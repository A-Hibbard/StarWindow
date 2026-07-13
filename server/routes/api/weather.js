const express = require("express");
const router = express.Router();
const weatherService = require("../../services/weatherService");

function requiredCoordinate(value, name) {
  const coordinate = Number(value);
  if (value === undefined || value === "" || !Number.isFinite(coordinate)) {
    const error = new Error(`${name} is required and must be a valid coordinate.`);
    error.status = 400;
    throw error;
  }
  return coordinate;
}

// GET /api/weather?lat=&lon=&units=
router.get("/", async (req, res) => {
  const { lat, lon, units = "imperial" } = req.query;

  try {
    const weather = await weatherService.getWeather({
      lat: requiredCoordinate(lat, "lat"),
      lon: requiredCoordinate(lon, "lon"),
      units,
    });
    res.json(weather);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message, status });
  }
});

// GET /api/weather/location?lat=&lon=
router.get("/location", async (req, res) => {
  const { lat, lon } = req.query;

  try {
    const location = await weatherService.getNearestLocation({
      lat: requiredCoordinate(lat, "lat"),
      lon: requiredCoordinate(lon, "lon"),
    });
    res.json(location);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message, status });
  }
});

module.exports = router;
