// Launch service: fetch LL2 /launches/upcoming/ -> transform -> persist
// (events + rocket_launch + lookups) -> return frontend-friendly data.
//
// NOTE: rocket_launch has no updated_at/cached_at column, so there's no TTL
// cache check yet (see TODO in db/queries/launches.js). The service fetches live
// and persists, de-duping by launch name to avoid piling up duplicate rows on
// repeat calls. Add an isCacheStale() gate using TTL_MINUTES.LAUNCHES once a
// timestamp column exists.

const launchQueries = require("../db/queries/launches");

const LL2_BASE = "https://lldev.thespacedevs.com/2.3.0";

/**
 * Get upcoming rocket launches.
 * @param {object} opts
 * @param {number} [opts.limit=5]
 * @param {string} [opts.fromDate]
 * @param {string} [opts.toDate]
 * @returns {Promise<object>} { count, results }
 */
async function getLaunches({ limit = 5, fromDate, toDate } = {}) {
  const params = new URLSearchParams({
    limit: String(limit),
    mode: "detailed",
  });
  if (fromDate) params.set("net__gte", toStartOfDay(fromDate));
  if (toDate) params.set("net__lte", toEndOfDay(toDate));

  const response = await fetch(`${LL2_BASE}/launches/upcoming/?${params}`);
  if (!response.ok) {
    const err = new Error(`LL2 API returned ${response.status}`);
    err.status = response.status;
    throw err;
  }

  const data = await response.json();

  // Transform to the frontend shape (same fields as the original route).
  const launches = (data.results || []).map((l) => ({
    name: l.name,
    status: l.status?.name,
    net: l.net,
    net_precision: l.net_precision?.name,
    mission: l.mission
      ? { name: l.mission.name, type: l.mission.type, description: l.mission.description }
      : null,
    pad: l.pad
      ? {
          name: l.pad.name,
          location: l.pad.location?.name,
          latitude: l.pad.latitude,
          longitude: l.pad.longitude,
          country: l.pad.country?.name,
        }
      : null,
    provider: l.launch_service_provider?.name,
    rocket: l.rocket?.configuration?.name,
    image: l.image?.image_url || null,
  }));

  console.log("\n=== UPCOMING ROCKET LAUNCHES ===");
  launches.forEach((l, i) => {
    console.log(`\n[${i + 1}] ${l.name}`);
    console.log(`    Status   : ${l.status}`);
    console.log(`    Launch   : ${l.net} (precision: ${l.net_precision})`);
    console.log(`    Rocket   : ${l.rocket} — ${l.provider}`);
    console.log(`    Pad      : ${l.pad?.name}`);
    console.log(`    Location : ${l.pad?.location} (${l.pad?.country})`);
    console.log(`    Coords   : ${l.pad?.latitude}, ${l.pad?.longitude}`);
    if (l.mission) console.log(`    Mission  : ${l.mission.name} [${l.mission.type}]`);
  });

  // Persist each launch: events row first, then rocket_launch (+ lookups).
  for (const l of launches) {
    try {
      // De-dup defensively by name (no idempotency key in schema yet).
      const existing = await launchQueries.findLaunchByName(l.name);
      if (existing) continue;

      const eventData = {
        name: l.name,
        startTime: l.net, // events.start_time = launch NET (no-earlier-than)
        endTime: null,
        datePrecision: l.net_precision,
        description: l.mission?.description || null,
        eventType: "Launch", // upserted into event_types
        webcastLive: null, // LL2 /launches doesn't expose a live flag here
        videoUrl: null,
        imageUrl: l.image,
      };

      const launchData = {
        name: l.name,
        status: l.status,
        netPrecision: l.net_precision,
        imageUrl: l.image,
        mission: l.mission
          ? { name: l.mission.name, missionType: l.mission.type, description: l.mission.description }
          : null,
        rocket: l.rocket ? { model: l.rocket, manufacturer: l.provider, description: null } : null,
        provider: l.provider ? { name: l.provider } : null,
        launchStatus: l.status ? { status: l.status } : null,
        pad: l.pad
          ? {
              name: l.pad.name,
              location: {
                name: l.pad.location,
                lat: l.pad.latitude,
                long: l.pad.longitude,
                country: l.pad.country,
              },
            }
          : null,
      };

      await launchQueries.saveLaunch(eventData, launchData);
    } catch (saveErr) {
      // Don't fail the whole request if one launch fails to persist.
      console.error(`Failed to save launch "${l.name}":`, saveErr.message);
    }
  }

  return { count: data.count, results: launches };
}

module.exports = { getLaunches };

function toStartOfDay(value) {
  return isDateOnly(value) ? `${value}T00:00:00Z` : value;
}

function toEndOfDay(value) {
  return isDateOnly(value) ? `${value}T23:59:59Z` : value;
}

function isDateOnly(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value));
}
