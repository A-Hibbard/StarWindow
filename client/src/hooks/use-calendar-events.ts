import { useEffect, useState } from 'react';

import { fetchCalendarEvents, type CalendarEvent } from '@/utilities/events-api';

let cachedEvents: CalendarEvent[] | null = null;
let pendingRequest: Promise<CalendarEvent[]> | null = null;

function loadCalendarEvents(limit?: number) {
  if (cachedEvents) return Promise.resolve(cachedEvents);

  pendingRequest ??= fetchCalendarEvents(limit)
    .then((events) => {
      cachedEvents = events;
      return events;
    })
    .finally(() => {
      pendingRequest = null;
    });

  return pendingRequest;
}

export function useCalendarEvents(limit?: number) {
  const [events, setEvents] = useState<CalendarEvent[]>(cachedEvents ?? []);
  const [isLoading, setIsLoading] = useState(!cachedEvents);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(!cachedEvents);
    setError(null);

    loadCalendarEvents(limit)
      .then((loadedEvents) => {
        if (!cancelled) setEvents(loadedEvents);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load calendar events.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [limit]);

  return { events, isLoading, error };
}
