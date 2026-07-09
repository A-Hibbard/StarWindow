// Event service: fill the event cache from SpaceDevs LL2 when a caller requests
// a date window, then return frontend-friendly rows from Supabase/Postgres.

const eventQueries = require("../db/queries/events");
const locationQueries = require("../db/queries/locations");

const LL2_BASE = "https://lldev.thespacedevs.com/2.3.0";
const DEFAULT_EVENT_TYPE = "Space Event";
const EVENTS_PAGE_SIZE = 100;

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
  if (fromDate && toDate) {
    await cacheExternalEvents({ fromDate, toDate });
  }

  const events = await eventQueries.getCachedEvents({ limit, fromDate, toDate });
  const results = events.map(mapCachedEvent);
  return { count: results.length, results };
}

async function cacheExternalEvents({ fromDate, toDate }) {
  const events = await fetchExternalEvents({ fromDate, toDate });
  let saved = 0;

  for (const event of events) {
    try {
      const normalized = await normalizeExternalEvent(event);
      if (!normalized) continue;

      await eventQueries.saveEvent(normalized);
      saved++;
    } catch (error) {
      console.error(`Failed to cache event "${event.name || event.id}":`, error.message);
    }
  }

  if (events.length > 0) {
    console.log(`\n=== LL2 EVENTS CACHE FILL ===\n    Fetched: ${events.length}\n    Saved/skipped idempotently: ${saved}`);
  }
}

async function fetchExternalEvents({ fromDate, toDate }) {
  const params = new URLSearchParams({
    limit: String(EVENTS_PAGE_SIZE),
    mode: "detailed",
    ordering: "date",
    date__gte: toStartOfDay(fromDate),
    date__lte: toEndOfDay(toDate),
  });

  let url = `${LL2_BASE}/events/?${params}`;
  const events = [];

  while (url) {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      const err = new Error(data?.detail || `LL2 API returned ${response.status}`);
      err.status = response.status;
      throw err;
    }

    events.push(...(data.results || []));
    url = data.next;
  }

  return events;
}

async function normalizeExternalEvent(event) {
  if (!event?.name || !event.date) return null;

  const location = event.location
    ? await locationQueries.findOrCreateLocationByName(event.location)
    : null;
  const primaryVideo = Array.isArray(event.vid_urls) ? event.vid_urls[0] : null;

  return {
    name: event.name,
    startTime: event.date,
    endTime: null,
    datePrecision: event.date_precision?.name || null,
    description: event.description || null,
    eventType: event.type?.name || DEFAULT_EVENT_TYPE,
    webcastLive: event.webcast_live ?? false,
    videoUrl: primaryVideo?.url || null,
    imageUrl: event.image?.image_url || event.image?.thumbnail_url || null,
    locationId: location?.location_id || null,
  };
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
