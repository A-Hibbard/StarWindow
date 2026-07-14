import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getEventIconByType } from '@/lib/event-icons';
import { Spacing } from '@/constants/theme';

export type CalendarEvent = {
  id: string;
  date: number;
  eventType?: string;
  icon?: string;
};

type CalendarDay = {
  key: string;
  date: number;
  currentMonth: boolean;
};

type MonthGridProps = {
  year: number;
  month: number;
  events?: CalendarEvent[];
  selectedDate?: Date;
  onSelectDate?: (date: Date) => void;
  compact?: boolean;
};

const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function getCalendarWeeks(year: number, month: number): CalendarDay[][] {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const previousMonthDays = new Date(year, month, 0).getDate();
  const cells: CalendarDay[] = [];

  for (let offset = firstDay.getDay() - 1; offset >= 0; offset -= 1) {
    const date = previousMonthDays - offset;
    cells.push({ key: `prev-${date}`, date, currentMonth: false });
  }

  for (let date = 1; date <= daysInMonth; date += 1) {
    cells.push({ key: `current-${date}`, date, currentMonth: true });
  }

  const trailingDays = cells.length <= 35 ? 35 - cells.length : 42 - cells.length;
  for (let date = 1; date <= trailingDays; date += 1) {
    cells.push({ key: `next-${date}`, date, currentMonth: false });
  }

  const weeks: CalendarDay[][] = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }

  return weeks;
}

export function MonthGrid({
  year,
  month,
  events = [],
  selectedDate,
  onSelectDate,
  compact = false,
}: MonthGridProps) {
  const weeks = getCalendarWeeks(year, month);

  return (
    <View style={[styles.calendarCard, compact && styles.calendarCardCompact]}>
      <View style={[styles.calendarRow, compact && styles.calendarRowCompact]}>
        {weekdays.map((day) => (
          <View key={day} style={[styles.dayCell, styles.dayCellHeader, compact && styles.dayCellCompact]}>
            <Text style={[styles.dayHeaderText, compact && styles.dayHeaderTextCompact]}>
              {compact ? day.slice(0, 1) : day}
            </Text>
          </View>
        ))}
      </View>

      {weeks.map((week, weekIndex) => (
        <View key={`week-${weekIndex}`} style={[styles.calendarRow, compact && styles.calendarRowCompact]}>
          {week.map((day) => {
            const isSelected =
              day.currentMonth &&
              selectedDate?.getDate() === day.date &&
              selectedDate?.getMonth() === month &&
              selectedDate?.getFullYear() === year;
            const dayEvents = day.currentMonth ? events.filter((event) => event.date === day.date) : [];
            const dayContent = (
              <View
                style={[
                  styles.dayCell,
                  compact && styles.dayCellCompact,
                  isSelected && styles.dayCellSelected,
                  !day.currentMonth && styles.dayCellDisabled,
                ]}>
                <View style={[styles.dayNumberContainer, compact && styles.dayNumberContainerCompact]}>
                  <Text
                    style={[
                      styles.dayCellText,
                      compact && styles.dayCellTextCompact,
                      isSelected && styles.dayCellSelectedText,
                      !day.currentMonth && styles.dayCellDisabledText,
                    ]}>
                    {day.date}
                  </Text>
                </View>
                {dayEvents.length > 0 && (
                  <View style={[styles.eventIconsContainer, compact && styles.eventIconsContainerCompact]}>
                    {dayEvents.slice(0, compact ? 1 : 3).map((event) => (
                      <View key={event.id} style={[styles.eventIconBox, compact && styles.eventIconBoxCompact]}>
                        {!compact && (
                          <Text style={styles.eventIcon}>
                            {event.icon ?? getEventIconByType(event.eventType)}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );

            if (!onSelectDate || !day.currentMonth || compact) {
              return <View key={day.key} style={styles.dayPressable}>{dayContent}</View>;
            }

            return (
              <Pressable
                key={day.key}
                onPress={() => onSelectDate(new Date(year, month, day.date))}
                style={({ pressed }) => [styles.dayPressable, pressed && styles.pressed]}>
                {dayContent}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  calendarCard: {
    backgroundColor: 'rgb(11, 18, 38)',
    gap: 0,
    width: '100%',
  },
  calendarCardCompact: {
    flex: 1,
    padding: 8,
  },
  calendarRow: {
    flexDirection: 'row',
    marginBottom: 1,
    gap: 1,
    justifyContent: 'space-between',
    width: '100%',
  },
  calendarRowCompact: {
    flex: 1,
    minHeight: '2dvh' as any,
  },
  dayPressable: {
    flex: 1,
    minWidth: 0,
  },
  dayCell: {
    flex: 1,
    minHeight: 130,
    minWidth: 0,
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(22, 32, 61, 0.72)',
    borderRadius: Spacing.three,
    paddingHorizontal: 10,
    paddingVertical: 10,
    position: 'relative',
  },
  dayCellCompact: {
    minHeight: '2dvh' as any,
    minWidth: 0,
    borderRadius: 4,
    paddingHorizontal: 0,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
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
  dayNumberContainer: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    minHeight: 26,
    width: '100%',
  },
  dayNumberContainerCompact: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 0,
  },
  dayCellText: {
    color: '#B0B4BA',
  },
  dayCellTextCompact: {
    fontSize: 9,
    lineHeight: 11,
    textAlign: 'center',
    width: '100%',
  },
  dayHeaderText: {
    color: '#A7C4FF',
    fontWeight: '600',
  },
  dayHeaderTextCompact: {
    fontSize: 9,
    lineHeight: 11,
  },
  dayCellSelectedText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  dayCellDisabledText: {
    color: '#6B7280',
  },
  eventIconsContainer: {
    position: 'absolute',
    bottom: Spacing.one,
    left: 0,
    right: 0,
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.half,
  },
  eventIconsContainerCompact: {
    bottom: 1,
  },
  eventIconBox: {
    width: 20,
    height: 20,
    backgroundColor: '#3A86FF',
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventIconBoxCompact: {
    width: 3,
    height: 3,
    borderRadius: 2,
  },
  eventIcon: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  pressed: {
    opacity: 0.7,
  },
});
