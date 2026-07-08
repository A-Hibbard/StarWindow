const express = require("express");
const router = express.Router();
const eventService = require("../../services/eventService");

// GET /api/events?limit=
router.get("/", async (req, res) => {
  const { limit } = req.query;
  try {
    const parsedLimit = limit == null ? undefined : Number(limit);
    const result = await eventService.getEvents({ limit: parsedLimit });
    res.json(result);
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
