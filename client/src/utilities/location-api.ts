import sendRequest from './send-request';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';
const LOCATION_URL = `${API_BASE}/api/weather/location`;

export type NearestLocation = {
  name: string;
  state?: string | null;
  country?: string | null;
  label: string;
  provider?: string;
};

export async function fetchNearestLocation({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
  });

  return sendRequest<null, NearestLocation>(`${LOCATION_URL}?${params}`);
}
