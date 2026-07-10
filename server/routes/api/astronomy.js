const express = require("express");
const router = express.Router();
const astronomyService = require("../../services/astronomyService");

function requiredCoordinate(value, name) {
  const coordinate = Number(value);
  if (value === undefined || value === "" || !Number.isFinite(coordinate)) {
    const error = new Error(`${name} is required and must be a valid coordinate.`);
    error.status = 400;
    throw error;
  }
  return coordinate;
}

// GET /api/astronomy/bodies?latitude=&longitude=&elevation=&from_date=&to_date=&time=
router.get("/bodies", async (req, res) => {
  const {
    latitude,
    longitude,
    elevation = 0,
    from_date,
    to_date,
    time = "22:00:00",
  } = req.query;

  try {
    const result = await astronomyService.getBodyPositions({
      latitude: requiredCoordinate(latitude, "latitude"),
      longitude: requiredCoordinate(longitude, "longitude"),
      elevation: Number(elevation),
      fromDate: from_date,
      toDate: to_date,
      time,
    });
    res.json(result);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message, status });
  }
});

// GET /api/astronomy/moon-phase?latitude=&longitude=&date=
router.get("/moon-phase", async (req, res) => {
  const {
    latitude,
    longitude,
    date,
  } = req.query;

  try {
    const result = await astronomyService.getMoonPhase({
      latitude: requiredCoordinate(latitude, "latitude"),
      longitude: requiredCoordinate(longitude, "longitude"),
      date,
    });
    res.json(result);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message, status });
  }
});

module.exports = router;
