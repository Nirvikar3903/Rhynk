# 04 — Coding Standards

There is **no ESLint/Prettier config in this repo**. Don't assume a linter will
catch style drift — match the surrounding file's style by hand, and prefer the
conventions below (drawn from the actual, implemented `auth` module) when a file
has no local precedent yet.

## Module system

- Pure ESM: `"type": "module"` in `server/package.json`. Always `import`/`export`,
  never `require`. Always include the `.js` extension in relative imports
  (`from './auth.schema.js'`) — Node ESM requires it.
- No TypeScript, no build step. Files run as-is under Node via `nodemon`/`node`.

## Quotes & formatting

- Single quotes are the dominant style across the actual business-logic files
  (`apiResponse.js`, `errorHandler.js`, every file under `modules/auth/`).
  `app.js` uses double quotes — that's the outlier, not the target. **Prefer
  single quotes** for new code.
- 2-space indentation throughout.
- Semicolons used consistently — keep using them.

## Classes over plain function exports for layer objects

Controllers, services, and repositories are ES classes, constructed once in
`<module>Index.js` and holding their dependencies on `this` (see `AuthController`,
`AuthService`, `AuthRepository`). Route-handler methods are **class field arrow
functions**, not prototype methods:

```js
export class FooController {
  constructor(fooService) {
    this.fooService = fooService;
  }

  doThing = async (request, reply) => {
    const result = await this.fooService.doThing(request.body);
    return reply.code(200).send(successResponse(result, 'Done'));
  };
}
```

This matters because Fastify calls `controller.doThing` directly as a bare
function reference — a prototype method would lose its `this` binding. Don't
switch to prototype methods without also changing how routes pass the handler.

Route files, `Index.js` files, and schema files stay as plain exported
functions/objects (`export default async function fooRoutes(...)`,
`export const fooSchema = {...}`) — only the three core layer classes use the
class pattern.

## Comments

The existing code uses short, one-to-few-line comments **above a method or
route**, explaining *why*/*what business rule*, not *what the syntax does* —
e.g. `// Sign Up: Rate-limited to max 3 attempts per 60s per IP` above a route,
or `// register: Handles new user signup. It hashes the password, creates an
unverified user...` above a controller method. Match this: one comment per
method describing its role in the business flow, not line-by-line narration.
Don't add comments that just restate the next line of code.

## Responses

Always go through the two helpers in `utils/apiResponse.js` — never hand-roll
a response shape:

```js
successResponse(data, message = 'Success')   // { success: true, message, data }
errorResponse(message, code = null)           // { success: false, message, code }
```

## Errors

Throw plain `Error` objects with a `.code` string property for business errors
(`const err = new Error('...'); err.code = 'EMAIL_TAKEN'; throw err;` — or an
equivalent helper if one gets introduced later). Don't throw raw strings, and
don't invent a bespoke custom Error class per module — `common/errors/` is
reserved (currently empty) for this if/when a shared base class becomes
justified across modules; check there first before adding a new one.
