// Event service: fetch LL2 /events/ -> transform -> upsert into events (+ type,
// location, body links) -> return frontend-friendly data.
//
// NOTE: events has no cached_at/updated_at column (see TODO in db/queries/events.js),
// so this service cannot do TTL-based cache checks yet — it fetches live and
// upserts. Once an updated_at column is added, add an isCacheStale() gate here
// using TTL_MINUTES.EVENTS exactly like the weather/iss services do.

const eventQueries = require("../db/queries/events");
const launchQueries = require("../db/queries/launches");
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
      // De-dup defensively by (name, start_time) — no idempotency key in schema
      // yet, so without this every fetch re-inserts the same events (that's what
      // filled the table with 9x eclipse rows). Mirrors the launch service guard.
      const existing = await eventQueries.findEventByNameAndTime(e.name, e.date);
      if (existing) continue;

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

/**
 * Build the unified upcoming-events list from CACHED DB data only (no external
 * API calls). Merges space events and rocket launches into one array of a single
 * normalized shape, sorted chronologically (soonest first).
 *
 * Normalized item:
 *   { id, category: "event"|"launch", name, type, date, date_precision,
 *     description, image_url, location }
 *
 * @returns {Promise<Array<object>>}
 */
async function getUpcomingList() {
  const [events, launches] = await Promise.all([
    eventQueries.getUpcomingNonLaunchEvents(),
    launchQueries.getUpcomingLaunches(),
  ]);

  const normalizedEvents = events.map((e) => ({
    id: e.event_id,
    // event_id is the FK target for saving (user_events.event_id). For plain
    // events it equals id; kept as its own field so the client never has to know
    // that launches differ (see below).
    event_id: e.event_id,
    category: "event",
    name: e.name,
    type: e.event_type || "Event",
    date: e.start_time,
    date_precision: e.date_precision,
    description: e.description,
    image_url: e.image_url,
    location: e.location_name || null,
    latitude: null, // LL2 /events/ gives a free-text location with no coords
    longitude: null,
    webcast_live: e.webcast_live ?? false,
    video_url: e.video_url || null,
    launch_details: null,
  }));

  const normalizedLaunches = launches.map((l) => ({
    // Display id stays the launch_id (unique per launch), but event_id is the
    // rocket_launch's underlying events row — THAT is what user_events references.
    id: l.launch_id,
    event_id: l.event_id,
    category: "launch",
    name: l.name,
    type: "Rocket Launch",
    date: l.net,
    date_precision: l.date_precision || l.net_precision,
    description: l.mission_description,
    image_url: l.image_url,
    // Prefer the pad's location; fall back to the pad name if it has no location row.
    location: l.pad_location || l.pad_name || null,
    latitude: l.pad_lat != null ? Number(l.pad_lat) : null,
    longitude: l.pad_lon != null ? Number(l.pad_lon) : null,
    webcast_live: l.webcast_live ?? false,
    video_url: l.video_url || null,
    launch_details: {
      rocket_model: l.rocket_model || null,
      provider: l.provider_name || null,
      mission_name: l.mission_name || null,
      mission_type: l.mission_type || null,
      pad_name: l.pad_name || null,
      pad_location: l.pad_location || null,
      status: l.launch_status || l.status || null,
    },
  }));

  // Merge, then sort chronologically. Items with a missing/invalid date sort last.
  return [...normalizedEvents, ...normalizedLaunches].sort((a, b) => {
    const ta = a.date ? new Date(a.date).getTime() : Infinity;
    const tb = b.date ? new Date(b.date).getTime() : Infinity;
    return ta - tb;
  });
}

module.exports = { getEvents, getSpacewalks, getUpcomingList };
