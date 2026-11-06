import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Chip } from '@/components/Buttons';
import { Icon } from '@/components/Icon';
import { Mannequin } from '@/components/Mannequin';
import { Slider } from '@/components/Slider';
import { Colors, Radius } from '@/constants/theme';
import { DEFAULT_MANNEQUIN, MANNEQUIN_LIMITS, type Gender, type MannequinParams } from '@/lib/body';
import { useWardrobe } from '@/store/wardrobe';

/** Personalizzazione del manichino con le misure dell'utente. */
export default function MannequinScreen() {
  const insets = useSafeAreaInsets();
  const saved = useWardrobe((s) => s.profile.mannequin);
  const setProfile = useWardrobe((s) => s.setProfile);
  const [params, setParams] = useState<MannequinParams>(saved);

  const set = (patch: Partial<MannequinParams>) => setParams((p) => ({ ...p, ...patch }));

  const setGender = (gender: Gender) => {
    if (gender === params.gender) return;
    setParams(DEFAULT_MANNEQUIN[gender]);
  };

  const save = () => {
    setProfile({ mannequin: params, avatarMode: 'mannequin' });
    router.back();
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Personalizza misure</Text>
          <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Chiudi">
            <Icon name="close" size={26} color={Colors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.preview}>
          <Mannequin params={params} width={130} />
        </View>

        <Text style={styles.label}>Forma del corpo</Text>
        <View style={styles.row}>
          <Chip label="Maschile" selected={params.gender === 'male'} onPress={() => setGender('male')} />
          <Chip label="Femminile" selected={params.gender === 'female'} onPress={() => setGender('female')} />
        </View>

        <View style={{ height: 18 }} />
        <Slider
          label="Altezza"
          unit="cm"
          value={params.heightCm}
          {...MANNEQUIN_LIMITS.heightCm}
          onChange={(heightCm) => set({ heightCm })}
        />
        <Slider
          label="Peso"
          unit="kg"
          value={params.weightKg}
          {...MANNEQUIN_LIMITS.weightKg}
          onChange={(weightKg) => set({ weightKg })}
        />
        <Slider
          label="Larghezza spalle"
          unit="cm"
          value={params.shouldersCm}
          {...MANNEQUIN_LIMITS.shouldersCm}
          onChange={(shouldersCm) => set({ shouldersCm })}
        />
        <Slider
          label="Circonferenza petto"
          unit="cm"
          value={params.chestCm}
          {...MANNEQUIN_LIMITS.chestCm}
          onChange={(chestCm) => set({ chestCm })}
        />
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Button title="Salva misure" onPress={save} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text },
  preview: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingVertical: 16,
    marginBottom: 8,
  },
  label: { fontSize: 16, color: Colors.textSecondary, marginTop: 16, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 10 },
  footer: { paddingHorizontal: 20, paddingTop: 12 },
});
