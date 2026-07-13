// Queries for celestial body positions + moon phases.
//
// Tables touched:
//   celestial_bodies(body_id PK, name)
//   constellations(constellation_id PK, short_name, full_name)
//   body_positions(body_position_id PK, body_id FK, location_id FK, observed_date,
//     altitude_degrees, azimuth_degrees, distance_from_earth_km, right_ascension,
//     declination, constellation_id FK, magnitude, elongation, cached_at)
//   moon_phases(moon_phase_id PK, location_id FK, phase_date, phase_string,
//     phase_fraction, phase_angle, image_url, cached_at)
//
// NOTE: celestial_bodies / constellations have no declared UNIQUE constraint in
// the schema, so the upserts below use SELECT-then-INSERT inside a transaction
// rather than ON CONFLICT. If you add UNIQUE(name) / UNIQUE(short_name), these
// can be simplified to INSERT ... ON CONFLICT DO NOTHING RETURNING.

const database = require("../../config/database");

module.exports = {
  getCachedBodyPositions,
  saveBodyPositions,
  getCachedMoonPhase,
  saveMoonPhase,
};

// ---------------------------------------------------------------------------
// Body positions
// ---------------------------------------------------------------------------

/**
 * Return cached body positions for a location, newest cache batch first, joined
 * with body + constellation names. The service uses the newest cached_at to
 * decide staleness.
 * @param {number} locationId
 * @param {object} [opts]
 * @param {string} [opts.fromDate]
 * @param {string} [opts.toDate]
 */
async function getCachedBodyPositions(locationId, opts = {}) {
  const { fromDate, toDate } = opts;
  const values = [locationId];
  const where = ["bp.location_id = $1"];

  if (fromDate) {
    values.push(fromDate);
    where.push(`bp.observed_date >= $${values.length}::date`);
  }

  if (toDate) {
    values.push(toDate);
    where.push(`bp.observed_date < ($${values.length}::date + INTERVAL '1 day')`);
  }

  const result = await database.query(
    `
      SELECT
        bp.body_position_id,
        bp.body_id,
        cb.name              AS body_name,
        bp.location_id,
        bp.observed_date,
        bp.altitude_degrees,
        bp.azimuth_degrees,
        bp.distance_from_earth_km,
        bp.right_ascension,
        bp.declination,
        bp.constellation_id,
        c.short_name         AS constellation_short,
        c.full_name          AS constellation_full,
        bp.magnitude,
        bp.elongation,
        bp.cached_at
      FROM public.body_positions bp
      JOIN public.celestial_bodies cb ON cb.body_id = bp.body_id
      LEFT JOIN public.constellations c ON c.constellation_id = bp.constellation_id
      WHERE ${where.join(" AND ")}
      ORDER BY bp.cached_at DESC, bp.observed_date ASC
    `,
    values
  );
  return result.rows;
}

/**
 * Upsert bodies + constellations and insert position rows, all in one
 * transaction. Each input row is the normalized shape the service produces.
 *
 * @param {Array<object>} rows - each:
 *   { bodyName, constellationShort, constellationFull, locationId, observedDate,
 *     altitudeDegrees, azimuthDegrees, distanceFromEarthKm, rightAscension,
 *     declination, magnitude, elongation }
 * @param {Date|string} cachedAt - timestamp stamped onto every inserted row.
 * @returns {Promise<number>} count of inserted position rows.
 */
async function saveBodyPositions(rows, cachedAt = new Date()) {
  if (!rows || rows.length === 0) return 0;

  const client = await database.connect();
  try {
    await client.query("BEGIN");

    // Cache name->id lookups within this batch to avoid repeat round-trips.
    const bodyIdByName = new Map();
    const constellationIdByShort = new Map();

    let inserted = 0;
    for (const row of rows) {
      const bodyId = await upsertBody(client, row.bodyName, bodyIdByName);
      const constellationId = await upsertConstellation(
        client,
        row.constellationShort,
        row.constellationFull,
        constellationIdByShort
      );

      await client.query(
        `
          INSERT INTO public.body_positions
            (body_id, location_id, observed_date, altitude_degrees, azimuth_degrees,
             distance_from_earth_km, right_ascension, declination, constellation_id,
             magnitude, elongation, cached_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (body_id, location_id, observed_date) DO UPDATE SET
            altitude_degrees       = EXCLUDED.altitude_degrees,
            azimuth_degrees        = EXCLUDED.azimuth_degrees,
            distance_from_earth_km = EXCLUDED.distance_from_earth_km,
            right_ascension        = EXCLUDED.right_ascension,
            declination            = EXCLUDED.declination,
            constellation_id       = EXCLUDED.constellation_id,
            magnitude              = EXCLUDED.magnitude,
            elongation             = EXCLUDED.elongation,
            cached_at              = EXCLUDED.cached_at
        `,
        [
          bodyId,
          row.locationId,
          row.observedDate,
          row.altitudeDegrees,
          row.azimuthDegrees,
          row.distanceFromEarthKm,
          row.rightAscension,
          row.declination,
          constellationId,
          row.magnitude,
          row.elongation,
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

// Resolve (or create) a celestial_bodies row by name, using a per-batch cache.
async function upsertBody(client, name, cache) {
  if (!name) return null;
  if (cache.has(name)) return cache.get(name);

  const found = await client.query(
    "SELECT body_id FROM public.celestial_bodies WHERE name = $1 LIMIT 1",
    [name]
  );
  let id;
  if (found.rows.length > 0) {
    id = found.rows[0].body_id;
  } else {
    const ins = await client.query(
      "INSERT INTO public.celestial_bodies (name) VALUES ($1) RETURNING body_id",
      [name]
    );
    id = ins.rows[0].body_id;
  }
  cache.set(name, id);
  return id;
}

// Resolve (or create) a constellations row by short_name, using a per-batch cache.
async function upsertConstellation(client, shortName, fullName, cache) {
  if (!shortName && !fullName) return null;
  const key = shortName || fullName;
  if (cache.has(key)) return cache.get(key);

  const found = await client.query(
    "SELECT constellation_id FROM public.constellations WHERE short_name = $1 LIMIT 1",
    [shortName]
  );
  let id;
  if (found.rows.length > 0) {
    id = found.rows[0].constellation_id;
  } else {
    const ins = await client.query(
      "INSERT INTO public.constellations (short_name, full_name) VALUES ($1, $2) RETURNING constellation_id",
      [shortName, fullName]
    );
    id = ins.rows[0].constellation_id;
  }
  cache.set(key, id);
  return id;
}

// ---------------------------------------------------------------------------
// Moon phases
//
// NOTE: the original route never fetched moon phases (AstronomyAPI exposes them
// at a separate /studio/moon-phase endpoint). These queries are ready for when
// the astronomy service starts populating them — see the TODO in astronomyService.js.
// ---------------------------------------------------------------------------

async function getCachedMoonPhase(locationId, phaseDate) {
  const values = [locationId];
  const dateFilter = phaseDate ? "AND phase_date = $2::date" : "";
  if (phaseDate) values.push(phaseDate);

  const result = await database.query(
    `
      SELECT moon_phase_id, location_id, phase_date, phase_string,
             phase_fraction, phase_angle, image_url, cached_at
      FROM public.moon_phases
      WHERE location_id = $1
        ${dateFilter}
      ORDER BY cached_at DESC
      LIMIT 1
    `,
    values
  );
  return result.rows[0] || null;
}

/**
 * @param {object} data
 * @param {number} data.locationId
 * @param {string} data.phaseDate
 * @param {string} data.phaseString
 * @param {number} data.phaseFraction
 * @param {number} data.phaseAngle
 * @param {string|null} [data.imageUrl]
 * @param {Date|string} [data.cachedAt]
 */
async function saveMoonPhase(data) {
  const result = await database.query(
    `
      INSERT INTO public.moon_phases
        (location_id, phase_date, phase_string, phase_fraction, phase_angle, image_url, cached_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (location_id, phase_date) DO UPDATE SET
        phase_string   = EXCLUDED.phase_string,
        phase_fraction = EXCLUDED.phase_fraction,
        phase_angle    = EXCLUDED.phase_angle,
        image_url      = EXCLUDED.image_url,
        cached_at      = EXCLUDED.cached_at
      RETURNING moon_phase_id, location_id, phase_date, phase_string,
                phase_fraction, phase_angle, image_url, cached_at
    `,
    [
      data.locationId,
      data.phaseDate,
      data.phaseString,
      data.phaseFraction,
      data.phaseAngle,
      data.imageUrl || null,
      data.cachedAt || new Date(),
    ]
  );
  return result.rows[0];
}
