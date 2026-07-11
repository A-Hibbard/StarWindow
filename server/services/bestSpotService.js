// "Best nearby stargazing spot" search.
//
// Strategy: sample a small grid of points around the user (concentric rings),
// fetch weather ONCE for the user's location (assumed constant across the
// radius — big API-call saving), then vary only light pollution per point and
// score each with calculateViewingScore. Return the highest-scoring point plus
// the user's own score.
//
// The heavy lifting is split into a PURE core (buildBestSpotResult — no I/O,
// takes weather as plain numbers) and a thin wrapper (findBestSpot) that fetches
// weather first. The pure core is what the conceptual demo/tests exercise.

const weatherService = require("./weatherService");
const { calculateViewingScore } = require("./scoreService");
const { getLightPollutionAt } = require("./lightPollutionService");
const {
  haversineMiles,
  destinationPoint,
  bearingDegrees,
  bearingToCompass,
  driveMinutes,
} = require("../utils/geo");

// Sampling shape: 4 rings at these fractions of the radius, 8 points per ring
// (every 45°), plus the center = 33 sample points total.
const RING_FRACTIONS = [0.25, 0.5, 0.75, 1.0];
const POINTS_PER_RING = 8;

// Radius slider bounds (miles) — mirrored on the frontend.
const MIN_RADIUS_MILES = 5;
const MAX_RADIUS_MILES = 100;

/**
 * Generate the sample coordinates around (lat, lon). Center first, then each
 * ring's 8 points. Pure geometry.
 * @returns {Array<{lat:number, lon:number, distance_miles:number, bearing_deg:number}>}
 */
function generateSamplePoints(lat, lon, radiusMiles) {
  const points = [
    { lat, lon, distance_miles: 0, bearing_deg: 0 },
  ];

  for (const frac of RING_FRACTIONS) {
    const ringDist = radiusMiles * frac;
    for (let i = 0; i < POINTS_PER_RING; i++) {
      const bearing = (360 / POINTS_PER_RING) * i; // 0,45,...,315
      const { lat: pLat, lon: pLon } = destinationPoint(lat, lon, bearing, ringDist);
      points.push({
        lat: pLat,
        lon: pLon,
        distance_miles: ringDist,
        bearing_deg: bearing,
      });
    }
  }

  return points;
}

/**
 * PURE core: score every sample point with fixed weather, return the best spot
 * and the user's (center) score. No network — light pollution is read via the
 * injected `lightPollutionAt` (defaults to the real service).
 *
 * @param {object} opts
 * @param {number} opts.lat            user latitude
 * @param {number} opts.lon            user longitude
 * @param {number} opts.radiusMiles    search radius (clamped 5–100)
 * @param {number} opts.cloudsPct      cloud cover 0–100 (constant across radius)
 * @param {number} opts.visibilityM    ground visibility, metres (constant)
 * @param {(lat:number, lon:number)=>Promise<number>} [opts.lightPollutionAt]
 * @returns {Promise<{best_spot:object, user_score:number, sampled:number, radius_miles:number}>}
 */
async function buildBestSpotResult({
  lat,
  lon,
  radiusMiles,
  cloudsPct,
  visibilityM,
  lightPollutionAt = getLightPollutionAt,
}) {
  const radius = clampRadius(radiusMiles);
  const points = generateSamplePoints(lat, lon, radius);

  // Light pollution is the only per-point variable; resolve all in parallel.
  const levels = await Promise.all(points.map((p) => lightPollutionAt(p.lat, p.lon)));

  let best = null; // highest-scoring sample
  let userScore = null; // score at the center (index 0)

  points.forEach((p, i) => {
    const lightLevel = levels[i];
    const score = calculateViewingScore(cloudsPct, visibilityM, lightLevel);
    if (i === 0) userScore = score;
    if (!best || score > best.score) {
      best = { ...p, score, light_pollution_level: lightLevel };
    }
  });

  // Recompute distance/bearing of the winner from the user's exact location
  // (ring geometry is approximate; this is the honest straight-line figure).
  const distance = haversineMiles(lat, lon, best.lat, best.lon);
  const bearing = bearingDegrees(lat, lon, best.lat, best.lon);

  return {
    radius_miles: radius,
    sampled: points.length,
    user_score: userScore,
    best_spot: {
      lat: round(best.lat, 5),
      lon: round(best.lon, 5),
      score: best.score,
      distance_miles: round(distance, 1),
      bearing: bearingToCompass(bearing),
      bearing_deg: Math.round(bearing),
      drive_minutes: driveMinutes(distance),
      light_pollution_level: best.light_pollution_level,
    },
  };
}

/**
 * Wrapper used by the route: fetch weather once for the user's location, then
 * delegate to the pure core.
 * @param {object} opts
 * @param {number} opts.lat
 * @param {number} opts.lon
 * @param {number} opts.radiusMiles
 * @param {string} [opts.units="imperial"]
 */
async function findBestSpot({ lat, lon, radiusMiles, units = "imperial" }) {
  // ONE weather fetch for the whole radius (see file header rationale).
  const weather = await weatherService.getWeather({ lat, lon, units });

  const result = await buildBestSpotResult({
    lat,
    lon,
    radiusMiles,
    // Same defensive fallbacks scoreService uses: no clouds data => overcast,
    // no visibility => 0.
    cloudsPct: Number(weather.clouds_pct ?? 100),
    visibilityM: Number(weather.visibility_m ?? 0),
  });

  return {
    ...result,
    weather: {
      clouds_pct: weather.clouds_pct,
      visibility_m: weather.visibility_m,
      conditions: weather.conditions,
    },
  };
}

function clampRadius(miles) {
  const n = Number(miles);
  if (!Number.isFinite(n)) return MIN_RADIUS_MILES;
  return Math.max(MIN_RADIUS_MILES, Math.min(MAX_RADIUS_MILES, n));
}

function round(n, dp) {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

module.exports = {
  findBestSpot,
  buildBestSpotResult,
  generateSamplePoints,
  MIN_RADIUS_MILES,
  MAX_RADIUS_MILES,
};
