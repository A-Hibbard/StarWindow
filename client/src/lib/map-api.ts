// Client for the map's best-nearby-spot endpoint (GET /api/map/best-spot).

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3005';

/** The single highest-scoring sample point returned by the search. */
export interface BestSpot {
  lat: number;
  lon: number;
  /** Viewing score 0–100. */
  score: number;
  /** Straight-line distance from the user, miles. */
  distance_miles: number;
  /** 16-point compass abbreviation, e.g. "NW". */
  bearing: string;
  bearing_deg: number;
  /** Rough drive time at ~40 mph, whole minutes. */
  drive_minutes: number;
  /** Bortle-like 0 (dark) – 9 (bright) used to score this point. */
  light_pollution_level: number;
}

export interface BestSpotResponse {
  radius_miles: number;
  /** How many points were sampled (33: center + 4 rings × 8). */
  sampled: number;
  /** Viewing score at the user's exact location. */
  user_score: number;
  best_spot: BestSpot;
  weather: {
    clouds_pct: number;
    visibility_m: number;
    conditions?: string;
  };
}

/**
 * Fetch the best nearby stargazing spot within `radiusMiles` of (lat, lon).
 * Pass an AbortSignal to cancel an in-flight request when the slider moves again.
 */
export async function fetchBestSpot(
  { lat, lon, radiusMiles }: { lat: number; lon: number; radiusMiles: number },
  signal?: AbortSignal
): Promise<BestSpotResponse> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    radius_miles: String(radiusMiles),
  });
  const res = await fetch(`${API_BASE}/api/map/best-spot?${params}`, { signal });
  if (!res.ok) throw new Error(`best-spot request failed: ${res.status}`);
  return res.json();
}
