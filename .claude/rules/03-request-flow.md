# 03 — Request Flow

Every HTTP request follows the same path, regardless of module:

```
HTTP request
  → Fastify route match (server/src/modules/<module>/<module>.route.js)
  → Schema validation runs FIRST (the `schema` option on the route)
      fails → throws FST_ERR_VALIDATION, error.validation is populated
  → preHandler(s), in declared order — e.g. rateLimit(), fastify.verifyJwt
      fails → throws with either error.code (rateLimit) or a plain statusCode (verifyJwt)
  → Controller method (<module>.controller.js)
      pulls whatever it needs off `request` (body/params/query/request.user)
  → Service method (<module>.service.js)
      all business logic; talks to Repository, Redis, mailer, etc.
  → Repository (<module>.repository.js)
      Prisma/Mongoose queries only
  → Controller wraps the service's return value: reply.code(x).send(successResponse(data, message))
  → On ANY thrown Error anywhere in this chain:
      global errorHandler (middlewares/errorHandler.js) maps error.code → HTTP
      status via the CODE_TO_STATUS table, wraps in errorResponse(), replies once
```

## Concrete example — `POST /auth/login` (`auth.route.js` → `authIndex.js`)

1. Route: schema = `loginSchema`, preHandler = `rateLimit({ maxAttempts: 5, windowSeconds: 60 })`.
2. Controller: `login = async (request, reply) => { const result = await this.authService.login(request.body); return reply.code(200).send(successResponse(result, 'Login successful')); }`
3. Service (`AuthService.login`): looks up user, `bcrypt.compare`, checks `isVerified`,
   issues tokens, upserts device — throws `INVALID_CREDENTIALS` / `EMAIL_NOT_VERIFIED`
   as needed.
4. Repository: plain Prisma calls (`findUnique`, `upsert`), no branching logic.
5. Error path: if step 3 throws `{ code: 'INVALID_CREDENTIALS' }`, `errorHandler`
   looks it up → 401 → `errorResponse('Invalid credentials', 'INVALID_CREDENTIALS')`.

## Rules that follow from this

- **Never send a reply from inside a service or repository.** Only the
  controller calls `reply.code(...).send(...)`. Services return or throw.
- **Never catch-and-swallow an error inside a service unless you're
  deliberately converting it** (e.g. `login()`'s "fire-and-continue OTP resend,
  swallow OTP_COOLDOWN" pattern in `auth.service.js` — that's an intentional,
  narrow catch, not a blanket `try/catch`).
- **preHandler order matters** and is declared inline in the route array —
  rate limiting before auth-guarding, matching what's already done for
  `/auth/register`, `/auth/verify-otp`, `/auth/login`.
- A route with no explicit `preHandler` (like `/auth/resend-otp`) has none —
  don't assume a default rate limit exists; see the gap called out in
  [[05-security]].
- Every thrown business error should carry a `.code` matching an entry in
  `CODE_TO_STATUS` (`middlewares/errorHandler.js`) — see [[02-naming]] and
  [[06-validation]]. Errors without a recognized `.code` or `.statusCode` fall
  through to a generic 500.
