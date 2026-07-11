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
