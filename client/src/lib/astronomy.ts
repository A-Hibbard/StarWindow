import type { RocketLaunch } from '@/components/star-map';

// Base URL of our Express server. Override per-environment with
// EXPO_PUBLIC_API_URL (e.g. a deployed server); falls back to local dev.
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3005';

/** Moon render + phase for a given instant, from GET /api/astronomy/moon. */
export interface MoonView {
  datetime: string;
  /** URL of NASA's rendered Moon image, or null if unavailable. */
  image_url: string | null;
  /** Percent illuminated (0–100). */
  phase: number | null;
  /** Days since the new moon (0–29.53). */
  age: number | null;
}

/**
 * Fetch the current (or a given instant's) Moon view via our backend proxy of
 * NASA's Dial-a-Moon. Proxied server-side so it isn't blocked by browser CORS.
 */
export async function fetchMoonView(datetime?: string): Promise<MoonView> {
  const qs = datetime ? `?datetime=${encodeURIComponent(datetime)}` : '';
  const res = await fetch(`${API_BASE}/api/astronomy/moon${qs}`);
  if (!res.ok) throw new Error(`Moon request failed: ${res.status}`);
  return res.json();
}

/** Raw shape of one launch as returned by GET /api/astronomy/launches. */
interface RawLaunch {
  name?: string;
  status?: string;
  net?: string;
  provider?: string;
  rocket?: string;
  image?: string | null;
  pad?: {
    name?: string;
    location?: string;
    latitude?: string | number | null;
    longitude?: string | number | null;
  } | null;
}

/**
 * Fetches upcoming launches from our server and normalizes them into one
 * `RocketLaunch` per pad (so multiple launches at the same pad share a marker).
 * Entries without usable pad coordinates are dropped.
 */
export async function fetchLaunches(limit = 20): Promise<RocketLaunch[]> {
  // Launches live at /api/launches (server.js), NOT under /api/astronomy —
  // that route only serves /bodies. Hitting the wrong path 404s and the map
  // silently shows no launch markers.
  const res = await fetch(`${API_BASE}/api/launches?limit=${limit}`);
  if (!res.ok) throw new Error(`Launches request failed: ${res.status}`);

  const data: { results?: RawLaunch[] } = await res.json();
  const byPad = new Map<string, RocketLaunch>();

  for (const l of data.results ?? []) {
    const lat = Number(l.pad?.latitude);
    const lng = Number(l.pad?.longitude);
    if (!l.pad || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const padName = l.pad.name ?? 'Launch pad';
    const id = `${padName}@${lat.toFixed(4)},${lng.toFixed(4)}`;

    let site = byPad.get(id);
    if (!site) {
      site = { id, name: padName, lat, lng, location: l.pad.location, upcoming: [] };
      byPad.set(id, site);
    }
    site.upcoming!.push({
      name: l.name ?? 'Launch',
      net: l.net,
      status: l.status,
      provider: l.provider,
      rocket: l.rocket,
      imageUrl: l.image ?? undefined,
    });
  }

  return [...byPad.values()];
}
