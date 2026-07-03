// Queries for the news_articles cache.
//
// Schema: news_articles(news_id PK, title NOT NULL, summary, url NOT NULL UNIQUE,
//   image_url, published_at, source, cached_at NOT NULL DEFAULT now())
//
// The UNIQUE(url) constraint lets saveNewsArticles() upsert idempotently with
// ON CONFLICT (url), so re-aggregating the same NASA items just refreshes them
// instead of creating duplicates.

const database = require("../../config/database");

module.exports = {
  getCachedNews,
  getLatestCachedAt,
  saveNewsArticles,
};

/**
 * Return cached news, newest published first.
 * @param {object} [opts]
 * @param {number} [opts.limit=20]
 * @param {string} [opts.source] - optional filter, e.g. "NASA APOD".
 */
async function getCachedNews({ limit = 20, source = null } = {}) {
  const result = await database.query(
    `
      SELECT news_id, title, summary, url, image_url, published_at, source, cached_at
      FROM public.news_articles
      WHERE ($2::varchar IS NULL OR source = $2)
      ORDER BY published_at DESC NULLS LAST, cached_at DESC
      LIMIT $1
    `,
    [limit, source]
  );
  return result.rows;
}

/**
 * Most recent cached_at across the table (per source if given) — used to decide
 * staleness. Returns null when there are no rows.
 */
async function getLatestCachedAt(source = null) {
  const result = await database.query(
    `
      SELECT MAX(cached_at) AS latest
      FROM public.news_articles
      WHERE ($1::varchar IS NULL OR source = $1)
    `,
    [source]
  );
  return result.rows[0]?.latest || null;
}

/**
 * Upsert a batch of normalized articles. Rows missing title or url are skipped
 * (both are NOT NULL). On url conflict the existing row is refreshed.
 *
 * @param {Array<object>} rows - each:
 *   { title, summary, url, imageUrl, publishedAt, source }
 * @returns {Promise<number>} number of rows inserted or updated.
 */
async function saveNewsArticles(rows) {
  if (!rows || rows.length === 0) return 0;

  const client = await database.connect();
  try {
    await client.query("BEGIN");

    let saved = 0;
    for (const r of rows) {
      if (!r.title || !r.url) continue; // NOT NULL columns — skip incomplete items

      await client.query(
        `
          INSERT INTO public.news_articles
            (title, summary, url, image_url, published_at, source, cached_at)
          VALUES ($1, $2, $3, $4, $5, $6, now())
          ON CONFLICT (url) DO UPDATE SET
            title        = EXCLUDED.title,
            summary      = EXCLUDED.summary,
            image_url    = EXCLUDED.image_url,
            published_at = EXCLUDED.published_at,
            source       = EXCLUDED.source,
            cached_at    = now()
        `,
        [r.title, r.summary || null, r.url, r.imageUrl || null, r.publishedAt || null, r.source || null]
      );
      saved++;
    }

    await client.query("COMMIT");
    return saved;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
