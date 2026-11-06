import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { Colors, Radius, Shadow } from '@/constants/theme';

type Variant = 'primary' | 'outline' | 'soft';

export function Button({
  title,
  icon,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
}: {
  title: string;
  icon?: IconName;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  const primary = variant === 'primary';
  const fg = primary ? Colors.white : variant === 'outline' ? Colors.primary : Colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        primary && styles.primary,
        primary && !disabled && Shadow.primary,
        primary && disabled && styles.primaryDisabled,
        variant === 'outline' && styles.outline,
        variant === 'soft' && styles.soft,
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon && <Icon name={icon} size={22} color={fg} />}
          <Text style={[styles.label, { color: fg }]} numberOfLines={1}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export function CircleButton({
  icon,
  onPress,
  variant = 'plain',
  size = 46,
  iconColor,
  accessibilityLabel,
  children,
}: {
  icon?: IconName;
  onPress?: () => void;
  variant?: 'plain' | 'primary';
  size?: number;
  iconColor?: string;
  accessibilityLabel: string;
  children?: ReactNode;
}) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.circle,
        { width: size, height: size, borderRadius: size / 2 },
        primary ? [styles.primary, Shadow.primary] : [styles.circlePlain, Shadow.card],
        pressed && { opacity: 0.8 },
      ]}>
      {icon && <Icon name={icon} size={size * 0.5} color={iconColor ?? (primary ? Colors.white : Colors.text)} />}
      {children}
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && { opacity: 0.8 }]}>
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    paddingHorizontal: 20,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { fontSize: 17, fontWeight: '600' },
  primary: { backgroundColor: Colors.primary },
  primaryDisabled: { backgroundColor: Colors.primaryDisabled },
  outline: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  soft: { backgroundColor: Colors.surface },
  circle: { alignItems: 'center', justifyContent: 'center' },
  circlePlain: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
  },
  chipSelected: { backgroundColor: Colors.primary },
  chipLabel: { fontSize: 16, color: Colors.text, fontWeight: '500' },
  chipLabelSelected: { color: Colors.white },
});
