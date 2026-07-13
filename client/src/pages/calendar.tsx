import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Palette, Radius } from '@/constants/tokens';
import { ThemedView } from '@/components/themed-view';
import { MonthGrid, CalendarEvent } from '@/components/calendar/month-grid';
import { ShootingStar } from '@/components/shooting-star';
import { getEventIconByType } from '@/lib/event-icons';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

export default function CalendarScreen() {
  const { width } = useWindowDimensions();
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
/**
 * PLACEHOLDER EVENTS DATA: In a real application, this data would be fetched from an API or database. For demonstration/testing purposes, there are hardcoded events.
 */
  const Events: CalendarEvent[] = [
  {
    id: '1',
    date: 12,
    eventType: 'meteor',
    title: 'Perseid Meteor Shower Peak',
    time: '02:00 AM - 05:00 AM Local',
    detail: 'Expected ZHR (Zenith Hourly Rate) of up to 100 meteors per hour. Best viewing conditions far from city lights.',
  },
  {
    id: '2',
    date: 12,
    eventType: 'launch',
    title: 'Falcon 9 - Starlink Group 8-2',
    time: '21:45 PM Local',
    detail: 'Launch visible from Eastern seaboard. Trajectory indicates clear visibility post-stage separation.',
  },
  {
    id: '3',
    date: 12,
    eventType: 'moon',
    title: 'Sturgeon Supermoon',
    time: 'All Night',
    detail: 'The Moon will be near its closest approach to the Earth and may look slightly larger than usual.',
  },
  {
    id: '4',
    date: 8,
    eventType: 'iss',
    title: 'ISS Fly Over',
    time: '19:30 PM Local',
    detail: 'International Space Station visible overhead.',
  },
];

  // Get events for selected date
  const selectedDayEvents = Events.filter((e) => e.date === selectedDate.getDate());

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
               backgroundColor: Palette.white,
              opacity: star.opacity,
            }}
          />
        ))}
      </View>

      {[0, 800, 1600, 2400, 3200, 4000].map((delay, i) => (
        <ShootingStar key={i} delay={delay} />
      ))}

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
        {/* Calendar Container */}
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
                events={Events}
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

              {selectedDayEvents.length > 0 ? (
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
                          <ThemedText style={styles.eventCardIcon}>{event.icon ?? getEventIconByType(event.eventType)}</ThemedText>
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
    paddingTop: 120,
  },
  calendarContainer: {
    marginTop: Spacing.five,
    paddingTop: Spacing.five,
    backgroundColor: 'rgba(11, 18, 38, 0.8)',
    backdropFilter: 'blur(14px)',
    borderRadius: Radius.lg,
    padding: Spacing.three,
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
  calendarSection: {
    backgroundColor: 'rgb(11, 18, 38)',
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
    gap: Spacing.three,
    position: 'relative',
    zIndex: 3,
  },
  selectedDayHeader: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
    color: Palette.textPrimary,
    letterSpacing: 4,
    textShadowColor: Palette.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
    marginTop: Spacing.three,
    zIndex: 1,
  },
  eventCount: {
    color: Palette.textSecondary,
    marginVertical: Spacing.two,
  },
  eventList: {
    gap: Spacing.three,
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
  pressed: {
    opacity: 0.7,
  },
  headerButton: {
    cursor: 'pointer',
  },
});