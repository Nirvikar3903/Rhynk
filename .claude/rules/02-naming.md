# 02 — Naming

## Module directories

- Folder name = singular or hyphenated feature name: `auth`, `user`, `media`,
  `messaging`, `music-room`.
- **Do not create or fill in the plural duplicates**: `users/`, `messages/`,
  `music-rooms/` are empty scaffold leftovers that shadow the real (singular)
  module names. If a task looks like it belongs in one of these, it almost
  certainly belongs in the singular sibling instead. Flag the duplicate for
  deletion rather than adding code to it.

## File naming inside a module

Given a module named `foo` (or a hyphenated `music-room` → concatenated
`musicroom` for the file prefix, matching the existing convention):

| File | Purpose |
|---|---|
| `foo.route.js` | Fastify route declarations |
| `foo.controller.js` | HTTP adapter class, e.g. `FooController` |
| `foo.service.js` | Business logic class, e.g. `FooService` |
| `foo.repository.js` | Data access class, e.g. `FooRepository` |
| `foo.schema.js` | Fastify JSON-schema validators, one export per route |
| `fooIndex.js` | Composition root — **camelCase, no dot before `Index`** (not `foo.index.js`) |

Module-specific extras follow the same `<module>.<concern>.js` pattern:
`media.queue.js`, `messaging.socket.js`, `message.model.js` (Mongoose model),
`musicroom.redis.js`.

## Classes

PascalCase, prefixed with the module name: `AuthController`, `AuthService`,
`AuthRepository`. Instance methods that are used directly as Fastify handlers
are defined as **class field arrow functions** (`register = async (request, reply) => {...}`)
so `this` stays bound when Fastify calls them — see [[04-coding-standards]].

## Prisma models & columns

- Model names: PascalCase singular (`User`, `Device`, `MusicRoom`).
- Model fields: camelCase (`passwordHash`, `lastActiveAt`).
- Table names: snake_case plural via `@@map("users")`, `@@map("devices")`.
- The full reference schema (`docs/schema.prisma`) also maps individual columns
  to snake_case via `@map("password_hash")`, `@map("device_type")`, etc. The
  **live** schema (`server/prisma/schema.prisma`) doesn't do this yet — it just
  uses Prisma's default camelCase columns. When extending the live schema
  toward parity with the reference, carry over the `@map`/`@@map` convention
  from `docs/schema.prisma` rather than inventing a different one. See
  [[10-database-migrations]].
- Enum names: PascalCase (`DeviceType`, `ConversationType`); enum values:
  SCREAMING_SNAKE / SCREAMING (`IOS`, `ANDROID`, `WEB`, `NEW_MESSAGE`).

## Redis keys

Colon-delimited, most-specific-last: `otp:<email>`, `otp:cooldown:<email>`,
`session:<userId>:<deviceId>`, `lock:refresh:<refreshToken>`,
`ratelimit:<ip>:<routerPath>`. Follow this `namespace:id[:subid]` shape for any
new Redis key — it's what makes `DEL session:<userId>:*` (used for reuse-detection
logout-everywhere) work as a pattern match.

## Error codes

SCREAMING_SNAKE strings on `error.code` (`EMAIL_TAKEN`, `OTP_INVALID`,
`REFRESH_LOCKED`), mapped to HTTP status in the `CODE_TO_STATUS` table inside
`middlewares/errorHandler.js`. When adding a new failure mode, add both the
thrown `error.code` string and its entry in that map — see [[05-security]] and
[[06-validation]].

## Environment variables

SCREAMING_SNAKE, declared in `config/env.js`. See [[08-git-docker-env]].
