import { DarkTheme, DefaultTheme, ThemeProvider, Stack, usePathname } from 'expo-router';
import { StyleSheet, View, useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AppSidebar } from '@/components/app-sidebar';

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
    const showSidebar = pathname !== '/' && pathname !== '/signup';

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
