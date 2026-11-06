import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { Colors } from '@/constants/theme';

const THUMB = 26;

/** Cursore orizzontale con etichetta e valore. */
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  const [width, setWidth] = useState(0);
  const latest = useRef({ width, min, max, step, onChange });
  useLayoutEffect(() => {
    latest.current = { width, min, max, step, onChange };
  });

  // Le callback del gesto vengono eseguite solo in risposta ai tocchi, mai durante il render.
  /* eslint-disable react-hooks/refs */
  const gesture = useMemo(() => {
    const update = (x: number) => {
      const { width: w, min: lo, max: hi, step: s, onChange: cb } = latest.current;
      if (w <= 0) return;
      const ratio = Math.min(1, Math.max(0, (x - THUMB / 2) / (w - THUMB)));
      const raw = lo + ratio * (hi - lo);
      cb(Math.round(raw / s) * s);
    };
    const pan = Gesture.Pan()
      .runOnJS(true)
      .minDistance(0)
      .onBegin((e) => update(e.x))
      .onUpdate((e) => update(e.x));
    return pan;
  }, []);
  /* eslint-enable react-hooks/refs */

  const ratio = (value - min) / (max - min);
  const thumbLeft = ratio * Math.max(0, width - THUMB);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {value} {unit}
        </Text>
      </View>
      <GestureDetector gesture={gesture}>
        <View
          style={styles.touch}
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ min, max, now: value, text: `${value} ${unit}` }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => {
            const delta = e.nativeEvent.actionName === 'increment' ? step : -step;
            onChange(Math.min(max, Math.max(min, value + delta)));
          }}>
          <View style={styles.track}>
            <View style={[styles.fill, { width: thumbLeft + THUMB / 2 }]} />
          </View>
          <View style={[styles.thumb, { left: thumbLeft }]} />
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 18 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontSize: 16, color: Colors.text, fontWeight: '500' },
  value: { fontSize: 16, color: Colors.primary, fontWeight: '700' },
  touch: { height: 40, justifyContent: 'center' },
  track: { height: 8, borderRadius: 4, backgroundColor: Colors.surfaceStrong, overflow: 'hidden' },
  fill: { height: 8, backgroundColor: Colors.primary },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});
