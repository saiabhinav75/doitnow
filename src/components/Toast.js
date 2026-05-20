import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useApp } from '../context/AppContext';

export default function Toast() {
  const { toast, theme } = useApp();
  const opacity = useRef(new Animated.Value(0)).current;
  const animating = useRef(false);

  useEffect(() => {
    if (toast) {
      animating.current = true;
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.delay(1400),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => { animating.current = false; });
    }
  }, [toast]);

  if (!toast) return null;

  return (
    <Animated.View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border, opacity }]}>
      <Text style={[styles.text, { color: theme.text }]}>{toast}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  text: { fontSize: 14, fontWeight: '600' },
});
