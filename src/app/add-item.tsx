import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { AssetField, MediaType, Query, requestPermissionsAsync } from 'expo-media-library';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Chip } from '@/components/Buttons';
import { Icon } from '@/components/Icon';
import { ADD_ITEM_CATEGORY_ORDER, getCategory, type CategoryId } from '@/constants/categories';
import { Colors, Radius } from '@/constants/theme';
import { prepareImage, type PreparedImage } from '@/lib/background-removal';
import { persistImage, resolveImageUri } from '@/lib/images';
import { useWardrobe } from '@/store/wardrobe';

const GALLERY_SIZE = 9;

type GalleryState =
  | { status: 'loading' }
  | { status: 'ready'; uris: string[] }
  | { status: 'unavailable' };

export default function AddItemScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useWardrobe((s) => (id ? s.garments.find((g) => g.id === id) : undefined));
  const addGarment = useWardrobe((s) => s.addGarment);
  const updateGarment = useWardrobe((s) => s.updateGarment);
  const removeGarment = useWardrobe((s) => s.removeGarment);
  const insets = useSafeAreaInsets();

  const [name, setName] = useState(existing?.name ?? '');
  const [category, setCategory] = useState<CategoryId | null>(existing?.category ?? null);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<PreparedImage | null>(null);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const editing = !!existing;
  const [gallery, setGallery] = useState<GalleryState>(
    Platform.OS === 'web' || editing ? { status: 'unavailable' } : { status: 'loading' },
  );

  const process = useCallback(async (uri: string) => {
    setSelectedSource(uri);
    setPrepared(null);
    setProcessing(true);
    try {
      setPrepared(await prepareImage(uri));
    } catch {
      setSelectedSource(null);
      Alert.alert('Immagine non disponibile', "Non è stato possibile caricare l'immagine. Prova con un'altra foto.");
    } finally {
      setProcessing(false);
    }
  }, []);

  // Galleria del telefono mostrata direttamente nel pannello.
  useEffect(() => {
    if (editing || Platform.OS === 'web') return;
    let cancelled = false;
    (async () => {
      try {
        const permission = await requestPermissionsAsync(false, ['photo']);
        if (!permission.granted) throw new Error('permission');
        const assets = await new Query()
          .eq(AssetField.MEDIA_TYPE, MediaType.IMAGE)
          .orderBy({ key: AssetField.CREATION_TIME, ascending: false })
          .limit(GALLERY_SIZE - 1)
          .exe();
        const uris = await Promise.all(assets.map((a) => a.getUri()));
        if (!cancelled) setGallery({ status: 'ready', uris });
      } catch {
        if (!cancelled) setGallery({ status: 'unavailable' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editing]);

  // Immagine scelta nella ricerca su Google.
  useEffect(
    () =>
      useWardrobe.subscribe((state) => {
        const uri = state.pendingWebImage;
        if (!uri) return;
        state.setPendingWebImage(null);
        process(uri);
      }),
    [process],
  );

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Fotocamera non disponibile', "Consenti l'accesso alla fotocamera dalle impostazioni del telefono.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!result.canceled && result.assets[0]) process(result.assets[0].uri);
  };

  const pickFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!result.canceled && result.assets[0]) process(result.assets[0].uri);
  };

  const canSave = editing
    ? !!name.trim() && !!category
    : !!prepared && !processing && !!name.trim() && !!category;

  const save = async () => {
    if (!category) return;
    if (existing) {
      updateGarment(existing.id, { name: name.trim(), category });
      router.back();
      return;
    }
    if (!prepared) return;
    setSaving(true);
    try {
      let image: string;
      try {
        image = await persistImage(prepared.uri);
      } catch {
        // Se la copia non riesce si tiene l'indirizzo originale dell'immagine.
        image = prepared.uri;
      }
      addGarment({
        name: name.trim(),
        category,
        image,
        aspect: prepared.height > 0 ? prepared.width / prepared.height : 1,
        cutout: prepared.cutout,
      });
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!existing) return;
    Alert.alert('Eliminare il capo?', `"${existing.name}" verrà rimosso dall'armadio e dagli outfit.`, [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: () => {
          removeGarment(existing.id);
          router.back();
        },
      },
    ]);
  };

  const previewUri = editing ? resolveImageUri(existing.image) : prepared?.uri;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.flex}>
        <View style={styles.grabber} />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.titleRow}>
            <Text style={styles.title}>{editing ? 'Modifica capo' : 'Aggiungi un capo'}</Text>
            <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Chiudi">
              <Icon name="close" size={26} color={Colors.textSecondary} />
            </Pressable>
          </View>

          {!editing && (
            <>
              <View style={styles.sourceRow}>
                <Button
                  title="Cerca su Google"
                  icon="web"
                  variant="outline"
                  style={styles.flex}
                  onPress={() => router.push('/web-search')}
                />
                <Button title="Scatta foto" icon="camera-flip-outline" style={styles.flex} onPress={takePhoto} />
              </View>

              <Text style={styles.sectionLabel}>Seleziona dalla galleria:</Text>
              <GalleryGrid
                state={gallery}
                selected={selectedSource}
                onSelect={process}
                onOpenLibrary={pickFromLibrary}
              />
            </>
          )}

          {(previewUri || processing) && (
            <View style={styles.preview}>
              {processing ? (
                <View style={styles.previewLoading}>
                  <ActivityIndicator color={Colors.primary} />
                  <Text style={styles.previewNote}>Rimozione dello sfondo…</Text>
                </View>
              ) : (
                <>
                  <Image source={{ uri: previewUri }} style={styles.previewImage} contentFit="contain" />
                  {!editing && prepared && (
                    <View style={styles.previewStatus}>
                      <Icon
                        name={prepared.cutout ? 'check-circle' : 'image-outline'}
                        size={16}
                        color={prepared.cutout ? Colors.primary : Colors.textSecondary}
                      />
                      <Text style={styles.previewNote} numberOfLines={2}>
                        {prepared.cutout ? 'Sfondo rimosso' : (prepared.note ?? 'Sfondo non rimosso')}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          )}

          <Text style={styles.fieldLabel}>Nome del capo</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Es.  Maglia nera"
            placeholderTextColor={Colors.textTertiary}
            style={styles.input}
            returnKeyType="done"
          />

          <Text style={styles.fieldLabel}>Categoria</Text>
          <View style={styles.chips}>
            {ADD_ITEM_CATEGORY_ORDER.map((c) => (
              <Chip key={c} label={getCategory(c).label} selected={category === c} onPress={() => setCategory(c)} />
            ))}
          </View>

          {editing && (
            <Pressable onPress={confirmDelete} style={styles.deleteRow} accessibilityRole="button">
              <Icon name="trash-can-outline" size={20} color={Colors.danger} />
              <Text style={styles.deleteText}>{"Elimina dall'armadio"}</Text>
            </Pressable>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Button
            title={editing ? 'Salva modifiche' : "Aggiungi all'armadio"}
            onPress={save}
            disabled={!canSave}
            loading={saving}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function GalleryGrid({
  state,
  selected,
  onSelect,
  onOpenLibrary,
}: {
  state: GalleryState;
  selected: string | null;
  onSelect: (uri: string) => void;
  onOpenLibrary: () => void;
}) {
  const uris = state.status === 'ready' ? state.uris : [];
  return (
    <View style={styles.gallery}>
      {state.status === 'loading' && (
        <View style={styles.galleryLoading}>
          <ActivityIndicator color={Colors.textSecondary} />
        </View>
      )}
      {uris.map((uri) => {
        const isSelected = selected === uri;
        return (
          <Pressable
            key={uri}
            style={styles.galleryCell}
            onPress={() => onSelect(uri)}
            accessibilityLabel="Foto della galleria"
            accessibilityState={{ selected: isSelected }}>
            <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" recyclingKey={uri} />
            <View style={[styles.galleryCheck, isSelected && styles.galleryCheckOn]}>
              {isSelected && <Icon name="check" size={14} color={Colors.white} />}
            </View>
          </Pressable>
        );
      })}
      {state.status !== 'loading' && (
        <Pressable
          style={[styles.galleryCell, styles.galleryMore]}
          onPress={onOpenLibrary}
          accessibilityRole="button"
          accessibilityLabel="Apri la galleria">
          <Icon name="image-multiple-outline" size={28} color={Colors.primary} />
          <Text style={styles.galleryMoreText}>{uris.length ? 'Altre foto' : 'Apri galleria'}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grabber: {
    alignSelf: 'center',
    width: 56,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.surfaceStrong,
    marginTop: 10,
  },
  content: { padding: 20, paddingBottom: 32 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  title: { fontSize: 30, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  sourceRow: { flexDirection: 'row', gap: 12 },
  sectionLabel: { fontSize: 20, fontWeight: '700', color: Colors.text, marginTop: 22, marginBottom: 10 },
  gallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: Radius.sm,
    overflow: 'hidden',
    gap: 2,
  },
  galleryLoading: { height: 120, flex: 1, alignItems: 'center', justifyContent: 'center' },
  galleryCell: {
    width: '32.9%',
    aspectRatio: 1.25,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  galleryCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.95)',
    backgroundColor: 'rgba(0,0,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryCheckOn: { backgroundColor: Colors.primary, borderColor: Colors.white },
  galleryMore: { alignItems: 'center', justifyContent: 'center', gap: 6 },
  galleryMoreText: { color: Colors.primary, fontWeight: '600', fontSize: 14 },
  preview: {
    marginTop: 20,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: 12,
    alignItems: 'center',
  },
  previewImage: { width: '100%', height: 220 },
  previewLoading: { height: 220, alignItems: 'center', justifyContent: 'center', gap: 10 },
  previewStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingHorizontal: 8 },
  previewNote: { fontSize: 13, color: Colors.textSecondary, flexShrink: 1 },
  fieldLabel: { fontSize: 16, color: Colors.textSecondary, marginTop: 24, marginBottom: 10, marginLeft: 4 },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm + 2,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 17,
    color: Colors.text,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  deleteRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 28, alignSelf: 'center', padding: 8 },
  deleteText: { color: Colors.danger, fontSize: 16, fontWeight: '600' },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: Colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
});
