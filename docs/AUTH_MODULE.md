# Rhynk — Auth Module Deep Dive

> Source: `server/src/modules/auth/*`, `server/src/utils/{jwt.util.js,hash.util.js}`, `server/src/middlewares/{verifyJwt.js,rateLimit.js,errorHandler.js}`, `server/src/plugins/{auth.plugin.js,mailer.plugin.js}`, `server/prisma/schema.prisma`, `server/swagger.json`. Read directly on 2026-07-10; file names updated 2026-07-12 (`auth.route.js` → `auth.routes.js`, `auth.schema.js` → `auth.validator.js`).

## 1. Files

| File | Responsibility |
|---|---|
| `auth.routes.js` | Declares the 6 HTTP routes, attaches JSON-schema validation and `preHandler` middleware (rate limit / JWT guard) per route |
| `auth.controller.js` | Thin HTTP adapter — pulls data off `request`, calls `AuthService`, returns `successResponse()` |
| `auth.service.js` | All business logic: OTP lifecycle, credential checks, token issuance, refresh rotation + reuse detection, logout |
| `auth.repository.js` | Prisma queries only — `User` and `Device` tables |
| `auth.validator.js` | Fastify JSON-schema request validators, one per route (renamed from `auth.schema.js`) |
| `authIndex.js` | Composition root — wires Prisma/Redis/mailer into repository→service→controller, registers routes under `/auth` prefix |

## 2. Data model (Postgres, via Prisma)

```prisma
model User {
  id           String   @id @default(uuid())
  username     String   @unique
  phone        String?  @unique
  email        String?  @unique
  passwordHash String?
  googleId     String?  @unique
  avatarUrl    String?
  bio          String?
  statusText   String?
  isVerified   Boolean  @default(false)
  lastSeenAt   DateTime?
  deletedAt    DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  devices      Device[]
}

model Device {
  id           String     @id @default(uuid())   // client-generated deviceId, used as PK
  userId       String
  deviceType   DeviceType  // IOS | ANDROID | WEB
  fcmToken     String?
  lastActiveAt DateTime   @default(now())
  createdAt    DateTime   @default(now())
}
```

Notes:
- `email`, `phone`, `googleId` are all optional+unique — schema anticipates phone-based and Google OAuth signup, but **only email+password is implemented** in `auth.service.js` today.
- `Device.id` is the client-supplied `deviceId` string, not a generated PK — the client owns device identity, and `upsertDevice` keys off it directly.
- One row per `(user, device)` — a user can be logged in on multiple devices simultaneously, each with its own refresh-token session in Redis.

## 3. Redis key space used by auth

| Key pattern | Purpose | TTL |
|---|---|---|
| `otp:<email>` | Current OTP code for that email | 60s |
| `otp:cooldown:<email>` | Blocks OTP resend spam | 30s |
| `session:<userId>:<deviceId>` | Current valid refresh token for that device session | 7 days |
| `lock:refresh:<refreshToken>` | Short-lived mutex during token rotation | 5s |
| `ratelimit:<ip>:<routerPath>` | Fixed-window request counter (from `middlewares/rateLimit.js`) | per-route window |

## 4. Endpoints

Base prefix: **`/auth`**

### 4.1 `POST /auth/register`
- **Rate limit:** 3 requests / 60s / IP
- **Body:** `{ username: string(3-30), email: string, password: string(min 6) }`
- **Logic** (`AuthService.register`):
  1. Look up user by email.
  2. If found **and verified** → throw `EMAIL_TAKEN` (409).
  3. If found **and unverified** → just resend OTP, return existing `userId`.
  4. If not found → hash password (bcrypt, 10 rounds), create user row (`isVerified: false`), send OTP.
- **Response `201`:** `{ email, userId, isVerified: false }`
- **Errors:** `EMAIL_TAKEN` (409), `OTP_COOLDOWN` (429, if resending too fast for an existing unverified account)

### 4.2 `POST /auth/verify-otp`
- **Rate limit:** 5 requests / 60s / IP
- **Body:** `{ email, otp: "^[0-9]{6}$", deviceId, deviceType: IOS|ANDROID|WEB }`
- **Logic** (`AuthService.verifyOtp`):
  1. Fetch OTP from Redis (`otp:<email>`); must exist and match exactly → else `OTP_INVALID` (400).
  2. Fetch user by email → else `USER_NOT_FOUND` (404).
  3. Mark user `isVerified = true` in Postgres, delete the Redis OTP key.
  4. Issue tokens (see §5) — this also upserts the `Device` row.
- **Response `200`:** `{ accessToken, refreshToken, user: { id, username, email, isVerified: true } }`
- **Errors:** `OTP_INVALID` (400), `USER_NOT_FOUND` (404)
- Note: this is the **only** place a first-time login's tokens are issued after signup — there's no separate "confirm and log me in" step.

### 4.3 `POST /auth/login`
- **Rate limit:** 5 requests / 60s / IP
- **Body:** `{ email, password, deviceId, deviceType }`
- **Logic** (`AuthService.login`):
  1. Fetch user by email; must exist and have a `passwordHash` → else `INVALID_CREDENTIALS` (401). (Deliberately identical error whether the user doesn't exist or the row has no password — e.g. a Google-only account — to avoid leaking account existence.)
  2. `bcrypt.compare` password vs hash → mismatch → `INVALID_CREDENTIALS` (401).
  3. If `isVerified === false` → fire-and-continue OTP resend (swallowing `OTP_COOLDOWN` errors so this doesn't crash the login attempt), then throw `EMAIL_NOT_VERIFIED` (403).
  4. Otherwise issue tokens and upsert device.
- **Response `200`:** same shape as verify-otp.
- **Errors:** `INVALID_CREDENTIALS` (401), `EMAIL_NOT_VERIFIED` (403)

### 4.4 `POST /auth/resend-otp`
- **No rate-limit preHandler** attached (only the internal 30s Redis cooldown in `sendOtp` protects it — this is a gap, see §7).
- **Body:** `{ email }`
- **Logic:** fetch user (else `USER_NOT_FOUND` 404), call `sendOtp(email)`.
- **Response `200`:** `{ success: true }`
- **Errors:** `USER_NOT_FOUND` (404), `OTP_COOLDOWN` (429)

### 4.5 `POST /auth/refresh`
- **Body:** `{ refreshToken, deviceId }`
- **Logic** (`AuthService.refresh`) — the most involved flow:
  1. `jwt.verify` the refresh token with `JWT_REFRESH_SECRET` → invalid/expired → `REFRESH_INVALID` (401).
  2. Confirm the token's embedded `deviceId` matches the request's `deviceId` → mismatch → `REFRESH_INVALID` (401).
  3. Acquire a Redis lock `lock:refresh:<refreshToken>` via `SET NX EX 5` → if already held, another refresh is in-flight for this exact token → `REFRESH_LOCKED` (409).
  4. Compare the presented token against `session:<userId>:<deviceId>` in Redis:
     - **Mismatch or missing** → treated as **token reuse / theft**: deletes *every* `session:<userId>:*` key (logs the user out of all devices), throws `SESSION_REVOKED` (401).
     - **Match** → proceeds.
  5. Looks up the device's current `deviceType` (falls back to `WEB` if the device record is missing).
  6. Issues a brand-new access+refresh pair, overwriting the Redis session key (**refresh-token rotation** — the old refresh token becomes unusable after this).
  7. Releases the lock in a `finally` block regardless of outcome.
- **Response `200`:** `{ accessToken, refreshToken }`
- **Errors:** `REFRESH_INVALID` (401), `REFRESH_LOCKED` (409), `SESSION_REVOKED` (401)
- This implements the standard **rotate + reuse-detection** refresh-token pattern: a stolen-and-replayed token, once the legitimate client also tries to use its (now-superseded) token, triggers full session revocation as a defensive measure.

### 4.6 `POST /auth/logout`
- **Auth required:** `preHandler: [fastify.verifyJwt]` — needs a valid **access token** (not refresh) in `Authorization: Bearer <token>`.
- **Body:** `{ deviceId }`
- **Logic** (`AuthService.logout`): deletes `session:<userId>:<deviceId>` from Redis, deletes the `Device` row from Postgres (silently ignores Prisma "record not found", `P2025`).
- **Response `200`:** `{ success: true }`
- Note: `userId` comes from the verified JWT (`request.user.userId`), not the body — you can only log out your own session, but `deviceId` in the body is trusted as-is (no check that it belongs to the authenticated user — see §7).

## 5. Token issuance (`issueTokens`, shared by verify-otp / login / refresh)

```
upsertDevice(deviceId, userId, deviceType)      // Postgres — registers/refreshes device
accessToken  = JWT { userId, deviceId }, secret=JWT_ACCESS_SECRET,  exp=15m
refreshToken = JWT { userId, deviceId }, secret=JWT_REFRESH_SECRET, exp=7d
redis.set(`session:<userId>:<deviceId>`, refreshToken, EX 7d)
```

Both tokens carry the same payload (`userId`, `deviceId`) but are signed with **different secrets** and have different lifetimes — this is what lets `verifyJwt` middleware and the refresh flow independently validate the right token type.

## 6. Supporting middleware

### `verifyJwt.js` (decorated as `fastify.verifyJwt`, used by `/auth/logout` and presumably other protected modules)
- Requires `Authorization: Bearer <token>` header.
- Verifies against `JWT_ACCESS_SECRET`.
- Requires both `userId` and `deviceId` claims present.
- Sets `request.user = { userId, deviceId }`.
- Any failure → generic `401 Invalid or expired access token` (doesn't leak whether the token was malformed vs expired vs missing claims).

### `rateLimit.js` (factory, used per-route with different budgets)
- Redis fixed-window counter keyed by `ratelimit:<ip>:<routerPath>`.
- `INCR` then `EXPIRE` only on the first hit in the window.
- Exceeding `maxAttempts` throws `RATE_LIMITED` → mapped to 429.
- **Caveat:** keys purely off IP + route, not per-account — a shared IP (NAT/corporate network) shares one budget across all its users for that route.

### `errorHandler.js` (global Fastify error handler)
Central `error.code → HTTP status` map:

| code | status |
|---|---|
| `EMAIL_TAKEN` | 409 |
| `OTP_COOLDOWN` | 429 |
| `OTP_INVALID` | 400 |
| `USER_NOT_FOUND` | 404 |
| `INVALID_CREDENTIALS` | 401 |
| `EMAIL_NOT_VERIFIED` | 403 |
| `REFRESH_INVALID` | 401 |
| `REFRESH_LOCKED` | 409 |
| `SESSION_REVOKED` | 401 |
| `RATE_LIMITED` | 429 |

Falls back to `error.statusCode` (used by `verifyJwt.js`, which throws plain `401`s without a `code`), then `500`. Fastify schema-validation errors (`error.validation`) are formatted into a human-readable message. Anything ≥500 gets logged via `request.log.error`.

## 7. Security properties & notable gaps

**What's solid:**
- Passwords hashed with bcrypt (cost 10), never stored/logged in plaintext.
- Access/refresh tokens use separate secrets, so leaking one doesn't compromise the other.
- Refresh-token rotation + reuse detection is a real defense against stolen-refresh-token replay — a textbook-correct implementation of the pattern.
- Per-account OTP cooldown prevents email-bombing a single address.
- Generic `INVALID_CREDENTIALS` message avoids leaking account existence on login.

**Gaps worth knowing about:**
- `resend-otp` has no `rateLimit()` preHandler (unlike register/verify-otp/login) — relies solely on the 30s Redis cooldown, which is weaker than the IP-based limiter used elsewhere.
- `logout` trusts `deviceId` from the request body without verifying it belongs to the authenticated `userId` — a valid access token holder could delete another device's session/record by guessing its `deviceId` (device IDs are client-generated UUID-like strings, so this requires the ID to be known/guessed, but there's no ownership check in `repository.deleteDevice` or the Redis key deletion).
- OTP is a 6-digit numeric code generated with `Math.random()` — not cryptographically secure, and there's no explicit brute-force lockout on the OTP itself beyond the 60s TTL (an attacker gets a 60-second window with no attempt limit on `verify-otp` beyond the shared IP rate limit of 5/60s).
- No CORS/Helmet middleware active anywhere in `app.js` (see PROJECT_STRUCTURE.md §7) — affects the whole app, including auth endpoints.
- `errorHandler` logs full error objects for 5xx — fine — but confirm no sensitive payloads (tokens, passwords) ever end up inside a thrown `Error`'s message in a future change.

## 8. Sequence summary

```
Register → (email unverified) → verify-otp → tokens issued, device registered
                                     ↑
Login (unverified) → resend OTP automatically, 403 EMAIL_NOT_VERIFIED  ┘

Login (verified) → tokens issued, device upserted

Access token expires (15m) → POST /auth/refresh with refreshToken + deviceId
  → valid & unused → rotated tokens
  → already rotated/stolen → ALL sessions for user revoked, must re-login

Logout → session key deleted, device row deleted
```
