import type { RocketLaunch } from '@/components/star-map';

// Base URL of our Express server. Override per-environment with
// EXPO_PUBLIC_API_URL (e.g. a deployed server); falls back to local dev.
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

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

function normalizeLaunchKey(value?: string | null) {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function getLaunchKey(launch: RawLaunch) {
  return [
    normalizeLaunchKey(launch.name),
    normalizeLaunchKey(launch.net),
    normalizeLaunchKey(launch.rocket),
    normalizeLaunchKey(launch.provider),
  ].join('|');
}

function sortByNet(left: NonNullable<RocketLaunch['upcoming']>[number], right: NonNullable<RocketLaunch['upcoming']>[number]) {
  const leftTime = left.net ? new Date(left.net).getTime() : Infinity;
  const rightTime = right.net ? new Date(right.net).getTime() : Infinity;
  return leftTime - rightTime;
}

/**
 * Fetches upcoming launches from our server and normalizes them into one
 * `RocketLaunch` per pad (so multiple launches at the same pad share a marker).
 * Entries without usable pad coordinates are dropped.
 */
export async function fetchLaunches(limit = 20): Promise<RocketLaunch[]> {
  const res = await fetch(`${API_BASE}/api/launches?limit=${limit}`);
  if (!res.ok) throw new Error(`Launches request failed: ${res.status}`);

  const data: { results?: RawLaunch[] } = await res.json();
  const byPad = new Map<string, RocketLaunch>();
  const seenByPad = new Map<string, Set<string>>();

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
      seenByPad.set(id, new Set());
    }

    const launchKey = getLaunchKey(l);
    const seenLaunches = seenByPad.get(id);
    if (seenLaunches?.has(launchKey)) continue;
    seenLaunches?.add(launchKey);

    site.upcoming!.push({
      name: l.name ?? 'Launch',
      net: l.net,
      status: l.status,
      provider: l.provider,
      rocket: l.rocket,
      imageUrl: l.image ?? undefined,
    });
  }

  return [...byPad.values()]
    .map((site) => ({
      ...site,
      upcoming: [...(site.upcoming ?? [])].sort(sortByNet).slice(0, 1),
    }))
    .filter((site) => (site.upcoming?.length ?? 0) > 0);
}
