import { useState } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Palette, Radius } from '@/constants/tokens';
import * as usersService from '@/utilities/users-service';

const navItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Calendar', href: '/calendar' },
  { label: 'Map', href: '/map' },
  { label: 'Events', href: '/events' },
  { label: 'Launches', href: '/explore' },
  { label: 'Profile', href: '/profile' },
] as const;

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [logoutHovered, setLogoutHovered] = useState(false);

  const handleLogout = () => {
    usersService.logOut();
    router.replace('/');
  };

  return (
    <View style={styles.rail}>
      <View style={styles.navGroup}>
        <Image
          source={require('@/assets/images/logo_starwindow.png')}
          style={styles.railLogo}
          resizeMode="contain"
        />

        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Pressable
              key={item.href}
              onPress={() => router.push(item.href)}
              style={[styles.railTab, active && styles.railTabActive]}>
              {active && <View style={styles.railTabIndicator} />}
              <Text style={[styles.railTabLabel, active && styles.railTabLabelActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={handleLogout}
        onHoverIn={() => setLogoutHovered(true)}
        onHoverOut={() => setLogoutHovered(false)}
        style={[styles.railTab, logoutHovered && styles.logoutTabHovered]}>
        <Text style={styles.logoutLabel}>Logout</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    width: 128,
    backgroundColor: Palette.bgDeep,
    borderRightWidth: 1,
    borderRightColor: Palette.borderSoft,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  navGroup: {
    alignItems: 'center',
    gap: 4,
  },
  railLogo: {
    width: 72,
    height: 72,
    marginBottom: 16,
  },
  railTab: {
    width: 108,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  railTabActive: {
    backgroundColor: Palette.surfaceRaised,
  },
  railTabIndicator: {
    position: 'absolute',
    left: -10,
    top: '50%',
    marginTop: -10,
    width: 3,
    height: 20,
    backgroundColor: Palette.accentMoon,
    borderRadius: 3,
  },
  railTabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.textTertiary,
    textTransform: 'uppercase',
  },
  railTabLabelActive: {
    color: Palette.accentMoon,
  },
  logoutTabHovered: {
    backgroundColor: Palette.accentRed + '14',
  },
  logoutLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.accentRed,
    textTransform: 'uppercase',
  },
});
