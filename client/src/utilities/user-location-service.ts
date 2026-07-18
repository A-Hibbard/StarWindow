import * as Location from 'expo-location';

export type UserCoordinates = {
  latitude: number;
  longitude: number;
  source: 'device' | 'ip';
};

const IP_LOCATION_URL = 'https://ipapi.co/json/';

let cachedLocation: UserCoordinates | null = null;
let pendingLocationRequest: Promise<UserCoordinates | null> | null = null;

export function getCachedUserLocation() {
  return cachedLocation;
}

export function setCachedUserLocation(location: UserCoordinates | null) {
  cachedLocation = location;
}

export async function getOrRequestUserLocation(
  options?: Parameters<typeof Location.getCurrentPositionAsync>[0]
) {
  if (cachedLocation) return cachedLocation;
  if (pendingLocationRequest) return pendingLocationRequest;

  pendingLocationRequest = resolveUserLocation(options).finally(() => {
    pendingLocationRequest = null;
  });

  return pendingLocationRequest;
}

async function resolveUserLocation(options?: Parameters<typeof Location.getCurrentPositionAsync>[0]) {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const position = await Location.getCurrentPositionAsync(options);
      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        source: 'device' as const,
      };
      setCachedUserLocation(location);
      return location;
    }
  } catch {
    // Fall through to IP geolocation when device/browser location is unavailable.
  }

  return resolveIpLocation();
}

async function resolveIpLocation() {
  const response = await fetch(IP_LOCATION_URL);
  const data = await response.json().catch(() => null);

  if (!response.ok || data?.error) return null;

  const latitude = Number(data?.latitude);
  const longitude = Number(data?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const location = {
    latitude,
    longitude,
    source: 'ip' as const,
  };
  setCachedUserLocation(location);
  return location;
}
