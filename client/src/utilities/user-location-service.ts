import * as Location from 'expo-location';

export type UserCoordinates = {
  latitude: number;
  longitude: number;
};

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
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;

  const position = await Location.getCurrentPositionAsync(options);
  const location = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
  setCachedUserLocation(location);
  return location;
}
