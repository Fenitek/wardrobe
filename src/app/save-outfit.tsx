import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Chip } from '@/components/Buttons';
import { Icon } from '@/components/Icon';
import { OutfitPreview } from '@/components/OutfitPreview';
import { OCCASIONS } from '@/constants/categories';
import { Colors, Radius } from '@/constants/theme';
import { useWardrobe } from '@/store/wardrobe';

export default function SaveOutfitScreen() {
  const insets = useSafeAreaInsets();
  const draft = useWardrobe((s) => s.draft);
  const editing = useWardrobe((s) => s.outfits.find((o) => o.id === s.draft.editingId));
  const saveOutfit = useWardrobe((s) => s.saveOutfit);
  const [name, setName] = useState(editing?.name ?? '');
  const [occasion, setOccasion] = useState<string>(editing?.occasion ?? 'Casual');

  const save = () => {
    saveOutfit({ name: name.trim(), occasion });
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.titleRow}>
          <Text style={styles.title}>{editing ? 'Aggiorna outfit' : 'Salva nei preferiti'}</Text>
          <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Chiudi">
            <Icon name="close" size={26} color={Colors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.preview}>
          <View style={styles.heart}>
            <Icon name="heart" size={22} color={Colors.heart} />
          </View>
          <OutfitPreview look={draft} height={260} />
        </View>

        <Text style={styles.label}>{"Nome dell'outfit"}</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Es. Weekend, Compleanno, Scuola"
          placeholderTextColor={Colors.textTertiary}
          style={styles.input}
          autoFocus={!editing}
          returnKeyType="done"
        />

        <Text style={styles.label}>Occasione</Text>
        <View style={styles.chips}>
          {OCCASIONS.map((o) => (
            <Chip key={o} label={o} selected={occasion === o} onPress={() => setOccasion(o)} />
          ))}
        </View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Button
          title={editing ? 'Aggiorna nei preferiti' : 'Salva nei preferiti'}
          icon="heart"
          onPress={save}
          disabled={!name.trim()}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text },
  preview: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingVertical: 16,
  },
  heart: { position: 'absolute', top: 12, right: 14 },
  label: { fontSize: 16, color: Colors.textSecondary, marginTop: 22, marginBottom: 10, marginLeft: 4 },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm + 2,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 17,
    color: Colors.text,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  footer: { paddingHorizontal: 20, paddingTop: 12 },
});
