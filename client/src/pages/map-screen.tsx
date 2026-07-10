import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StarMap, type RocketLaunch, type StargazingSpot } from '@/components/star-map';
import { ThemedText } from '@/components/themed-text';
import { WebBadge } from '@/components/web-badge';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchLaunches } from '@/lib/astronomy';
import * as usersService from '@/utilities/users-service';

// Zoom we drop to once we know the user's location — close enough to see their
// city while the (upscaled) light-pollution overlay stays readable.
const CITY_ZOOM = 11;

type LocateState = 'locating' | 'ready' | 'denied' | 'unavailable';

// Placeholder data until a backend feed lands. Bortle: 1 = pristine dark sky.
const SAMPLE_SPOTS: StargazingSpot[] = [
  { id: 'death-valley', name: 'Death Valley National Park', lat: 36.5054, lng: -117.0794, bortle: 1, description: 'Gold-tier International Dark Sky Park.' },
  { id: 'cherry-springs', name: 'Cherry Springs State Park', lat: 41.6501, lng: -77.8164, bortle: 2, description: 'Dark-sky park with strong Milky Way visibility.' },
];

export default function MapScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const [selected, setSelected] = useState<StargazingSpot | null>(null);
  const [center, setCenter] = useState<[number, number] | undefined>(undefined);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locate, setLocate] = useState<LocateState>('locating');
  const [launches, setLaunches] = useState<RocketLaunch[]>([]);

  //check if logged in
  useEffect(() => {
    if (!usersService.getToken()) {
      router.replace('/');
    }
  }, []);

  // Lazy: only hit the (rate-limited) launches API the first time the user
  // enables the rocket layer.
  const loadLaunches = async () => {
    try {
      setLaunches(await fetchLaunches());
    } catch (e) {
      console.warn('Failed to load launches:', e);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (status !== 'granted') {
          setLocate('denied');
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setCenter([latitude, longitude]);
        setLocate('ready');
      } catch {
        if (!cancelled) setLocate('unavailable');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };

  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },
    web: {
      paddingTop: Spacing.six,
      paddingBottom: Spacing.four,
    },
  });

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={insets}
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Stargazing Spots</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
            Find dark skies near you. Toggle the light-pollution overlay on the map.
          </ThemedText>
        </View>

        <StarMap
          spots={SAMPLE_SPOTS}
          launches={launches}
          center={center}
          zoom={center ? CITY_ZOOM : undefined}
          userLocation={userLocation}
          onSelectSpot={setSelected}
          onLaunchesEnable={loadLaunches}
        />

        {selected ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.selected}>
            {selected.name}
            {selected.bortle != null ? ` · Bortle ${selected.bortle}` : ''}
          </ThemedText>
        ) : (
          <ThemedText type="small" themeColor="textSecondary" style={styles.selected}>
            {locate === 'locating' && 'Finding your location…'}
            {locate === 'ready' && 'Centered on your location.'}
            {locate === 'denied' && 'Location is required. Enable location in browser site settings and reload.'}
            {locate === 'unavailable' && "Couldn't get your location. Check browser and system location settings, then reload."}
          </ThemedText>
        )}

        {Platform.OS === 'web' && <WebBadge />}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  header: {
    gap: Spacing.two,
    alignItems: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
  selected: {
    textAlign: 'center',
  },
});
