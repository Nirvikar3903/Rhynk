# 07 — API Docs / Swagger

## This is a hand-written spec, not auto-generated

`server/swagger.json` is a manually maintained OpenAPI 3.0 document. **There is
no `@fastify/swagger` (or similar) installed** — Fastify route `schema` objects
(see [[06-validation]]) do **not** automatically produce this file. Editing a
route's JSON-schema and forgetting to update `swagger.json` is a real, common
way for the docs to silently drift from the actual API — check both when
changing a route's request/response shape.

## Serving

- `GET /swagger.json` (declared directly in `app.js`) reads and returns the
  file's contents as JSON.
- `GET /docs` (also in `app.js`) returns a static HTML page embedding Swagger UI
  via the `swagger-ui-dist` CDN bundle, pointed at `/swagger.json`.
- Both routes are infra-level and live in `app.js` itself, not in a module —
  consistent with [[01-architecture]]'s note that `/health`, `/swagger.json`,
  `/docs` are the three exceptions to "routes live in modules."

## Structure to follow when adding a new endpoint's docs

`swagger.json` already establishes:

- `components.securitySchemes.rhynkAuth` — bearer JWT scheme, reused via
  `security: [{ rhynkAuth: [] }]` on any route requiring `fastify.verifyJwt`.
- `components.schemas.ApiResponse` / `ApiErrorResponse` — generic envelope
  shapes matching `utils/apiResponse.js`'s `successResponse`/`errorResponse`.
  New endpoints should reference these rather than redefining the envelope.
- `components.schemas.ApiErrorResponse.properties.code.enum` — the list of all
  known error codes (kept in lockstep with `CODE_TO_STATUS` in
  `middlewares/errorHandler.js`, see [[02-naming]]). **Every new error `.code`
  you add to the error handler should also be appended to this enum.**

When adding a route: add its path/method/summary/requestBody/responses under
`paths`, referencing the shared schemas above, and update the title/description
if the doc's scope changes (currently titled "Rhynk Auth API" — will need
broadening once non-auth modules ship real endpoints).

## Don't

- Don't wire up `@fastify/swagger`/`@fastify/swagger-ui` to auto-generate this
  without discussing it first — the hand-written file and the Fastify route
  schemas are two independent sources of truth today, and switching to
  auto-generation is an architecture change, not a docs tweak.
- Don't let `swagger.json` reference an error code, model shape, or endpoint
  that doesn't exist in the actual code, or vice versa.
