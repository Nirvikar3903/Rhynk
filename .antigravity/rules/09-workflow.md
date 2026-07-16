# 09 — Workflow

## Day-to-day scripts (`server/package.json`)

```
npm run dev             nodemon src/server.js — hot-reload dev server
npm run start            node src/server.js — production-style start, no reload
npm run prisma:generate  prisma generate — regenerate the Prisma client after a schema change
npm run prisma:migrate   prisma migrate dev — create/apply a dev migration
npm run prisma:studio    prisma studio — DB GUI
npm run prisma:push      prisma db push — push schema without creating a migration file
```

All commands are run from `server/` (that's where `package.json` lives — this
repo has no root-level `package.json`).

## Testing status — there are none yet

`npm test` is currently a stub (`echo "Error: no test specified" && exit 1`).
`server/tests/integration/` and `server/tests/unit/` both exist but are empty.
This means:

- Don't claim "tests pass" or run `npm test` as a verification step — it will
  always fail by design, not because of your change.
- If a task would normally be verified by tests, verify manually instead
  (exercise the endpoint, check the DB row, inspect Redis) and say so
  explicitly rather than treating an absent test suite as a pass.
- Adding real tests for the `auth` module (the only fully-implemented one) is
  valuable, currently-unclaimed work — there's no existing test convention to
  match yet, so a first test file should establish one (test runner choice
  hasn't been decided; check with the user before picking one, since adding a
  new devDependency is a real decision here, not a default).

## Prisma schema workflow

See [[10-database-migrations]] for the split between the live schema
(`server/prisma/schema.prisma`) and the reference schema (`docs/database/schema.prisma`),
and which one to edit for a given task. No `server/prisma/migrations/` directory
exists yet — no tracked migration has ever been generated; schema changes so
far have presumably gone through `db push` or been applied by hand. Prefer
`prisma:migrate` (which creates a tracked migration file) over `prisma:push`
once you're adding real schema changes that should be reproducible across
environments — `db push` is fine for local, throwaway iteration only.

## Module rollout order

Given the current state ([[00-overview]]): `auth` is the only real module.
When picking up work on `user`, `media`, `messaging`, or `music-room` (all
currently empty despite having scaffold files), treat it as new work, not
"finishing" existing code — use `auth`'s five-file layering
([[01-architecture]]) as the template to copy, not a partial implementation to
patch.
