import sendRequest from './send-request';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';
const SCORE_URL = `${API_BASE}/api/score`;

export type ViewingScoreWeather = {
  conditions?: string | null;
  clouds_pct?: number | null;
  visibility_m?: number | null;
};

export type ViewingScoreResponse = {
  viewing_score: number | null;
  inputs?: {
    clouds_pct?: number | null;
    visibility_m?: number | null;
    light_pollution_level?: number | null;
  };
  weather?: ViewingScoreWeather | null;
};

export async function fetchViewingScore({
  latitude,
  longitude,
  lightPollutionLevel = 5,
}: {
  latitude: number;
  longitude: number;
  lightPollutionLevel?: number;
}) {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    light_pollution: String(lightPollutionLevel),
  });

  return sendRequest<null, ViewingScoreResponse>(`${SCORE_URL}?${params}`);
}
