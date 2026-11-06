import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, CircleButton } from '@/components/Buttons';
import { Icon } from '@/components/Icon';
import { Mannequin } from '@/components/Mannequin';
import { OutfitPreview } from '@/components/OutfitPreview';
import { Colors, Radius, Shadow, TAB_BAR_SPACE } from '@/constants/theme';
import { prepareImage } from '@/lib/background-removal';
import { deleteStoredImage, persistImage, resolveImageUri } from '@/lib/images';
import { useWardrobe, type Outfit } from '@/store/wardrobe';

const AVATAR_BOX_H = 230;

export default function ProfileScreen() {
  const profile = useWardrobe((s) => s.profile);
  const garmentCount = useWardrobe((s) => s.garments.length);
  const outfits = useWardrobe((s) => s.outfits);
  const setProfile = useWardrobe((s) => s.setProfile);
  const resetDraft = useWardrobe((s) => s.resetDraft);
  const loadOutfitIntoDraft = useWardrobe((s) => s.loadOutfitIntoDraft);
  const removeOutfit = useWardrobe((s) => s.removeOutfit);
  const [loadingPhoto, setLoadingPhoto] = useState(false);

  const photoUri = resolveImageUri(profile.photo);
  const usingPhoto = profile.avatarMode === 'photo' && !!profile.photo;

  const choosePhoto = () => {
    const handle = async (result: ImagePicker.ImagePickerResult) => {
      if (result.canceled || !result.assets[0]) return;
      setLoadingPhoto(true);
      try {
        const prepared = await prepareImage(result.assets[0].uri);
        const stored = await persistImage(prepared.uri);
        deleteStoredImage(profile.photo);
        setProfile({
          photo: stored,
          photoAspect: prepared.height ? prepared.width / prepared.height : 0.5,
          avatarMode: 'photo',
        });
      } catch {
        Alert.alert('Foto non caricata', 'Non è stato possibile usare questa foto. Riprova con un’altra immagine.');
      } finally {
        setLoadingPhoto(false);
      }
    };
    const fromCamera = async () => {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return;
      handle(await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 }));
    };
    const fromLibrary = async () =>
      handle(await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 }));

    Alert.alert('La tua foto', 'Usa una foto a figura intera, in piedi e di fronte, su uno sfondo semplice.', [
      { text: 'Scatta foto', onPress: fromCamera },
      { text: 'Scegli dalla galleria', onPress: fromLibrary },
      { text: 'Annulla', style: 'cancel' },
    ]);
  };

  const selectPhotoMode = () => {
    if (!profile.photo) choosePhoto();
    else setProfile({ avatarMode: 'photo' });
  };

  const openOutfit = (o: Outfit) => {
    loadOutfitIntoDraft(o.id);
    router.navigate('/outfit');
  };

  const confirmRemove = (o: Outfit) =>
    Alert.alert('Rimuovere dai preferiti?', `L'outfit "${o.name}" verrà eliminato.`, [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Rimuovi', style: 'destructive', onPress: () => removeOutfit(o.id) },
    ]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE + 10 }}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatarImage} contentFit="cover" contentPosition="top" />
            ) : (
              <Text style={styles.avatarInitial}>{profile.name.charAt(0).toUpperCase()}</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.hello} numberOfLines={1}>
              Ciao {profile.name}
            </Text>
            <Text style={styles.summary}>
              Hai {garmentCount} {garmentCount === 1 ? 'capo' : 'capi'} e {outfits.length}{' '}
              {outfits.length === 1 ? 'outfit preferito' : 'outfit preferiti'}
            </Text>
          </View>
          <CircleButton icon="cog-outline" accessibilityLabel="Impostazioni" onPress={() => router.push('/settings')} />
        </View>

        <View style={styles.quickRow}>
          <Button
            title="Aggiungi capo"
            icon="plus"
            variant="outline"
            style={{ flex: 1 }}
            onPress={() => router.push('/add-item')}
          />
          <Button
            title="Crea Outfit"
            icon="tshirt-crew-outline"
            style={{ flex: 1 }}
            onPress={() => {
              resetDraft();
              router.navigate('/outfit');
            }}
          />
        </View>

        <Text style={styles.section}>Avatar</Text>
        <View style={styles.avatarRow}>
          <AvatarCard
            title="La tua foto"
            selected={usingPhoto}
            onPress={selectPhotoMode}
            accessibilityLabel="Usa la tua foto">
            {loadingPhoto ? (
              <ActivityIndicator color={Colors.primary} />
            ) : photoUri ? (
              <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} contentFit="contain" />
            ) : (
              <View style={styles.placeholder}>
                <Icon name="camera-outline" size={34} color={Colors.textTertiary} />
                <Text style={styles.placeholderText}>Aggiungi una foto</Text>
              </View>
            )}
          </AvatarCard>
          <AvatarCard
            title="Manichino"
            selected={!usingPhoto}
            onPress={() => setProfile({ avatarMode: 'mannequin' })}
            accessibilityLabel="Usa il manichino">
            <Mannequin params={profile.mannequin} width={(AVATAR_BOX_H - 24) / 2} />
          </AvatarCard>
        </View>

        <View style={styles.avatarAction}>
          {usingPhoto ? (
            <Button title="Cambia foto" icon="camera-flip-outline" variant="soft" onPress={choosePhoto} />
          ) : (
            <Button
              title="Personalizza misure"
              icon="ruler-square"
              variant="soft"
              onPress={() => router.push('/mannequin')}
            />
          )}
        </View>

        <Text style={styles.section}>I tuoi outfit preferiti</Text>
        {outfits.length === 0 ? (
          <View style={styles.emptyFav}>
            <Icon name="heart-outline" size={32} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>
              {"Crea un outfit e premi il cuore per salvarlo qui con il suo nome e l'occasione."}
            </Text>
          </View>
        ) : (
          <FlatList
            horizontal
            data={outfits}
            keyExtractor={(o) => o.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.favList}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [styles.favCard, pressed && { opacity: 0.85 }]}
                onPress={() => openOutfit(item)}
                onLongPress={() => confirmRemove(item)}
                accessibilityLabel={`${item.name}, ${item.occasion}`}>
                <View style={styles.favImage}>
                  <OutfitPreview look={item} height={200} />
                  <Pressable style={styles.favHeart} onPress={() => confirmRemove(item)} hitSlop={8}>
                    <Icon name="heart" size={22} color={Colors.heart} />
                  </Pressable>
                </View>
                <Text style={styles.favName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.favOccasion} numberOfLines={1}>
                  {item.occasion}
                </Text>
              </Pressable>
            )}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function AvatarCard({
  title,
  selected,
  onPress,
  accessibilityLabel,
  children,
}: {
  title: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      style={[styles.avatarCard, selected && styles.avatarCardSelected]}>
      <View style={styles.avatarBox}>{children}</View>
      <Text style={styles.avatarTitle}>{title}</Text>
      <Text style={[styles.avatarStatus, selected && styles.avatarStatusSelected]}>
        {selected ? 'In uso' : 'Tocca per selezionare'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 16 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarInitial: { fontSize: 28, fontWeight: '700', color: Colors.primary },
  hello: { fontSize: 32, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  summary: { fontSize: 15, color: Colors.textSecondary, marginTop: 2 },
  quickRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: 22 },
  section: { fontSize: 22, fontWeight: '800', color: Colors.text, paddingHorizontal: 20, marginTop: 28, marginBottom: 12 },
  avatarRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20 },
  avatarCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 8,
    paddingBottom: 12,
  },
  avatarCardSelected: { borderColor: Colors.primary },
  avatarBox: {
    height: AVATAR_BOX_H,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 10,
  },
  placeholder: { alignItems: 'center', gap: 6 },
  placeholderText: { fontSize: 13, color: Colors.textSecondary },
  avatarTitle: { fontSize: 18, fontWeight: '600', color: Colors.text, paddingHorizontal: 6 },
  avatarStatus: { fontSize: 14, color: Colors.textSecondary, paddingHorizontal: 6, marginTop: 2 },
  avatarStatusSelected: { color: Colors.primary },
  avatarAction: { paddingHorizontal: 20, marginTop: 12 },
  emptyFav: { marginHorizontal: 20, padding: 24, borderRadius: Radius.md, backgroundColor: Colors.surface, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 21 },
  favList: { paddingHorizontal: 20, gap: 14, paddingBottom: 8 },
  favCard: {
    width: 160,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: 6,
    paddingBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F0F2',
    ...Shadow.card,
  },
  favImage: {
    height: 212,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 10,
  },
  favHeart: { position: 'absolute', top: 8, right: 8 },
  favName: { fontSize: 16, fontWeight: '600', color: Colors.text, paddingHorizontal: 6 },
  favOccasion: { fontSize: 14, color: Colors.textSecondary, paddingHorizontal: 6, marginTop: 2 },
});
