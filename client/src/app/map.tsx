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
import { fetchBestSpot, type BestSpot } from '@/lib/map-api';
import * as usersService from '@/utilities/users-service';

// Zoom we drop to once we know the user's location — close enough to see their
// city while the (upscaled) light-pollution overlay stays readable.
const CITY_ZOOM = 11;

// Default search radius (miles) for the best-nearby-spot query.
const DEFAULT_RADIUS = 25;
// Wait this long after the last slider move before re-querying.
const RADIUS_DEBOUNCE_MS = 300;

type LocateState = 'locating' | 'ready' | 'denied' | 'unavailable';

// Placeholder data until a backend feed lands. Bortle: 1 = pristine dark sky.
const SAMPLE_SPOTS: StargazingSpot[] = [
  { id: 'death-valley', name: 'Death Valley National Park', lat: 36.5054, lng: -117.0794, bortle: 1, description: 'Gold-tier International Dark Sky Park.' },
  { id: 'cincinnati-observatory', name: 'Cincinnati Observatory', lat: 39.1389, lng: -84.4225, bortle: 1, description: `Cincinnati's historic observatory.` },
];

export default function MapScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const [selected, setSelected] = useState<StargazingSpot | null>(null);
  const [center, setCenter] = useState<[number, number] | undefined>(undefined);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locate, setLocate] = useState<LocateState>('locating');
  const [launches, setLaunches] = useState<RocketLaunch[]>([]);
  const [radiusMiles, setRadiusMiles] = useState(DEFAULT_RADIUS);
  const [userScore, setUserScore] = useState<number | null>(null);
  const [bestSpot, setBestSpot] = useState<BestSpot | null>(null);

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

  // Re-query the best nearby spot whenever the user's location or the radius
  // changes. Debounced so dragging the slider fires one request ~300ms after
  // the user stops, not on every intermediate value; the previous in-flight
  // request is aborted.
  useEffect(() => {
    if (!userLocation) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetchBestSpot(
          { lat: userLocation.lat, lon: userLocation.lng, radiusMiles },
          controller.signal
        );
        setUserScore(res.user_score);
        setBestSpot(res.best_spot);
      } catch (e) {
        if ((e as Error)?.name !== 'AbortError') {
          console.warn('Failed to load best spot:', e);
        }
      }
    }, RADIUS_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [userLocation, radiusMiles]);

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
          userScore={userScore}
          bestSpot={bestSpot}
          radiusMiles={radiusMiles}
          onRadiusChange={setRadiusMiles}
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
            {locate === 'denied' && 'Location off — showing the whole map. Enable location to center on you.'}
            {locate === 'unavailable' && "Couldn't get your location — showing the whole map."}
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
