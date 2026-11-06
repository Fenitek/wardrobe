import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Colors } from '@/constants/theme';
import { useWardrobe } from '@/store/wardrobe';

SplashScreen.preventAutoHideAsync();

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: Colors.background, primary: Colors.primary },
};

export default function RootLayout() {
  const hydrated = useWardrobe((s) => s.hydrated);

  useEffect(() => {
    if (hydrated) SplashScreen.hideAsync();
  }, [hydrated]);

  if (!hydrated) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={theme}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="welcome" options={{ gestureEnabled: false, animation: 'fade' }} />
          <Stack.Screen name="add-item" options={{ presentation: 'modal' }} />
          <Stack.Screen name="web-search" options={{ presentation: 'modal' }} />
          <Stack.Screen name="garment-search" options={{ presentation: 'modal' }} />
          <Stack.Screen name="save-outfit" options={{ presentation: 'modal' }} />
          <Stack.Screen name="mannequin" options={{ presentation: 'modal' }} />
          <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
