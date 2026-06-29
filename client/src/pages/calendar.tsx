import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Palette, Radius } from '@/constants/tokens';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

const categories = ['Meteor Showers', 'Rocket Launches', 'Alignments', 'More Filters'];

//==================================================
// To get calendar data for a given month/year
//==================================================
function getCalendarRows(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());

  const rows: (string | number)[][] = [['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']];
  let week: number[] = [];
  let current = new Date(startDate);

  while (current <= lastDay || week.length > 0) {
    week.push(current.getDate());
    if (week.length === 7) {
      rows.push([...week]);
      week = [];
    }
    current.setDate(current.getDate() + 1);
  }

  return rows;
}

//==========================================================================
// Mock events data 
//==========================================================================
const Events = [
  {
    id: '1',
    date: 12,
    title: 'Perseid Meteor Shower Peak',
    time: '02:00 AM - 05:00 AM Local',
    detail: 'Expected ZHR (Zenith Hourly Rate) of up to 100 meteors per hour. Best viewing conditions far from city lights.',
    icon: '✕',
  },
  {
    id: '2',
    date: 12,
    title: 'Falcon 9 - Starlink Group 8-2',
    time: '21:45 PM Local',
    detail: 'Launch visible from Eastern seaboard. Trajectory indicates clear visibility post-stage separation.',
    icon: '✕',
  },
  {
    id: '3',
    date: 12,
    title: 'Sturgeon Supermoon',
    time: 'All Night',
    detail: 'The Moon will be near its closest approach to the Earth and may look slightly larger than usual.',
    icon: '✕',
  },
  {
    id: '4',
    date: 8,
    title: 'ISS Fly Over',
    time: '19:30 PM Local',
    detail: 'International Space Station visible overhead.',
    icon: '✕',
  },
];

export default function CalendarScreen() {
  const { width } = useWindowDimensions();
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const calendarRows = getCalendarRows(currentYear, currentMonth);
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const monthStart = new Date(currentYear, currentMonth, 1);

  //============================
  // Get events for selected date
  //============================
  const selectedDayEvents = Events.filter((e) => e.date === selectedDate.getDate());

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

        {/* ================================================================
            "Frosted Glass" Container for Calendar + Selected Day
            ================================================================ */}
        <ThemedView style={styles.calendarContainer}>
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

              <ThemedView style={styles.calendarCard}>
                {calendarRows.map((row, rowIndex) => (
                  <View key={`row-${rowIndex}`} style={styles.calendarRow}>
                    {row.map((day) => {
                      const isHeader = typeof day === 'string';
                      const dayNum = typeof day === 'number' ? day : 0;
                      const isCurrentMonth = dayNum >= 1 && dayNum <= daysInMonth;
                      const isSelected =
                        isCurrentMonth &&
                        dayNum === selectedDate.getDate() &&
                        currentMonth === selectedDate.getMonth() &&
                        currentYear === selectedDate.getFullYear();
                      const dayEvents = Events.filter((e) => e.date === dayNum);

                      return (
                        <Pressable
                          key={`day-${day}-${rowIndex}`}
                          onPress={() => {
                            if (isCurrentMonth) {
                              setSelectedDate(new Date(currentYear, currentMonth, dayNum));
                            }
                          }}
                          disabled={!isCurrentMonth && !isHeader}
                          style={({ pressed }) => pressed && !isHeader && styles.pressed}>
                          <ThemedView
                            style={[
                              styles.dayCell,
                              isHeader && styles.dayCellHeader,
                              isSelected && styles.dayCellSelected,
                              !isCurrentMonth && !isHeader && styles.dayCellDisabled,
                            ]}>
                            <View style={styles.dayNumberContainer}>
                            <ThemedText
                              type={isHeader ? 'smallBold' : isSelected ? 'smallBold' : 'small'}
                              style={
                                isHeader
                                  ? styles.dayHeaderText
                                  : isSelected
                                    ? styles.dayCellSelectedText
                                    : !isCurrentMonth
                                      ? styles.dayCellDisabledText
                                      : styles.dayCellText
                              }>
                              {day}
                            </ThemedText>
                          </View>
                            {/* ====================================
                                Event icons for this day
                                ==================================== */}
                            {dayEvents.length > 0 && !isHeader && (
                              <View style={styles.eventIconsContainer}>
                                {dayEvents.slice(0, 3).map((event, idx) => (
                                  <View key={event.id} style={styles.eventIconBox}>
                                    <ThemedText style={styles.eventIcon}>{event.icon}</ThemedText>
                                  </View>
                                ))}
                              </View>
                            )}
                          </ThemedView>
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </ThemedView>
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

              {selectedDayEvents.length > 0 ? (
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
  calendarContainer: {
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
  //================================================== 
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
         fontWeight: '900',
      color: Palette.white,
      letterSpacing: 4,
      marginBottom: 4,
      textShadowColor: Palette.accent,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 14,
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
         fontWeight: '900',
      color: Palette.white,
      letterSpacing: 4,
      marginBottom: 4,
      textShadowColor: Palette.accent,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 14,
  },
  dayHeaderText: {
         fontWeight: '900',
      color: Palette.white,
      letterSpacing: 4,
      marginBottom: 4,
      textShadowColor: Palette.accent,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 14,
  },
  dayCellSelectedText: {
         fontWeight: '900',
      color: Palette.white,
      letterSpacing: 4,
      marginBottom: 4,
      textShadowColor: Palette.accent,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 14,
  },
  dayCellDisabledText: {
         fontWeight: '900',
      color: Palette.white,
      letterSpacing: 4,
      marginBottom: 4,
      textShadowColor: Palette.accent,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 14,
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
         fontWeight: '900',
      color: Palette.white,
      letterSpacing: 4,
      marginBottom: 4,
      textShadowColor: Palette.accent,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 14,
  },
  selectedDateText: {
           fontWeight: '900',
      color: Palette.white,
      letterSpacing: 4,
      marginBottom: 4,
      textShadowColor: Palette.accent,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 14,
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
  pressed: {
    opacity: 0.7,
  },
});

