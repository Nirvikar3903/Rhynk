# 00 — Overview

These are the standing project rules for Rhynk. They exist so that **Claude Code**
(`.claude/rules/`) and **Antigravity** (`.antigravity/rules/`) behave consistently —
same architecture, same naming, same conventions — no matter which assistant is
driving a given change. The two rule sets are kept byte-identical in content;
only tool-specific wiring (e.g. `CLAUDE.md`) differs.

## What Rhynk is

A chat + social-music application: messaging, calls, stories, shared "music rooms",
media sharing. Source: `docs/product/Rhynk_PRD_v2.2.pdf`, `docs/architecture/rhynk_hld.pdf`,
`docs/architecture/rhynk_lld.pdf`, `docs/music/Rhynk_Music_Provider_Strategy_Detailed.pdf`.

This repo currently contains **only the backend** (`server/`). There is no
`client/` app in this repo — it was moved out to a separate `rhynk-client` repo
(see commit `0c8f507`).

## Tech stack

| Concern | Technology |
|---|---|
| HTTP framework | Fastify v5 |
| Primary DB | PostgreSQL via Prisma ORM |
| Secondary DB | MongoDB via Mongoose (chat/messages — schema-flexible, high write volume) |
| Cache / session store | Redis via `ioredis` |
| Realtime | `socket.io` |
| Auth | `jsonwebtoken` (custom-rolled, **not** `@fastify/jwt` despite it being a dependency) |
| Password hashing | `bcrypt` |
| Email | `nodemailer` (SMTP; console fallback in dev) |
| API docs | Hand-written `server/swagger.json`, served at `/swagger.json`, rendered at `/docs` |
| Logging | `pino` / `pino-pretty` |
| Dev process manager | `nodemon` |

`@fastify/jwt`, `@fastify/cors`, `@fastify/helmet`, `@fastify/env`, `@fastify/static`,
`@fastify/autoload`, `@fastify/sensible` are installed dependencies but are **not**
registered in `app.js`. Don't assume they're active — check `server/src/app.js`
before relying on CORS, security headers, or autoload behavior.

## Current implementation status (verify before trusting stale docs)

Only the **`auth`** module (`server/src/modules/auth/`) has real code in it today.
Every other module directory (`user`, `media`, `messaging`, `music-room`, `calls`,
`conversations`, `devices`, `health`, `messages`, `music-rooms`, `notifications`,
`songs`, `stories`, `users`) is either fully empty (0-byte files) or an empty
scaffold directory — including `user/`, `media/`, `messaging/`, `music-room/`,
which older docs describe as "implemented." **Always check actual file contents
before assuming a module works** — line counts change fast in an early-stage repo.

There are also duplicate-looking module pairs: `user/` vs `users/`, `messaging/`
vs `messages/`, `music-room/` vs `music-rooms/`. Only the singular-named ones are
the real target — see [[02-naming]] before creating or filling in a module.

## Deep-dive docs (read these, don't re-derive from scratch)

- `docs/auth/AUTH_MODULE.md` — full auth flow, Redis key space, endpoint-by-endpoint
  behavior, security gaps. The only fully-implemented module; use it as the
  reference pattern for every new module.
- `docs/auth/authintgrationsteps.md` — frontend-facing API integration guide for
  every `/auth` endpoint (payloads, success shapes, error codes to handle).
- `docs/PROJECT_STRUCTURE.md` — directory layout, module pattern, request
  lifecycle, persistence model.
- `docs/database/schema.prisma` — the full PRD-derived reference Postgres schema
  (all planned models). See [[10-database-migrations]] for how this differs from
  the live schema.
- `docs/database/rhynk_database_design.pdf` — database design reference.
- `docs/user/userbackend.md` — user module backend notes.

## Docs folder layout

`docs/` is organized by topic rather than left flat:

```
docs/
  auth/          AUTH_MODULE.md, authintgrationsteps.md
  architecture/  rhynk_hld.pdf, rhynk_lld.pdf
  database/      schema.prisma, rhynk_database_design.pdf
  product/       Rhynk_PRD_v2.2.pdf
  music/         Rhynk_Music_Provider_Strategy_Detailed.pdf
  user/          userbackend.md
```

Put new docs under the subfolder matching their topic rather than back at the
`docs/` root — add a new subfolder only when a doc doesn't fit an existing one.

These docs are snapshots (dated 2026-07-10) — re-verify against the actual code
for anything load-bearing, the same way this rule set was written.

## Rule file index

- [[01-architecture]] — layers, plugins, persistence split, composition root
- [[02-naming]] — files, classes, DB columns, Redis keys, env vars
- [[03-request-flow]] — request lifecycle through the stack
- [[04-coding-standards]] — style actually used in the codebase today
- [[05-security]] — what's solid, what's a known gap, don't repeat the gaps
- [[06-validation]] — Fastify JSON-schema validation pattern
- [[07-docs-swagger]] — manual OpenAPI spec maintenance
- [[08-git-docker-env]] — env vars, git, no Docker yet
- [[09-workflow]] — dev scripts, Prisma workflow, test status
- [[10-database-migrations]] — Postgres/Mongo/Redis split, schema drift
