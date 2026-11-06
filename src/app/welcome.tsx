import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Chip } from '@/components/Buttons';
import { Icon } from '@/components/Icon';
import { Colors, Radius } from '@/constants/theme';
import { DEFAULT_MANNEQUIN, type Gender } from '@/lib/body';
import { useWardrobe } from '@/store/wardrobe';

export default function Welcome() {
  const setProfile = useWardrobe((s) => s.setProfile);
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('male');

  const start = () => {
    setProfile({ name: name.trim(), mannequin: DEFAULT_MANNEQUIN[gender] });
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.logo}>
            <Icon name="hanger" size={44} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Il tuo armadio, sempre con te</Text>
          <Text style={styles.subtitle}>
            Cataloga i tuoi vestiti, prova gli abbinamenti sulla tua figura e salva gli outfit migliori.
          </Text>
        </View>

        <Text style={styles.label}>Come ti chiami?</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Es. Fabio"
          placeholderTextColor={Colors.textTertiary}
          style={styles.input}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={() => name.trim() && start()}
        />

        <Text style={styles.label}>Forma del manichino</Text>
        <View style={styles.row}>
          <Chip label="Maschile" selected={gender === 'male'} onPress={() => setGender('male')} />
          <Chip label="Femminile" selected={gender === 'female'} onPress={() => setGender('female')} />
        </View>

        <View style={{ flex: 1 }} />
        <Button title="Inizia" onPress={start} disabled={!name.trim()} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, padding: 24, paddingBottom: 16 },
  hero: { alignItems: 'center', marginTop: 40, marginBottom: 40, gap: 12 },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  subtitle: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  label: { fontSize: 15, color: Colors.textSecondary, marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 17,
    color: Colors.text,
  },
  row: { flexDirection: 'row', gap: 10 },
});
