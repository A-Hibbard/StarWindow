const database = require('../config/database');

module.exports = {
  getAll,
  getForUser,
  replaceForUser,
};

async function getAll() {
  console.log("Getting all event types from the database")
  const result = await database.query(`
    SELECT event_type_id, event_type
    FROM public.event_types
    ORDER BY event_type
  `);

  return result.rows;
}

async function getForUser(userId) {
  const result = await database.query(
    `
      SELECT event_type_id
      FROM public.user_event_types
      WHERE user_id = $1
      ORDER BY event_type_id
    `,
    [userId]
  );

  return result.rows.map((row) => Number(row.event_type_id));
}

async function replaceForUser(userId, eventTypeIds) {
  const ids = [...new Set(eventTypeIds.map(Number))].filter(Number.isInteger);
  const client = await database.connect();

  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM public.user_event_types WHERE user_id = $1', [userId]);

    for (const eventTypeId of ids) {
      await client.query(
        `
          INSERT INTO public.user_event_types (user_id, event_type_id)
          VALUES ($1, $2)
          ON CONFLICT (user_id, event_type_id) DO NOTHING
        `,
        [userId, eventTypeId]
      );
    }

    await client.query('COMMIT');
    return ids;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
