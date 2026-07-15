import { useEffect, useState } from 'react';

import { fetchCalendarEvents, type CalendarEvent, type CalendarEventsQuery } from '@/utilities/events-api';

type CalendarEventsInput = number | CalendarEventsQuery;
type NormalizedCalendarEventsQuery = Required<Pick<CalendarEventsQuery, 'fromDate' | 'toDate'>> & CalendarEventsQuery;
type DateRange = Pick<NormalizedCalendarEventsQuery, 'fromDate' | 'toDate'>;
type CachedRange = {
  cacheKey: string;
  query: NormalizedCalendarEventsQuery;
  events: CalendarEvent[];
};

const cachedEvents = new Map<string, CalendarEvent[]>();
const pendingRequests = new Map<string, Promise<CalendarEvent[]>>();
const cachedRanges = new Map<string, CachedRange>();

function getCacheKey(input?: CalendarEventsInput) {
  return JSON.stringify(normalizeInput(input));
}

function getInputFromCacheKey(cacheKey: string): CalendarEventsQuery {
  return JSON.parse(cacheKey) as CalendarEventsQuery;
}

function formatDateForApi(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function defaultCalendarWindow() {
  const today = new Date();
  const from = new Date(today.getFullYear(), today.getMonth(), 1);
  const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return { fromDate: formatDateForApi(from), toDate: formatDateForApi(to) };
}

function normalizeInput(input?: CalendarEventsInput): NormalizedCalendarEventsQuery {
  const defaults = defaultCalendarWindow();
  if (typeof input === 'number') return { ...defaults, limit: input };
  return { ...defaults, ...input };
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addDays(value: string, days: number) {
  const date = parseDateKey(value);
  date.setDate(date.getDate() + days);
  return formatDateForApi(date);
}

function getEventDateKey(event: CalendarEvent) {
  const date = new Date(event.startDate);
  if (Number.isNaN(date.getTime())) return null;
  return formatDateForApi(date);
}

function hasCoordinates(query: NormalizedCalendarEventsQuery) {
  return (
    typeof query.latitude === 'number' &&
    Number.isFinite(query.latitude) &&
    typeof query.longitude === 'number' &&
    Number.isFinite(query.longitude)
  );
}

function usesVisibleBodySource(query: NormalizedCalendarEventsQuery) {
  return query.includeVisibleBodies !== false && hasCoordinates(query);
}

function sameCoordinates(a: NormalizedCalendarEventsQuery, b: NormalizedCalendarEventsQuery) {
  if (!usesVisibleBodySource(a) && !usesVisibleBodySource(b)) return true;
  return a.latitude === b.latitude && a.longitude === b.longitude;
}

function canSeedEventsFrom(cached: CachedRange, target: NormalizedCalendarEventsQuery) {
  if (cached.query.limit || target.limit) return false;

  const cachedUsesBodies = usesVisibleBodySource(cached.query);
  const targetUsesBodies = usesVisibleBodySource(target);

  if (!targetUsesBodies && cachedUsesBodies) return false;
  if (cachedUsesBodies && !sameCoordinates(cached.query, target)) return false;

  return rangesOverlap(cached.query, target);
}

function completelyCoversSameSources(cached: CachedRange, target: NormalizedCalendarEventsQuery) {
  if (!canSeedEventsFrom(cached, target)) return false;
  return usesVisibleBodySource(cached.query) === usesVisibleBodySource(target);
}

function rangesOverlap(a: DateRange, b: DateRange) {
  return a.fromDate <= b.toDate && b.fromDate <= a.toDate;
}

function eventInRange(event: CalendarEvent, range: DateRange) {
  const dateKey = getEventDateKey(event);
  return Boolean(dateKey && dateKey >= range.fromDate && dateKey <= range.toDate);
}

function mergeEvents(eventGroups: CalendarEvent[][]) {
  const byId = new Map<string, CalendarEvent>();

  for (const events of eventGroups) {
    for (const event of events) {
      byId.set(`${event.id}-${event.startDate}-${event.type ?? ''}`, event);
    }
  }

  return [...byId.values()].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );
}

function getSeedEvents(query: NormalizedCalendarEventsQuery) {
  const eventGroups = [...cachedRanges.values()]
    .filter((cached) => canSeedEventsFrom(cached, query))
    .map((cached) => cached.events.filter((event) => eventInRange(event, query)));

  return mergeEvents(eventGroups);
}

function subtractCoveredRanges(target: DateRange, coveredRanges: DateRange[]) {
  let missingRanges: DateRange[] = [target];

  for (const covered of coveredRanges.sort((a, b) => a.fromDate.localeCompare(b.fromDate))) {
    missingRanges = missingRanges.flatMap((missing) => {
      if (!rangesOverlap(missing, covered)) return [missing];

      const nextMissing: DateRange[] = [];
      if (covered.fromDate > missing.fromDate) {
        nextMissing.push({ fromDate: missing.fromDate, toDate: addDays(covered.fromDate, -1) });
      }
      if (covered.toDate < missing.toDate) {
        nextMissing.push({ fromDate: addDays(covered.toDate, 1), toDate: missing.toDate });
      }

      return nextMissing;
    });
  }

  return missingRanges;
}

function rememberRange(cacheKey: string, query: NormalizedCalendarEventsQuery, events: CalendarEvent[]) {
  if (query.limit) return;
  cachedRanges.set(cacheKey, { cacheKey, query, events });
}

async function fetchMissingCalendarRanges(cacheKey: string, query: NormalizedCalendarEventsQuery) {
  const seedEvents = getSeedEvents(query);
  const coveredRanges = [...cachedRanges.values()]
    .filter((cached) => completelyCoversSameSources(cached, query))
    .map((cached) => ({
      fromDate: cached.query.fromDate < query.fromDate ? query.fromDate : cached.query.fromDate,
      toDate: cached.query.toDate > query.toDate ? query.toDate : cached.query.toDate,
    }));
  const missingRanges = subtractCoveredRanges(query, coveredRanges);

  const fetchedGroups = await Promise.all(
    missingRanges.map((range) => fetchCalendarEvents({ ...query, ...range }))
  );
  const events = mergeEvents([seedEvents, ...fetchedGroups]);

  cachedEvents.set(cacheKey, events);
  rememberRange(cacheKey, query, events);

  return events;
}

function loadCalendarEvents(cacheKey: string) {
  const cached = cachedEvents.get(cacheKey);
  const input = getInputFromCacheKey(cacheKey);
  const query = normalizeInput(input);
  if (cached) {
    rememberRange(cacheKey, query, cached);
    return Promise.resolve(cached);
  }

  let pendingRequest = pendingRequests.get(cacheKey);
  pendingRequest ??= (query.limit ? fetchCalendarEvents(query) : fetchMissingCalendarRanges(cacheKey, query))
    .then((events) => {
      cachedEvents.set(cacheKey, events);
      rememberRange(cacheKey, query, events);
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
  const query = normalizeInput(input);
  const cached = cachedEvents.get(cacheKey);
  const seedEvents = cached ?? getSeedEvents(query);
  const [events, setEvents] = useState<CalendarEvent[]>(seedEvents);
  const [isLoading, setIsLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const currentCached = cachedEvents.get(cacheKey);
    const currentSeedEvents = currentCached ?? getSeedEvents(query);

    Promise.resolve().then(() => {
      if (cancelled) return;
      setEvents(currentSeedEvents);
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
