# 08 — Git, Docker & Environment

## Git

- Remote: `origin` → `https://github.com/Nirvikar3903/Rhynk.git`.
- `main` is the default/primary branch.
- Feature work happens on `feature/<name>` branches merged into `main` via PR
  (see `feature/auth-module`, merged in commit `295a00d`). Follow the same
  pattern for new feature branches.
- `package-lock.json` lives in `server/`, not the repo root — it was
  deliberately moved there (commit `55a9b8a`, "move package-lock.json from root
  to server directory"). Don't recreate a lockfile at the repo root.
- The former `client/` app was removed entirely and now lives in a separate
  `rhynk-client` repo (commit `0c8f507`). Don't resurrect client code inside
  this repo — it belongs in the other repository.
- `.gitignore` (root) currently ignores only `node_modules` and `.env`. If you
  add new local-only artifacts (build output, `.env.local`, IDE folders, log
  files), add them explicitly rather than assuming they're already excluded.

## Docker

**No `Dockerfile`, `docker-compose.yml`, or any container config exists in this
repo yet.** Don't assume a containerized dev workflow, don't reference "the
Docker setup" in docs or answers, and don't add Docker files speculatively —
if containerization is wanted, it needs to be raised as its own task, since
Postgres/MongoDB/Redis are currently expected to run some other way (local
installs, hosted services — `schema.prisma`'s header notes Postgres is hosted
on **Supabase**, region `ap-south-1`).

## Environment variables

Loaded via `dotenv/config` at the top of `server/src/config/env.js`, which
**fails fast**: it checks a required-vars list and calls `process.exit(1)` if
any are missing, before the app object is even built.

Currently required (`reqEnvVariables` in `env.js`):

```
DATABASE_URL
MONGODB_URI
REDIS_URL
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
```

Optional, defaulted or undefined-safe: `NODE_ENV` (default `development`),
`PORT` (default `4000`), `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
(mailer degrades to console logging if SMTP vars are absent — see
`plugins/mailer.plugin.js`).

Rules:

- **Any new required env var must be added to `reqEnvVariables` in `env.js`**
  and to the exported `env` object — don't read `process.env.X` directly
  elsewhere in the codebase; go through `config/env.js`'s exported `env`.
- **There is no `.env.example` committed.** `server/.env` is gitignored and
  holds real secrets (DATABASE_URL, REDIS_URL, JWT secrets, SMTP creds) per
  `docs/PROJECT_STRUCTURE.md`. When you introduce a new required env var,
  consider adding/updating a `.env.example` alongside it so setup instructions
  don't silently drift — none exists today, so don't assume one is being kept
  in sync automatically.
- Never commit `.env` or print its contents in logs/output.
