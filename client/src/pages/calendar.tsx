import React, { useEffect, useMemo, useState } from 'react';
import * as Location from 'expo-location';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShootingStar } from '@/components/shooting-star';
import { ThemedText } from '@/components/themed-text';
import { Radius, Palette } from '@/constants/tokens';
import { ThemedView } from '@/components/themed-view';
import { MonthGrid } from '@/components/calendar/month-grid';
import { Spacing } from '@/constants/theme';
import { useCalendarEvents } from '@/hooks/use-calendar-events';
import { getCalendarEventsForDate, getCalendarEventsForMonth } from '@/utilities/events-api';
import { getEventIconByType } from '@/lib/event-icons';

const MONTHS_BEHIND_TO_FETCH = 2;
const MONTHS_AHEAD_TO_FETCH = 3;

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

  return {
    fromDate: formatDateForApi(from),
    toDate: formatDateForApi(to),
    startMonthIndex: getMonthIndex(from.getFullYear(), from.getMonth()),
    endMonthIndex: getMonthIndex(to.getFullYear(), to.getMonth()),
  };
}

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
    if (
      currentMonthIndex <= loadedWindow.startMonthIndex ||
      currentMonthIndex >= loadedWindow.endMonthIndex
    ) {
      setLoadedWindow(getCalendarFetchWindow(currentYear, currentMonth));
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
  const selectedDayEvents = getCalendarEventsForDate(events, selectedDate);
  const currentMonthEvents = getCalendarEventsForMonth(events, currentYear, currentMonth);

  // Determine if layout should be vertical (mobile) or horizontal (desktop)
  const isVertical = width < 900;
  const monthName = new Date(currentYear, currentMonth).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const STARS = Array.from({ length: 150 }, (_, i) => ({
    top: (i * 23.7) % 100,
    left: (i * 41.3) % 100,
    size: (i % 4) + 0.5,
    opacity: (i % 6) * 0.08 + 0.15,
  }));

  return (
    <SafeAreaView style={styles.safeArea}>
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
               backgroundColor: Palette.bgVoid, ////////////////////
              opacity: star.opacity,
            }}
          />
        ))}
      </View>

      {[0, 800, 1600, 2400, 3200, 4000].map((delay, i) => (
        <ShootingStar key={i} delay={delay} />
      ))}

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.locationNotice}>
          {locationNotice}
        </ThemedText>

        <ThemedView style={styles.calendarContainer}>
          <View style={isVertical ? styles.layoutVertical : styles.layoutHorizontal}>
            {/* Calendar Section (Left) */}
            <ThemedView style={[styles.calendarSection, !isVertical && { flex: 0.7 }]}>
              <View style={styles.monthHeader}>
                <Pressable
                  onPress={() => {
                    if (currentMonth === 0) {
                      setCurrentMonth(11);
                      setCurrentYear(currentYear - 1);
                    } else {
                      setCurrentMonth(currentMonth - 1);
                    }
                  }}
                  style={({ pressed }) => [pressed && styles.pressed, styles.headerButton]}>
                  <ThemedText type="small">← Prev</ThemedText>
                </Pressable>
                <View style={styles.monthHeaderContent} pointerEvents="none">
                  <ThemedText type="title" style={styles.monthTitle}>
                    {monthName}
                  </ThemedText>
                </View>
                <Pressable
                  onPress={() => {
                    if (currentMonth === 11) {
                      setCurrentMonth(0);
                      setCurrentYear(currentYear + 1);
                    } else {
                      setCurrentMonth(currentMonth + 1);
                    }
                  }}
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
            <ThemedView style={[styles.selectedDayPanel, !isVertical && { flex: 0.3 }]}>
              <View style={[styles.selectedDayHeader, { zIndex: 99 }]}>
                <ThemedText type="title" style={styles.selectedDateText}>
                  {selectedDate.toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </ThemedText>
              </View>

              {isLoading ? (
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
                </View>
              ) : selectedDayEvents.length > 0 ? (
                <>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.eventCount}>
                    {selectedDayEvents.length} celestial event{selectedDayEvents.length !== 1 ? 's' : ''} detected.
                  </ThemedText>

                  <ScrollView
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
    backgroundColor: Palette.bgVoid,
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
    gap: Spacing.one,
    paddingTop: 60,
  },
  calendarContainer: {
    marginTop: Spacing.one,
    paddingTop: Spacing.one,
    backgroundColor: Palette.bgDeep,
    backdropFilter: 'blur(14px)',
    borderRadius: Radius.lg,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: Palette.borderSoft,
  },
  layoutHorizontal: {
    flexDirection: 'row',
    gap: Spacing.four,
  },
  layoutVertical: {
    flexDirection: 'column',
    gap: Spacing.four,
  },
  calendarSection: {
    backgroundColor: Palette.bgDeep,
    gap: Spacing.three,
    position: 'relative',
    zIndex: 1,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.one,
    paddingBottom: Spacing.one,
    borderBottomWidth: 2,
    borderBottomColor: Palette.borderSoft,
    backgroundColor: Palette.bgDeep,
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
    fontWeight: '400',
    color: Palette.white,
    letterSpacing: 1,
    marginBottom: Spacing.two ,
    fontSize: 30,
    paddingBottom: Spacing.one,
  },
  selectedDayPanel: {
    backgroundColor: Palette.bgDeep,
    gap: Spacing.three,
    borderRadius: Radius.md,
    borderColor: Palette.borderSoft,
    borderWidth: 1,
    padding: Spacing.three,
    position: 'relative',
    zIndex: 3,
  },
  selectedDayHeader: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.one,
    position: 'relative',
    paddingTop: Spacing.one,
  },
  selectedDateText: {
    fontWeight: '400',
    color: Palette.textPrimary,
    letterSpacing: 2,
    marginTop: Spacing.three,
    zIndex: 1,
  },
  eventCount: {
    color: Palette.textSecondary,
    marginVertical: Spacing.two,
  },
  eventList: {
    gap: Spacing.two,
  },
  eventCard: {
    backgroundColor: Palette.border,
    padding: Spacing.three,
    borderRadius: Radius.md,
    flexDirection: 'row',
    gap: Spacing.three,
  },
  eventCardIconBox: {
    width: 40,
    height: 40,
    backgroundColor: Palette.accentMoonDim,
    borderRadius: Radius.sm,
  },
  eventCardIcon: {
// TODO import client/assests/icons and use them here instead of emoji
    textAlign: 'center',
    lineHeight: 40,
    fontSize: 20,
    color: Palette.textPrimary,
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
  pressed: {
    opacity: 0.7,
  },
  headerButton: {
    cursor: 'pointer',
  },
});