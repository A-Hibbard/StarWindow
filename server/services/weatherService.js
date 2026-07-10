// Weather service: cache-check -> fetch OpenWeatherMap -> transform -> save -> return.
//
// Now backed by the real `weather` table: resolves the coordinate to a locations
// row, reads the newest cached row for that location+units, and only calls
// OpenWeatherMap when the cache is missing or older than the 1h TTL. Saving is
// best-effort — a cache write failure never breaks the response.

const weatherQueries = require("../db/queries/weather");
const locationQueries = require("../db/queries/locations");
const { isCacheStale, TTL_MINUTES } = require("../middleware/cache");

const OPENWEATHER_BASE = "https://api.openweathermap.org/data/2.5";
const OPENWEATHER_GEO_BASE = "https://api.openweathermap.org/geo/1.0";
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

/**
 * Get current weather for a coordinate.
 * @param {object} opts
 * @param {number} opts.lat
 * @param {number} opts.lon
 * @param {string} [opts.units="imperial"]
 * @returns {Promise<object>} frontend-friendly weather object.
 */
async function getWeather({ lat, lon, units = "imperial" }) {
  if (!process.env.OpenWeatherMap_API_KEY) {
    const err = new Error("OpenWeatherMap_API_KEY is not set in environment");
    err.status = 500;
    throw err;
  }

  // Resolve (or create) the location this observation belongs to.
  const location = await locationQueries.findOrCreateLocation({ lat, long: lon });

  // 1) Cache check — reuse if the newest row for this location+units is fresh.
  const cached = await weatherQueries.getCachedWeather(location.location_id, units);
  if (cached && !isCacheStale(cached.cached_at, TTL_MINUTES.WEATHER)) {
    console.log("\n=== CURRENT WEATHER (cache hit) ===");
    return transformRow(cached, units);
  }

  // 2) Fetch live from OpenWeatherMap.
  const params = new URLSearchParams({
    lat,
    lon,
    units,
    appid: process.env.OpenWeatherMap_API_KEY,
  });

  const response = await fetch(`${OPENWEATHER_BASE}/weather?${params}`);
  const data = await response.json();

  if (!response.ok) {
    const err = new Error(data.message || `OpenWeather API returned ${response.status}`);
    err.status = response.status;
    throw err;
  }

  // 3) Transform raw API response into our shape.
  const weather = {
    location: data.name,
    coords: { lat: data.coord?.lat, lon: data.coord?.lon },
    conditions: data.weather?.[0]?.description,
    temp: data.main?.temp,
    feels_like: data.main?.feels_like,
    humidity: data.main?.humidity,
    pressure: data.main?.pressure,
    wind_speed: data.wind?.speed,
    clouds_pct: data.clouds?.all,
    visibility_m: data.visibility,
    units,
  };

  console.log("\n=== CURRENT WEATHER ===");
  console.log(`    Location   : ${weather.location}`);
  console.log(`    Conditions : ${weather.conditions}`);
  console.log(`    Temp       : ${weather.temp}° (feels like ${weather.feels_like}°)`);
  console.log(`    Humidity   : ${weather.humidity}%`);
  console.log(`    Wind       : ${weather.wind_speed}`);
  console.log(`    Clouds     : ${weather.clouds_pct}%`);

  // 4) Save to DB (best-effort — caching must not break the response).
  try {
    await weatherQueries.saveWeather(location.location_id, weather, units);
  } catch (saveErr) {
    console.error("Failed to cache weather:", saveErr.message);
  }

  return weather;
}

async function getNearestLocation({ lat, lon }) {
  const lookups = [lookupOpenWeatherLocation, lookupNominatimLocation];

  for (const lookup of lookups) {
    try {
      const location = await lookup({ lat, lon });
      if (location?.label) return location;
    } catch (error) {
      console.warn(`${lookup.name} failed:`, error.message);
    }
  }

  const err = new Error("No nearby city found for these coordinates.");
  err.status = 404;
  throw err;
}

async function lookupOpenWeatherLocation({ lat, lon }) {
  if (!process.env.OpenWeatherMap_API_KEY) return null;

  const params = new URLSearchParams({
    lat,
    lon,
    limit: "1",
    appid: process.env.OpenWeatherMap_API_KEY,
  });

  const response = await fetch(`${OPENWEATHER_GEO_BASE}/reverse?${params}`);
  const data = await response.json();

  if (!response.ok) {
    const err = new Error(data.message || `OpenWeather Geocoding API returned ${response.status}`);
    err.status = response.status;
    throw err;
  }

  const place = Array.isArray(data) ? data[0] : null;
  if (!place?.name) return null;

  return {
    name: place.name,
    state: place.state ?? null,
    country: place.country ?? null,
    label: formatLocationLabel(place.name, place.state, place.country),
    provider: "openweather",
  };
}

async function lookupNominatimLocation({ lat, lon }) {
  const params = new URLSearchParams({
    format: "jsonv2",
    lat,
    lon,
    zoom: "10",
    addressdetails: "1",
    layer: "address",
  });

  const response = await fetch(`${NOMINATIM_BASE}/reverse?${params}`, {
    headers: {
      "Accept-Language": "en",
      "User-Agent": "StarWindow/1.0 (local development)",
    },
  });
  const data = await response.json();

  if (!response.ok) {
    const err = new Error(data.error || `Nominatim API returned ${response.status}`);
    err.status = response.status;
    throw err;
  }

  const address = data.address ?? {};
  const name =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.county ||
    data.name;

  if (!name) return null;

  return {
    name,
    state: address.state ?? null,
    country: address.country_code?.toUpperCase() ?? address.country ?? null,
    label: formatLocationLabel(name, address.state, address.country_code?.toUpperCase() ?? address.country),
    provider: "nominatim",
  };
}

function formatLocationLabel(name, region, country) {
  return [name, region ?? country].filter(Boolean).join(", ");
}

// Map a cached DB row back to the frontend shape. Numeric columns arrive from pg
// as strings, so coerce them. NOTE: the DB has no column for OpenWeather's city
// name, so on a cache hit `location` falls back to the stored locations.name.
function transformRow(row, units) {
  return {
    location: row.location_name,
    coords: { lat: num(row.lat), lon: num(row.long) },
    conditions: row.conditions,
    temp: num(row.temp),
    feels_like: num(row.feels_like),
    humidity: row.humidity,
    pressure: row.pressure,
    wind_speed: num(row.wind_speed),
    clouds_pct: row.clouds_pct,
    visibility_m: row.visibility_m,
    units: row.units || units,
    cached_at: row.cached_at,
  };
}

function num(v) {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

module.exports = { getWeather, getNearestLocation };
