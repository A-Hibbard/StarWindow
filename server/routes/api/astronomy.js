const express = require("express");
const router = express.Router();

const authString = Buffer.from(
  `${process.env.Astronomy_API_ID}:${process.env.Astronomy_API_Secret}`
).toString("base64");

const ASTRONOMY_BASE = "https://api.astronomyapi.com/api/v2";
const ISS_API_BASE = "https://iss-api.fly.dev";
const LL2_BASE = "https://lldev.thespacedevs.com/2.3.0";

// Cincinnati, OH coordinates for testing
const CINCINNATI = { lat: 39.1031, lon: -84.512 };

router.get("/bodies", async (req, res) => {
  try {
    const response = await fetch(`${ASTRONOMY_BASE}/bodies/positions`, {
      headers: {
        Authorization: `Basic ${authString}`,
      },
    });

    const data = await response.json();
console.log(JSON.stringify(data, null, 2));
res.status(response.status).json(data);
  } catch (error) {
    console.error("Astronomy API error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

router.get("/launches", async (req, res) => {
  const { limit = 5 } = req.query;
  try {
    const response = await fetch(`${LL2_BASE}/launches/upcoming/?limit=${limit}&mode=detailed`);
    if (!response.ok) return res.status(response.status).json({ error: `LL2 API returned ${response.status}` });

    const data = await response.json();

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

    res.json({ count: data.count, results: launches });
  } catch (error) {
    console.error("Launches API error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

router.get("/events", async (req, res) => {
  const { limit = 5 } = req.query;
  try {
    const response = await fetch(`${LL2_BASE}/events/upcoming/?limit=${limit}`);
    if (!response.ok) return res.status(response.status).json({ error: `LL2 API returned ${response.status}` });

    const data = await response.json();

    const events = (data.results || []).map((e) => ({
      name: e.name,
      type: e.type?.name,
      date: e.date,
      date_precision: e.date_precision?.name,
      location: e.location,
      description: e.description,
      webcast_live: e.webcast_live,
      video_urls: (e.vid_urls || []).map((v) => v.url),
    }));

    console.log("\n=== UPCOMING SPACE EVENTS ===");
    events.forEach((e, i) => {
      console.log(`\n[${i + 1}] ${e.name}`);
      console.log(`    Type     : ${e.type}`);
      console.log(`    Date     : ${e.date} (precision: ${e.date_precision})`);
      console.log(`    Location : ${e.location}`);
      if (e.description) console.log(`    Desc     : ${e.description.slice(0, 120)}...`);
    });

    res.json({ count: data.count, results: events });
  } catch (error) {
    console.error("Events API error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

router.get("/spacewalks", async (req, res) => {
  const { limit = 5 } = req.query;
  try {
    const response = await fetch(`${LL2_BASE}/spacewalks/?limit=${limit}&ordering=-start`);
    if (!response.ok) return res.status(response.status).json({ error: `LL2 API returned ${response.status}` });

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

    res.json({ count: data.count, results: spacewalks });
  } catch (error) {
    console.error("Spacewalks API error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

router.get("/iss-cincinnati", async (req, res) => {
  const { lat = CINCINNATI.lat, lon = CINCINNATI.lon, n = 5, days_ahead = 5 } = req.query;

  try {
    const url = `${ISS_API_BASE}/iss-pass?lat=${lat}&lon=${lon}&n=${n}&days_ahead=${days_ahead}&visible_only=true`;
    const response = await fetch(url);

    if (!response.ok) {
      return res.status(response.status).json({ error: `ISS API returned ${response.status}` });
    }

    const data = await response.json();

    const passes = (data.passes || []).map((pass) => {
      const riseTime = new Date(pass.rise.time);
      const setTime = new Date(pass.set.time);
      const peakTime = new Date(pass.culmination.time);

      return {
        rise: {
          time: riseTime.toLocaleString("en-US", { timeZone: "America/New_York" }),
          direction: pass.rise.compass,
        },
        peak: {
          time: peakTime.toLocaleString("en-US", { timeZone: "America/New_York" }),
          direction: pass.culmination.compass,
          elevation_deg: pass.culmination.elevation,
        },
        set: {
          time: setTime.toLocaleString("en-US", { timeZone: "America/New_York" }),
          direction: pass.set.compass,
        },
        duration_sec: pass.duration_sec,
        visible_duration_sec: pass.visible_duration_sec,
        visible: pass.visible,
      };
    });

    res.json({
      location: "Cincinnati, OH",
      observer: data.observer,
      tle_epoch: data.tle_epoch,
      generated_at: data.generated_at,
      passes,
    });
  } catch (error) {
    console.error("ISS API error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
