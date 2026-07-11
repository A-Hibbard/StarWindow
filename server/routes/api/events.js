const express = require("express");
const router = express.Router();
const eventService = require("../../services/eventService");

// GET /api/events?limit=
router.get("/", async (req, res) => {
  const { limit = 5 } = req.query;
  try {
    const result = await eventService.getEvents({ limit: Number(limit) });
    res.json(result);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message, status });
  }
});

// GET /api/events/list
// Unified upcoming list: space events + rocket launches merged into one array,
// normalized to a common shape and sorted soonest-first. Reads CACHED DB data
// only (no external API calls on this route).
router.get("/list", async (req, res) => {
  try {
    const results = await eventService.getUpcomingList();
    res.json(results);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message, status });
  }
});

// GET /api/events/spacewalks?limit=  (live only — no spacewalk table yet)
router.get("/spacewalks", async (req, res) => {
  const { limit = 5 } = req.query;
  try {
    const result = await eventService.getSpacewalks({ limit: Number(limit) });
    res.json(result);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message, status });
  }
});

module.exports = router;
