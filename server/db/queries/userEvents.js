// Queries for user_events — a user's saved events.
//
// Table:
//   user_events(user_event_id PK bigint, user_id FK NOT NULL, event_id FK NOT NULL
//     -> events(event_id) ON DELETE CASCADE, event_comment, event_rating CHECK 1..5)
//   UNIQUE (user_id, event_id)  -- uq_user_events_user_event
//
// The unique constraint lets saveUserEvent() be idempotent via ON CONFLICT, so a
// double-tap on "Save" can't create duplicate saves for the same user+event.

const database = require("../../config/database");

module.exports = {
  saveUserEvent,
  deleteUserEvent,
  getUserEvent,
  getSavedEventsForUser,
};

/**
 * Save an event for a user. Idempotent: a repeat save returns the existing row
 * (already_saved = true) instead of erroring or inserting a duplicate.
 * @param {number} userId
 * @param {number|string} eventId
 * @returns {Promise<{user_event_id, user_id, event_id, already_saved: boolean}>}
 */
async function saveUserEvent(userId, eventId) {
  const inserted = await database.query(
    `
      INSERT INTO public.user_events (user_id, event_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, event_id) DO NOTHING
      RETURNING user_event_id, user_id, event_id
    `,
    [userId, eventId]
  );

  if (inserted.rows.length > 0) {
    return { ...inserted.rows[0], already_saved: false };
  }

  // Conflict -> it was already saved; return the existing row so the client can
  // still learn its user_event_id (needed to unsave).
  const existing = await database.query(
    "SELECT user_event_id, user_id, event_id FROM public.user_events WHERE user_id = $1 AND event_id = $2 LIMIT 1",
    [userId, eventId]
  );
  return { ...existing.rows[0], already_saved: true };
}

/**
 * Remove a saved event by its user_event_id.
 * @param {number|string} userEventId
 * @returns {Promise<boolean>} true if a row was deleted.
 */
async function deleteUserEvent(userEventId) {
  const result = await database.query(
    "DELETE FROM public.user_events WHERE user_event_id = $1 RETURNING user_event_id",
    [userEventId]
  );
  return result.rows.length > 0;
}

/**
 * Look up whether a user has saved a given event (used to seed the modal's
 * saved/unsaved state when it opens).
 * @returns {Promise<{user_event_id}|null>}
 */
async function getUserEvent(userId, eventId) {
  const result = await database.query(
    "SELECT user_event_id FROM public.user_events WHERE user_id = $1 AND event_id = $2 LIMIT 1",
    [userId, eventId]
  );
  return result.rows[0] || null;
}

/**
 * Return every event saved by a user, normalized to the same shape consumed by
 * the events list UI.
 * @param {number} userId
 * @returns {Promise<Array<object>>}
 */
async function getSavedEventsForUser(userId) {
  const result = await database.query(
    `
      SELECT
        ue.user_event_id,
        ue.event_comment,
        ue.event_rating,
        COALESCE(rl.launch_id, e.event_id) AS id,
        ue.event_id,
        CASE WHEN rl.launch_id IS NULL THEN 'event' ELSE 'launch' END AS category,
        COALESCE(rl.name, e.name) AS name,
        CASE
          WHEN rl.launch_id IS NULL THEN COALESCE(et.event_type, 'Event')
          ELSE 'Rocket Launch'
        END AS type,
        e.start_time AS date,
        COALESCE(e.date_precision, rl.net_precision) AS date_precision,
        CASE
          WHEN rl.launch_id IS NULL THEN e.description
          ELSE m.description
        END AS description,
        COALESCE(rl.image_url, e.image_url) AS image_url,
        CASE
          WHEN rl.launch_id IS NULL THEN (
            SELECT loc.name
            FROM public.event_location el
            JOIN public.locations loc ON loc.location_id = el.location_id
            WHERE el.event_id = e.event_id
            ORDER BY el.event_location_id ASC
            LIMIT 1
          )
          ELSE COALESCE(pad_loc.name, pad.name)
        END AS location,
        CASE WHEN rl.launch_id IS NULL THEN NULL ELSE pad_loc.lat END AS latitude,
        CASE WHEN rl.launch_id IS NULL THEN NULL ELSE pad_loc.long END AS longitude,
        e.webcast_live,
        e.video_url,
        r.model AS rocket_model,
        p.name AS provider,
        m.name AS mission_name,
        m.mission_type,
        pad.name AS pad_name,
        pad_loc.name AS pad_location,
        COALESCE(ls.status, rl.status) AS launch_status
      FROM public.user_events ue
      JOIN public.events e ON e.event_id = ue.event_id
      LEFT JOIN public.event_types et ON et.event_type_id = e.type_id
      LEFT JOIN public.rocket_launch rl ON rl.event_id = e.event_id
      LEFT JOIN public.missions m ON m.mission_id = rl.mission_id
      LEFT JOIN public.rockets r ON r.rocket_id = rl.rocket_id
      LEFT JOIN public.providers p ON p.provider_id = rl.provider_id
      LEFT JOIN public.launch_statuses ls ON ls.launch_status_id = rl.launch_status_id
      LEFT JOIN public.pads pad ON pad.pad_id = rl.pad_id
      LEFT JOIN public.locations pad_loc ON pad_loc.location_id = pad.location_id
      WHERE ue.user_id = $1
      ORDER BY e.start_time ASC, ue.user_event_id ASC
    `,
    [userId]
  );

  return result.rows.map((row) => ({
    user_event_id: row.user_event_id,
    event_comment: row.event_comment,
    event_rating: row.event_rating,
    id: row.id,
    event_id: row.event_id,
    category: row.category,
    name: row.name,
    type: row.type,
    date: row.date,
    date_precision: row.date_precision,
    description: row.description,
    image_url: row.image_url,
    location: row.location,
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
    webcast_live: row.webcast_live ?? false,
    video_url: row.video_url || null,
    launch_details:
      row.category === "launch"
        ? {
            rocket_model: row.rocket_model || null,
            provider: row.provider || null,
            mission_name: row.mission_name || null,
            mission_type: row.mission_type || null,
            pad_name: row.pad_name || null,
            pad_location: row.pad_location || null,
            status: row.launch_status || null,
          }
        : null,
  }));
}
