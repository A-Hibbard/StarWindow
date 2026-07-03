// Queries for the ISS pass cache.
//
// Schema: iss_passes(iss_pass_id PK, location_id FK, rise_time, rise_compass,
//   peak_time, peak_compass, peak_elevation_deg, set_time, set_compass,
//   duration_sec, visible_duration_sec, visible, tle_epoch,
//   cached_at NOT NULL DEFAULT now())
//
// A "batch" = all passes from one fetch for one location; they share a single
// cached_at (passed explicitly). getCachedPasses returns the most recent batch.
// CHECK constraints enforce peak_elevation 0-90, non-negative durations, and
// visible_duration_sec <= duration_sec.

const database = require("../../config/database");

module.exports = {
  getCachedPasses,
  savePasses,
};

/**
 * Return the most recent cached batch of passes for a location, earliest rise
 * first. Empty array when nothing is cached.
 * @param {number} locationId
 */
async function getCachedPasses(locationId) {
  if (!locationId) return [];
  const result = await database.query(
    `
      SELECT *
      FROM public.iss_passes
      WHERE location_id = $1
        AND cached_at = (
          SELECT MAX(cached_at) FROM public.iss_passes WHERE location_id = $1
        )
      ORDER BY rise_time ASC
    `,
    [locationId]
  );
  return result.rows;
}

/**
 * Insert a batch of passes in one transaction, all stamped with the same
 * cachedAt so they read back together as one batch.
 *
 * @param {number} locationId
 * @param {Array<object>} rows - each:
 *   { riseTime, riseCompass, peakTime, peakCompass, peakElevationDeg,
 *     setTime, setCompass, durationSec, visibleDurationSec, visible }
 * @param {object} [meta] - { tleEpoch }
 * @param {Date} [cachedAt] - shared timestamp for the batch.
 * @returns {Promise<number>} number of rows inserted.
 */
async function savePasses(locationId, rows, meta = {}, cachedAt = new Date()) {
  if (!locationId || !rows || rows.length === 0) return 0;

  const client = await database.connect();
  try {
    await client.query("BEGIN");

    let inserted = 0;
    for (const r of rows) {
      await client.query(
        `
          INSERT INTO public.iss_passes
            (location_id, rise_time, rise_compass, peak_time, peak_compass,
             peak_elevation_deg, set_time, set_compass, duration_sec,
             visible_duration_sec, visible, tle_epoch, cached_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `,
        [
          locationId,
          r.riseTime || null,
          r.riseCompass || null,
          r.peakTime || null,
          r.peakCompass || null,
          r.peakElevationDeg ?? null,
          r.setTime || null,
          r.setCompass || null,
          r.durationSec ?? null,
          r.visibleDurationSec ?? null,
          r.visible ?? null,
          meta.tleEpoch || null,
          cachedAt,
        ]
      );
      inserted++;
    }

    await client.query("COMMIT");
    return inserted;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
