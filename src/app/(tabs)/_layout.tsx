import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/tabs';

import { TabBar } from '@/components/TabBar';
import { Colors } from '@/constants/theme';
import { useWardrobe } from '@/store/wardrobe';

export default function TabsLayout() {
  const name = useWardrobe((s) => s.profile.name);
  if (!name) return <Redirect href="/welcome" />;

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: Colors.background } }}>
      <Tabs.Screen name="index" options={{ title: 'Armadio' }} />
      <Tabs.Screen name="outfit" options={{ title: 'Outfit' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profilo' }} />
    </Tabs>
  );
}
