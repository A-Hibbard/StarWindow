// Heuristics for whether an event is worth showing a location-specific viewing
// score for. Phase-2 rough cut — see TODO below.

import type { EventListItem } from '@/lib/events-api';

const VISIBILITY_RADIUS_MILES = 300;

/** Great-circle distance between two lat/lon points, in miles (haversine). */
export function distanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 3958.8; // Earth radius, miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Keyword buckets used to classify an event by its type/name.
const BROAD_SKY = [
  'meteor',
  'shower',
  'planet',
  'conjunction',
  'opposition',
  'iss',
  'space station',
  'comet',
  'aurora',
  'lunar', // lunar eclipses are visible from the whole night side
  'moon',
  'supermoon',
  'solstice',
  'equinox',
];
const LOCATION_SPECIFIC = ['solar eclipse', 'eclipse', 'launch', 'occultation', 'transit'];

function matches(haystack: string, needles: string[]): boolean {
  const h = haystack.toLowerCase();
  return needles.some((n) => h.includes(n));
}

/**
 * Rough "is this event visible from the user's location?" check.
 *
 * TODO (refinement): this is intentionally coarse.
 *   - Broad-sky events (meteor showers, planetary events, ISS passes, general
 *     celestial events) are treated as visible everywhere.
 *   - Location-specific events (solar eclipses, launches tied to a pad/region)
 *     are visible only within ~300 mi of the event — but that needs the EVENT's
 *     coordinates. We only have coords for launches (pad lat/lon); name-only
 *     events (e.g. eclipses) have no coords yet, so we can't distance-check them
 *     and fall back to "visible". Add geocoding of the location string to close
 *     this gap.
 *   - Anything ambiguous defaults to visible.
 *
 * @param event   the list item (type/name + optional coords)
 * @param userLat user latitude (null if unknown → default visible)
 * @param userLon user longitude
 */
export interface VisibilityInfo {
  /** Show the local viewing-score gauge (broad-sky, ambiguous, or in-range). */
  visible: boolean;
  /** A location-specific event that's beyond the radius (coords known both sides). */
  tooFar: boolean;
  /** Distance to the event in miles, when computable (else null). */
  distanceMiles: number | null;
}

/**
 * Richer classification behind isVisibleFromLocation(): also reports whether a
 * location-specific event is simply too far (so the modal can show a 0 score +
 * "watch the stream" note rather than hiding the gauge). Same heuristics/TODOs.
 */
export function describeVisibility(
  event: EventListItem,
  userLat: number | null,
  userLon: number | null
): VisibilityInfo {
  const label = `${event.type} ${event.name}`;

  // Broad-sky wins even if the name also contains a location-ish word.
  if (matches(label, BROAD_SKY)) return { visible: true, tooFar: false, distanceMiles: null };

  const isLocationSpecific = event.category === 'launch' || matches(label, LOCATION_SPECIFIC);
  if (!isLocationSpecific) return { visible: true, tooFar: false, distanceMiles: null }; // ambiguous

  // Location-specific: distance-check only if we have BOTH sets of coords.
  // Missing either → default visible (TODO above).
  if (
    event.latitude == null ||
    event.longitude == null ||
    userLat == null ||
    userLon == null
  ) {
    return { visible: true, tooFar: false, distanceMiles: null };
  }

  const d = distanceMiles(userLat, userLon, event.latitude, event.longitude);
  const tooFar = d > VISIBILITY_RADIUS_MILES;
  return { visible: !tooFar, tooFar, distanceMiles: Math.round(d) };
}

/** Boolean convenience wrapper (original phase-2 signature). */
export function isVisibleFromLocation(
  event: EventListItem,
  userLat: number | null,
  userLon: number | null
): boolean {
  return describeVisibility(event, userLat, userLon).visible;
}
