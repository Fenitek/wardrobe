import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { getCategory, slotOf } from '@/constants/categories';
import { Colors, Radius } from '@/constants/theme';
import { resolveImageUri } from '@/lib/images';
import { makeLayer, useWardrobe, type Garment } from '@/store/wardrobe';

/** Cerca un capo nell'armadio e lo fa indossare subito nella sezione Outfit. */
export default function GarmentSearchScreen() {
  const insets = useSafeAreaInsets();
  const garments = useWardrobe((s) => s.garments);
  const setDraft = useWardrobe((s) => s.setDraft);
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return garments;
    return garments.filter(
      (g) => g.name.toLowerCase().includes(q) || getCategory(g.category).label.toLowerCase().includes(q),
    );
  }, [garments, query]);

  const wear = (g: Garment) => {
    const d = useWardrobe.getState().draft;
    if (slotOf(g.category) === 'bottom') {
      setDraft({ bottom: makeLayer(g.id), initialized: true });
    } else if (d.tops.length === 0) {
      setDraft({ tops: [makeLayer(g.id)], activeTop: 0, initialized: true });
    } else {
      const tops = d.tops.slice();
      tops[d.activeTop] = makeLayer(g.id);
      setDraft({ tops, initialized: true });
    }
    router.back();
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <View style={styles.searchBox}>
          <Icon name="magnify" size={20} color={Colors.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Cerca un capo da indossare"
            placeholderTextColor={Colors.textTertiary}
            style={styles.input}
            autoFocus
          />
        </View>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.cancel}>Annulla</Text>
        </Pressable>
      </View>
      <FlatList
        data={results}
        keyExtractor={(g) => g.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        renderItem={({ item }) => (
          <Pressable style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]} onPress={() => wear(item)}>
            <View style={styles.thumbBox}>
              <Image source={{ uri: resolveImageUri(item.image) }} style={styles.thumb} contentFit="contain" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.category}>{getCategory(item.category).label}</Text>
            </View>
            <Icon name="tshirt-crew-outline" size={22} color={Colors.primary} />
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Nessun capo trovato</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
  },
  input: { flex: 1, paddingVertical: 12, fontSize: 16, color: Colors.text },
  cancel: { color: Colors.primary, fontSize: 16, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  thumbBox: { width: 60, height: 60, borderRadius: Radius.sm, backgroundColor: Colors.surface, padding: 6 },
  thumb: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: Colors.text },
  category: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 40, fontSize: 15 },
});
