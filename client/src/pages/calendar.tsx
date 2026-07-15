import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import * as Location from 'expo-location';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Palette, Radius } from '@/constants/tokens';
import { ThemedView } from '@/components/themed-view';
import { MonthGrid } from '@/components/calendar/month-grid';
import { ShootingStar } from '@/components/shooting-star';
import { Spacing } from '@/constants/theme';
import { useCalendarEvents } from '@/hooks/use-calendar-events';
import { getCalendarEventsForDate, getCalendarEventsForMonth } from '@/utilities/events-api';
import { getEventIconByType } from '@/lib/event-icons';

const categories = ['Meteor Showers', 'Rocket Launches', 'Alignments', 'More Filters'];
const MONTHS_BEHIND_TO_FETCH = 1;
const MONTHS_AHEAD_TO_FETCH = 1;
const CALENDAR_GRID_MAX_HEIGHT = 840;
const STARS = Array.from({ length: 72 }, (_, i) => ({
  top: (i * 23.7) % 100,
  left: (i * 41.3) % 100,
  size: (i % 4) + 0.5,
  opacity: (i % 6) * 0.08 + 0.15,
}));
const SHOOTING_STAR_DELAYS = [0, 2400];

function formatDateForApi(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonthIndex(year: number, month: number) {
  return year * 12 + month;
}

function getCalendarFetchWindow(year: number, month: number) {
  const from = new Date(year, month - MONTHS_BEHIND_TO_FETCH, 1);
  const to = new Date(year, month + MONTHS_AHEAD_TO_FETCH + 1, 0);

  return getCalendarFetchWindowFromIndexes(
    getMonthIndex(from.getFullYear(), from.getMonth()),
    getMonthIndex(to.getFullYear(), to.getMonth())
  );
}

function getCalendarFetchWindowFromIndexes(startMonthIndex: number, endMonthIndex: number) {
  const from = new Date(Math.floor(startMonthIndex / 12), startMonthIndex % 12, 1);
  const to = new Date(Math.floor(endMonthIndex / 12), (endMonthIndex % 12) + 1, 0);

  return {
    fromDate: formatDateForApi(from),
    toDate: formatDateForApi(to),
    startMonthIndex,
    endMonthIndex,
  };
}

const CalendarBackdrop = memo(function CalendarBackdrop() {
  return (
    <>
      <View style={styles.starField} pointerEvents="none">
        {STARS.map((star, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              top: `${star.top}%` as any,
              left: `${star.left}%` as any,
              width: star.size,
              height: star.size,
              borderRadius: star.size,
              backgroundColor: Palette.white,
              opacity: star.opacity,
            }}
          />
        ))}
      </View>

      {SHOOTING_STAR_DELAYS.map((delay, i) => (
        <ShootingStar key={i} delay={delay} glow={false} />
      ))}
    </>
  );
});

export default function CalendarScreen() {
  const { width } = useWindowDimensions();
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [loadedWindow, setLoadedWindow] = useState(() =>
    getCalendarFetchWindow(today.getFullYear(), today.getMonth())
  );
  const [browserCoords, setBrowserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationNotice, setLocationNotice] = useState('Requesting browser location for visible sky events.');

  useEffect(() => {
    const currentMonthIndex = getMonthIndex(currentYear, currentMonth);
    if (currentMonthIndex <= loadedWindow.startMonthIndex) {
      setLoadedWindow((currentWindow) =>
        getCalendarFetchWindowFromIndexes(currentWindow.startMonthIndex - 1, currentWindow.endMonthIndex)
      );
      return;
    }

    if (currentMonthIndex >= loadedWindow.endMonthIndex) {
      setLoadedWindow((currentWindow) =>
        getCalendarFetchWindowFromIndexes(currentWindow.startMonthIndex, currentWindow.endMonthIndex + 1)
      );
    }
  }, [currentMonth, currentYear, loadedWindow.endMonthIndex, loadedWindow.startMonthIndex]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (status !== 'granted') {
          setBrowserCoords(null);
          setLocationNotice('Location is required for visible sky events. Enable location in browser site settings and reload.');
          return;
        }

        const position = await Location.getCurrentPositionAsync({});
        if (cancelled) return;
        setBrowserCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationNotice('Visible sky events use your current browser location.');
      } catch {
        if (cancelled) return;
        setBrowserCoords(null);
        setLocationNotice("Couldn't get your location. Check browser and system location settings, then reload.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const calendarQuery = useMemo(() => {
    return {
      fromDate: loadedWindow.fromDate,
      toDate: loadedWindow.toDate,
      includeVisibleBodies: true,
      ...(browserCoords ?? {}),
    };
  }, [browserCoords, loadedWindow.fromDate, loadedWindow.toDate]);
  const { events, isLoading, error } = useCalendarEvents(calendarQuery);

  //============================
  // Get events for selected date
  //============================
  const selectedDayEvents = useMemo(
    () => getCalendarEventsForDate(events, selectedDate),
    [events, selectedDate]
  );
  const currentMonthEvents = useMemo(
    () => getCalendarEventsForMonth(events, currentYear, currentMonth),
    [events, currentYear, currentMonth]
  );

  // Determine if layout should be vertical (mobile) or horizontal (desktop)
  const isVertical = width < 900;
  const monthName = useMemo(
    () => new Date(currentYear, currentMonth).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    }),
    [currentMonth, currentYear]
  );

  const handlePreviousMonth = useCallback(() => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  }, [currentMonth, currentYear]);

  const handleNextMonth = useCallback(() => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  }, [currentMonth, currentYear]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <CalendarBackdrop />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
        {/* ================================================================
            Filter Buttons
            ================================================================ */}
        <View style={styles.filterButtonsContainer}>
          {categories.map((category) => (
            <ThemedView key={category} style={styles.categoryPill}>
              <ThemedText type="small" style={styles.categoryText}>
                {category}
              </ThemedText>
            </ThemedView>
          ))}
        </View>
        <ThemedText type="small" themeColor="textSecondary" style={styles.locationNotice}>
          {locationNotice}
        </ThemedText>

        {/* ================================================================
            "Frosted Glass" Container for Calendar + Selected Day
            ================================================================ */}
        <ThemedView style={styles.frostedContainer}>
          <View style={isVertical ? styles.layoutVertical : styles.layoutHorizontal}>
            {/* Calendar Section (Left) */}
            <ThemedView style={[styles.calendarSection, !isVertical && { flex: 0.7 }]}>
              <View style={styles.monthHeader}>
                <Pressable
                  onPress={handlePreviousMonth}
                  style={({ pressed }) => [pressed && styles.pressed, styles.headerButton]}>
                  <ThemedText type="small">← Prev</ThemedText>
                </Pressable>
                <View style={styles.monthHeaderContent} pointerEvents="none">
                  <ThemedText type="title" style={styles.monthTitle}>
                    {monthName}
                  </ThemedText>
                </View>
                <Pressable
                  onPress={handleNextMonth}
                  style={({ pressed }) => [pressed && styles.pressed, styles.headerButton]}>
                  <ThemedText type="small">Next →</ThemedText>
                </Pressable>
              </View>

              <MonthGrid
                year={currentYear}
                month={currentMonth}
                events={currentMonthEvents}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />
            </ThemedView>

            {/* Selected Day Panel (Right) */}
            <ThemedView style={[styles.selectedDayPanel, !isVertical && styles.selectedDayPanelDesktop, !isVertical && { flex: 0.3 }]}>
              <View style={[styles.selectedDayHeader, { zIndex: 99 }]}>
                <ThemedText type="smallBold" style={styles.selectedDateText}>
                  {selectedDate.toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </ThemedText>
              </View>

              {selectedDayEvents.length > 0 ? (
                <>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.eventCount}>
                    {selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? 's' : ''} detected.
                  </ThemedText>

                  <ScrollView
                    style={styles.eventListScroll}
                    showsVerticalScrollIndicator={true}
                    contentContainerStyle={styles.eventList}>
                    {selectedDayEvents.map((event) => (
                      <ThemedView key={event.id} style={styles.eventCard}>
                        <View style={styles.eventCardIconBox}>
                          <ThemedText style={styles.eventCardIcon}>{event.icon ?? getEventIconByType(event.type)}</ThemedText>
                        </View>
                        <View style={styles.eventContent}>
                          <ThemedText type="smallBold" style={styles.eventTitle}>
                            {event.title}
                          </ThemedText>
                          {event.time ? (
                            <ThemedText type="small" themeColor="textSecondary" style={styles.eventTime}>
                              {event.time}
                            </ThemedText>
                          ) : null}
                          <ThemedText type="small" style={styles.eventDetail}>
                            {event.detail}
                          </ThemedText>
                        </View>
                      </ThemedView>
                    ))}
                  </ScrollView>
                </>
              ) : isLoading ? (
                <View style={styles.noEventsContainer}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.noEventsText}>
                    Loading calendar events...
                  </ThemedText>
                </View>
              ) : error ? (
                <View style={styles.noEventsContainer}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.noEventsText}>
                    Could not load calendar events.
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.shootingStarsPlaceholder}>
                    {error}
                  </ThemedText>
                </View>
              ) : (
                <View style={styles.noEventsContainer}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.noEventsText}>
                    No events detected for this day.
                  </ThemedText>
                </View>
              )}
            </ThemedView>
          </View>
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  starField: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: Spacing.three,
    gap: Spacing.four,
  },
  calendarContainer: {
    marginTop: Spacing.five,
    paddingTop: Spacing.five,
    backgroundColor: 'rgba(11, 18, 38, 0.8)',
    borderRadius: Radius.lg,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(58, 134, 255, 0.25)',
  },
  filterButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
    marginTop: Spacing.three,
  },
  categoryPill: {
    backgroundColor: Palette.surfaceRaised,
    borderWidth: 1,
    borderColor: Palette.borderSoft,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
  categoryText: {
    color: Palette.accentMoon,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  frostedContainer: {
    marginTop: Spacing.two,
    paddingTop: Spacing.five,
    backgroundColor: 'rgba(11, 18, 38, 0.84)',
    borderRadius: Radius.lg,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(58, 134, 255, 0.25)',
    shadowColor: Palette.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
  } as any,
  layoutHorizontal: {
    flexDirection: 'row',
    gap: Spacing.four,
  },
  layoutVertical: {
    flexDirection: 'column',
    gap: Spacing.four,
  },
  calendarSection: {
    backgroundColor: 'rgb(11, 18, 38)',
    borderRadius: Radius.lg,
    gap: Spacing.three,
    position: 'relative',
    zIndex: 1,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
    paddingBottom: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: Palette.borderSoft,
    backgroundColor: 'rgb(11, 18, 38)',
    borderRadius: Spacing.three,
    padding: Spacing.two,
  },
  monthHeaderContent: {
    flex: 1,
    justifyContent: 'center',
    position: 'absolute',
    left: Spacing.two,
    right: Spacing.two,
    alignItems: 'center',
  },
  monthTitle: {
    fontWeight: '900',
    color: Palette.textPrimary,
    letterSpacing: 4,
    marginBottom: 4,
    textShadowColor: Palette.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  selectedDayPanel: {
    backgroundColor: Palette.surface,
    borderRadius: Radius.lg,
    gap: Spacing.three,
    position: 'relative',
    zIndex: 3,
  },
  selectedDayPanelDesktop: {
    maxHeight: CALENDAR_GRID_MAX_HEIGHT,
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  selectedDayHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.one,
    zIndex: 3,
    position: 'relative',
    paddingTop: Spacing.three,
  },
  sectionLabel: {
    fontWeight: '900',
    color: Palette.textTertiary,
    letterSpacing: 1,
    textShadowColor: Palette.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
    zIndex: 30,
    position: 'absolute',
    top: -Spacing.half,
    left: Spacing.one,
    backgroundColor: Palette.surface,
    paddingHorizontal: Spacing.one,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  selectedDateText: {
    fontWeight: '900',
    color: Palette.textSecondary,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 0.8,
    marginTop: Spacing.two,
    zIndex: 1,
    textAlign: 'center',
    width: '100%',
  },
  eventCount: {
    color: Palette.textSecondary,
    marginVertical: Spacing.two,
    marginHorizontal: Spacing.three,
  },
  eventList: {
    gap: Spacing.three,
  },
  eventListScroll: {
    flex: 1,
    minHeight: 0,
  },
  eventCard: {
    backgroundColor: 'rgba(22, 32, 61, 0.72)',
    padding: Spacing.three,
    borderRadius: Radius.md,
    flexDirection: 'row',
    gap: Spacing.three,
  },
  eventCardIconBox: {
    width: 40,
    height: 40,
    backgroundColor: Palette.accent,
    borderRadius: Radius.sm,
  },
  eventCardIcon: {
    color: Palette.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  eventContent: {
    flex: 1,
    gap: Spacing.one, 
  },
  eventTitle: {
    color: Palette.textPrimary,
  },
  eventTime: {
    color: Palette.accent,
  },
  eventDetail: {
    color: Palette.textSecondary,
  },
  noEventsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
    gap: Spacing.three,
  },
  noEventsText: {
    color: Palette.textSecondary,
  },
  locationNotice: {
    paddingHorizontal: Spacing.two,
    lineHeight: 18,
  },
  shootingStarsPlaceholder: {
    color: Palette.textTertiary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  headerButton: {
    cursor: 'pointer',
  },
});
