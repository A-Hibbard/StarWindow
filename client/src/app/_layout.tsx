import { DarkTheme, DefaultTheme, ThemeProvider, Stack, usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View, useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AppSidebar } from '@/components/app-sidebar';
import * as usersService from '@/utilities/users-service';

// export default function TabLayout() {
//   const colorScheme = useColorScheme();
//   return (
//     <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
//       <AnimatedSplashOverlay />
//       <AppTabs />
//     </ThemeProvider>
//   );
// }

export default function RootLayout() {
    const colorScheme = useColorScheme();
    const pathname = usePathname();
    const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(usersService.getUser()));
    const showSidebar = isLoggedIn && pathname !== '/signup' && pathname !== '/login';

    useEffect(() => {
      const syncAuthState = () => {
        setIsLoggedIn(Boolean(usersService.getUser()));
      };

      const unsubscribe = usersService.subscribeAuthChanges(syncAuthState);
      if (typeof window !== 'undefined') {
        window.addEventListener('storage', syncAuthState);
      }
      syncAuthState();

      return () => {
        unsubscribe();
        if (typeof window !== 'undefined') {
          window.removeEventListener('storage', syncAuthState);
        }
      };
    }, []);

    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <View style={styles.shell}>
          {showSidebar && <AppSidebar />}
          <View style={styles.content}>
            <Stack screenOptions={{ headerShown: false }} />
          </View>
        </View>
      </ThemeProvider>
    );
  }

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    flexDirection: 'row',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
});
