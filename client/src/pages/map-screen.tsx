import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StarMap, type RocketLaunch, type StargazingSpot } from '@/components/star-map';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchLaunches } from '@/lib/astronomy';
import * as usersService from '@/utilities/users-service';

// Zoom we drop to once we know the user's location - close enough to see their
// city while the upscaled light-pollution overlay stays readable.
const CITY_ZOOM = 11;

// Placeholder data until a backend feed lands. Bortle: 1 = pristine dark sky.
const SAMPLE_SPOTS: StargazingSpot[] = [
  {
    id: 'death-valley',
    name: 'Death Valley National Park',
    lat: 36.5054,
    lng: -117.0794,
    bortle: 1,
    description: 'Gold-tier International Dark Sky Park.',
  },
  {
    id: 'cherry-springs',
    name: 'Cherry Springs State Park',
    lat: 41.6501,
    lng: -77.8164,
    bortle: 2,
    description: 'Dark-sky park with strong Milky Way visibility.',
  },
];

export default function MapScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const [center, setCenter] = useState<[number, number] | undefined>(undefined);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [launches, setLaunches] = useState<RocketLaunch[]>([]);

  useEffect(() => {
    if (!usersService.getToken()) {
      router.replace('/');
    }
  }, []);

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
        if (cancelled || status !== 'granted') return;

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;

        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setCenter([latitude, longitude]);
      } catch {
        // Keep the map usable with its default center if browser location fails.
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
      paddingTop: Spacing.two,
      paddingBottom: Spacing.two,
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
        </View>

        <StarMap
          spots={SAMPLE_SPOTS}
          launches={launches}
          center={center}
          zoom={center ? CITY_ZOOM : undefined}
          userLocation={userLocation}
          onLaunchesEnable={loadLaunches}
          immersive
        />
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
    flex: 1,
    width: '100%',
    paddingHorizontal: Spacing.two,
    gap: Spacing.two,
  },
  header: {
    alignItems: 'center',
  },
});
