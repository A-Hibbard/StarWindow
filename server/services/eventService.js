// Event service: read cached event rows from Supabase/Postgres and return
// frontend-friendly data. The free tier should not refetch live LL2 data on
// every calendar/dashboard request.

const eventQueries = require("../db/queries/events");

const LL2_BASE = "https://lldev.thespacedevs.com/2.3.0";

function mapCachedEvent(row) {
  return {
    id: row.event_id,
    name: row.name,
    type: row.event_type,
    date: row.start_time,
    end_date: row.end_time,
    date_precision: row.date_precision,
    description: row.description,
    webcast_live: row.webcast_live,
    video_urls: row.video_url ? [row.video_url] : [],
    image_url: row.image_url,
  };
}

/**
 * Get cached space events from Supabase/Postgres.
 * @param {object} opts
 * @param {number} [opts.limit]
 * @param {string} [opts.fromDate]
 * @param {string} [opts.toDate]
 * @returns {Promise<object>} { count, results }
 */
async function getEvents({ limit, fromDate, toDate } = {}) {
  const events = await eventQueries.getCachedEvents({ limit, fromDate, toDate });
  const results = events.map(mapCachedEvent);
  return { count: results.length, results };
}

/**
 * Get recent spacewalks (EVAs).
 *
 * NOTE: there is no spacewalk table in the schema, so this is NOT persisted.
 * @param {object} opts
 * @param {number} [opts.limit=5]
 * @param {string} [opts.fromDate]
 * @param {string} [opts.toDate]
 */
async function getSpacewalks({ limit = 5, fromDate, toDate } = {}) {
  const params = new URLSearchParams({
    limit: String(limit),
    ordering: "-start",
  });
  if (fromDate) params.set("start__gte", toStartOfDay(fromDate));
  if (toDate) params.set("start__lte", toEndOfDay(toDate));

  const response = await fetch(`${LL2_BASE}/spacewalks/?${params}`);
  if (!response.ok) {
    const err = new Error(`LL2 API returned ${response.status}`);
    err.status = response.status;
    throw err;
  }

  const data = await response.json();

  const spacewalks = (data.results || []).map((s) => ({
    name: s.name,
    start: s.start,
    end: s.end,
    duration: s.duration,
    location: s.location,
    space_station: s.space_station?.name || null,
    crew: (s.crew || []).map((c) => ({
      name: c.astronaut?.name,
      nationality: c.astronaut?.nationality,
      role: c.role?.role,
    })),
  }));

  return { count: data.count, results: spacewalks };
}

module.exports = { getEvents, getSpacewalks };

function toStartOfDay(value) {
  return isDateOnly(value) ? `${value}T00:00:00Z` : value;
}

function toEndOfDay(value) {
  return isDateOnly(value) ? `${value}T23:59:59Z` : value;
}

function isDateOnly(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value));
}
