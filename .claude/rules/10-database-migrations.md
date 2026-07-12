# 10 — Database & Migrations

## Two schema.prisma files — know which one you're editing

- **`server/prisma/schema.prisma`** — the **live** schema, the only one that
  `prisma generate`/`migrate`/`push` actually act on. Today it only defines
  `User`, `Device`, and the `DeviceType` enum, using Prisma's default camelCase
  column mapping (no per-field `@map`).
- **`docs/schema.prisma`** — a **reference/PRD-derived** schema documenting the
  full target data model: `User`, `Device`, `UserContact`, `BlockedUser`,
  `Conversation`, `ConversationMember`, `MusicRoom`, `Song`, `Playlist`,
  `PlaylistSong`, `LikedSong`, `Notification`, `NotificationPreference`,
  `CallLog`, plus enums (`ConversationType`, `MemberRole`, `SongSourceType`,
  `NotificationType`, `CallType`, `CallStatus`). It uses `@map`/`@@map`
  throughout to snake_case columns/tables, and its header states Postgres runs
  on **Supabase**, region `ap-south-1`, all IDs UUID v4, all timestamps UTC.

**These two files are currently out of sync** — the live schema hasn't caught
up to most of the reference schema's models. When a task needs a new Postgres
model/field:

1. Check `docs/schema.prisma` first — the target shape (including comments
   explaining *why* a field lives where it does, e.g. `Device.fcmToken` living
   on `Device` not `User` for multi-device push) has usually already been
   designed there.
2. Port the relevant model into `server/prisma/schema.prisma`, **including**
   its `@map`/`@@map` annotations and comments — don't introduce the live
   schema's older camelCase-column style for new models; converge toward the
   reference's mapped-column convention instead ([[02-naming]]).
3. Run `npm run prisma:generate` after any schema edit, and prefer
   `npm run prisma:migrate` over `prisma:push` for anything meant to be
   reproducible ([[09-workflow]]).

## Why data is split across three stores

From `docs/schema.prisma`'s own header comment: Postgres is "the SYSTEM OF
RECORD for identity, structure, and relationships." High-write ephemeral data
(messages, stories, presence, room playback state) intentionally lives
**outside** Postgres. Concretely:

- **Postgres** — accounts, devices, conversation membership, music-room
  existence/ownership (not live playback), songs/playlists metadata,
  notifications, call history. Anything that needs relational joins or is a
  system of record.
- **MongoDB** — chat messages (`messaging/message.model.js`) — schema-flexible,
  very high write volume, not relationally joined the way Postgres data is.
- **Redis** — anything that mutates multiple times per second or is inherently
  short-lived: OTPs/cooldowns, refresh-token sessions, rate-limit counters,
  refresh-rotation locks, and **live music-room playback state** (position_ms,
  is_playing, queue) — `MusicRoom.isPlaying` in Postgres is explicitly only a
  "last-known snapshot, reconciled from Redis on room close," not the live value.

Don't add a new high-frequency-write field directly to a Postgres model — check
whether it belongs in Redis instead, following the `MusicRoom` precedent.

## Soft deletes

`User.deletedAt` exists specifically for GDPR/DPDPA compliance — the schema
comment is explicit: "soft delete, never hard-delete a row with FK fan-out."
Any new deletion flow on `User` (or a model with similar FK fan-out) should
follow the same soft-delete pattern rather than issuing a hard `DELETE`, unless
a specific row is meant to cascade-delete by design (like `Device` rows on
logout, which *are* hard-deleted per `AUTH_MODULE.md` §4.6 — devices are
disposable session records, not identity records).

## Indexes

Composite unique constraints double as the query index for hot lookups — e.g.
`ConversationMember.@@unique([conversationId, userId])` is called out in the
schema comment as "the index Postgres uses to answer 'is user X in
conversation Y' on every single message-send / socket auth check." When adding
a new membership/permission-check table, add the composite unique/index
up front rather than as an afterthought — these are on the hot path.
