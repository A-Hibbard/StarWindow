const express = require("express");
const router = express.Router();
const weatherService = require("../../services/weatherService");

// Cincinnati, OH — default test coordinates.
const CINCINNATI = { lat: 39.1031, lon: -84.512 };

// GET /api/weather?lat=&lon=&units=
router.get("/", async (req, res) => {
  const { lat = CINCINNATI.lat, lon = CINCINNATI.lon, units = "imperial" } = req.query;

  try {
    const weather = await weatherService.getWeather({
      lat: Number(lat),
      lon: Number(lon),
      units,
    });
    res.json(weather);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message, status });
  }
});

module.exports = router;
