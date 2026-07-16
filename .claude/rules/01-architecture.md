# 01 — Architecture

## Layered module pattern

Every feature module (`server/src/modules/<name>/`) follows the same five-file
layering, established by `auth/` — the only module currently fully built:

```
<module>.route.js        Fastify route declarations: URL, schema, preHandlers
<module>.controller.js   Thin HTTP adapter: reads request, calls service, wraps response
<module>.service.js      Business logic: orchestrates repository + Redis/mailer/etc.
<module>.repository.js   Data access only (Prisma/Mongoose queries) — no business logic
<module>Index.js         Composition root: wires repository → service → controller, registers routes
```

Rules that follow from this:

- **Controllers never touch Prisma/Mongoose/Redis directly.** They call one
  service method and send the result. See `auth.controller.js` — every method is
  `service call → reply.code(x).send(successResponse(...))`, nothing else.
- **Services never import Fastify request/reply.** They take plain arguments and
  return plain data or throw errors with a `.code`. This is what keeps them
  testable (even though no tests exist yet — see [[09-workflow]]).
- **Repositories only do data access.** No conditionals about business rules,
  no calling other repositories' business logic — just queries.
- **`<module>Index.js` is the only place dependencies get wired.** `app.js` never
  constructs a repository/service/controller itself — it just
  `await app.register(fooIndex)`. Keep dependency injection localized to each
  module instead of centralizing it in `app.js`. See `authIndex.js`.

## Plugins vs. modules

`server/src/plugins/` holds Fastify plugins (wrapped with `fastify-plugin`) that
**decorate the Fastify instance** with a shared resource or capability:

- `prisma.plugin.js` → `fastify.prisma`
- `mongoose.plugin.js` → `fastify.mongo`
- `redis.plugin.js` → `fastify.redis`
- `mailer.plugin.js` → `fastify.sendOtpEmail`
- `auth.plugin.js` → `fastify.verifyJwt`
- `socket.plugin.js` → present but **not yet registered** in `app.js`

New cross-cutting infrastructure (a new external client, a new decorator used by
multiple modules) belongs in `plugins/`, not duplicated inside a module.
Module-specific logic (even if it talks to Redis, like `musicroom.redis.js`)
stays inside that module's own file — it isn't a plugin.

## Persistence split — pick the right store

- **Postgres (Prisma)** — system of record for identity, structure, and
  relationships: `User`, `Device`, and (per the reference schema) conversations,
  memberships, music rooms, songs, playlists, notifications, call logs. Low
  write-volume, relational, durable.
- **MongoDB (Mongoose)** — high-write, schema-flexible data: chat messages
  (`messaging/message.model.js`).
- **Redis** — hot ephemeral state that must never hit Postgres/Mongo write paths:
  OTP codes/cooldowns, refresh-token sessions, rate-limit counters, refresh
  rotation locks, live music-room playback state (position, queue, is_playing).

When adding a new piece of state, ask which bucket it belongs to before writing
code — see the comments in `docs/database/schema.prisma` (e.g. `MusicRoom` model) for the
reasoning already worked out for this app. Don't put high-frequency-mutation data
in Postgres, and don't put durable structural data only in Redis.

## Request lifecycle

See [[03-request-flow]] for the full path a request takes through
route → preHandler → controller → service → repository → response/error.

## Composition root (`app.js`)

`app.js` (`server/src/app.js`) registers plugins, sets the global error handler,
then registers each module's `Index.js`. It is intentionally thin — it should
never grow business logic, and new modules are wired in by adding one
`await app.register(fooIndex)` line, mirroring how `authIndex` is registered.
`/health`, `/swagger.json`, and `/docs` are the only routes currently declared
directly in `app.js` (not module-owned) — that's fine for these three
infra/docs endpoints, but feature endpoints always belong in a module.
