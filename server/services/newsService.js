// News service: aggregate NASA content from four sources into the news_articles
// cache, then return a unified, frontend-friendly feed.
//
// Sources (chosen because api.nasa.gov has no dedicated "news" endpoint):
//   - APOD   (planetary/apod)         — daily discovery/explainer  [needs NASA_API_KEY]
//   - DONKI  (DONKI/notifications)    — space-weather notifications [needs NASA_API_KEY]
//   - Images (images-api.nasa.gov)    — image library search        [no key]
//   - RSS    (nasa.gov press releases)— real press releases         [no key]
//
// Flow: cache-check (news_articles.cached_at, TTL 6h) -> if stale, fetch all
// sources in parallel (each guarded so one failure doesn't sink the feed) ->
// transform to the news_articles shape -> upsert -> return newest-first.

const newsQueries = require("../db/queries/news");
const { isCacheStale, TTL_MINUTES } = require("../middleware/cache");

const NASA_BASE = "https://api.nasa.gov";
const IMAGES_BASE = "https://images-api.nasa.gov";
const NASA_RSS = "https://www.nasa.gov/news-release/feed/";

/**
 * Get aggregated NASA news.
 * @param {object} [opts]
 * @param {number} [opts.limit=20]
 * @param {string} [opts.source]   - filter cached results to one source.
 * @param {string} [opts.imagesQuery="discovery"] - keyword for the image library.
 * @param {boolean} [opts.forceRefresh=false] - bypass the cache TTL.
 * @returns {Promise<object>} { count, results }
 */
async function getNews({ limit = 20, source = null, imagesQuery = "discovery", forceRefresh = false } = {}) {
  // 1) Cache check across the whole table.
  const latest = await newsQueries.getLatestCachedAt();
  if (!forceRefresh && latest && !isCacheStale(latest, TTL_MINUTES.NEWS)) {
    console.log("\n=== NASA NEWS (cache hit) ===");
    const cached = await newsQueries.getCachedNews({ limit, source });
    return { count: cached.length, results: cached.map(fromRow) };
  }

  // 2) Fetch every source in parallel; guard each so one failure is non-fatal.
  console.log("\n=== AGGREGATING NASA NEWS ===");
  const [apod, donki, images, rss] = await Promise.all([
    guard("APOD", fetchApod()),
    guard("DONKI", fetchDonki()),
    guard("Images", fetchImages(imagesQuery)),
    guard("RSS", fetchRss()),
  ]);

  const all = [...apod, ...donki, ...images, ...rss];
  console.log(`    APOD: ${apod.length}  DONKI: ${donki.length}  Images: ${images.length}  RSS: ${rss.length}  => ${all.length} total`);

  // 3) Upsert everything (dedup handled by ON CONFLICT (url)).
  if (all.length > 0) {
    await newsQueries.saveNewsArticles(all);
  }

  // 4) Return the unified feed from the cache (now refreshed), newest first.
  const rows = await newsQueries.getCachedNews({ limit, source });
  return { count: rows.length, results: rows.map(fromRow) };
}

// --------------------------------------------------------------------------
// Source fetch + transform helpers. Each returns the normalized shape
// saveNewsArticles expects: { title, summary, url, imageUrl, publishedAt, source }
// --------------------------------------------------------------------------

async function fetchApod() {
  if (!process.env.NASA_API_KEY) throw new Error("NASA_API_KEY is not set");
  // A small recent window of daily entries.
  const res = await fetch(`${NASA_BASE}/planetary/apod?count=7&api_key=${process.env.NASA_API_KEY}`);
  if (!res.ok) throw new Error(`APOD returned ${res.status}`);
  const data = await res.json();

  return (Array.isArray(data) ? data : [data]).map((a) => ({
    title: a.title,
    summary: a.explanation,
    // APOD has no article URL; build the stable permalink from its date.
    url: apodPermalink(a.date),
    imageUrl: a.media_type === "image" ? a.hdurl || a.url : a.thumbnail_url || null,
    publishedAt: a.date,
    source: "NASA APOD",
  }));
}

async function fetchDonki() {
  if (!process.env.NASA_API_KEY) throw new Error("NASA_API_KEY is not set");
  const end = new Date();
  const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const qs = new URLSearchParams({
    type: "all",
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    api_key: process.env.NASA_API_KEY,
  });
  const res = await fetch(`${NASA_BASE}/DONKI/notifications?${qs}`);
  if (!res.ok) throw new Error(`DONKI returned ${res.status}`);
  const data = await res.json();

  return (data || []).map((n) => ({
    title: `Space Weather Notification — ${n.messageType}`,
    summary: (n.messageBody || "").slice(0, 2000),
    url: n.messageURL, // unique per notification
    imageUrl: null,
    publishedAt: n.messageIssueTime,
    source: "NASA DONKI",
  }));
}

async function fetchImages(query) {
  const res = await fetch(`${IMAGES_BASE}/search?q=${encodeURIComponent(query)}&media_type=image`);
  if (!res.ok) throw new Error(`Images returned ${res.status}`);
  const data = await res.json();
  const items = data?.collection?.items || [];

  return items.slice(0, 15).map((item) => {
    const d = (item.data && item.data[0]) || {};
    const thumb = (item.links && item.links[0] && item.links[0].href) || null;
    return {
      title: d.title,
      summary: d.description,
      url: d.nasa_id ? `https://images.nasa.gov/details/${d.nasa_id}` : item.href,
      imageUrl: thumb,
      publishedAt: d.date_created,
      source: "NASA Images",
    };
  });
}

async function fetchRss() {
  const res = await fetch(NASA_RSS);
  if (!res.ok) throw new Error(`RSS returned ${res.status}`);
  const xml = await res.text();

  return parseRssItems(xml).map((it) => ({
    title: it.title,
    summary: stripHtml(it.description),
    url: it.link,
    imageUrl: null,
    publishedAt: it.pubDate ? new Date(it.pubDate).toISOString() : null,
    source: "NASA News",
  }));
}

// --------------------------------------------------------------------------
// Small helpers
// --------------------------------------------------------------------------

// Resolve a guarded promise to [] on failure so one broken source is non-fatal.
async function guard(label, promise) {
  try {
    return await promise;
  } catch (error) {
    console.error(`News source "${label}" failed:`, error.message);
    return [];
  }
}

// APOD date "2026-02-16" -> https://apod.nasa.gov/apod/ap260216.html
function apodPermalink(date) {
  if (!date) return null;
  const [y, m, d] = date.split("-");
  return `https://apod.nasa.gov/apod/ap${y.slice(2)}${m}${d}.html`;
}

// Map a cached DB row to the frontend shape.
function fromRow(r) {
  return {
    title: r.title,
    summary: r.summary,
    url: r.url,
    image_url: r.image_url,
    published_at: r.published_at,
    source: r.source,
  };
}

// Minimal RSS item parser. NOTE: deliberately dependency-free and basic — it
// handles the NASA press-release feed (<item> with title/link/description/pubDate,
// CDATA-wrapped or not). For anything more robust, add the `rss-parser` package
// and swap this out.
function parseRssItems(xml) {
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  return blocks.map((block) => ({
    title: pickTag(block, "title"),
    link: pickTag(block, "link"),
    description: pickTag(block, "description"),
    pubDate: pickTag(block, "pubDate"),
  }));
}

function pickTag(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  if (!m) return null;
  // Strip an optional CDATA wrapper and trim.
  return m[1].replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
}

function stripHtml(s) {
  if (!s) return null;
  return s
    .replace(/<[^>]*>/g, "") // drop tags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;|&#8216;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .trim()
    .slice(0, 2000);
}

module.exports = { getNews };
