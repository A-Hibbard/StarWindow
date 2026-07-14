import sendRequest from './send-request';

const API_BASE = process.env.EXPO_PUBLIC_API_URL;
const BODIES_URL = `${API_BASE}/api/astronomy/bodies`;

export type VisibleBody = {
  body?: string | null;
  observed_date?: string | null;
  altitude_degrees?: string | number | null;
  azimuth_degrees?: string | number | null;
  constellation?: string | null;
  magnitude?: string | number | null;
  image_url?: string | null;
  image_source?: string | null;
};

export type VisibleBodiesResponse = {
  count?: number;
  results?: VisibleBody[];
};

function formatDateForApi(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function fetchVisibleBodies({
  latitude,
  longitude,
  date = new Date(),
  time,
}: {
  latitude: number;
  longitude: number;
  date?: Date;
  time?: string | null;
}) {
  const dateKey = formatDateForApi(date);
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    from_date: dateKey,
    to_date: dateKey,
  });
  if (time && time !== '--:--') params.set('time', time);

  return sendRequest<null, VisibleBodiesResponse>(`${BODIES_URL}?${params}`);
}
