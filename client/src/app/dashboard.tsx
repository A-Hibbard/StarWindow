// app/dashboard.tsx
// StarWindow — Home Dashboard
// Left rail with 4 tabs (Calendar, Map, Launches, Profile),
// moon-phase hero, and preview cards for each tab.
// Colors are written directly in this file (no theme.js needed).

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';

// ---------- StarWindow colors ----------
const colors = {
  bgVoid: '#070809',
  bgDeep: '#0A0C0E',
  surface: '#0F1518',
  surfaceRaised: '#141C20',
  border: '#1E3A40',
  borderSoft: '#16252A',
  textPrimary: '#E8F4F6',
  textSecondary: '#7FA8AE',
  textTertiary: '#3D5358',
  accentMoon: '#3DD9E8',
  accentMoonDim: '#1C6B73',
  accentGlow: '#5EEFFA',
  accentBlue: '#5B9FFF',
  accentGreen: '#4ADEC4',
  accentRed: '#FF6B5B',
};

const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 44,
};

const radius = {
  sm: 8,
  md: 14,
  lg: 16,
  xl: 20,
  pill: 100,
};

export default function DashboardScreen() {
  const router = useRouter();
  const [locationLabel, setLocationLabel] = useState('Locating…');

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
      <View style={styles.body}>
        {/* ---------- LEFT RAIL ---------- */}
        <View style={styles.rail}>
          <View style={styles.railMark}>
            <View style={styles.railMarkCell} />
            <View style={styles.railMarkCell} />
            <View style={styles.railMarkCell} />
            <View style={styles.railMarkCell} />
          </View>

          <RailTab label="Calendar" active onPress={() => {}} />
          <RailTab label="Map" onPress={() => {}} />
          <RailTab label="Launches" onPress={() => {}} />
          <RailTab label="Profile" onPress={() => {}} />
        </View>

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
                Waning Gibbous —{'\n'}
                <Text style={styles.heroTitleAccent}>78% illuminated</Text>
              </Text>

              <View style={styles.heroStats}>
                <Stat label="MOONRISE" value="9:42 PM" />
                <Stat label="MOONSET" value="11:18 AM" />
                <Stat label="ALTITUDE" value="34°" />
              </View>

              <View style={styles.heroNow}>
                <View style={styles.pulseDot} />
                <Text style={styles.heroNowText}>
                  The moon is currently <Text style={{ fontWeight: '600' }}>above the horizon</Text> — visible now in the SE sky
                </Text>
              </View>
            </View>

            <View style={styles.moonStage}>
              <View style={styles.moonOrbitRing} />
              <View style={styles.moonDisc}>
                <View style={styles.moonShadow} />
              </View>
            </View>
          </View>

          <SectionLabel text="YOUR TABS" />

          {/* ---------- PREVIEW CARDS ---------- */}
          <View style={styles.previewGrid}>
            <PreviewCard
              eyebrow="CALENDAR"
              badge="3 EVENTS"
              badgeColor={colors.accentBlue}
              title="June 2026"
              meta="Next: Perseid prep notes · Jun 24"
              thumb={<CalendarThumb />}
              onPress={() => {}}
            />

            <PreviewCard
              eyebrow="LIGHT POLLUTION MAP"
              badge="BORTLE 4"
              badgeColor={colors.accentGreen}
              title="Your Sky Tonight"
              meta="Suburban/transition zone · best viewing 30mi NE"
              thumb={<MapThumb />}
              onPress={() => {}}
            />

            <PreviewCard
              eyebrow="LAUNCHES"
              badge="T–6H 12M"
              badgeColor={colors.accentRed}
              title="Falcon 9 · Starlink 11-4"
              meta="Cape Canaveral SLC-40 · visible from your location"
              thumb={<LaunchThumb />}
              onPress={() => {}}
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

function RailTab({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.railTab, active && styles.railTabActive]}>
      {active && <View style={styles.railTabIndicator} />}
      <Text style={[styles.railTabLabel, active && styles.railTabLabelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

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

function PreviewCard({ eyebrow, badge, badgeColor, title, meta, thumb, onPress }: {
  eyebrow: string; badge: string; badgeColor: string; title: string; meta: string;
  thumb: React.ReactNode; onPress: () => void;
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
  const events = [2, 8];
  const today = 10;
  return (
    <View style={styles.calGrid}>
      {Array.from({ length: 14 }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.calCell,
            events.includes(i) && styles.calCellEvent,
            i === today && styles.calCellToday,
          ]}
        />
      ))}
    </View>
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
  app: { flex: 1, backgroundColor: colors.bgVoid },
  body: { flex: 1, flexDirection: 'row' },

  rail: {
    width: 76,
    backgroundColor: colors.bgDeep,
    borderRightWidth: 1,
    borderRightColor: colors.borderSoft,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  railMark: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.bgDeep,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 3,
    gap: 2,
    marginBottom: spacing.lg,
  },
  railMarkCell: {
    width: '46%',
    height: '46%',
    backgroundColor: colors.surfaceRaised,
    borderRadius: 2,
  },
  railTab: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railTabActive: {
    backgroundColor: colors.surfaceRaised,
  },
  railTabIndicator: {
    position: 'absolute',
    left: -8,
    top: '50%',
    marginTop: -14,
    width: 3,
    height: 28,
    backgroundColor: colors.accentMoon,
    borderRadius: 3,
  },
  railTabLabel: {
    fontSize: 9,
    color: colors.textTertiary,
    textTransform: 'uppercase',
  },
  railTabLabelActive: {
    color: colors.accentMoon,
  },

  main: { flex: 1 },
  mainContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eyebrow: {
    fontSize: 11,
    color: colors.accentMoon,
    letterSpacing: 1,
    marginBottom: 6,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  locationChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  locationChipText: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  hero: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  heroLeft: {},
  heroEyebrow: {
    fontSize: 11,
    color: colors.textTertiary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    lineHeight: 30,
  },
  heroTitleAccent: { color: colors.accentMoon },
  heroStats: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textTertiary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  heroNow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentMoon + '14',
    borderWidth: 1,
    borderColor: colors.accentMoon + '40',
    borderRadius: radius.sm,
    padding: 12,
    gap: 8,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.accentGreen,
  },
  heroNowText: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
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
    borderColor: colors.border,
    borderStyle: 'dashed',
    opacity: 0.5,
  },
  moonDisc: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#D9DEDA',
    overflow: 'hidden',
    shadowColor: colors.accentMoon,
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 8,
  },
  moonShadow: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '32%',
    backgroundColor: colors.bgDeep,
    opacity: 0.92,
  },

  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionLabelText: {
    fontSize: 11,
    color: colors.textTertiary,
    letterSpacing: 1,
  },
  sectionLabelLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderSoft,
  },

  previewGrid: { gap: spacing.md },
  previewCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  previewThumb: {
    height: 110,
    backgroundColor: colors.bgDeep,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  previewBody: { padding: spacing.md },
  previewEyebrowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewEyebrow: {
    fontSize: 10,
    color: colors.textTertiary,
    letterSpacing: 0.5,
  },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
  },
  badgeText: {
    fontSize: 9.5,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  previewMeta: {
    fontSize: 12.5,
    color: colors.textSecondary,
  },

  calGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 4,
  },
  calCell: {
    width: '12.5%',
    height: '40%',
    backgroundColor: colors.borderSoft,
    borderRadius: 3,
  },
  calCellEvent: { backgroundColor: colors.accentBlue + '50' },
  calCellToday: { backgroundColor: colors.accentMoon },

  mapThumb: {
    flex: 1,
    backgroundColor: colors.bgDeep,
  },
  mapPin: {
    position: 'absolute',
    top: '55%',
    left: '42%',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentMoon,
    borderWidth: 1.5,
    borderColor: colors.bgDeep,
  },

  launchThumb: {
    flex: 1,
    backgroundColor: colors.bgDeep,
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
    backgroundColor: colors.accentMoon,
    opacity: 0.5,
  },
  launchRocket: { fontSize: 20 },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  profileRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: colors.accentMoon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentBlue,
  },
});