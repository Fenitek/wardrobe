import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { Button } from '@/components/Buttons';
import { Icon } from '@/components/Icon';
import { Colors, Radius } from '@/constants/theme';
import { useWardrobe } from '@/store/wardrobe';

const searchUrl = (q: string) =>
  `https://www.google.com/search?tbm=isch&hl=it&q=${encodeURIComponent(q)}`;

/**
 * Script iniettato nella pagina di Google Immagini: quando l'utente tocca una foto
 * ne comunica l'indirizzo all'app. Il tocco prosegue normalmente, così Google apre
 * l'anteprima: toccando la foto grande si ottiene un'immagine di qualità migliore.
 */
const INJECTED = `
(function () {
  if (window.__wardrobeInjected) return;
  window.__wardrobeInjected = true;
  function findImage(el) {
    if (!el) return null;
    if (el.tagName === 'IMG') return el;
    var holder = el.closest ? el.closest('a, div[role="button"], div[jsaction]') : null;
    return holder && holder.querySelector ? holder.querySelector('img') : null;
  }
  document.addEventListener('click', function (e) {
    var img = findImage(e.target);
    if (!img) return;
    var r = img.getBoundingClientRect();
    if (r.width < 50 || r.height < 50) return;
    var src = img.currentSrc || img.src || img.getAttribute('data-src') || '';
    if (!src || src.indexOf('data:image/gif') === 0) return;
    window.ReactNativeWebView.postMessage(JSON.stringify({
      src: src, w: img.naturalWidth || 0, h: img.naturalHeight || 0
    }));
  }, true);
})();
true;
`;

type Candidate = { src: string; w: number; h: number };

export default function WebSearchScreen() {
  const insets = useSafeAreaInsets();
  const setPendingWebImage = useWardrobe((s) => s.setPendingWebImage);
  const [query, setQuery] = useState('');
  const [url, setUrl] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [pasted, setPasted] = useState('');

  const search = () => {
    const q = query.trim();
    if (!q) return;
    setCandidate(null);
    setUrl(searchUrl(q));
  };

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(e.nativeEvent.data) as Candidate;
      if (data.src) setCandidate(data);
    } catch {
      // Messaggio non valido: si ignora.
    }
  };

  const importImage = (src: string) => {
    setPendingWebImage(src);
    router.back();
  };

  const isWeb = Platform.OS === 'web';

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'android' ? insets.top : 12 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Chiudi">
          <Icon name="close" size={26} color={Colors.text} />
        </Pressable>
        <View style={styles.searchBox}>
          <Icon name="magnify" size={20} color={Colors.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Es. giacca di jeans"
            placeholderTextColor={Colors.textTertiary}
            style={styles.searchInput}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={search}
          />
        </View>
      </View>

      {isWeb ? (
        <View style={styles.webFallback}>
          <Icon name="web" size={40} color={Colors.textTertiary} />
          <Text style={styles.hintTitle}>Ricerca disponibile sul telefono</Text>
          <Text style={styles.hint}>
            {"Nel browser Google non può essere aperto dentro l'app. Incolla qui l'indirizzo di un'immagine."}
          </Text>
          <TextInput
            value={pasted}
            onChangeText={setPasted}
            placeholder="https://…/immagine.jpg"
            placeholderTextColor={Colors.textTertiary}
            style={[styles.searchInput, styles.pasteInput]}
            autoCapitalize="none"
          />
          <Button title="Usa questa immagine" onPress={() => importImage(pasted.trim())} disabled={!/^https?:\/\//.test(pasted.trim())} />
        </View>
      ) : url ? (
        <WebView
          source={{ uri: url }}
          style={styles.flex}
          injectedJavaScript={INJECTED}
          onMessage={onMessage}
          setSupportMultipleWindows={false}
          allowsBackForwardNavigationGestures
        />
      ) : (
        <View style={styles.intro}>
          <Icon name="web" size={48} color={Colors.textTertiary} />
          <Text style={styles.hintTitle}>Cerca il tuo capo su Google</Text>
          <Text style={styles.hint}>
            {"Scrivi il nome dell'indumento e tocca una delle foto proposte per importarla nell'armadio."}
          </Text>
          <Button title="Cerca" icon="magnify" onPress={search} disabled={!query.trim()} style={{ marginTop: 8 }} />
        </View>
      )}

      {candidate && (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          <Image source={{ uri: candidate.src }} style={styles.thumb} contentFit="contain" />
          <View style={styles.flex}>
            <Text style={styles.bottomTitle}>Foto selezionata</Text>
            <Text style={styles.bottomHint} numberOfLines={2}>
              {candidate.w && candidate.w < 300
                ? "Tocca la foto grande nell'anteprima per una qualità migliore."
                : 'Pronta per essere importata.'}
            </Text>
          </View>
          <Button title="Usa" onPress={() => importImage(candidate.src)} style={styles.useButton} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 10 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: Colors.text },
  pasteInput: {
    flex: 0,
    alignSelf: 'stretch',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
  },
  intro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  webFallback: { flex: 1, alignItems: 'center', padding: 32, gap: 12, paddingTop: 60 },
  hintTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  hint: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 21 },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  thumb: { width: 56, height: 56, borderRadius: Radius.sm, backgroundColor: Colors.surface },
  bottomTitle: { fontSize: 16, fontWeight: '600', color: Colors.text },
  bottomHint: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  useButton: { minHeight: 46, paddingHorizontal: 24 },
});
