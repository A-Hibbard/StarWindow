// Queries for the weather cache.
//
// Schema: weather(weather_id PK, location_id FK, conditions, temp, feels_like,
//   humidity, pressure, wind_speed, clouds_pct, visibility_m, units,
//   cached_at NOT NULL DEFAULT now())
//
// Append-only (no unique key): each fetch inserts a new row; getCachedWeather
// reads the newest row for a location + units. CHECK constraints enforce
// humidity/clouds 0-100 and non-negative pressure/wind/visibility — the values
// from OpenWeatherMap already satisfy these.

const database = require("../../config/database");

module.exports = {
  getCachedWeather,
  saveWeather,
};

/**
 * Newest cached weather row for a location + units, joined with the location
 * name/coords. Returns null when nothing is cached.
 * @param {number} locationId
 * @param {string} units
 */
async function getCachedWeather(locationId, units) {
  if (!locationId) return null;
  const result = await database.query(
    `
      SELECT
        w.weather_id, w.location_id, w.conditions, w.temp, w.feels_like,
        w.humidity, w.pressure, w.wind_speed, w.clouds_pct, w.visibility_m,
        w.units, w.cached_at,
        l.name AS location_name, l.lat, l.long
      FROM public.weather w
      JOIN public.locations l ON l.location_id = w.location_id
      WHERE w.location_id = $1 AND w.units = $2
      ORDER BY w.cached_at DESC
      LIMIT 1
    `,
    [locationId, units]
  );
  return result.rows[0] || null;
}

/**
 * Insert a transformed weather observation.
 * @param {number} locationId
 * @param {object} data - the transformed weather object from the service.
 * @param {string} units
 * @returns {Promise<object>} the inserted row.
 */
async function saveWeather(locationId, data, units) {
  const result = await database.query(
    `
      INSERT INTO public.weather
        (location_id, conditions, temp, feels_like, humidity, pressure,
         wind_speed, clouds_pct, visibility_m, units)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING weather_id, cached_at
    `,
    [
      locationId,
      data.conditions || null,
      data.temp ?? null,
      data.feels_like ?? null,
      data.humidity ?? null,
      data.pressure ?? null,
      data.wind_speed ?? null,
      data.clouds_pct ?? null,
      data.visibility_m ?? null,
      units || null,
    ]
  );
  return result.rows[0];
}
