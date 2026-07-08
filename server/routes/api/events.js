const express = require("express");
const router = express.Router();
const eventService = require("../../services/eventService");

// GET /api/events?limit=&from_date=&to_date=
router.get("/", async (req, res) => {
  const { limit, from_date, to_date } = req.query;
  try {
    const parsedLimit = limit == null ? undefined : Number(limit);
    const result = await eventService.getEvents({
      limit: parsedLimit,
      fromDate: from_date,
      toDate: to_date,
    });
    res.json(result);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message, status });
  }
});

// GET /api/events/spacewalks?limit=  (live only — no spacewalk table yet)
router.get("/spacewalks", async (req, res) => {
  const { limit = 5, from_date, to_date } = req.query;
  try {
    const result = await eventService.getSpacewalks({
      limit: Number(limit),
      fromDate: from_date,
      toDate: to_date,
    });
    res.json(result);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message, status });
  }
});

module.exports = router;
