import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';

const getScreen = () => Dimensions.get('window');

const STARS = Array.from({ length: 150 }, (_, i) => ({
  top: (i * 23.7) % 100,
  left: (i * 41.3) % 100,
  size: (i % 4) + 0.5,
  opacity: (i % 6) * 0.08 + 0.15,
}));

function ShootingStar({ delay }: { delay: number }) {
  const position = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [screenWidth, setScreenWidth] = useState(getScreen().width);
  const top = useRef((delay % 7) * 80).current;

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const animate = () => {
      position.setValue(0);
      opacity.setValue(0);
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(position, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 1500,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start(() => animate());
    };
    animate();
  }, []);

  const translateX = position.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, screenWidth + 100],
  });

  const translateY = position.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 80],
  });

  return (
    <Animated.View style={{
      position: 'absolute',
      top,
      left: 0,
      opacity,
      transform: [{ translateX }, { translateY }, { rotate: '20deg' }],
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{
          width: 60,
          height: 2,
          backgroundColor: '#00d4ff',
          opacity: 0.6,
          borderRadius: 2,
        }} />
        <View style={{
          width: 7,
          height: 7,
          borderRadius: 7,
          backgroundColor: '#ffffff',
          shadowColor: '#00d4ff',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: 8,
        }} />
      </View>
    </Animated.View>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [screen, setScreen] = useState(getScreen());
  const signInGlow = useRef(new Animated.Value(0)).current;
  const newUserGlow = useRef(new Animated.Value(0)).current;
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    const loadSound = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('@/assets/sounds/space.mp3'),
          { shouldPlay: true, volume: 0.4, isLooping: true }
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
  const logoSize = isSmall ? 80 : isMedium ? 100 : 120;
  const titleSize = isSmall ? 28 : isMedium ? 36 : 42;
  const inputPad = isSmall ? 10 : 13;
  const cardPad = isSmall ? 14 : 20;

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

  const signInBorderColor = signInGlow.interpolate({
    inputRange: [0, 1],
    outputRange: ['#00d4ff', '#ffffff'],
  });
  const newUserBorderColor = newUserGlow.interpolate({
    inputRange: [0, 1],
    outputRange: ['#0a1a2e', '#00d4ff'],
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
            backgroundColor: '#ffffff',
            opacity: star.opacity,
          }} />
        ))}
      </View>

      {[0, 800, 1600, 2400, 3200, 4000].map((delay, i) => (
        <ShootingStar key={i} delay={delay} />
      ))}

      <ScrollView contentContainerStyle={styles.inner}>

        <View style={styles.centerWrapper}>

          <Image
            source={require('../../assets/images/logo_starwindow.png')}
            style={{
              width: logoSize,
              height: logoSize,
              marginBottom: 10,
            }}
            resizeMode="contain"
          />

          <Text style={[styles.appName, { fontSize: titleSize }]}>
            StarWindow
          </Text>
          <Text style={styles.tagline}>
            Your personal guide to the night sky
          </Text>

          <View style={[styles.card, { padding: cardPad }]}>

            <TextInput
              style={[styles.input, { padding: inputPad }]}
              placeholder="Email"
              placeholderTextColor="#2a4055"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              style={[styles.input, { padding: inputPad }]}
              placeholder="Password"
              placeholderTextColor="#2a4055"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity style={styles.forgotRow}>
              <Text style={styles.forgot}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPressIn={handleSignInPressIn}
              onPressOut={handleSignInPressOut}
              onPress={() => router.push('/dashboard')}
              activeOpacity={1}
            >
              <Animated.View style={[styles.signInButton, { borderColor: signInBorderColor }]}>
                <Text style={styles.signInText}>SIGN IN</Text>
              </Animated.View>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              onPressIn={handleNewUserPressIn}
              onPressOut={handleNewUserPressOut}
              activeOpacity={1}
            >
              <Animated.View style={[styles.newUserButton, { borderColor: newUserBorderColor }]}>
                <Text style={styles.newUserText}>Create New Account</Text>
              </Animated.View>
            </TouchableOpacity>

          </View>

          <Text style={styles.footer}>✦   ✦   ✦</Text>

        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000008',
    overflow: 'hidden',
  },
  starField: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  inner: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  centerWrapper: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  appName: {
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 4,
    marginBottom: 4,
    textShadowColor: '#00d4ff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  tagline: {
    fontSize: 10,
    color: '#334455',
    marginBottom: 24,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: '#01030a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#0a1828',
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
  },
  input: {
    backgroundColor: '#020810',
    borderWidth: 1,
    borderColor: '#0d1e30',
    borderRadius: 10,
    color: '#aabbcc',
    fontSize: 13,
    marginBottom: 10,
  },
  forgotRow: {
    alignSelf: 'flex-end',
    marginBottom: 14,
  },
  forgot: {
    color: '#00d4ff',
    fontSize: 10,
    opacity: 0.6,
  },
  signInButton: {
    backgroundColor: '#00111f',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  signInText: {
    color: '#00d4ff',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#080f18',
  },
  dividerText: {
    color: '#1a2a3a',
    marginHorizontal: 10,
    fontSize: 10,
  },
  newUserButton: {
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  newUserText: {
    color: '#336688',
    fontSize: 12,
    letterSpacing: 1,
  },
  footer: {
    color: '#080f18',
    fontSize: 14,
    marginTop: 20,
    letterSpacing: 8,
  },
});