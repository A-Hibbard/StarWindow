import sendRequest from './send-request';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';
const BASE_URL = `${API_BASE}/api/events`;

type RawEvent = {
  id?: number | string;
  name?: string;
  type?: string;
  date?: string;
  date_precision?: string;
  location?: string | null;
  description?: string | null;
  webcast_live?: boolean;
  video_urls?: string[];
  image_url?: string | null;
};

type EventsResponse = {
  count?: number;
  results?: RawEvent[];
};

export type CalendarEvent = {
  id: string;
  date: number;
  startDate: string;
  title: string;
  time: string;
  detail: string;
  icon: string;
  type?: string;
  location?: string | null;
  imageUrl?: string | null;
};

function getEventIcon(type?: string) {
  const normalized = type?.toLowerCase() ?? '';
  if (normalized.includes('launch')) return 'L';
  if (normalized.includes('eclipse')) return 'E';
  if (normalized.includes('spacewalk')) return 'S';
  if (normalized.includes('moon')) return 'M';
  return '*';
}

function formatEventTime(date: Date, precision?: string) {
  if (Number.isNaN(date.getTime())) return precision ?? 'Time TBD';

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function toCalendarEvent(event: RawEvent, index: number): CalendarEvent | null {
  if (!event.date) return null;

  const start = new Date(event.date);
  if (Number.isNaN(start.getTime())) return null;

  return {
    id: String(event.id ?? `${event.name ?? 'event'}-${event.date}-${index}`),
    date: start.getDate(),
    startDate: start.toISOString(),
    title: event.name ?? 'Space event',
    time: formatEventTime(start, event.date_precision),
    detail: event.description ?? event.location ?? 'No event details available.',
    icon: getEventIcon(event.type),
    type: event.type,
    location: event.location,
    imageUrl: event.image_url,
  };
}

export async function fetchCalendarEvents(limit?: number): Promise<CalendarEvent[]> {
  const url = typeof limit === 'number' && Number.isFinite(limit) && limit > 0 ? `${BASE_URL}?limit=${limit}` : BASE_URL;
  const data = await sendRequest<null, EventsResponse>(url);
  return (data.results ?? [])
    .map(toCalendarEvent)
    .filter((event): event is CalendarEvent => event !== null);
}

export function getCalendarEventsForMonth(events: CalendarEvent[], year: number, month: number) {
  return events.filter((event) => {
    const start = new Date(event.startDate);
    return start.getFullYear() === year && start.getMonth() === month;
  });
}

export function getCalendarEventsForDate(events: CalendarEvent[], date: Date) {
  return events.filter((event) => {
    const start = new Date(event.startDate);
    return (
      start.getFullYear() === date.getFullYear() &&
      start.getMonth() === date.getMonth() &&
      start.getDate() === date.getDate()
    );
  });
}

export function getNextCalendarEvent(events: CalendarEvent[], today = new Date()) {
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  return events
    .filter((event) => new Date(event.startDate).getTime() >= todayStart)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0];
}
