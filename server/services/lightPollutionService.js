// ============================================================================
//  ⚠️  KEY DEPENDENCY TO VERIFY — light pollution at arbitrary coordinates
// ============================================================================
//
// getLightPollutionAt(lat, lon) returns a Bortle-like level 0 (pristine dark
// sky) .. 9 (inner-city), which feeds scoreService.calculateViewingScore().
//
// The RIGHT source is VIIRS VNL (Visible Infrared Imaging Radiometer Suite,
// nighttime-lights) radiance. Reading it server-side is NOT plug-and-play:
//
//   Option A — raw raster (most accurate):
//     Download the annual VIIRS VNL GeoTIFF (global, ~a few GB) from NOAA/EOG
//     (https://eogdata.mines.edu/products/vnl/). Sample the pixel at (lat, lon)
//     with a raster lib — e.g. `geotiff` (pure JS) or `gdal-async` (native).
//     Then map radiance (nW/cm²/sr) → Bortle via a calibration curve.
//     Cost: the GeoTIFF is large; native GDAL needs build tooling on Windows.
//
//   Option B — pre-rendered tiles (what the FRONTEND already uses):
//     The map overlays David Lorenz's tiles
//     (djlorenz.github.io/astronomy/image_tiles/...). We *could* fetch the tile
//     covering (lat, lon) server-side and read the pixel color, but that's a
//     lossy round-trip (color→brightness) and rate-limited.
//
//   Option C — a lookup API (simplest, if one fits the budget):
//     e.g. lightpollutionmap.info / a self-hosted tile pixel service.
//
// >>> Until one of the above is wired up, the ACTIVE implementation below is a
//     HEURISTIC FALLBACK: a city-glow model where darkness increases with
//     distance from major cities. It is good enough to demo and to make the
//     "best nearby spot" search move you away from cities, but the absolute
//     numbers are NOT real measurements. Replace `fallbackCityGlowLevel` with a
//     real VIIRS read before trusting the scores. <<<
//
// ============================================================================

const { haversineMiles } = require("../utils/geo");

// Set to true once a real VIIRS/raster/API path (readViirsLevel) is implemented
// and verified in your environment. While false, we use the fallback.
const VIIRS_ENABLED = false;

/**
 * Light pollution level at a coordinate, 0 (darkest) .. 9 (brightest).
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<number>}
 */
async function getLightPollutionAt(lat, lon) {
  if (VIIRS_ENABLED) {
    try {
      const level = await readViirsLevel(lat, lon);
      if (Number.isFinite(level)) return clampLevel(level);
    } catch (err) {
      // Never let a raster/API hiccup break the whole best-spot search — fall
      // back to the heuristic and log it.
      console.warn("VIIRS lookup failed, using city-glow fallback:", err.message);
    }
  }
  return fallbackCityGlowLevel(lat, lon);
}

/**
 * TODO(VIIRS): implement a real read here and flip VIIRS_ENABLED to true.
 * Expected to return a Bortle-like 0..9 (or radiance you then calibrate).
 * See Options A/B/C in the header. Left unimplemented on purpose so it's an
 * explicit, greppable TODO rather than a silent stub.
 */
async function readViirsLevel(/* lat, lon */) {
  throw new Error("readViirsLevel not implemented — see TODO(VIIRS) in lightPollutionService.js");
}

// ---------------------------------------------------------------------------
// Fallback heuristic: superposed city glow (inverse-square-ish falloff).
//
// Each city contributes brightness ∝ weight / (1 + (d/scale)²). Summing across
// nearby cities gives a smooth field that's bright in/near metros and fades to
// dark in the countryside. We then map total brightness → 0..9. Purely a
// stand-in; farther from cities = darker, which is the property the search
// needs. NOT a measurement.
// ---------------------------------------------------------------------------

// A small set of major US cities: [name, lat, lon, weight ~ log10(population)].
// Extend/replace freely — this only shapes the fallback field.
const MAJOR_CITIES = [
  ["New York", 40.7128, -74.006, 7.3],
  ["Los Angeles", 34.0522, -118.2437, 7.0],
  ["Chicago", 41.8781, -87.6298, 6.9],
  ["Houston", 29.7604, -95.3698, 6.8],
  ["Phoenix", 33.4484, -112.074, 6.7],
  ["Philadelphia", 39.9526, -75.1652, 6.7],
  ["San Antonio", 29.4241, -98.4936, 6.6],
  ["San Diego", 32.7157, -117.1611, 6.6],
  ["Dallas", 32.7767, -96.797, 6.6],
  ["San Jose", 37.3382, -121.8863, 6.5],
  ["Austin", 30.2672, -97.7431, 6.5],
  ["Columbus", 39.9612, -82.9988, 6.4],
  ["Indianapolis", 39.7684, -86.1581, 6.3],
  ["Cincinnati", 39.1031, -84.512, 6.2],
  ["Denver", 39.7392, -104.9903, 6.4],
  ["Seattle", 47.6062, -122.3321, 6.4],
  ["Atlanta", 33.749, -84.388, 6.4],
  ["Miami", 25.7617, -80.1918, 6.4],
  ["Boston", 42.3601, -71.0589, 6.4],
  ["Minneapolis", 44.9778, -93.265, 6.3],
  ["Detroit", 42.3314, -83.0458, 6.4],
  ["Las Vegas", 36.1699, -115.1398, 6.4],
  ["Portland", 45.5152, -122.6784, 6.3],
  ["Nashville", 36.1627, -86.7816, 6.2],
  ["St. Louis", 38.627, -90.1994, 6.2],
];

// How quickly a city's glow falls off with distance (miles). Larger = its glow
// reaches farther. Roughly tuned so a ~7-weight metro still tints the sky ~40mi out.
const GLOW_SCALE_MILES = 22;

function fallbackCityGlowLevel(lat, lon) {
  let brightness = 0;
  for (const [, cLat, cLon, weight] of MAJOR_CITIES) {
    const d = haversineMiles(lat, lon, cLat, cLon);
    // Weight is log-population; convert to a linear-ish intensity before falloff.
    const intensity = Math.pow(10, weight - 6); // ~1 for a weight-6 city
    brightness += intensity / (1 + (d / GLOW_SCALE_MILES) ** 2);
  }

  // Map brightness → 0..9. log compresses the huge dynamic range between
  // "downtown" and "middle of nowhere". Constants tuned so a mid-size metro core
  // (brightness ~1.6) lands ~8, big metros clamp to 9, and deep rural ~1.5-2.
  const level = 16 * Math.log10(1 + brightness) + 1.4;
  return clampLevel(level);
}

function clampLevel(level) {
  return Math.max(0, Math.min(9, Math.round(level * 10) / 10));
}

module.exports = {
  getLightPollutionAt,
  // exported for the conceptual demo / tests:
  fallbackCityGlowLevel,
  VIIRS_ENABLED,
};
