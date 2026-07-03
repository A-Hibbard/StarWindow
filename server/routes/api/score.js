const express = require("express");
const router = express.Router();
const scoreService = require("../../services/scoreService");
const summaryService = require("../../services/summaryService");

// Cincinnati, OH — default test coordinates.
const CINCINNATI = { lat: 39.1031, lon: -84.512 };

// GET /api/score?lat=&lon=&light_pollution=&clouds_pct=&visibility_m=
// Viewing score for a location. Weather is fetched from lat/lon automatically
// (defaults to Cincinnati); clouds_pct / visibility_m are optional overrides
// that skip the weather fetch when both are supplied.
router.get("/", async (req, res) => {
  const {
    lat = CINCINNATI.lat,
    lon = CINCINNATI.lon,
    light_pollution = 5,
    clouds_pct,
    visibility_m,
  } = req.query;

  try {
    const result = await scoreService.getViewingScore({
      lat: Number(lat),
      lon: Number(lon),
      lightPollutionLevel: Number(light_pollution),
      cloudsPct: clouds_pct !== undefined ? Number(clouds_pct) : undefined,
      visibilityM: visibility_m !== undefined ? Number(visibility_m) : undefined,
    });
    res.json(result);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message, status });
  }
});

// GET /api/score/summary?lat=&lon=&light_pollution=
// One combined payload: weather + ISS + launches + events + bodies + score.
router.get("/summary", async (req, res) => {
  const { lat = CINCINNATI.lat, lon = CINCINNATI.lon, light_pollution = 5 } = req.query;

  try {
    const summary = await summaryService.getSummary({
      lat: Number(lat),
      lon: Number(lon),
      lightPollutionLevel: Number(light_pollution),
    });
    res.json(summary);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message, status });
  }
});

module.exports = router;
