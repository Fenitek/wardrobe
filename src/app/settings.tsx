import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Buttons';
import { Icon } from '@/components/Icon';
import { Colors, Radius } from '@/constants/theme';
import { isBackgroundRemovalAvailable } from '@/lib/background-removal';
import { useWardrobe } from '@/store/wardrobe';

export default function SettingsScreen() {
  const profileName = useWardrobe((s) => s.profile.name);
  const setProfile = useWardrobe((s) => s.setProfile);
  const [name, setName] = useState(profileName);

  const save = () => {
    if (!name.trim()) {
      Alert.alert('Nome mancante', 'Scrivi il tuo nome.');
      return;
    }
    setProfile({ name: name.trim() });
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Impostazioni</Text>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Chiudi">
          <Icon name="close" size={26} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <Text style={styles.label}>Il tuo nome</Text>
      <TextInput value={name} onChangeText={setName} style={styles.input} returnKeyType="done" onSubmitEditing={save} />

      <View style={styles.info}>
        <Icon
          name={isBackgroundRemovalAvailable() ? 'check-circle' : 'image-outline'}
          size={20}
          color={isBackgroundRemovalAvailable() ? Colors.primary : Colors.textSecondary}
        />
        <Text style={styles.infoText}>
          {isBackgroundRemovalAvailable()
            ? 'Rimozione automatica dello sfondo attiva.'
            : "Rimozione automatica dello sfondo non disponibile in questa versione dell'app (serve la versione installabile, non Expo Go)."}
        </Text>
      </View>

      <View style={{ flex: 1 }} />
      <Button title="Salva" onPress={save} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingBottom: 36, backgroundColor: Colors.background },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text },
  label: { fontSize: 16, color: Colors.textSecondary, marginTop: 8, marginBottom: 10 },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm + 2,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 17,
    color: Colors.text,
  },
  info: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
    padding: 14,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    alignItems: 'flex-start',
  },
  infoText: { flex: 1, fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
});
