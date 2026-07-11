// Astronomy service: cache-check -> fetch AstronomyAPI -> transform -> save -> return.
//
// Transforms the AstronomyAPI /bodies/positions response into rows matching
// body_positions (+ upserts into celestial_bodies / constellations via the query
// layer). All positions are cached; only those above the horizon (altitude > 0)
// are returned to the frontend.

const bodyQueries = require("../db/queries/bodies");
const locationQueries = require("../db/queries/locations");
const { isCacheStale, TTL_MINUTES } = require("../middleware/cache");

const authString = Buffer.from(
  `${process.env.Astronomy_API_ID}:${process.env.Astronomy_API_Secret}`
).toString("base64");

const ASTRONOMY_BASE = "https://api.astronomyapi.com/api/v2";

/**
 * Get celestial body positions for a coordinate + date window.
 * @param {object} opts
 * @param {number} opts.latitude
 * @param {number} opts.longitude
 * @param {number} [opts.elevation=0]
 * @param {string} [opts.fromDate] - YYYY-MM-DD (defaults to today)
 * @param {string} [opts.toDate]   - YYYY-MM-DD (defaults to today + 7 days)
 * @param {string} [opts.time="22:00:00"]
 * @returns {Promise<object>} { location_id, count, results } (results = above horizon)
 */
async function getBodyPositions({
  latitude,
  longitude,
  elevation = 0,
  fromDate,
  toDate,
  time = "22:00:00",
}) {
  // Resolve (or create) the location row these positions belong to.
  const location = await locationQueries.findOrCreateLocation({
    lat: Number(latitude),
    long: Number(longitude),
  });

  // 1) Cache check — reuse if the newest cached batch is still fresh.
  const cachedRows = await bodyQueries.getCachedBodyPositions(location.location_id);
  if (cachedRows.length > 0 && !isCacheStale(cachedRows[0].cached_at, TTL_MINUTES.BODY_POSITIONS)) {
    console.log("\n=== BODY POSITIONS (cache hit) ===");
    return {
      location_id: location.location_id,
      count: cachedRows.length,
      results: cachedRows
        .filter((r) => Number(r.altitude_degrees) > 0)
        .map(transformCachedRow),
    };
  }

  // 2) Fetch live from AstronomyAPI.
  const today = new Date().toISOString().slice(0, 10);
  const weekOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const params = new URLSearchParams({
    latitude,
    longitude,
    elevation,
    from_date: fromDate || today,
    to_date: toDate || weekOut,
    time,
    output: "rows",
  });

  const response = await fetch(`${ASTRONOMY_BASE}/bodies/positions?${params}`, {
    headers: { Authorization: `Basic ${authString}` },
  });

  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));

  if (!response.ok) {
    const err = new Error(
      data?.errors?.[0]?.message || `AstronomyAPI returned ${response.status}`
    );
    err.status = response.status;
    throw err;
  }

  // 3) Transform the nested table.rows -> flat normalized rows for the DB.
  const normalized = transformBodiesResponse(data, location.location_id);

  // 4) Cache ALL positions (above and below horizon) with one cached_at.
  if (normalized.length > 0) {
    await bodyQueries.saveBodyPositions(normalized, new Date());
  }

  // 5) Return only bodies above the horizon to the frontend.
  const visible = normalized
    .filter((r) => Number(r.altitudeDegrees) > 0)
    .map((r) => ({
      body: r.bodyName,
      observed_date: r.observedDate,
      altitude_degrees: r.altitudeDegrees,
      azimuth_degrees: r.azimuthDegrees,
      distance_from_earth_km: r.distanceFromEarthKm,
      right_ascension: r.rightAscension,
      declination: r.declination,
      constellation: r.constellationFull || r.constellationShort,
      magnitude: r.magnitude,
      elongation: r.elongation,
    }));

  return { location_id: location.location_id, count: visible.length, results: visible };
}

// Flatten AstronomyAPI rows -> the normalized shape saveBodyPositions() expects.
function transformBodiesResponse(data, locationId) {
  const rows = data?.data?.table?.rows || [];
  const out = [];

  for (const row of rows) {
    const bodyName = row.entry?.name;
    for (const cell of row.cells || []) {
      const pos = cell.position || {};
      const horizontal = pos.horizontal || {};
      const equatorial = pos.equatorial || {};
      const constellation = pos.constellation || {};

      out.push({
        bodyName,
        constellationShort: constellation.short || null,
        constellationFull: constellation.name || null,
        locationId,
        observedDate: cell.date,
        altitudeDegrees: toNum(horizontal.altitude?.degrees),
        azimuthDegrees: toNum(horizontal.azimuth?.degrees),
        distanceFromEarthKm: toNum(cell.distance?.fromEarth?.km),
        rightAscension: toNum(equatorial.rightAscension?.hours),
        declination: toNum(equatorial.declination?.degrees),
        magnitude: toNum(cell.extraInfo?.magnitude),
        elongation: toNum(cell.extraInfo?.elongation),
      });
    }
  }
  return out;
}

// Map a cached DB row back to the frontend shape.
function transformCachedRow(r) {
  return {
    body: r.body_name,
    observed_date: r.observed_date,
    altitude_degrees: r.altitude_degrees,
    azimuth_degrees: r.azimuth_degrees,
    distance_from_earth_km: r.distance_from_earth_km,
    right_ascension: r.right_ascension,
    declination: r.declination,
    constellation: r.constellation_full || r.constellation_short,
    magnitude: r.magnitude,
    elongation: r.elongation,
  };
}

// AstronomyAPI returns numbers as strings; coerce, keeping null on failure.
function toNum(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

// NASA's "Dial-a-Moon" — a rendered Moon image plus phase/age for a given instant.
// Used by the dashboard hero. Fetched server-side (here) instead of from the
// browser so it isn't blocked by CORS (the browser call threw "Failed to fetch").
const DIALAMOON_BASE = "https://svs.gsfc.nasa.gov/api/dialamoon";

/**
 * Proxy NASA's Dial-a-Moon for the given instant and return just the fields the
 * dashboard needs. No DB caching — dialamoon is keyless and cheap, and the
 * moon_phases table models AstronomyAPI's phase data, not these renders.
 * @param {string} [datetime] - "YYYY-MM-DDTHH:mm"; defaults to now (UTC).
 * @returns {Promise<{datetime:string, image_url:string|null, phase:number|null, age:number|null}>}
 */
async function getMoonView(datetime) {
  // dialamoon wants minute precision: YYYY-MM-DDTHH:mm
  const iso = (datetime || new Date().toISOString()).slice(0, 16);

  const response = await fetch(`${DIALAMOON_BASE}/${iso}`);
  if (!response.ok) {
    const err = new Error(`Dial-a-Moon returned ${response.status}`);
    err.status = response.status;
    throw err;
  }

  const data = await response.json();
  return {
    datetime: iso,
    image_url: data.image?.url || null,
    phase: data.phase ?? null, // percent illuminated
    age: data.age ?? null, // days since new moon
  };
}

// TODO (FEATURE GAP): moon phases. The schema has moon_phases and db/queries/bodies.js
// exposes getCachedMoonPhase/saveMoonPhase, but the original route never fetched
// them. AstronomyAPI serves moon phase from POST /studio/moon-phase (a separate
// endpoint). Add a getMoonPhase() here when you want to populate that table.

module.exports = { getBodyPositions, getMoonView };
