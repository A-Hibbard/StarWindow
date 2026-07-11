// Pure spherical-geometry helpers. No I/O, no dependencies — safe to unit-test
// in isolation. All distances are in statute miles (matches the frontend's
// radius slider, which is 5–100 mi).

const EARTH_RADIUS_MILES = 3958.8;

const toRad = (deg) => (deg * Math.PI) / 180;
const toDeg = (rad) => (rad * 180) / Math.PI;

/**
 * Great-circle distance between two coordinates, in miles (haversine).
 */
function haversineMiles(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_MILES * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Point reached by travelling `distanceMiles` from (lat, lon) along an initial
 * compass `bearingDeg` (0 = N, 90 = E), on a sphere. Longitude is normalized to
 * [-180, 180].
 * @returns {{lat: number, lon: number}}
 */
function destinationPoint(lat, lon, bearingDeg, distanceMiles) {
  const angular = distanceMiles / EARTH_RADIUS_MILES; // angular distance (radians)
  const theta = toRad(bearingDeg);
  const phi1 = toRad(lat);
  const lambda1 = toRad(lon);

  const phi2 = Math.asin(
    Math.sin(phi1) * Math.cos(angular) +
      Math.cos(phi1) * Math.sin(angular) * Math.cos(theta)
  );
  const lambda2 =
    lambda1 +
    Math.atan2(
      Math.sin(theta) * Math.sin(angular) * Math.cos(phi1),
      Math.cos(angular) - Math.sin(phi1) * Math.sin(phi2)
    );

  return {
    lat: toDeg(phi2),
    lon: ((toDeg(lambda2) + 540) % 360) - 180,
  };
}

/**
 * Initial bearing (0–360°, 0 = N) from point 1 to point 2.
 */
function bearingDegrees(lat1, lon1, lat2, lon2) {
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const dLambda = toRad(lon2 - lon1);
  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

const COMPASS_16 = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
];

/**
 * Bearing in degrees → 16-point compass abbreviation (e.g. 315 → "NW").
 */
function bearingToCompass(bearingDeg) {
  const idx = Math.round(((bearingDeg % 360) / 22.5)) % 16;
  return COMPASS_16[idx];
}

/**
 * Rough drive-time estimate for a straight-line distance, assuming an average
 * speed (default 40 mph). Deliberately crude — real roads aren't great circles.
 * @returns {number} whole minutes.
 */
function driveMinutes(distanceMiles, mph = 40) {
  if (distanceMiles <= 0) return 0;
  return Math.round((distanceMiles / mph) * 60);
}

module.exports = {
  EARTH_RADIUS_MILES,
  haversineMiles,
  destinationPoint,
  bearingDegrees,
  bearingToCompass,
  driveMinutes,
};
