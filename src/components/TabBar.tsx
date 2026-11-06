import type { BottomTabBarProps } from 'expo-router/tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { Colors, Radius, Shadow } from '@/constants/theme';

const TABS: Record<string, { label: string; icon: IconName; iconActive: IconName }> = {
  index: { label: 'Armadio', icon: 'hanger', iconActive: 'hanger' },
  outfit: { label: 'Outfit', icon: 'tshirt-crew-outline', iconActive: 'tshirt-crew' },
  profile: { label: 'Profilo', icon: 'account-outline', iconActive: 'account' },
};

/** Barra di navigazione fluttuante a pillola, come nei concept. */
export function TabBar({ state, navigateToTab, insets }: BottomTabBarProps) {
  return (
    <View pointerEvents="box-none" style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const tab = TABS[route.name];
          if (!tab) return null;
          const focused = state.index === index;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={tab.label}
              onPress={() => {
                if (!focused) navigateToTab(route.key);
              }}
              style={[styles.item, focused && styles.itemActive]}>
              <Icon
                name={focused ? tab.iconActive : tab.icon}
                size={26}
                color={focused ? Colors.text : Colors.textSecondary}
              />
              <Text style={[styles.label, focused && styles.labelActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 6,
    ...Shadow.floating,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: Radius.pill,
    gap: 2,
  },
  itemActive: { backgroundColor: Colors.surface },
  label: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  labelActive: { color: Colors.text, fontWeight: '600' },
});
