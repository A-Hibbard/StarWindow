const express = require("express");
const router = express.Router();
const issService = require("../../services/issService");

function requiredCoordinate(value, name) {
  const coordinate = Number(value);
  if (value === undefined || value === "" || !Number.isFinite(coordinate)) {
    const error = new Error(`${name} is required and must be a valid coordinate.`);
    error.status = 400;
    throw error;
  }
  return coordinate;
}

// GET /api/iss?lat=&lon=&n=&days_ahead=
router.get("/", async (req, res) => {
  const { lat, lon, n = 5, days_ahead = 5 } = req.query;

  try {
    const result = await issService.getIssPasses({
      lat: requiredCoordinate(lat, "lat"),
      lon: requiredCoordinate(lon, "lon"),
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
