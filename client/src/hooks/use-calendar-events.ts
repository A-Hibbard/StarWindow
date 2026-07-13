import { useEffect, useState } from 'react';

import { fetchCalendarEvents, type CalendarEvent, type CalendarEventsQuery } from '@/utilities/events-api';

type CalendarEventsInput = number | CalendarEventsQuery;

const cachedEvents = new Map<string, CalendarEvent[]>();
const pendingRequests = new Map<string, Promise<CalendarEvent[]>>();

function getCacheKey(input?: CalendarEventsInput) {
  return JSON.stringify(typeof input === 'number' ? { limit: input } : input ?? {});
}

function getInputFromCacheKey(cacheKey: string): CalendarEventsQuery {
  return JSON.parse(cacheKey) as CalendarEventsQuery;
}

function loadCalendarEvents(cacheKey: string) {
  const cached = cachedEvents.get(cacheKey);
  if (cached) return Promise.resolve(cached);

  let pendingRequest = pendingRequests.get(cacheKey);
  pendingRequest ??= fetchCalendarEvents(getInputFromCacheKey(cacheKey))
    .then((events) => {
      cachedEvents.set(cacheKey, events);
      return events;
    })
    .finally(() => {
      pendingRequests.delete(cacheKey);
    });
  pendingRequests.set(cacheKey, pendingRequest);

  return pendingRequest;
}

export function useCalendarEvents(input?: CalendarEventsInput) {
  const cacheKey = getCacheKey(input);
  const cached = cachedEvents.get(cacheKey);
  const [events, setEvents] = useState<CalendarEvent[]>(cached ?? []);
  const [isLoading, setIsLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const currentCached = cachedEvents.get(cacheKey);

    Promise.resolve().then(() => {
      if (cancelled) return;
      if (currentCached) setEvents(currentCached);
      setIsLoading(!currentCached);
      setError(null);
    });

    loadCalendarEvents(cacheKey)
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
  }, [cacheKey]);

  return { events, isLoading, error };
}
