// Client for the unified events list endpoint (GET /api/events/list).

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3005';

/** Whether an item is a generic space event or a rocket launch. */
export type EventCategory = 'event' | 'launch';

/** Launch-only detail fields (present when category === "launch"). */
export interface LaunchDetails {
  rocket_model: string | null;
  provider: string | null;
  mission_name: string | null;
  mission_type: string | null;
  pad_name: string | null;
  pad_location: string | null;
  status: string | null;
}

/**
 * One row in the unified events list. Space events and rocket launches are
 * merged into this single normalized shape by the backend.
 */
export interface EventListItem {
  /** Display id: event_id for events, launch_id for launches. Unique within category. */
  id: number | string;
  /**
   * The underlying events.event_id — the FK used when saving to user_events.
   * For launches this differs from `id` (which is the launch_id).
   */
  event_id: number | string;
  category: EventCategory;
  name: string;
  /** event_type name, or "Rocket Launch" for launches. Used for the type filter. */
  type: string;
  /** ISO timestamp (start_time / launch NET). May be approximate — see date_precision. */
  date: string | null;
  /** LL2 precision name: "Year" | "Month" | "Day" | "Hour" | "Minute" | ... */
  date_precision: string | null;
  description: string | null;
  image_url: string | null;
  /** Human-readable place name, if known. */
  location: string | null;
  /** Event coordinates when known (launch pads); null for name-only events. */
  latitude: number | null;
  longitude: number | null;
  webcast_live: boolean;
  video_url: string | null;
  launch_details: LaunchDetails | null;
}

export interface ViewingScoreResponse {
  viewing_score: number;
  inputs: { clouds_pct: number; visibility_m: number; light_pollution_level: number };
  weather: unknown;
}

/** Fetch a 0–100 viewing score for a coordinate (GET /api/score). */
export async function fetchViewingScore(
  lat: number,
  lon: number,
  signal?: AbortSignal
): Promise<ViewingScoreResponse> {
  const params = new URLSearchParams({ lat: String(lat), lon: String(lon) });
  const res = await fetch(`${API_BASE}/api/score?${params}`, { signal });
  if (!res.ok) throw new Error(`score request failed: ${res.status}`);
  return res.json();
}

/** Whether a user has already saved an event (GET /api/user-events). */
export async function checkEventSaved(
  userId: number,
  eventId: number | string,
  signal?: AbortSignal
): Promise<{ saved: boolean; user_event_id: string | null }> {
  const params = new URLSearchParams({ user_id: String(userId), event_id: String(eventId) });
  const res = await fetch(`${API_BASE}/api/user-events?${params}`, { signal });
  if (!res.ok) throw new Error(`saved-check failed: ${res.status}`);
  return res.json();
}

/** Save an event for a user (POST /api/user-events). Idempotent server-side. */
export async function saveUserEvent(
  userId: number,
  eventId: number | string
): Promise<{ user_event_id: string; already_saved: boolean }> {
  const res = await fetch(`${API_BASE}/api/user-events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, event_id: eventId }),
  });
  if (!res.ok) throw new Error(`save failed: ${res.status}`);
  return res.json();
}

/** Unsave a previously-saved event (DELETE /api/user-events/:id). */
export async function deleteUserEvent(userEventId: number | string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/user-events/${userEventId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`unsave failed: ${res.status}`);
}

/**
 * Fetch all upcoming events (space events + launches) as one chronologically
 * sorted array. Reads cached server data; no external APIs are hit.
 */
export async function fetchEventsList(signal?: AbortSignal): Promise<EventListItem[]> {
  const res = await fetch(`${API_BASE}/api/events/list`, { signal });
  if (!res.ok) throw new Error(`events list request failed: ${res.status}`);
  return res.json();
}
