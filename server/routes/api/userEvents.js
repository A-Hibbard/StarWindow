const express = require("express");
const router = express.Router();
const ensureLoggedIn = require("../../config/ensureLoggedIn");
const userEventQueries = require("../../db/queries/userEvents");

// NOTE: this trusts user_id from the request body per the phase-2 spec. The
// global checkToken middleware also decodes the JWT into req.user, so a stricter
// version could use `req.user.user_id` and ignore the body — left as a follow-up.

// GET /api/user-events?user_id=&event_id=
// Report whether a user has already saved an event (seeds the modal's state).
router.get("/", async (req, res) => {
  const { user_id, event_id } = req.query;
  if (!user_id || !event_id) {
    return res.status(400).json({ error: "user_id and event_id are required", status: 400 });
  }
  try {
    const row = await userEventQueries.getUserEvent(Number(user_id), event_id);
    res.json({ saved: Boolean(row), user_event_id: row?.user_event_id ?? null });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message, status });
  }
});

// GET /api/user-events/saved
// Return all events saved by the current logged-in user.
router.get("/saved", ensureLoggedIn, async (req, res) => {
  try {
    const events = await userEventQueries.getSavedEventsForUser(req.user.user_id);
    res.json(events);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message, status });
  }
});

// POST /api/user-events  { user_id, event_id }
// Save an event for a user. Idempotent (won't duplicate an existing save).
router.post("/", async (req, res) => {
  const { user_id, event_id } = req.body || {};
  if (!user_id || !event_id) {
    return res.status(400).json({ error: "user_id and event_id are required", status: 400 });
  }
  try {
    const saved = await userEventQueries.saveUserEvent(Number(user_id), event_id);
    // 200 if it already existed, 201 if newly created.
    res.status(saved.already_saved ? 200 : 201).json(saved);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message, status });
  }
});

// DELETE /api/user-events/:id   (:id = user_event_id) — unsave.
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await userEventQueries.deleteUserEvent(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Saved event not found", status: 404 });
    }
    res.json({ deleted: true, user_event_id: req.params.id });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message, status });
  }
});

module.exports = router;
