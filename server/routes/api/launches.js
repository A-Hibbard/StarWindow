const express = require("express");
const router = express.Router();
const launchService = require("../../services/launchService");

// GET /api/launches?limit=
router.get("/", async (req, res) => {
  const { limit = 5 } = req.query;
  try {
    const result = await launchService.getLaunches({ limit: Number(limit) });
    res.json(result);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message, status });
  }
});

module.exports = router;
