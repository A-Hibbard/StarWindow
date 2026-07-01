// Reusable cache-staleness helper shared by every service.
//
// Services follow the same pattern: read a cached row (with its `cached_at` /
// `updated_at` timestamp) from db/queries, ask isCacheStale() whether it is too
// old, and only hit the external API when it is. Centralising the math here
// keeps the TTL policy in one place.

/**
 * Returns true when cached data should be considered stale and refetched.
 *
 * @param {Date|string|number|null|undefined} cachedAt - when the row was cached.
 *        Accepts a Date, an ISO string, or epoch ms. Missing/invalid => stale.
 * @param {number} ttlMinutes - how long the data stays fresh, in minutes.
 * @returns {boolean} true if stale (or never cached), false if still fresh.
 */
function isCacheStale(cachedAt, ttlMinutes) {
  if (!cachedAt) return true; // never cached => always stale

  const cachedMs = new Date(cachedAt).getTime();
  if (Number.isNaN(cachedMs)) return true; // unparseable timestamp => stale

  const ageMs = Date.now() - cachedMs;
  return ageMs > ttlMinutes * 60 * 1000;
}

// Named TTLs (in minutes) so services don't sprinkle magic numbers around.
const TTL_MINUTES = {
  LAUNCHES: 24 * 60, // 24 hours
  EVENTS: 24 * 60, // 24 hours
  SPACEWALKS: 24 * 60, // 24 hours
  WEATHER: 60, // 1 hour
  ISS: 24 * 60, // 24 hours
  BODY_POSITIONS: 24 * 60, // 24 hours
  MOON_PHASES: 24 * 60, // 24 hours
  NEWS: 6 * 60, // 6 hours
};

module.exports = { isCacheStale, TTL_MINUTES };
