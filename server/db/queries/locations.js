// Shared helpers for the locations table. NOTE: this file is an addition beyond
// the originally-listed db/queries/* set — multiple services (body positions,
// moon phases, pads, the /summary endpoint) all need to resolve a location_id
// from lat/lon, so the logic lives here once instead of being duplicated.
//
// Schema: locations(location_id PK, name, description, lat, long, country)

const database = require("../../config/database");

module.exports = {
  findOrCreateLocation,
  findOrCreateLocationByName,
  getLocationById,
};

/**
 * Resolve a locations row by name only, creating it (with null coords) if absent.
 * Used for sources like LL2 events that give a free-text location string and no
 * coordinates. Matching is case-insensitive on name.
 * @param {string} name
 * @returns {Promise<object|null>} the row, or null if no name supplied.
 */
async function findOrCreateLocationByName(name) {
  if (!name) return null;

  const client = await database.connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query(
      "SELECT location_id, name, description, lat, long, country FROM public.locations WHERE lower(name) = lower($1) LIMIT 1",
      [name]
    );
    if (existing.rows.length > 0) {
      await client.query("COMMIT");
      return existing.rows[0];
    }

    const inserted = await client.query(
      `
        INSERT INTO public.locations (name)
        VALUES ($1)
        RETURNING location_id, name, description, lat, long, country
      `,
      [name]
    );
    await client.query("COMMIT");
    return inserted.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Resolve a locations row for the given coordinates, creating it if absent.
 * Coordinates are matched at ~5 decimal places (~1m) so tiny float differences
 * from different callers don't spawn duplicate rows.
 *
 * @param {object} loc
 * @param {number} loc.lat
 * @param {number} loc.long
 * @param {string} [loc.name]
 * @param {string} [loc.description]
 * @param {string} [loc.country]
 * @returns {Promise<object>} the locations row (existing or newly inserted).
 */
async function findOrCreateLocation({ lat, long, name = null, description = null, country = null }) {
  // locations.name is NOT NULL — synthesize a name from coords when none given.
  if (!name) name = `${lat}, ${long}`;

  const client = await database.connect();
  try {
    await client.query("BEGIN");

    // Match on rounded coordinates so 39.1031 and 39.10310001 collapse to one row.
    const existing = await client.query(
      `
        SELECT location_id, name, description, lat, long, country
        FROM public.locations
        WHERE round(lat::numeric, 5) = round($1::numeric, 5)
          AND round(long::numeric, 5) = round($2::numeric, 5)
        LIMIT 1
      `,
      [lat, long]
    );

    if (existing.rows.length > 0) {
      await client.query("COMMIT");
      return existing.rows[0];
    }

    const inserted = await client.query(
      `
        INSERT INTO public.locations (name, description, lat, long, country)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING location_id, name, description, lat, long, country
      `,
      [name, description, lat, long, country]
    );

    await client.query("COMMIT");
    return inserted.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function getLocationById(locationId) {
  const result = await database.query(
    `
      SELECT location_id, name, description, lat, long, country
      FROM public.locations
      WHERE location_id = $1
    `,
    [locationId]
  );
  return result.rows[0] || null;
}
