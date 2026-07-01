# Database TODO

Reconciliation of the **actual** Postgres schema (introspected 2026-06-30) against
what the services/queries expect. Driven by the "failed to save" errors during
launch/event ingestion. Items are ordered by priority.

Run SQL against the Supabase Postgres (the same DB `config/database.js` connects to).

---

## P0 — Unblocks the current failed saves

### 0.1 `locations`: allow coordinate-less rows  ✅ DONE (lat/long now nullable)
LL2 events (eclipses, flybys, EVAs, teleconferences) have a free-text location
string but no coordinates. `locations.lat` / `locations.long` are `NOT NULL`, so
`findOrCreateLocationByName()` fails with *"null value in column lat ... violates
not-null constraint"*.

```sql
ALTER TABLE public.locations
  ALTER COLUMN lat  DROP NOT NULL,
  ALTER COLUMN long DROP NOT NULL;
```
- Affected code: `db/queries/locations.js` (`findOrCreateLocationByName`) — already
  written to insert name-only; will work once this runs.


### 0.3 `locations.name` is `NOT NULL` — coordinate-only inserts pass `name = null`
`findOrCreateLocation({lat, long})` (used by `/bodies` and `/summary`) inserts a
`null` name → will fail the same way when a *new* coordinate location is created.
No DB change needed if we go the clean route:
- Affected code: `db/queries/locations.js` — synthesize a name when none supplied,
  e.g. `name = name || `${lat}, ${long}``. (Alternative: `ALTER COLUMN name DROP NOT NULL`.)

### 0.4 `events.webcast_live` is `NOT NULL DEFAULT false` — launch insert passes `null`
`insertEvent()` sends `webcastLive ?? null`; launches have no webcast flag → `null`
violates `NOT NULL`. No DB change needed:
- Affected code: `db/queries/events.js` `insertEvent()` — coerce to boolean:
  `data.webcastLive ?? false` instead of `?? null`.

### 0.5 `events.type_id` is `NOT NULL`
Every event must have a type. Launches pass `"Launch"` (fine). Some LL2 `/events/`
entries may have an empty `type` → would violate. No DB change needed:
- Affected code: `services/eventService.js` — fall back to a default type name
  (e.g. `"Other"`) so `upsertEventType` always yields an id.

---

## P1 — Caching correctness (TTL gates can't run without a timestamp)

### 1.1 `events`: add `updated_at`
No `cached_at`/`updated_at`, so `isCacheStale()` can't gate event refetches.
```sql
ALTER TABLE public.events
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
```
Then add an `isCacheStale(..., TTL_MINUTES.EVENTS)` check in `eventService.js`.

### 1.2 `rocket_launch`: add `updated_at`
Same gap for launches.
```sql
ALTER TABLE public.rocket_launch
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
```

### 1.3 Create a weather table  ✅ DONE (table `weather`; queries + service wired, caching live)
_Original proposal kept for reference:_
```sql
CREATE TABLE public.weather_observations (
  weather_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  location_id  BIGINT REFERENCES public.locations(location_id),
  conditions   TEXT,
  temp         NUMERIC,
  feels_like   NUMERIC,
  humidity     INT,
  pressure     INT,
  wind_speed   NUMERIC,
  clouds_pct   INT,
  visibility_m INT,
  units        TEXT,
  cached_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
Then implement `getCachedWeather`/`saveWeather` in `db/queries/weather.js`
(currently no-ops; TTL = 1h).

### 1.4 Create an ISS pass table  ✅ DONE (table `iss_passes`; queries + service wired, caching live)
_Original proposal kept for reference:_
```sql
CREATE TABLE public.iss_passes (
  iss_pass_id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  location_id          BIGINT REFERENCES public.locations(location_id),
  rise_time            TIMESTAMPTZ,
  rise_compass         TEXT,
  peak_time            TIMESTAMPTZ,
  peak_compass         TEXT,
  peak_elevation_deg   NUMERIC,
  set_time             TIMESTAMPTZ,
  set_compass          TEXT,
  duration_sec         INT,
  visible_duration_sec INT,
  visible              BOOLEAN,
  tle_epoch            TIMESTAMPTZ,
  cached_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
Then implement `getCachedPasses`/`savePasses` in `db/queries/iss.js` (TTL = 24h).

---

## P2 — Data integrity, idempotency, de-duplication

### 2.1 Add UNIQUE constraints on natural keys  ✅ DONE (added in schema-guide.md)
Present now: celestial_bodies.name, constellations.short_name/full_name,
event_types.event_type, launch_statuses.status, providers.name,
rockets(model, manufacture), pads(name, location_id), plus dedup uniques on
body_positions(body_id,location_id,observed_date), event_location(event_id,location_id),
event_bodies(event_id,body_id), moon_phases(location_id,phase_date),
rocket_launch(event_id), news_articles(url).

Code updated to be conflict-safe against these: body_positions + moon_phases now
ON CONFLICT DO UPDATE, event links ON CONFLICT DO NOTHING, pads matched on
(name, location_id). The lookup upserts still use SELECT-then-INSERT (correct, but
could be simplified to ON CONFLICT now that the constraints exist — optional).

_Original suggestion (now satisfied):_
```sql
ALTER TABLE public.event_types      ADD CONSTRAINT uq_event_types_type      UNIQUE (event_type);
ALTER TABLE public.missions         ADD CONSTRAINT uq_missions_name         UNIQUE (name);
ALTER TABLE public.rockets          ADD CONSTRAINT uq_rockets_model         UNIQUE (model);
ALTER TABLE public.providers        ADD CONSTRAINT uq_providers_name        UNIQUE (name);
ALTER TABLE public.launch_statuses  ADD CONSTRAINT uq_launch_statuses_status UNIQUE (status);
ALTER TABLE public.pads             ADD CONSTRAINT uq_pads_name             UNIQUE (name);
ALTER TABLE public.celestial_bodies ADD CONSTRAINT uq_bodies_name           UNIQUE (name);
ALTER TABLE public.constellations   ADD CONSTRAINT uq_constellations_short  UNIQUE (short_name);
```

### 2.2 Idempotent launches/events (stop duplicate inserts on every fetch)
There's no natural key from LL2, so re-fetching re-inserts new `events` +
`rocket_launch` rows. Add the LL2 UUID and upsert on it:
```sql
ALTER TABLE public.events        ADD COLUMN ll2_id TEXT UNIQUE;
ALTER TABLE public.rocket_launch ADD COLUMN ll2_id TEXT UNIQUE;
```
Then store `l.id` from the API and switch `saveLaunch`/`saveEvent` to
`ON CONFLICT (ll2_id) DO UPDATE`. Until then `launchService` de-dups by name
(weak — names can repeat across launches).

---

## Not a database issue

- **`/api/score` returning 400** is by design: it requires `clouds_pct` and
  `visibility_m` query params. For a no-arg score use **`/api/score/summary?lat=..&lon=..`**
  (it pulls live weather and computes the score), or call
  `/api/score?clouds_pct=20&visibility_m=10000&light_pollution=4`.

## Ready but unused (feature, not a blocker)
- `moon_phases` table + `getCachedMoonPhase`/`saveMoonPhase` exist, but nothing
  fetches moon phase yet (separate AstronomyAPI `/studio/moon-phase` endpoint).
