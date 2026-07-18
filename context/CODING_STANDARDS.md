# StarWindow — Coding Standards

## The Single Rule That Overrides Everything

**Before writing any new code, check if something already exists that does it.**

Look in:
- `server/services/` — business logic + external API fetch/transform
- `server/db/queries/` — reusable SQL query functions, grouped by table/domain
- `server/utils/` — pure helpers (currently `geo.js` spherical math)
- `server/middleware/cache.js` — `isCacheStale()` + `TTL_MINUTES` (all cache TTLs live here)
- `client/src/utilities/` — API client modules + auth/location services
- `client/src/components/` — shared UI (events, calendar, star-map subfolders)
- `client/src/constants/tokens.ts` — ALL design tokens: `Palette`, `Radius`, `Spacing`, `Breakpoints`, `Fonts`, `alpha()` helper
- `client/src/hooks/` — shared React hooks

If it exists, use it. If it almost fits, extend it. Only create something new if nothing comes close.

⚠️ Known violation to not make worse: the client has **two parallel API layers** — `src/utilities/*-api.ts` and `src/lib/*.ts` (`events-api`, `astronomy`, `map-api`). Do not add a third and do not add new functions to `src/lib/` — new API clients go in `src/utilities/` until the layers are merged (tracked in PROGRESS_TRACKER).

---

## Project Structure

```
/server                    ← Express 5 API, CommonJS
  server.js                ← entry: middleware chain + route mounting only
  /config                  ← database pool, checkToken (JWT decode), ensureLoggedIn
  /controllers/api         ← req/res handlers for auth-style resources (users, eventTypes)
  /routes/api              ← one router file per /api/* mount; most call services directly
  /services                ← business logic; external API fetch → transform → cache
  /db/queries              ← all SQL lives here, grouped by domain (events, launches, iss, …)
  /middleware              ← cache staleness helper (TTL_MINUTES)
  /models                  ← user + eventType query modules (legacy MEN-stack naming; SQL, not ORM)
  /utils                   ← pure helpers, no I/O (geo.js)
  /docs                    ← schema-guide.json-style schema dump
  /db/TODO.md              ← schema reconciliation backlog

/client                    ← Expo SDK 56, TypeScript
  /src/app                 ← expo-router routes; thin re-exports of /src/pages screens
  /src/pages               ← screen components (one file per screen)
  /src/components          ← shared UI; domain subfolders (events/, calendar/, star-map/)
  /src/utilities           ← API clients (one per server route group) + users/location services
  /src/lib                 ← ⚠️ legacy second API layer — freeze; do not add to it
  /src/hooks               ← shared hooks (use-calendar-events, use-theme, use-color-scheme)
  /src/constants           ← tokens.ts — single design-token source (Palette/Radius/Spacing/Breakpoints/Fonts/alpha)
  /src/global.css          ← web font CSS variables only (colors live in tokens.ts)
  /docs                    ← STYLING.md (NativeWind plan), CSS-TO-TAILWIND.md
```

### What Goes Where

| Type of code | Location |
|---|---|
| New API endpoint | `server/routes/api/{domain}.js`, mounted in `server.js` |
| Business logic / external API call | `server/services/{domain}Service.js` |
| SQL query | `server/db/queries/{domain}.js` — never inline in routes/services |
| Cache TTL | `server/middleware/cache.js` `TTL_MINUTES` — never a magic number |
| Pure helper (math, formatting) | `server/utils/{name}.js` |
| New screen | `client/src/pages/{name}-screen.tsx` + thin route file in `src/app/` |
| Shared UI component | `client/src/components/{domain}/{name}.tsx` |
| Client API call | `client/src/utilities/{domain}-api.ts` using `send-request.ts` |
| Color / spacing / radius value | `client/src/constants/tokens.ts` |

---

## General Rules

### Naming
- Server files: `camelCase.js` (`launchService.js`, `userEvents.js`)
- Client files: `kebab-case.tsx` / `kebab-case.ts` (`event-card.tsx`, `users-service.ts`)
- Functions and variables: `camelCase`; components/types: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Database columns: `snake_case` (`user_id`, `f_name`, `cached_at`); API JSON mirrors DB naming
- Query params: `snake_case` (`from_date`, `radius_miles`, `light_pollution`)

### Modules
- **Server is CommonJS** — `require`/`module.exports`, with a `module.exports = { fn, fn }` block at the top of the file and named function declarations below.
- **Client is ESM TypeScript** — named exports for utilities/components; default export only for screens and `send-request`.
- Client imports use the `@/` alias (maps to `client/src/`).

### Functions
- One function does one thing; name it after what it returns or does
- JSDoc on exported server functions (see `db/queries/*` for the house style)
- Keep route handlers thin: parse/validate input, call service, shape response

### Error Handling
- Server route handlers wrap everything in try/catch and respond `res.status(error.status || 500).json({ error: error.message, status })`
- Input validation errors: create an `Error` with `error.status = 400` and throw (see `requiredCoordinate` in the route files)
- Log errors with route context: `console.error("GET /api/users/me failed:", err)`
- Client: `send-request.ts` throws an `Error` with the server's message; screens catch and render a friendly state — never let a fetch reject unhandled

### Data & Caching Rules
- All SQL is parameterized (`$1, $2`) — never string-interpolate values into queries
- Cache-through pattern is mandatory for external data: check cached rows + `isCacheStale(cachedAt, TTL_MINUTES.X)` before hitting an external API
- Upserts are conflict-safe: `ON CONFLICT ... DO UPDATE/NOTHING` against the unique constraints listed in `server/docs/schema-guide.md`
- Multi-statement writes use a client from the pool with `BEGIN/COMMIT/ROLLBACK` (see `eventType.replaceForUser`)
- Schema changes go through `server/db/TODO.md` first — the Supabase schema is the source of truth

### Styling Rules (current state — pre-NativeWind)
- `StyleSheet.create` at the bottom of the file + values from `Palette`/`Radius`/`Spacing` in `constants/tokens.ts`
- **No hardcoded hex, rgba, spacing, or radius numbers in components.** If a value isn't a token, add it to `tokens.ts` first. Translucency = `alpha(Palette.x, opacity)`, never a raw `rgba(...)` string
- Responsive widths compare against `Breakpoints` from `tokens.ts`, via `useWindowDimensions()` (not module-scope `Dimensions.get`)
- The app is a single fixed dark theme — there is no light/dark switching; `ThemedText`/`ThemedView` render Palette colors directly
- Platform-specific UI uses paired files: `foo.tsx` (native/shared) + `foo.web.tsx` (web). CSS Modules (`*.module.css`) are allowed **only** inside `*.web.tsx` web-only chrome
- The NativeWind migration is **deferred by decision (2026-07-18)** — do not install it or use `className` styling on shared components until the user calls for it (plan lives in `client/docs/STYLING.md`)

### No Magic Numbers or Strings
```js
// ❌ Bad
if (ageMs > 24 * 60 * 60 * 1000) { ... }

// ✅ Good
const { isCacheStale, TTL_MINUTES } = require("../middleware/cache");
if (isCacheStale(row.cached_at, TTL_MINUTES.LAUNCHES)) { ... }
```

---

## Client API Modules

- Base URL always comes from `process.env.EXPO_PUBLIC_API_URL` — never hardcode a host
- Authenticated calls go through `send-request.ts` (it attaches the Bearer token); don't hand-roll `fetch` with auth headers
- Export TypeScript interfaces for response shapes next to the fetch function
- Support `AbortSignal` on fetches used by screens that unmount (pattern already in `lib/events-api.ts`)

---

## What Not To Do

- ❌ Don't add functions to `client/src/lib/` — that layer is frozen pending merge into `utilities/`
- ❌ Don't write SQL outside `server/db/queries/` (or the two `models/` files)
- ❌ Don't hardcode hex colors, rgba strings, spacing, or radii in components — tokens only
- ❌ Don't add a new npm package without checking native/Expo APIs and existing deps first
- ❌ Don't trust identifiers from the request body — derive the acting user from `req.user` (JWT)
- ❌ Don't put screen logic in `src/app/` route files — they are thin re-exports of `src/pages/` (⚠️ `app/events.tsx` currently violates this; don't copy it)
- ❌ Don't use `console.log` for permanent logging — labeled `console.error` for errors; remove debug logs before committing
- ❌ Don't create multiple ways to do the same thing across sessions
