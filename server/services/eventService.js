// Event service: fetch LL2 /events/ -> transform -> upsert into events (+ type,
// location, body links) -> return frontend-friendly data.
//
// NOTE: events has no cached_at/updated_at column (see TODO in db/queries/events.js),
// so this service cannot do TTL-based cache checks yet — it fetches live and
// upserts. Once an updated_at column is added, add an isCacheStale() gate here
// using TTL_MINUTES.EVENTS exactly like the weather/iss services do.

const eventQueries = require("../db/queries/events");
const locationQueries = require("../db/queries/locations");

const LL2_BASE = "https://lldev.thespacedevs.com/2.3.0";

/**
 * Get upcoming space events.
 * @param {object} opts
 * @param {number} [opts.limit=5]
 * @returns {Promise<object>} { count, results }
 */
async function getEvents({ limit = 5 } = {}) {
  const response = await fetch(`${LL2_BASE}/events/upcoming/?limit=${limit}`);
  if (!response.ok) {
    const err = new Error(`LL2 API returned ${response.status}`);
    err.status = response.status;
    throw err;
  }

  const data = await response.json();

  // Transform to the frontend shape (same fields as the original route).
  const events = (data.results || []).map((e) => ({
    name: e.name,
    type: e.type?.name,
    date: e.date,
    date_precision: e.date_precision?.name,
    location: e.location,
    description: e.description,
    webcast_live: e.webcast_live,
    video_urls: (e.vid_urls || []).map((v) => v.url),
    image_url: e.feature_image || null,
  }));

  console.log("\n=== UPCOMING SPACE EVENTS ===");
  events.forEach((e, i) => {
    console.log(`\n[${i + 1}] ${e.name}`);
    console.log(`    Type     : ${e.type}`);
    console.log(`    Date     : ${e.date} (precision: ${e.date_precision})`);
    console.log(`    Location : ${e.location}`);
    if (e.description) console.log(`    Desc     : ${e.description.slice(0, 120)}...`);
  });

  // Persist each event: map -> events columns, upsert type, link location.
  for (const e of events) {
    try {
      // LL2 events give location as a free-text string with no coords.
      const location = e.location ? await locationQueries.findOrCreateLocationByName(e.location) : null;

      await eventQueries.saveEvent({
        name: e.name,
        startTime: e.date, // events.start_time; LL2 events are single-point in time
        endTime: null, // events.end_time — LL2 /events/ has no end; left null
        datePrecision: e.date_precision,
        description: e.description,
        eventType: e.type || "Other", // events.type_id is NOT NULL — never leave it unset
        webcastLive: e.webcast_live,
        videoUrl: e.video_urls[0] || null, // schema has single video_url column
        imageUrl: e.image_url,
        locationId: location?.location_id || null,
        bodyIds: [], // event_bodies: LL2 /events/ doesn't reference celestial bodies
      });
    } catch (saveErr) {
      // Don't fail the whole request if one event fails to persist.
      console.error(`Failed to save event "${e.name}":`, saveErr.message);
    }
  }

  return { count: data.count, results: events };
}

/**
 * Get recent spacewalks (EVAs).
 *
 * NOTE: there is no spacewalk table in the schema, so this is NOT persisted —
 * returned live only. If you want to cache these, they'd map naturally onto the
 * events table (with a "Spacewalk" event_type and crew stored separately), but
 * crew has no table either — flag for a follow-up if you want it persisted.
 * @param {object} opts
 * @param {number} [opts.limit=5]
 */
async function getSpacewalks({ limit = 5 } = {}) {
  const response = await fetch(`${LL2_BASE}/spacewalks/?limit=${limit}&ordering=-start`);
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

  console.log("\n=== RECENT SPACEWALKS ===");
  spacewalks.forEach((s, i) => {
    console.log(`\n[${i + 1}] ${s.name}`);
    console.log(`    Station  : ${s.space_station}`);
    console.log(`    Location : ${s.location}`);
    console.log(`    Start    : ${s.start}`);
    console.log(`    Duration : ${s.duration}`);
    console.log(`    Crew     : ${s.crew.map((c) => `${c.name} (${c.nationality}) — ${c.role}`).join(", ")}`);
  });

  return { count: data.count, results: spacewalks };
}

module.exports = { getEvents, getSpacewalks };
