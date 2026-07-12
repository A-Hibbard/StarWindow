import sendRequest from './send-request';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';
const WEATHER_URL = `${API_BASE}/api/weather`;

export type WeatherResponse = {
  location?: string | null;
  conditions?: string | null;
  temp?: number | null;
  feels_like?: number | null;
  humidity?: number | null;
  wind_speed?: number | null;
  clouds_pct?: number | null;
  visibility_m?: number | null;
  units?: string | null;
};

export async function fetchCurrentWeather({
  latitude,
  longitude,
  units = 'imperial',
}: {
  latitude: number;
  longitude: number;
  units?: 'imperial' | 'metric' | 'standard';
}) {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    units,
  });

  return sendRequest<null, WeatherResponse>(`${WEATHER_URL}?${params}`);
}
