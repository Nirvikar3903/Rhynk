# 06 — Validation

## Pattern

Validation is **Fastify JSON-schema**, not a separate library (no `zod`/`joi`/
`class-validator`). Each route's request shape is defined once in
`<module>.schema.js`, one named export per route, then attached via the
route's `schema` option in `<module>.route.js`:

```js
// foo.schema.js
export const createFooSchema = {
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 60 }
    }
  }
};

// foo.route.js
fastify.post('/foo', { schema: createFooSchema, preHandler: [...] }, controller.create);
```

Fastify runs this validation **before** any preHandler or controller code
executes. A failure throws with `error.validation` populated — the global
`errorHandler` (`middlewares/errorHandler.js`) formats it into a readable
message automatically:

```js
`Validation Error: ${error.validation.map(e => `${e.instancePath || ''} ${e.message}`).join(', ')}`
```

Don't hand-write your own "if (!body.name) throw ..." checks for things a
JSON-schema `required`/`type`/`pattern`/`enum` can already express — that
duplicates validation logic in two places and can drift.

## Conventions already established (`auth.schema.js`)

- Email: `{ type: 'string', pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' }` — reuse
  this exact pattern for any new email field rather than a different regex.
- OTP: `{ type: 'string', pattern: '^[0-9]{6}$' }`.
- Enums as literal string arrays: `{ type: 'string', enum: ['IOS', 'ANDROID', 'WEB'] }`
  — keep these in sync with the corresponding Prisma enum (`DeviceType`) so the
  two don't drift; see [[02-naming]] / [[10-database-migrations]].
- IDs / tokens passed in body: `{ type: 'string', minLength: 1 }` — no format
  assumption beyond non-empty.
- `username`: `minLength: 3, maxLength: 30`; `password`: `minLength: 6` (no
  upper bound enforced, no complexity rule beyond length — don't add stricter
  password rules without a product decision to back it, since none of the docs
  specify one).

## Shared/cross-module validation fragments

`server/src/common/validators/` is reserved for JSON-schema fragments shared
across modules (e.g. a common email/deviceType/pagination shape) — it's
currently empty. When two or more modules would otherwise duplicate the same
property definition, put the shared fragment there and `$ref`/spread it into
each module's schema, rather than copy-pasting the object literal repeatedly.

## Rate limiting is not validation

`rateLimit()` (`middlewares/rateLimit.js`) is a `preHandler`, not part of the
`schema` — it runs after validation succeeds. It throws
`{ code: 'RATE_LIMITED' }` on an IP+route counter exceeding `maxAttempts` in
`windowSeconds`. See [[03-request-flow]] for where this sits in the pipeline
and [[05-security]] for which routes currently lack it.
