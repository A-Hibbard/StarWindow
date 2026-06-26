import { useState, useEffect, useRef } from 'react';
import { View, Animated, Dimensions } from 'react-native';
import { Palette } from '@/constants/tokens';

const getScreen = () => Dimensions.get('window');

export function ShootingStar({ delay }: { delay: number }) {
  const position = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [screen, setScreen] = useState(getScreen());
  const startLeft = useRef(((delay / 800) % 7) * (screen.width / 6) - 160).current;
  const startTop = useRef(-80 - ((delay / 800) % 4) * 70).current;

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setScreen(window);
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
    outputRange: [0, screen.width + 260],
  });

  const translateY = position.interpolate({
    inputRange: [0, 1],
    outputRange: [0, screen.height + 900],
  });

  return (
    <Animated.View style={{
      position: 'absolute',
      top: startTop,
      left: startLeft,
      opacity,
      transform: [{ translateX }, { translateY }, { rotate: '45deg' }],
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{
          width: 60,
          height: 2,
          backgroundColor: Palette.accent,
          opacity: 0.6,
          borderRadius: 2,
        }} />
        <View style={{
          width: 7,
          height: 7,
          borderRadius: 7,
          backgroundColor: Palette.white,
          shadowColor: Palette.accent,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: 8,
        }} />
      </View>
    </Animated.View>
  );
}