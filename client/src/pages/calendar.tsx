import React, { useEffect, useMemo, useState } from 'react';
import * as Location from 'expo-location';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MonthGrid } from '@/components/calendar/month-grid';
import { Spacing } from '@/constants/theme';
import { useCalendarEvents } from '@/hooks/use-calendar-events';
import { getCalendarEventsForDate, getCalendarEventsForMonth } from '@/utilities/events-api';

const categories = ['Meteor Showers', 'Rocket Launches', 'Alignments', 'More Filters'];
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
      ...(browserCoords ?? {}),
    };
  }, [browserCoords, loadedWindow.fromDate, loadedWindow.toDate]);
  const { events, isLoading, error } = useCalendarEvents(calendarQuery);

  //============================
  // Get events for selected date
  //============================
  const selectedDayEvents = getCalendarEventsForDate(events, selectedDate);
  const currentMonthEvents = getCalendarEventsForMonth(events, currentYear, currentMonth);

  //========================================================================
  // Determine if layout should be vertical (mobile) or horizontal (desktop)
  //========================================================================
  const isVertical = width < 900;
  const monthName = new Date(currentYear, currentMonth).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <SafeAreaView style={styles.safeArea}>
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
            {/* ============================================================
                Calendar Section (Left)
                ============================================================ */}
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
                  style={({ pressed }) => pressed && styles.pressed}>
                  <ThemedText type="small">← Prev</ThemedText>
                </Pressable>
                <ThemedText type="title" style={styles.monthTitle}>
                  {monthName}
                </ThemedText>
                <Pressable
                  onPress={() => {
                    if (currentMonth === 11) {
                      setCurrentMonth(0);
                      setCurrentYear(currentYear + 1);
                    } else {
                      setCurrentMonth(currentMonth + 1);
                    }
                  }}
                  style={({ pressed }) => pressed && styles.pressed}>
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

            {/* ============================================================
                Selected Day Panel (Right)
                ============================================================ */}
            <ThemedView style={[styles.selectedDayPanel, !isVertical && { flex: 0.3 }]}>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
                SELECTED DAY
              </ThemedText>
              <ThemedText type="title" style={styles.selectedDateText}>
                {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </ThemedText>

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
                  <ThemedText type="small" themeColor="textSecondary" style={styles.shootingStarsPlaceholder}>
                    {error}
                  </ThemedText>
                </View>
              ) : selectedDayEvents.length > 0 ? (
                <>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.eventCount}>
                    {selectedDayEvents.length} celestial event{selectedDayEvents.length !== 1 ? 's' : ''} detected.
                  </ThemedText>

                  <ScrollView
                    style={styles.eventListContainer}
                    showsVerticalScrollIndicator={true}
                    contentContainerStyle={styles.eventList}>
                    {selectedDayEvents.map((event) => (
                      <ThemedView key={event.id} style={styles.eventCard}>
                        <View style={styles.eventCardIconBox}>
                          <ThemedText style={styles.eventCardIcon}>{event.icon}</ThemedText>
                        </View>
                        <View style={styles.eventContent}>
                          <ThemedText type="smallBold" style={styles.eventTitle}>
                            {event.title}
                          </ThemedText>
                          <ThemedText type="small" themeColor="textSecondary" style={styles.eventTime}>
                            {event.time}
                          </ThemedText>
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
                  <ThemedText type="small" themeColor="textSecondary" style={styles.shootingStarsPlaceholder}>
                    [Shooting stars image will appear here]
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
    backgroundColor: '#050814',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: Spacing.three,
    gap: Spacing.four,
    paddingTop: 120,
  },
  //==================================================
  // Frosted Glass Container
  //==================================================
  frostedContainer: {
    marginTop: 24,
    paddingTop: 16,
    backgroundColor: 'rgba(11, 18, 38, 0.8)',
    backdropFilter: 'blur(14px)',
    borderRadius: Spacing.five,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: 'rgba(58, 134, 255, 0.25)',
  },
  layoutHorizontal: {
    flexDirection: 'row',
    gap: Spacing.four,
  },
  layoutVertical: {
    flexDirection: 'column',
    gap: Spacing.four,
  },
  //==================================================
  // Calendar Section (Left)
  //==================================================  cd cl
  calendarSection: {
    backgroundColor: 'rgb(11, 18, 38)',
    gap: Spacing.three,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
    paddingBottom: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: '#FFFFFF',
    backgroundColor: 'rgb(11, 18, 38)',
    borderRadius: Spacing.three,
    padding: Spacing.two,
  },
  monthTitle: {
    color: '#FFFFFF',
  },
  calendarCard: {
    backgroundColor: 'rgb(11, 18, 38)',
    gap: 0,
    width: '100%',
  },
  calendarRow: {
    flexDirection: 'row',
    marginBottom: 1,
    gap: 1,
    justifyContent: 'space-between',
    width: '100%',
  },
  dayCell: {
    flex: 1,
    minHeight: 130,
    minWidth: 140,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(22, 32, 61, 0.72)',
    borderRadius: Spacing.three,
    paddingHorizontal: 10,
    paddingVertical: 10,
    position: 'relative',
  },
  dayCellHeader: {
    backgroundColor: 'transparent',
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellSelected: {
    backgroundColor: 'rgba(58, 134, 255, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(58, 134, 255, 0.55)',
  },
  dayCellDisabled: {
    backgroundColor: 'rgba(15, 20, 32, 0.35)',
    opacity: 1,
  },
  dayCellText: {
    color: '#B0B4BA',
  },
  dayHeaderText: {
    color: '#A7C4FF',
    fontWeight: '600',
  },
  dayCellSelectedText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  dayCellDisabledText: {
    color: '#6B7280',
  },
  //==================================================
  // Event Icons in Day Cells
  //==================================================
  eventIconsContainer: {
    position: 'absolute',
    bottom: Spacing.one,
    left: 0,
    right: 0,
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.half,
  },
  dayNumberContainer: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    minHeight: 26,
    width: '100%',
  },
  eventIconBox: {
    width: 20,
    height: 20,
    backgroundColor: '#3A86FF',
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventIcon: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  selectedDayPanel: {
    backgroundColor: 'rgb(11, 18, 38)',
    gap: Spacing.three,
  },
  sectionLabel: {
    color: '#A7C4FF',
  },
  selectedDateText: {
    color: '#FFFFFF',
  },
  eventCount: {
    color: '#B0B4BA',
  },
  eventListContainer: {
    maxHeight: 500,
  },
  eventList: {
    gap: Spacing.three,
  },
  eventCard: {
    backgroundColor: '#10172C',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    flexDirection: 'row',
    gap: Spacing.three,
  },
  eventCardIconBox: {
    width: 40,
    height: 40,
    backgroundColor: '#3A86FF',
    borderRadius: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventCardIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  eventContent: {
    flex: 1,
    gap: Spacing.one,
  },
  eventTitle: {
    color: '#FFFFFF',
  },
  eventTime: {
    color: '#A7C4FF',
  },
  eventDetail: {
    color: '#B0B4BA',
  },
  noEventsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
    gap: Spacing.three,
  },
  noEventsText: {
    color: '#B0B4BA',
  },
  shootingStarsPlaceholder: {
    color: '#6B7280',
    fontStyle: 'italic',
  },
  //==================================================
  // Filter Buttons Container
  //==================================================
  filterButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
    marginTop: 20,
  },
  categoryPill: {
    backgroundColor: '#1A2744',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
  },
  categoryText: {
    color: '#A7C4FF',
  },
  locationNotice: {
    paddingHorizontal: Spacing.two,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.7,
  },
});

