import sendRequest from './send-request';

const API_BASE = process.env.EXPO_PUBLIC_API_URL;
const BASE_URL = `${API_BASE}/api/event-types`;

export interface EventType {
  event_type_id: number;
  event_type: string;
}

export function getEventTypes(): Promise<EventType[]> {
  return sendRequest(BASE_URL);
}
