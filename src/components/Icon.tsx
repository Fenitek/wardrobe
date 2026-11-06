import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';

import { Colors } from '@/constants/theme';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export function Icon({
  name,
  size = 22,
  color = Colors.text,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}
