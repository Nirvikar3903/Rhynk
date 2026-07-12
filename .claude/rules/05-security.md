# 05 — Security

## What's solid — keep doing this in new modules

- Passwords hashed with `bcrypt`, cost factor **10**. Never store or log
  plaintext passwords.
- Access and refresh JWTs use **separate secrets**
  (`JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`) and separate lifetimes
  (15m access / 7d refresh) — leaking one doesn't compromise the other. Reuse
  this split for any new token type rather than reusing an existing secret.
- **Refresh-token rotation + reuse detection** (`AuthService.refresh`): every
  refresh issues a brand-new pair and overwrites the Redis session key; if a
  presented refresh token doesn't match what's stored, treat it as theft and
  revoke every session for that user (`DEL session:<userId>:*`). This is the
  textbook-correct pattern — replicate it for any other rotating-credential flow.
- Per-account cooldowns (`otp:cooldown:<email>`, 30s) prevent spam distinct from
  IP-based rate limiting — use both layers together, not just one.
- Generic, identical error messages for cases that could otherwise leak account
  existence (`INVALID_CREDENTIALS` covers both "no such user" and "user has no
  password set") — don't split these into more specific messages.
- The global error handler never leaks stack traces to the client and logs 5xx
  errors server-side via `request.log.error`. Keep new error paths going through
  it rather than replying directly with `error.stack` or raw exception details.

## Known gaps — don't copy these into new code; fix opportunistically if touching this area

- `POST /auth/resend-otp` has **no `rateLimit()` preHandler**, unlike
  register/verify-otp/login — it relies solely on the 30s Redis cooldown. If
  you touch this route, add the same IP-based rate limiter the sibling routes use.
- `POST /auth/logout` trusts `deviceId` from the request body without checking
  it belongs to the authenticated `userId` (`request.user.userId` from the JWT).
  A valid access-token holder can delete another device's session/row if they
  guess its `deviceId`. Any new "act on a resource by ID" endpoint should verify
  ownership server-side, not just trust the caller's payload.
- OTPs are 6-digit codes from `Math.random()` — not cryptographically secure,
  and there's no explicit brute-force lockout on `verify-otp` beyond the shared
  IP rate limit (5/60s). If you touch OTP generation, prefer a CSPRNG
  (`crypto.randomInt`) and consider a per-OTP attempt counter.
- **No CORS or security-header middleware is active anywhere** — `@fastify/cors`
  and `@fastify/helmet` are installed but never registered in `app.js`. Don't
  assume either is protecting the app; if a change depends on CORS behavior,
  register and configure the plugin explicitly rather than assuming a default.
- Rate limiting keys purely off `ip:route`, not per-account — a shared IP (NAT,
  corporate network) shares one budget across all its users for that route.
  Know this limitation before treating the rate limiter as an account-level
  brute-force defense.

## General rules for new endpoints

- Every new mutating/sensitive route needs an explicit rate-limit and/or
  auth-guard decision — don't leave a route unprotected by omission. If a route
  is intentionally unauthenticated/unlimited, that should be a deliberate,
  documented choice, not an oversight.
- Never put secrets, tokens, or password hashes inside an `Error`'s message —
  those get logged verbatim for 5xx errors.
- See [[06-validation]] for input validation, which is the first line of
  defense against malformed/oversized payloads.
