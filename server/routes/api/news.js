const express = require("express");
const router = express.Router();
const newsService = require("../../services/newsService");

// GET /api/news?limit=&source=&q=&refresh=
//   source  - filter to one feed, e.g. "NASA APOD" | "NASA DONKI" | "NASA Images" | "NASA News"
//   q       - keyword for the Image library source (default "discovery")
//   refresh - "true" bypasses the 6h cache TTL and re-aggregates
router.get("/", async (req, res) => {
  const { limit = 20, source, q, refresh } = req.query;

  try {
    const result = await newsService.getNews({
      limit: Number(limit),
      source: source || null,
      imagesQuery: q || "discovery",
      forceRefresh: refresh === "true",
    });
    res.json(result);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message, status });
  }
});

module.exports = router;
