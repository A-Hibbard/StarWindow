const express = require("express");
const router = express.Router();
const bestSpotService = require("../../services/bestSpotService");

// Cincinnati, OH — default test coordinates (matches /api/score).
const CINCINNATI = { lat: 39.1031, lon: -84.512 };

// GET /api/map/best-spot?lat=&lon=&radius_miles=
// Samples concentric rings around (lat, lon), scores each point's viewing
// conditions (weather constant across the radius, light pollution per-point),
// and returns the single best spot plus the user's own score.
//
//   { radius_miles, sampled, user_score,
//     best_spot: { lat, lon, score, distance_miles, bearing, bearing_deg,
//                  drive_minutes, light_pollution_level },
//     weather: { clouds_pct, visibility_m, conditions } }
router.get("/best-spot", async (req, res) => {
  const {
    lat = CINCINNATI.lat,
    lon = CINCINNATI.lon,
    radius_miles = 25,
    units = "imperial",
  } = req.query;

  try {
    const result = await bestSpotService.findBestSpot({
      lat: Number(lat),
      lon: Number(lon),
      radiusMiles: Number(radius_miles),
      units,
    });
    res.json(result);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message, status });
  }
});

module.exports = router;
