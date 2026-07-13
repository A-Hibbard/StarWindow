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
const NASA_SVS_BASE = "https://svs.gsfc.nasa.gov/api/dialamoon";
const NASA_IMAGES_BASE = "https://images-api.nasa.gov";
const NASA_REQUEST_TIMEOUT_MS = 8000;
const NASA_IMAGES_REQUEST_TIMEOUT_MS = 5000;
const BODY_IMAGE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const SYNODIC_MONTH_DAYS = 29.530588853;
const KNOWN_NEW_MOON_UTC = Date.UTC(2000, 0, 6, 18, 14);
const bodyImageCache = new Map();
const BODY_IMAGE_QUERIES = {
  mercury: "Mercury MESSENGER global view",
  venus: "Venus PIA00104",
  mars: "Mars global color view",
  jupiter: "Jupiter Hubble portrait",
  saturn: "Saturn Cassini portrait",
  uranus: "Uranus Voyager 2 planet",
  neptune: "Neptune Voyager 2 planet",
  pluto: "Pluto dwarf planet NASA",
  moon: "Moon full disk NASA",
  sun: "Sun SDO full disk",
};
const BAD_BODY_IMAGE_TERMS = [
  "comparison",
  "diagram",
  "frame mosaic",
  "map",
  "montage",
  "mosaic",
  "portrait - views",
  "solar system portrait",
  "views of",
  "left and right",
];

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
  const cachedRows = await bodyQueries.getCachedBodyPositions(location.location_id, {
    fromDate,
    toDate,
  });
  if (
    cachedRows.length > 0 &&
    !isCacheStale(cachedRows[0].cached_at, TTL_MINUTES.BODY_POSITIONS) &&
    hasRequestedDateCoverage(cachedRows, fromDate, toDate)
  ) {
    console.log("\n=== BODY POSITIONS (cache hit) ===");
    const results = cachedRows
      .filter((r) => Number(r.altitude_degrees) > 0)
      .map(transformCachedRow);

    return {
      location_id: location.location_id,
      count: results.length,
      results: await enrichVisibleBodiesWithImages(results),
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

  return {
    location_id: location.location_id,
    count: visible.length,
    results: await enrichVisibleBodiesWithImages(visible),
  };
}

/**
 * Get moon phase for a coordinate/date. The phase itself is effectively global,
 * but it is cached by location because the existing schema keys moon_phases by
 * location_id + phase_date.
 * @param {object} opts
 * @param {number} opts.latitude
 * @param {number} opts.longitude
 * @param {string} [opts.date] - YYYY-MM-DD or ISO datetime. Defaults to now.
 */
async function getMoonPhase({ latitude, longitude, date } = {}) {
  const when = date ? new Date(date) : new Date();
  if (Number.isNaN(when.getTime())) {
    const err = new Error("Invalid date");
    err.status = 400;
    throw err;
  }

  const phaseDate = toDateKey(when);

  try {
    const location = await locationQueries.findOrCreateLocation({
      lat: Number(latitude),
      long: Number(longitude),
    });

    const cached = await bodyQueries.getCachedMoonPhase(location.location_id, phaseDate);
    if (cached && !isCacheStale(cached.cached_at, TTL_MINUTES.MOON_PHASES)) {
      console.log("\n=== MOON PHASE (cache hit) ===");
      const cachedMoon = transformMoonPhaseRow(cached);
      if (cachedMoon.image_url && cachedMoon.phase_angle !== null) return cachedMoon;

      const moon = transformMoonPhaseData(await getMoonPhaseData(when), phaseDate, when);
      if (!moon.image_url && moon.phase_angle === null) return cachedMoon;

      const saved = await bodyQueries.saveMoonPhase({
        locationId: location.location_id,
        phaseDate,
        phaseString: moon.phase_string || cachedMoon.phase_string,
        phaseFraction: moon.phase_fraction ?? cachedMoon.phase_fraction,
        phaseAngle: moon.phase_angle ?? cachedMoon.phase_angle,
        imageUrl: moon.image_url || cachedMoon.image_url,
      });

      return {
        ...transformMoonPhaseRow(saved),
        age_days: moon.age_days,
      };
    }

    const moon = transformMoonPhaseData(await getMoonPhaseData(when), phaseDate, when);
    const saved = await bodyQueries.saveMoonPhase({
      locationId: location.location_id,
      phaseDate,
      phaseString: moon.phase_string,
      phaseFraction: moon.phase_fraction,
      phaseAngle: moon.phase_angle,
      imageUrl: moon.image_url,
    });

    return {
      ...transformMoonPhaseRow(saved),
      age_days: moon.age_days,
      image_url: moon.image_url,
    };
  } catch (error) {
    console.warn("Moon phase cache unavailable; returning uncached phase:", error.message);
    return transformMoonPhaseData(await getMoonPhaseData(when), phaseDate, when);
  }
}

async function getMoonPhaseData(when) {
  return fetchMoonPhaseFromNasa(when).catch((error) => {
    console.warn("NASA moon phase fetch failed; using approximate phase:", error.message);
    return getApproxMoonPhase(when);
  });
}

async function fetchMoonPhaseFromNasa(when) {
  const isoMinute = when.toISOString().slice(0, 16);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NASA_REQUEST_TIMEOUT_MS);

  let response;
  let data;
  try {
    response = await fetch(`${NASA_SVS_BASE}/${isoMinute}`, {
      signal: controller.signal,
    });
    data = await response.json();
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const err = new Error(data?.detail || `NASA SVS returned ${response.status}`);
    err.status = response.status;
    throw err;
  }

  return data;
}

function getApproxMoonPhase(when) {
  const age = getMoonAge(when);
  const phase = ((1 - Math.cos((2 * Math.PI * age) / SYNODIC_MONTH_DAYS)) / 2) * 100;

  return {
    age,
    phase,
    angle: (age / SYNODIC_MONTH_DAYS) * 360,
    image: null,
  };
}

// Flatten AstronomyAPI rows -> the normalized shape saveBodyPositions() expects.
function transformBodiesResponse(data, locationId) {
  if (Array.isArray(data?.data?.rows)) {
    return transformRowsOutput(data.data.rows, locationId);
  }

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

function transformRowsOutput(rows, locationId) {
  const out = [];

  for (const row of rows) {
    const bodyName = row.body?.name || row.entry?.name;

    for (const positionRow of row.positions || []) {
      const pos = positionRow.position || {};
      const horizontal = pos.horizontal || pos.horizonal || {};
      const equatorial = pos.equatorial || {};
      const constellation = pos.constellation || {};

      out.push({
        bodyName: positionRow.name || bodyName,
        constellationShort: constellation.short || null,
        constellationFull: constellation.name || null,
        locationId,
        observedDate: positionRow.date,
        altitudeDegrees: toNum(horizontal.altitude?.degrees),
        azimuthDegrees: toNum(horizontal.azimuth?.degrees),
        distanceFromEarthKm: toNum(positionRow.distance?.fromEarth?.km),
        rightAscension: toNum(equatorial.rightAscension?.hours),
        declination: toNum(equatorial.declination?.degrees),
        magnitude: toNum(positionRow.extraInfo?.magnitude),
        elongation: toNum(positionRow.extraInfo?.elongation),
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

function transformMoonPhaseRow(row) {
  const phaseFraction = toNum(row.phase_fraction);
  const phaseAngle = toNum(row.phase_angle);
  return {
    moon_phase_id: row.moon_phase_id,
    location_id: row.location_id,
    phase_date: toDateKey(row.phase_date),
    phase_string: row.phase_string,
    phase_fraction: phaseFraction,
    phase_percent: phaseFraction == null ? null : Math.round(phaseFraction * 100),
    phase_angle: phaseAngle,
    phase_trend: getMoonTrendFromAngle(phaseAngle),
    cached_at: row.cached_at,
    image_url: row.image_url || null,
  };
}

function transformMoonPhaseData(data, phaseDate, when) {
  const phasePercent = toNum(data.phase);
  const age = toNum(data.age) ?? getMoonAge(when);
  const phaseFraction = phasePercent == null ? null : phasePercent / 100;
  const phaseAngle = getPhaseAngle(data, age);

  return {
    moon_phase_id: null,
    location_id: null,
    phase_date: phaseDate,
    phase_string: getMoonPhaseName(age),
    phase_fraction: phaseFraction,
    phase_percent: phasePercent == null ? null : Math.round(phasePercent),
    phase_angle: phaseAngle,
    phase_trend: getMoonTrendFromAge(age),
    cached_at: null,
    age_days: age,
    image_url: data.image?.url || null,
  };
}

async function enrichVisibleBodiesWithImages(bodies) {
  if (!Array.isArray(bodies) || bodies.length === 0) return bodies;

  const uniqueBodyNames = [...new Set(bodies.map((body) => body.body).filter(Boolean))];
  const imageEntries = await Promise.all(
    uniqueBodyNames.map(async (bodyName) => [bodyName, await getBodyImageUrl(bodyName)])
  );
  const imageUrlByBody = new Map(imageEntries);

  return bodies.map((body) => ({
    ...body,
    image_url: imageUrlByBody.get(body.body) || null,
    image_source: imageUrlByBody.get(body.body) ? "NASA Images" : null,
  }));
}

async function getBodyImageUrl(bodyName) {
  const query = getBodyImageQuery(bodyName);
  if (!query) return null;

  const cacheKey = normalizeBodyName(bodyName);
  const cached = bodyImageCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < BODY_IMAGE_CACHE_TTL_MS) {
    return cached.imageUrl;
  }

  const imageUrl = await fetchBodyImageFromNasa(query, bodyName).catch((error) => {
    console.warn(`NASA body image fetch failed for ${bodyName}:`, error.message);
    return null;
  });

  bodyImageCache.set(cacheKey, {
    imageUrl,
    cachedAt: Date.now(),
  });
  return imageUrl;
}

function getBodyImageQuery(bodyName) {
  const key = normalizeBodyName(bodyName);
  return BODY_IMAGE_QUERIES[key] || null;
}

async function fetchBodyImageFromNasa(query, bodyName) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NASA_IMAGES_REQUEST_TIMEOUT_MS);

  let response;
  let data;
  try {
    const params = new URLSearchParams({
      q: query,
      media_type: "image",
      page_size: "10",
    });
    response = await fetch(`${NASA_IMAGES_BASE}/search?${params}`, {
      signal: controller.signal,
    });
    data = await response.json();
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const err = new Error(`NASA Images returned ${response.status}`);
    err.status = response.status;
    throw err;
  }

  return pickBestBodyImage(data?.collection?.items || [], bodyName);
}

function pickBestBodyImage(items, bodyName) {
  const normalizedBody = normalizeBodyName(bodyName);
  const candidates = items
    .map((item) => {
      const imageUrl = item.links?.find((link) => link.render === "image")?.href || item.links?.[0]?.href || null;
      if (!imageUrl) return null;

      const data = item.data?.[0] || {};
      const searchable = [
        data.title,
        data.description,
        ...(Array.isArray(data.keywords) ? data.keywords : []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const title = String(data.title || "").toLowerCase();
      const hasBodyMatch = searchable.includes(normalizedBody);
      const hasBadTerm = BAD_BODY_IMAGE_TERMS.some((term) => searchable.includes(term));
      if (!hasBodyMatch || hasBadTerm) return null;

      const score =
        (title.includes(normalizedBody) ? 8 : 0) +
        (searchable.includes("global") ? 3 : 0) +
        (searchable.includes("full disk") ? 3 : 0) +
        (searchable.includes("planet") ? 2 : 0) +
        (searchable.includes("hubble") ? 1 : 0) +
        (searchable.includes("voyager") ? 1 : 0) +
        (searchable.includes("cassini") ? 1 : 0);

      return { imageUrl, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.imageUrl || null;
}

function getPhaseAngle(data, age) {
  const explicitAngle = toNum(data.angle ?? data.phase_angle ?? data.phaseAngle);
  if (explicitAngle !== null) return normalizeAngle(explicitAngle);
  if (age === null) return null;
  return normalizeAngle((age / SYNODIC_MONTH_DAYS) * 360);
}

function getMoonAge(when) {
  const daysSinceKnownNewMoon = (when.getTime() - KNOWN_NEW_MOON_UTC) / 86400000;
  return modulo(daysSinceKnownNewMoon, SYNODIC_MONTH_DAYS);
}

function getMoonTrendFromAge(age) {
  if (age === null) return null;
  return age < SYNODIC_MONTH_DAYS / 2 ? "Growing" : "Shrinking";
}

function getMoonTrendFromAngle(angle) {
  if (angle === null) return null;
  return normalizeAngle(angle) < 180 ? "Growing" : "Shrinking";
}

function getMoonPhaseName(age) {
  if (age == null) return "Moon Phase";
  if (age < 1.84) return "New Moon";
  if (age < 5.53) return "Waxing Crescent";
  if (age < 9.22) return "First Quarter";
  if (age < 12.91) return "Waxing Gibbous";
  if (age < 16.61) return "Full Moon";
  if (age < 20.3) return "Waning Gibbous";
  if (age < 23.99) return "Third Quarter";
  if (age < 27.68) return "Waning Crescent";
  return "New Moon";
}

function hasRequestedDateCoverage(rows, fromDate, toDate) {
  if (!fromDate || !toDate) return true;

  const expectedDates = getDateKeysInRange(fromDate, toDate);
  if (expectedDates.length === 0) return true;

  const cachedDates = new Set(rows.map((row) => toDateKey(row.observed_date)).filter(Boolean));
  return expectedDates.every((date) => cachedDates.has(date));
}

function getDateKeysInRange(fromDate, toDate) {
  const start = parseDateOnly(fromDate);
  const end = parseDateOnly(toDate);
  if (!start || !end || start > end) return [];

  const dates = [];
  for (let date = start; date <= end; date = addDays(date, 1)) {
    dates.push(toDateKey(date));
  }
  return dates;
}

function parseDateOnly(value) {
  if (!value) return null;
  const [datePart] = String(value).split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toDateKey(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

// AstronomyAPI returns numbers as strings; coerce, keeping null on failure.
function toNum(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function normalizeAngle(value) {
  return modulo(value, 360);
}

function normalizeBodyName(value) {
  return String(value || "").trim().toLowerCase();
}

function modulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

module.exports = { getBodyPositions, getMoonPhase };
