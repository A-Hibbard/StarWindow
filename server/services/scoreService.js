// Viewing-score service.
//
// calculateViewingScore() is the pure math (cloud cover + ground visibility +
// light pollution -> 0-100). getViewingScore() is the convenience wrapper the
// /api/score route uses: it pulls live weather for a coordinate so callers only
// need lat/lon, while still allowing manual clouds_pct / visibility_m overrides.

const weatherService = require("./weatherService");

/**
 * @param {number} clouds_pct - cloud cover percentage, 0-100.
 * @param {number} visibility_m - ground visibility in metres (OpenWeather caps ~10000).
 * @param {number} lightPollutionLevel - Bortle-like scale 0 (pristine) .. 9 (inner city).
 * @returns {number} integer score 0-100.
 */
function calculateViewingScore(clouds_pct, visibility_m, lightPollutionLevel) {
  const weatherScore = (1 - clouds_pct / 100) * 50;
  const visibilityScore = Math.min(visibility_m / 10000, 1) * 30;
  const pollutionScore = (1 - lightPollutionLevel / 9) * 20;

  return Math.round(weatherScore + visibilityScore + pollutionScore);
}

/**
 * Compute a viewing score for a location, fetching weather when the cloud/
 * visibility inputs aren't supplied directly.
 * @param {object} opts
 * @param {number} opts.lat
 * @param {number} opts.lon
 * @param {number} [opts.lightPollutionLevel=5]
 * @param {number} [opts.cloudsPct]   - override; skips the weather fetch if both overrides given.
 * @param {number} [opts.visibilityM] - override.
 * @param {string} [opts.units="imperial"]
 * @returns {Promise<object>} { viewing_score, inputs, weather }
 */
async function getViewingScore({ lat, lon, lightPollutionLevel = 5, cloudsPct, visibilityM, units = "imperial" }) {
  let clouds_pct = cloudsPct;
  let visibility_m = visibilityM;
  let weather = null;

  // Only hit the weather API if we're missing an input.
  if (clouds_pct == null || visibility_m == null) {
    weather = await weatherService.getWeather({ lat, lon, units });
    if (clouds_pct == null) clouds_pct = weather.clouds_pct;
    if (visibility_m == null) visibility_m = weather.visibility_m;
  }

  // Fallbacks if a source omitted a field: no cloud data => assume overcast (0 pts),
  // no visibility => assume 0.
  const viewing_score = calculateViewingScore(
    Number(clouds_pct ?? 100),
    Number(visibility_m ?? 0),
    Number(lightPollutionLevel)
  );

  return {
    viewing_score,
    inputs: { clouds_pct, visibility_m, light_pollution_level: lightPollutionLevel },
    weather,
  };
}

module.exports = { calculateViewingScore, getViewingScore };
