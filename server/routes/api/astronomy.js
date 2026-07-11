const express = require("express");
const router = express.Router();
const astronomyService = require("../../services/astronomyService");

// Cincinnati, OH — default test coordinates.
const CINCINNATI = { lat: 39.1031, lon: -84.512 };

// GET /api/astronomy/bodies?latitude=&longitude=&elevation=&from_date=&to_date=&time=
router.get("/bodies", async (req, res) => {
  const {
    latitude = CINCINNATI.lat,
    longitude = CINCINNATI.lon,
    elevation = 0,
    from_date,
    to_date,
    time = "22:00:00",
  } = req.query;

  try {
    const result = await astronomyService.getBodyPositions({
      latitude: Number(latitude),
      longitude: Number(longitude),
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

// GET /api/astronomy/moon?datetime=YYYY-MM-DDTHH:mm
// Server-side proxy of NASA's Dial-a-Moon (rendered Moon image + phase + age),
// so the dashboard doesn't call NASA directly and hit CORS.
router.get("/moon", async (req, res) => {
  const { datetime } = req.query;
  try {
    const result = await astronomyService.getMoonView(datetime);
    res.json(result);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message, status });
  }
});

module.exports = router;
