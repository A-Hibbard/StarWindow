// pages/dashboard-screen.tsx
// StarWindow — Home Dashboard
// Left rail with 4 tabs (Calendar, Map, Launches, Profile),
// moon-phase hero, and preview cards for each tab.
//
// UPDATED: now imports Palette/Radius from @/constants/tokens (the same
// source the login screen uses) instead of a local hardcoded `colors`
// object, so the two screens share one color scheme.

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Palette, Radius } from '@/constants/tokens';
import { ShootingStar } from '@/components/shooting-star';
import { MonthGrid } from '@/components/calendar/month-grid';
import { useCalendarEvents } from '@/hooks/use-calendar-events';
import {
  getCalendarEventsForMonth,
  getNextCalendarEvent,
  type CalendarEvent,
} from '@/utilities/events-api';
import { fetchNearestLocation } from '@/utilities/location-api';
import { fetchMoonPhase } from '@/utilities/moon-api';

const STARS = Array.from({ length: 150 }, (_, i) => ({
  top: (i * 23.7) % 100,
  left: (i * 41.3) % 100,
  size: (i % 4) + 0.5,
  opacity: (i % 6) * 0.08 + 0.15,
}));

const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 44,
};

const LOCATION_REQUIRED_LABEL = 'Location required';
const LOCATION_SETTINGS_MESSAGE = 'Enable browser location access in site settings to load your sky data.';

function formatMoonTrend(value: string | null) {
  return value ?? 'Loading';
}

function formatMoonPercent(value: number | null) {
  return value === null ? 'Loading' : `${Math.round(value)}%`;
}

function formatMoonDate(value: string | null) {
  if (!value) return 'Today';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'Today';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatCoordinates(latitude: number, longitude: number) {
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

export default function DashboardScreen() {
  const router = useRouter();
  const today = new Date();
  const [browserCoords, setBrowserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const { events, isLoading: isCalendarLoading, error: calendarError } = useCalendarEvents(
    browserCoords ?? undefined
  );
  const currentMonthEvents = getCalendarEventsForMonth(events, today.getFullYear(), today.getMonth());
  const calendarTitle = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const nextCalendarEvent = getNextCalendarEvent(events, today);
  const nextCalendarDate = nextCalendarEvent
    ? new Date(nextCalendarEvent.startDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : null;
  const calendarBadge = isCalendarLoading ? 'LOADING' : calendarError ? 'UNAVAILABLE' : `${currentMonthEvents.length} EVENTS`;
  const calendarMeta = isCalendarLoading
    ? 'Loading upcoming events...'
    : calendarError
    ? 'Could not load event data'
    : nextCalendarEvent
    ? `Next: ${nextCalendarEvent.title} - ${nextCalendarDate}`
    : 'No calendar events scheduled';
  const [locationLabel, setLocationLabel] = useState('Requesting location...');
  const [locationMessage, setLocationMessage] = useState('Waiting for browser location access.');
  const [moonImageUrl, setMoonImageUrl] = useState<string | null>(null);
  const [moonPhasePercent, setMoonPhasePercent] = useState<number | null>(null);
  const [moonPhaseTrend, setMoonPhaseTrend] = useState<string | null>(null);
  const [moonPhaseDate, setMoonPhaseDate] = useState<string | null>(null);
  const [moonPhaseName, setMoonPhaseName] = useState('Waiting for location...');

  useEffect(() => {
    let isMounted = true;

    function clearMoonData(message: string) {
      setMoonImageUrl(null);
      setMoonPhasePercent(null);
      setMoonPhaseTrend(null);
      setMoonPhaseDate(null);
      setMoonPhaseName(message);
    }

    async function loadMoonPhase(coords: { latitude: number; longitude: number }) {
      try {
        const moon = await fetchMoonPhase(coords);
        if (!isMounted) return;
        setMoonImageUrl(moon.image_url ?? null);
        setMoonPhasePercent(moon.phase_percent ?? null);
        setMoonPhaseTrend(moon.phase_trend ?? null);
        setMoonPhaseDate(moon.phase_date ?? null);
        setMoonPhaseName(moon.phase_string ?? 'Moon phase unavailable');
      } catch (error) {
        console.log('Moon fetch error:', error);
        if (isMounted) {
          setMoonPhaseName('Moon data unavailable');
        }
      }
    }

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (!isMounted) return;
        if (status !== 'granted') {
          setBrowserCoords(null);
          setLocationLabel(LOCATION_REQUIRED_LABEL);
          setLocationMessage(LOCATION_SETTINGS_MESSAGE);
          clearMoonData('Location permission required');
          return;
        }

        const position = await Location.getCurrentPositionAsync({});
        if (!isMounted) return;
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setBrowserCoords(coords);
        setLocationLabel(formatCoordinates(coords.latitude, coords.longitude));
        setLocationMessage('Sky data is based on your current browser location.');
        void loadMoonPhase(coords);

        try {
          const nearest = await fetchNearestLocation(coords);
          if (!isMounted) return;
          setLocationLabel(nearest.label);
        } catch (error) {
          console.log('Nearest city lookup unavailable:', error);
        }

        try {
          const places = await Location.reverseGeocodeAsync({
            latitude: coords.latitude,
            longitude: coords.longitude,
          });

          if (!isMounted || places.length === 0) return;
          const place = places[0];
          const city = place.city ?? place.subregion;
          const region = place.region ?? '';
          if (city) setLocationLabel(region ? `${city}, ${region}` : city);
        } catch (error) {
          console.log('Reverse geocode unavailable:', error);
        }
      } catch (err) {
        if (!isMounted) return;
        setBrowserCoords(null);
        setLocationLabel(LOCATION_REQUIRED_LABEL);
        setLocationMessage(LOCATION_SETTINGS_MESSAGE);
        clearMoonData('Location unavailable');
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <SafeAreaView style={styles.app}>
      <View style={styles.starField}>
        {STARS.map((star, i) => (
          <View key={i} style={{
            position: 'absolute',
            top: `${star.top}%` as any,
            left: `${star.left}%` as any,
            width: star.size,
            height: star.size,
            borderRadius: star.size,
            backgroundColor: Palette.white,
            opacity: star.opacity,
          }} />
        ))}
      </View>

      {[0, 800, 1600, 2400, 3200, 4000].map((delay, i) => (
        <ShootingStar key={i} delay={delay} />
      ))}

      <View style={styles.body}>
        {/* ---------- MAIN CONTENT ---------- */}
        <ScrollView style={styles.main} contentContainerStyle={styles.mainContent}>
          <View style={styles.topBar}>
            <View>
              <Text style={styles.eyebrow}>TONIGHT'S SKY · MON, JUN 22</Text>
              <Text style={styles.greeting}>Clear skies ahead, Sam</Text>
            </View>
            <View style={styles.locationChip}>
              <Text style={styles.locationChipText}>📍 {locationLabel}</Text>
            </View>
          </View>

          {/* ---------- MOON HERO ---------- */}
          <View style={styles.hero}>
            <View style={styles.heroLeft}>
              <Text style={styles.heroEyebrow}>MOON PHASE · LIVE</Text>
              <Text style={styles.heroTitle}>
                {moonPhaseName}
              </Text>

              <View style={styles.heroStats}>
                <Stat label="ILLUMINATION" value={formatMoonPercent(moonPhasePercent)} />
                <Stat label="MOON TREND" value={formatMoonTrend(moonPhaseTrend)} />
                <Stat label="PHASE DATE" value={formatMoonDate(moonPhaseDate)} />
              </View>

              <View style={styles.heroNow}>
                <View style={styles.pulseDot} />
                <Text style={styles.heroNowText}>
                  {locationMessage}
                </Text>
              </View>
            </View>

            <View style={styles.moonStage}>
              <View style={styles.moonOrbitRing} />
              <View style={styles.moonDisc}>
                {moonImageUrl ? (
                  <Image
                    source={{ uri: moonImageUrl }}
                    style={styles.moonImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.moonLoading} />
                )}
              </View>
            </View>
          </View>

          <SectionLabel text="YOUR TABS" />

          {/* ---------- PREVIEW CARDS ---------- */}
          <View style={styles.previewGrid}>
            <PreviewCard
              eyebrow="CALENDAR"
              badge={calendarBadge}
              badgeColor={Palette.accentBlue}
              title={calendarTitle}
              meta={calendarMeta}
              thumb={<CalendarThumb events={currentMonthEvents} />}
              onPress={() => router.push('/calendar')}
            />

            <PreviewCard
              eyebrow="LIGHT POLLUTION MAP"
              badge="LIVE"
              badgeColor={Palette.accentGreen}
              title="Your Sky Tonight"
              meta="Requires browser location access"
              thumb={<MapThumb />}
              onPress={() => router.push('/map')}
            />

            <PreviewCard
              eyebrow="LAUNCHES"
              badge="T–6H 12M"
              badgeColor={Palette.accentRed}
              title="Falcon 9 · Starlink 11-4"
              meta="Cape Canaveral SLC-40 · visible from your location"
              thumb={<LaunchThumb />}
              onPress={() => router.push('/explore')}
            />
          </View>

          <SectionLabel text="ACCOUNT" />

          <Pressable style={styles.profileCard} onPress={() => {}}>
            <View style={styles.profileRing}>
              <View style={styles.profileAvatar} />
            </View>
            <View style={{ marginLeft: spacing.md }}>
              <Text style={styles.previewTitle}>Sam Rivera</Text>
              <Text style={styles.previewMeta}>68% sky log complete · Lvl 4 Stargazer</Text>
            </View>
          </Pressable>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

/* ---------- small subcomponents ---------- */

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <View style={styles.sectionLabelRow}>
      <Text style={styles.sectionLabelText}>{text}</Text>
      <View style={styles.sectionLabelLine} />
    </View>
  );
}

function PreviewCard({
  eyebrow,
  badge,
  badgeColor,
  title,
  meta,
  thumb,
  onPress,
}: {
  eyebrow: string;
  badge: string;
  badgeColor: string;
  title: string;
  meta: string;
  thumb: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.previewCard} onPress={onPress}>
      <View style={styles.previewThumb}>{thumb}</View>
      <View style={styles.previewBody}>
        <View style={styles.previewEyebrowRow}>
          <Text style={styles.previewEyebrow}>{eyebrow}</Text>
          <View style={[styles.badge, { backgroundColor: badgeColor + '20' }]}>
            <Text style={[styles.badgeText, { color: badgeColor }]}>{badge}</Text>
          </View>
        </View>
        <Text style={styles.previewTitle}>{title}</Text>
        <Text style={styles.previewMeta}>{meta}</Text>
      </View>
    </Pressable>
  );
}

function CalendarThumb({ events }: { events: CalendarEvent[] }) {
  const today = new Date();

  return (
    <MonthGrid
      year={today.getFullYear()}
      month={today.getMonth()}
      selectedDate={today}
      events={events}
      compact
    />
  );
}

function MapThumb() {
  return (
    <View style={styles.mapThumb}>
      <View style={styles.mapPin} />
    </View>
  );
}

function LaunchThumb() {
  return (
    <View style={styles.launchThumb}>
      <View style={styles.launchTrail} />
      <Text style={styles.launchRocket}>🚀</Text>
    </View>
  );
}

/* ---------- styles ---------- */

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: Palette.bgVoid, overflow: 'hidden' },
  starField: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  body: { flex: 1 },

  main: { flex: 1 },
  mainContent: {
    padding: spacing.lg,
    paddingLeft: 20,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
  },
  topBar: {
    marginBottom: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  eyebrow: {
    fontSize: 11,
    color: Palette.accentMoon,
    letterSpacing: 1,
    marginBottom: 6,
    fontWeight: '600',
  },
  greeting: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
    color: Palette.textPrimary,
  },
  locationChip: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.borderSoft,
    borderRadius: Radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  locationChipText: {
    fontSize: 12,
    color: Palette.textSecondary,
  },

  hero: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.borderSoft,
    borderRadius: Radius.lg,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  heroLeft: {},
  heroEyebrow: {
    fontSize: 11,
    color: Palette.textTertiary,
    letterSpacing: 1,
    marginBottom: 8,
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: Palette.textPrimary,
    marginBottom: spacing.md,
    lineHeight: 34,
  },
  heroStats: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    flexWrap: 'wrap',
    rowGap: spacing.sm,
    columnGap: spacing.lg,
  },
  statLabel: {
    fontSize: 10,
    color: Palette.textSecondary,
    marginBottom: 4,
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  statValue: {
    fontSize: 16,
    color: Palette.accentMoon,
    fontWeight: '600',
  },
  heroNow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.accentMoon + '14',
    borderWidth: 1,
    borderColor: Palette.accentMoon + '40',
    borderRadius: Radius.sm,
    padding: 10,
    gap: 8,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Palette.accentGreen,
  },
  heroNowText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: Palette.textPrimary,
  },
  moonStage: {
    width: '100%',
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moonOrbitRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: Palette.border,
    borderStyle: 'dashed',
    opacity: 0.5,
  },
  moonDisc: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    backgroundColor: Palette.bgDeep,
    shadowColor: Palette.accentMoon,
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 8,
  },
  moonImage: {
    width: '100%',
    height: '100%',
  },
  moonLoading: {
    width: '100%',
    height: '100%',
    backgroundColor: Palette.surfaceRaised,
  },

  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionLabelText: {
    fontSize: 12,
    color: Palette.textTertiary,
    letterSpacing: 1,
    fontWeight: '600',
  },
  sectionLabelLine: {
    flex: 1,
    height: 1,
    backgroundColor: Palette.borderSoft,
  },

  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  previewCard: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.borderSoft,
    borderRadius: Radius.md,
    overflow: 'hidden',
    flexBasis: '31%',
    flexGrow: 1,
    minWidth: 230,
  },
  previewThumb: {
    height: 168,
    backgroundColor: Palette.bgDeep,
    borderBottomWidth: 1,
    borderBottomColor: Palette.borderSoft,
  },
  previewBody: {
    padding: spacing.sm,
    alignItems: 'stretch',
    gap: 3,
  },
  previewEyebrowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 3,
  },
  previewEyebrow: {
    flex: 1,
    fontSize: 10,
    color: Palette.textTertiary,
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: Radius.pill,
  },
  badgeText: {
    fontSize: 8.5,
    fontWeight: '700',
  },
  previewTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
    color: Palette.textPrimary,
  },
  previewMeta: {
    fontSize: 12,
    lineHeight: 17,
    color: Palette.textSecondary,
  },

  mapThumb: {
    flex: 1,
    backgroundColor: Palette.bgDeep,
  },
  mapPin: {
    position: 'absolute',
    top: '55%',
    left: '42%',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Palette.accentMoon,
    borderWidth: 1.5,
    borderColor: Palette.bgDeep,
  },

  launchThumb: {
    flex: 1,
    backgroundColor: Palette.bgDeep,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  launchTrail: {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    marginLeft: -1.5,
    width: 3,
    height: '60%',
    backgroundColor: Palette.accentMoon,
    opacity: 0.5,
  },
  launchRocket: { fontSize: 20 },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.borderSoft,
    borderRadius: Radius.md,
    padding: spacing.md,
  },
  profileRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Palette.accentMoon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Palette.accentBlue,
  },
});
