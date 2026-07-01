const express = require("express");
const router = express.Router();
const issService = require("../../services/issService");

// Cincinnati, OH — default test coordinates.
const CINCINNATI = { lat: 39.1031, lon: -84.512 };

// GET /api/iss?lat=&lon=&n=&days_ahead=
router.get("/", async (req, res) => {
  const { lat = CINCINNATI.lat, lon = CINCINNATI.lon, n = 5, days_ahead = 5 } = req.query;

  try {
    const result = await issService.getIssPasses({
      lat: Number(lat),
      lon: Number(lon),
      n: Number(n),
      daysAhead: Number(days_ahead),
    });
    res.json(result);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message, status });
  }
});

module.exports = router;
