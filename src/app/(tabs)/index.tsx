import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, CircleButton } from '@/components/Buttons';
import { Icon } from '@/components/Icon';
import { CATEGORIES, getCategory, type CategoryId } from '@/constants/categories';
import { Colors, Radius, Shadow, TAB_BAR_SPACE } from '@/constants/theme';
import { resolveImageUri } from '@/lib/images';
import { useWardrobe, type Garment } from '@/store/wardrobe';

type Filter = 'all' | CategoryId;

export default function WardrobeScreen() {
  const garments = useWardrobe((s) => s.garments);
  const [filter, setFilter] = useState<Filter>('all');
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return garments.filter(
      (g) =>
        (filter === 'all' || g.category === filter) &&
        (!q || g.name.toLowerCase().includes(q) || getCategory(g.category).label.toLowerCase().includes(q)),
    );
  }, [garments, filter, query]);

  const tabs: { id: Filter; label: string }[] = [{ id: 'all', label: 'Tutto' }, ...CATEGORIES];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Il tuo armadio</Text>
        <View style={styles.headerActions}>
          <CircleButton
            icon={searching ? 'close' : 'magnify'}
            accessibilityLabel={searching ? 'Chiudi ricerca' : 'Cerca nel guardaroba'}
            onPress={() => {
              setSearching((v) => !v);
              setQuery('');
            }}
          />
          <CircleButton
            icon="plus"
            variant="primary"
            accessibilityLabel="Aggiungi un capo"
            onPress={() => router.push('/add-item')}
          />
        </View>
      </View>

      {searching && (
        <View style={styles.searchBox}>
          <Icon name="magnify" size={20} color={Colors.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Cerca un capo…"
            placeholderTextColor={Colors.textTertiary}
            style={styles.searchInput}
            autoFocus
            returnKeyType="search"
          />
        </View>
      )}

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {tabs.map((t) => {
            const active = filter === t.id;
            return (
              <Pressable
                key={t.id}
                onPress={() => setFilter(t.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={styles.tab}>
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{t.label}</Text>
                <View style={[styles.tabUnderline, active && styles.tabUnderlineActive]} />
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(g) => g.id}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => <GarmentCard garment={item} />}
        ListEmptyComponent={
          <EmptyState hasGarments={garments.length > 0} searching={!!query.trim()} />
        }
        keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
  );
}

function GarmentCard({ garment }: { garment: Garment }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
      onPress={() => router.push({ pathname: '/add-item', params: { id: garment.id } })}
      accessibilityLabel={`${garment.name}, ${getCategory(garment.category).label}`}>
      <View style={styles.cardImageBox}>
        <Image
          source={{ uri: resolveImageUri(garment.image) }}
          style={styles.cardImage}
          contentFit="contain"
          transition={150}
        />
      </View>
      <View style={styles.cardText}>
        <Text style={styles.cardName} numberOfLines={1}>
          {garment.name}
        </Text>
        <Text style={styles.cardCategory} numberOfLines={1}>
          {getCategory(garment.category).label}
        </Text>
      </View>
    </Pressable>
  );
}

function EmptyState({ hasGarments, searching }: { hasGarments: boolean; searching: boolean }) {
  if (hasGarments || searching) {
    return (
      <View style={styles.empty}>
        <Icon name="magnify" size={40} color={Colors.textTertiary} />
        <Text style={styles.emptyText}>Nessun capo trovato</Text>
      </View>
    );
  }
  return (
    <View style={styles.empty}>
      <Icon name="hanger" size={48} color={Colors.textTertiary} />
      <Text style={styles.emptyTitle}>Il tuo armadio è vuoto</Text>
      <Text style={styles.emptyText}>Aggiungi il primo capo con una foto, dalla galleria o cercandolo su Google.</Text>
      <Button title="Aggiungi un capo" icon="plus" onPress={() => router.push('/add-item')} style={{ marginTop: 8 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: { fontSize: 32, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', gap: 12 },
  searchBox: {
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: Colors.text },
  tabs: { paddingHorizontal: 20, gap: 22, paddingTop: 8 },
  tab: { alignItems: 'center' },
  tabLabel: { fontSize: 17, color: Colors.textSecondary, paddingVertical: 8, paddingHorizontal: 4 },
  tabLabelActive: { color: Colors.primary, fontWeight: '600' },
  tabUnderline: { height: 2, alignSelf: 'stretch', borderRadius: 1, backgroundColor: 'transparent' },
  tabUnderlineActive: { backgroundColor: Colors.primary },
  grid: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: TAB_BAR_SPACE, gap: 14, flexGrow: 1 },
  column: { gap: 14 },
  card: {
    flex: 1,
    maxWidth: '50%',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: 6,
    borderWidth: 1,
    borderColor: '#F0F0F2',
    ...Shadow.card,
  },
  cardImageBox: {
    aspectRatio: 0.95,
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm + 2,
    padding: 14,
  },
  cardImage: { flex: 1 },
  cardText: { paddingHorizontal: 6, paddingTop: 10, paddingBottom: 8 },
  cardName: { fontSize: 17, fontWeight: '600', color: Colors.text },
  cardCategory: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 30, paddingTop: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  emptyText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 21 },
});
