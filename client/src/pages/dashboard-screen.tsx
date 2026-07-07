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
import { CalendarEvents } from '@/data/calendar-events';

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

/** Converts the Moon's age (days since new moon, synodic month ≈ 29.53 days)
 * into a human-readable phase name. */
function getMoonPhaseName(age: number): string {
  if (age < 1.84) return 'New Moon';
  if (age < 5.53) return 'Waxing Crescent';
  if (age < 9.22) return 'First Quarter';
  if (age < 12.91) return 'Waxing Gibbous';
  if (age < 16.61) return 'Full Moon';
  if (age < 20.30) return 'Waning Gibbous';
  if (age < 23.99) return 'Last Quarter';
  if (age < 27.68) return 'Waning Crescent';
  return 'New Moon';
}

function getNextCalendarEvent(today: Date) {
  return CalendarEvents.find((event) => event.date >= today.getDate()) ?? CalendarEvents[0];
}

export default function DashboardScreen() {
  const router = useRouter();
  const today = new Date();
  const calendarTitle = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const nextCalendarEvent = getNextCalendarEvent(today);
  const nextCalendarDate = nextCalendarEvent
    ? new Date(today.getFullYear(), today.getMonth(), nextCalendarEvent.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : null;
  const calendarMeta = nextCalendarEvent
    ? `Next: ${nextCalendarEvent.title} - ${nextCalendarDate}`
    : 'No calendar events scheduled';
  const [locationLabel, setLocationLabel] = useState('Locating…');
  const [moonImageUrl, setMoonImageUrl] = useState<string | null>(null);
  const [moonPhasePercent, setMoonPhasePercent] = useState<number | null>(null);
  const [moonPhaseName, setMoonPhaseName] = useState('Loading…');

  useEffect(() => {
    (async () => {
      try {
        const now = new Date();
        const iso = now.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
        const res = await fetch(`https://svs.gsfc.nasa.gov/api/dialamoon/${iso}`);
        const data = await res.json();

        setMoonImageUrl(data.image?.url ?? null);
        setMoonPhasePercent(Math.round(data.phase ?? 0));
        setMoonPhaseName(getMoonPhaseName(data.age ?? 0));
      } catch (e) {
        console.log('Moon fetch error:', e);
        setMoonPhaseName('Moon data unavailable');
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationLabel('Location off');
        return;
      }

      try {
        const position = await Location.getCurrentPositionAsync({});
        const places = await Location.reverseGeocodeAsync({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });

        if (places.length > 0) {
          const place = places[0];
          const city = place.city ?? place.subregion ?? 'Unknown';
          const region = place.region ?? '';
          setLocationLabel(region ? `${city}, ${region}` : city);
        } else {
          setLocationLabel('Unknown location');
        }
      } catch (err) {
        setLocationLabel('Location unavailable');
      }
    })();
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
                {moonPhasePercent !== null ? ' —\n' : ''}
                {moonPhasePercent !== null && (
                  <Text style={styles.heroTitleAccent}>{moonPhasePercent}% illuminated</Text>
                )}
              </Text>

              <View style={styles.heroStats}>
                <Stat label="MOONRISE" value="9:42 PM" />
                <Stat label="MOONSET" value="11:18 AM" />
                <Stat label="ALTITUDE" value="34°" />
              </View>

              <View style={styles.heroNow}>
                <View style={styles.pulseDot} />
                <Text style={styles.heroNowText}>
                  The moon is currently{' '}
                  <Text style={{ fontWeight: '600' }}>above the horizon</Text> — visible now in the SE sky
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
              badge={`${CalendarEvents.length} EVENTS`}
              badgeColor={Palette.accentBlue}
              title={calendarTitle}
              meta={calendarMeta}
              thumb={<CalendarThumb />}
              onPress={() => router.push('/calendar')}
            />

            <PreviewCard
              eyebrow="LIGHT POLLUTION MAP"
              badge="BORTLE 4"
              badgeColor={Palette.accentGreen}
              title="Your Sky Tonight"
              meta="Suburban/transition zone · best viewing 30mi NE"
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
    <View style={{ marginRight: spacing.lg }}>
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

function CalendarThumb() {
  const today = new Date();

  return (
    <MonthGrid
      year={today.getFullYear()}
      month={today.getMonth()}
      selectedDate={today}
      events={CalendarEvents}
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
  heroTitleAccent: { color: Palette.accentMoon },
  heroStats: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    flexWrap: 'wrap',
    rowGap: spacing.sm,
  },
  statLabel: {
    fontSize: 10,
    color: Palette.textTertiary,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 14,
    color: Palette.textPrimary,
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
