import { useState, useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { ShootingStar } from '@/components/shooting-star';
import { Palette, Radius } from '@/constants/tokens';
import * as usersService from '@/utilities/users-service';

const getScreen = () => Dimensions.get('window');

const STARS = Array.from({ length: 150 }, (_, i) => ({
  top: (i * 23.7) % 100,
  left: (i * 41.3) % 100,
  size: (i % 4) + 0.5,
  opacity: (i % 6) * 0.08 + 0.15,
}));

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [screen, setScreen] = useState(getScreen());
  const signInGlow = useRef(new Animated.Value(0)).current;
  const newUserGlow = useRef(new Animated.Value(0)).current;
  
  
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false);
  
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (usersService.getUser()) router.replace('/map');
  }, []);

  useEffect(() => {
    const loadSound = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('@/assets/sounds/space.mp3'),
          { shouldPlay: true, volume: isMutedRef.current ? 0 : 0.4, isLooping: true, isMuted: isMutedRef.current }
        );
        soundRef.current = sound;
      } catch (e) {
        console.log('Sound error:', e);
      }
    };
    loadSound();
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setScreen(window);
    });
    return () => sub.remove();
  }, []);

  const isSmall = screen.width < 380;
  const isMedium = screen.width < 768;
  const isShort = screen.height < 740;
  const logoSize = isShort ? 64 : isSmall ? 76 : isMedium ? 92 : 104;
  const titleSize = isShort ? 28 : isSmall ? 30 : isMedium ? 34 : 38;
  const inputPad = isShort ? 8 : isSmall ? 10 : 12;
  const cardPad = isShort ? 12 : isSmall ? 14 : 18;

  const handleToggleSound = async () => {
    const next = !isMutedRef.current;
    isMutedRef.current = next;
    setIsMuted(next);

    try {
      await soundRef.current?.setStatusAsync({
        isMuted: next,
        volume: next ? 0 : 0.4,
      });
    } catch (e) {
      console.log('Sound toggle error:', e);
    }
  };

  const handleSignInPressIn = () => {
    Animated.timing(signInGlow, { toValue: 1, duration: 150, useNativeDriver: false }).start();
  };
  const handleSignInPressOut = () => {
    Animated.timing(signInGlow, { toValue: 0, duration: 300, useNativeDriver: false }).start();
  };
  const handleNewUserPressIn = () => {
    Animated.timing(newUserGlow, { toValue: 1, duration: 150, useNativeDriver: false }).start();
  };
  const handleNewUserPressOut = () => {
    Animated.timing(newUserGlow, { toValue: 0, duration: 300, useNativeDriver: false }).start();
  };



  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await usersService.login({ email: email.trim(), password });
      router.replace('/map');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Log In Failed - Try Again');
    } finally {
      setIsSubmitting(false);
    }
  };

  const signInBorderColor = signInGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [Palette.accent, Palette.white],
  });
  const newUserBorderColor = newUserGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [Palette.accentMuted, Palette.accent],
  });

  return (
    <SafeAreaView style={styles.container}>
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

      <TouchableOpacity style={styles.soundButton} onPress={handleToggleSound} activeOpacity={0.8}>
        <SymbolView
          name={{
            ios: isMuted ? 'speaker.slash.fill' : 'speaker.wave.2.fill',
            android: isMuted ? 'volume_off' : 'volume_up',
            web: isMuted ? 'volume_off' : 'volume_up',
          }}
          size={18}
          tintColor={Palette.accent}
        />
      </TouchableOpacity>

      <View style={styles.inner}>
        <View style={styles.centerWrapper}>
          <Image
            source={require('@/assets/images/logo_starwindow.png')}
            style={{
              width: logoSize,
              height: logoSize,
              marginBottom: 8,
            }}
            resizeMode="contain"
          />

          <Text style={[styles.appName, { fontSize: titleSize }]}>StarWindow</Text>
          <Text style={styles.tagline}>Your personal guide to the night sky</Text>

          <View style={[styles.card, { padding: cardPad }]}>
            
            <TextInput
              style={[styles.input, { padding: inputPad }]}
              placeholder="Email"
              placeholderTextColor="#2a4055"
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                setError('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TextInput
              style={[styles.input, { padding: inputPad }]}
              placeholder="Password"
              placeholderTextColor="#2a4055"
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                setError('');
              }}
              secureTextEntry
            />

            <TouchableOpacity style={styles.forgotRow}>
              <Text style={styles.forgot}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleLogin}
              onPressIn={handleSignInPressIn}
              onPressOut={handleSignInPressOut}
              activeOpacity={1}
              disabled={isSubmitting}
            >
              <Animated.View
                style={[
                  styles.signInButton,
                  { borderColor: signInBorderColor },
                  isSubmitting && styles.disabledButton,
                ]}
              >
                <Text style={styles.signInText}>{isSubmitting ? 'SIGNING IN...' : 'SIGN IN'}</Text>
              </Animated.View>
            </TouchableOpacity>

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              onPress={() => router.push('/signup')}
              onPressIn={handleNewUserPressIn}
              onPressOut={handleNewUserPressOut}
              activeOpacity={1}
            >
              <Animated.View style={[styles.newUserButton, { borderColor: newUserBorderColor }]}>
                <Text style={styles.newUserText}>Create New Account</Text>
              </Animated.View>
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>*   *   *</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.background,
    overflow: 'hidden',
  },
  starField: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  soundButton: {
    position: 'absolute',
    top: 18,
    right: 18,
    zIndex: 10,
    borderWidth: 1,
    borderColor: Palette.cardBorder,
    borderRadius: Radius.sm,
    backgroundColor: Palette.cardBackground,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  centerWrapper: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontWeight: '900',
    color: Palette.white,
    letterSpacing: 4,
    marginBottom: 4,
    textShadowColor: Palette.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  tagline: {
    fontSize: 10,
    color: Palette.tagline,
    marginBottom: 10,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: Palette.cardBackground,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.cardBorder,
    shadowColor: Palette.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
  },
  input: {
    backgroundColor: Palette.inputBackground,
    borderWidth: 1,
    borderColor: Palette.inputBorder,
    borderRadius: Radius.sm,
    color: Palette.inputText,
    fontSize: 13,
    marginBottom: 8,
  },
  forgotRow: {
    alignSelf: 'flex-end',
    marginBottom: 10,
  },
  forgot: {
    color: Palette.accent,
    fontSize: 10,
    opacity: 0.6,
  },
  signInButton: {
    backgroundColor: Palette.signInBackground,
    borderRadius: Radius.sm,
    padding: 10,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    shadowColor: Palette.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  disabledButton: {
    opacity: 0.55,
  },
  signInText: {
    color: Palette.accent,
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  errorText: {
    color: '#ff9a9a',
    fontSize: 11,
    marginBottom: 12,
    textAlign: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Palette.divider,
  },
  dividerText: {
    color: Palette.dividerText,
    marginHorizontal: 10,
    fontSize: 10,
  },
  newUserButton: {
    borderRadius: Radius.sm,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  newUserText: {
    color: Palette.newUserText,
    fontSize: 12,
    letterSpacing: 1,
  },
  footer: {
    color: Palette.divider,
    fontSize: 14,
    marginTop: 10,
    letterSpacing: 8,
  },
});




