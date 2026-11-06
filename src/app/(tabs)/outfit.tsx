import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Buttons';
import { Figure, placeLayers, type LayerKey } from '@/components/Figure';
import { Icon, type IconName } from '@/components/Icon';
import { Colors, Radius, Shadow, TAB_BAR_SPACE } from '@/constants/theme';
import { computeBody, DEFAULT_FIT, FIGURE_ASPECT, type Fit } from '@/lib/body';
import { resolveImageUri } from '@/lib/images';
import { useGarmentsById } from '@/store/hooks';
import {
  bottomGarments,
  makeLayer,
  topGarments,
  useWardrobe,
  type Draft,
  type Garment,
} from '@/store/wardrobe';

const SWIPE_THRESHOLD = 60;
const PEEK_W = 84;
const PEEK_H = 118;

const haptic = (style = Haptics.ImpactFeedbackStyle.Light) => {
  if (Platform.OS !== 'web') Haptics.impactAsync(style).catch(() => {});
};

type Zone = 'top' | 'bottom';

export default function OutfitScreen() {
  const garments = useWardrobe((s) => s.garments);
  const profile = useWardrobe((s) => s.profile);
  const draft = useWardrobe((s) => s.draft);
  const setDraft = useWardrobe((s) => s.setDraft);
  const resetDraft = useWardrobe((s) => s.resetDraft);
  const editingOutfit = useWardrobe((s) => s.outfits.find((o) => o.id === s.draft.editingId));
  const garmentsById = useGarmentsById();

  const tops = useMemo(() => topGarments(garments), [garments]);
  const bottoms = useMemo(() => bottomGarments(garments), [garments]);

  const [stage, setStage] = useState({ w: 0, h: 0 });
  const [selectedKey, setEditKey] = useState<LayerKey | null>(null);
  const [liveFit, setLiveFit] = useState<{ key: LayerKey; fit: Fit } | null>(null);
  const [swipe, setSwipe] = useState<{ zone: Zone; dx: number } | null>(null);

  // Primo outfit proposto: la prima maglia e il primo pantalone dell'armadio.
  useEffect(() => {
    if (draft.initialized || garments.length === 0) return;
    setDraft({
      tops: tops[0] ? [makeLayer(tops[0].id)] : [],
      bottom: bottoms[0] ? makeLayer(bottoms[0].id) : null,
      activeTop: 0,
      initialized: true,
    });
  }, [draft.initialized, garments.length, tops, bottoms, setDraft]);

  // Se lo strato in modifica non esiste più (es. capo eliminato) si esce dalla modifica.
  const editKey =
    selectedKey === null
      ? null
      : (selectedKey === 'bottom' ? !!draft.bottom : selectedKey < draft.tops.length)
        ? selectedKey
        : null;

  const figW = Math.max(0, Math.min(stage.w * 0.6, stage.h / FIGURE_ASPECT));
  const figH = figW * FIGURE_ASPECT;
  const figX = (stage.w - figW) / 2;
  const figY = (stage.h - figH) / 2;
  const body = useMemo(() => computeBody(profile.mannequin), [profile.mannequin]);

  // ---- Azioni -------------------------------------------------------------

  const listFor = (zone: Zone) => (zone === 'top' ? tops : bottoms);

  const currentGarmentId = (d: Draft, zone: Zone) =>
    zone === 'bottom' ? d.bottom?.garmentId : d.tops[d.activeTop]?.garmentId;

  const neighbour = (d: Draft, zone: Zone, dir: 1 | -1): Garment | undefined => {
    const list = listFor(zone);
    if (list.length === 0) return undefined;
    const idx = list.findIndex((g) => g.id === currentGarmentId(d, zone));
    if (idx === -1) return list[0];
    return list[(idx + dir + list.length) % list.length];
  };

  const cycle = (zone: Zone, dir: 1 | -1) => {
    const d = useWardrobe.getState().draft;
    const next = neighbour(d, zone, dir);
    if (!next || next.id === currentGarmentId(d, zone)) return;
    haptic();
    if (zone === 'bottom') {
      setDraft({ bottom: makeLayer(next.id) });
    } else if (d.tops.length === 0) {
      setDraft({ tops: [makeLayer(next.id)], activeTop: 0 });
    } else {
      const newTops = d.tops.slice();
      newTops[d.activeTop] = makeLayer(next.id);
      setDraft({ tops: newTops });
    }
  };

  /** Aggiunge uno strato superiore, preferendo felpe, giacche e camicie non ancora indossate. */
  const addLayer = () => {
    const d = useWardrobe.getState().draft;
    if (tops.length === 0) return;
    const used = new Set(d.tops.map((t) => t.garmentId));
    const pick =
      tops.find((g) => !used.has(g.id) && (g.category === 'felpe' || g.category === 'giacche')) ??
      tops.find((g) => !used.has(g.id) && g.category === 'camicie') ??
      tops.find((g) => !used.has(g.id)) ??
      tops[0];
    haptic(Haptics.ImpactFeedbackStyle.Medium);
    setDraft({ tops: [...d.tops, makeLayer(pick.id)], activeTop: d.tops.length });
    setEditKey(null);
  };

  const removeLayer = (index: number) => {
    const d = useWardrobe.getState().draft;
    const newTops = d.tops.filter((_, i) => i !== index);
    setDraft({ tops: newTops, activeTop: Math.max(0, Math.min(d.activeTop, newTops.length - 1)) });
    setEditKey(null);
  };

  const fitOf = (key: LayerKey): Fit => {
    const d = useWardrobe.getState().draft;
    const layer = key === 'bottom' ? d.bottom : d.tops[key];
    return layer ? layer.fit : DEFAULT_FIT;
  };

  const commitFit = (key: LayerKey, fit: Fit) => {
    const d = useWardrobe.getState().draft;
    if (key === 'bottom') {
      if (d.bottom) setDraft({ bottom: { ...d.bottom, fit } });
    } else if (d.tops[key]) {
      const newTops = d.tops.slice();
      newTops[key] = { ...newTops[key], fit };
      setDraft({ tops: newTops });
    }
  };

  const adjust = (change: Partial<Record<'sx' | 'sy', number>>) => {
    if (editKey === null) return;
    const f = fitOf(editKey);
    const clampScale = (v: number) => Math.min(2.5, Math.max(0.4, v));
    commitFit(editKey, {
      ...f,
      sx: clampScale(f.sx * (change.sx ?? 1)),
      sy: clampScale(f.sy * (change.sy ?? 1)),
    });
  };

  /** Capo indossato nel punto toccato (dal più esterno al più interno). */
  const hitTest = (x: number, y: number): LayerKey | null => {
    const d = useWardrobe.getState().draft;
    const placed = placeLayers(d, garmentsById, body, figW);
    const px = x - figX;
    const py = y - figY;
    for (let i = placed.length - 1; i >= 0; i--) {
      const r = placed[i].rect;
      if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return placed[i].key;
    }
    return null;
  };

  const zoneAt = (y: number): Zone => (y - figY < body.waistY * figH + 0.02 * figH ? 'top' : 'bottom');

  // Le funzioni dei gesti leggono sempre lo stato più recente tramite questo riferimento.
  const latest = useRef({ cycle, addLayer, hitTest, zoneAt, fitOf, commitFit, editKey, figW, figH });
  useLayoutEffect(() => {
    latest.current = { cycle, addLayer, hitTest, zoneAt, fitOf, commitFit, editKey, figW, figH };
  });

  // ---- Gesti --------------------------------------------------------------
  // Le callback dei gesti vengono eseguite solo in risposta ai tocchi, mai durante il render.
  /* eslint-disable react-hooks/refs */

  const browseGesture = useMemo(() => {
    const g = { zone: 'top' as Zone };
    const pan = Gesture.Pan()
      .runOnJS(true)
      .activeOffsetX([-12, 12])
      .failOffsetY([-24, 24])
      .onBegin((e) => {
        g.zone = latest.current.zoneAt(e.y);
      })
      .onUpdate((e) => setSwipe({ zone: g.zone, dx: e.translationX }))
      .onEnd((e) => {
        if (Math.abs(e.translationX) > SWIPE_THRESHOLD || Math.abs(e.velocityX) > 600) {
          latest.current.cycle(g.zone, e.translationX < 0 ? 1 : -1);
        }
      })
      .onFinalize(() => setSwipe(null));

    const longPress = Gesture.LongPress()
      .runOnJS(true)
      .minDuration(450)
      .onStart((e) => {
        const hit = latest.current.hitTest(e.x, e.y);
        if (typeof hit === 'number' || (hit === null && latest.current.zoneAt(e.y) === 'top')) {
          latest.current.addLayer();
        }
      });

    const tap = Gesture.Tap()
      .runOnJS(true)
      .onEnd((e) => {
        const hit = latest.current.hitTest(e.x, e.y);
        if (hit !== null) {
          haptic();
          setEditKey(hit);
          if (typeof hit === 'number') setDraft({ activeTop: hit });
        }
      });

    return Gesture.Race(pan, Gesture.Exclusive(longPress, tap));
  }, [setDraft]);

  const editGesture = useMemo(() => {
    const g = { fit: DEFAULT_FIT, lastX: 0, lastY: 0, lastScale: 1, active: 0 };

    const start = () => {
      const key = latest.current.editKey;
      if (key !== null && g.active === 0) g.fit = { ...latest.current.fitOf(key) };
      g.active += 1;
    };
    const finish = () => {
      g.active = Math.max(0, g.active - 1);
      const key = latest.current.editKey;
      if (key !== null) latest.current.commitFit(key, g.fit);
      if (g.active === 0) setLiveFit(null);
    };
    const publish = () => {
      const key = latest.current.editKey;
      if (key !== null) setLiveFit({ key, fit: { ...g.fit } });
    };

    const pan = Gesture.Pan()
      .runOnJS(true)
      .minDistance(2)
      .onStart(() => {
        g.lastX = 0;
        g.lastY = 0;
        start();
      })
      .onUpdate((e) => {
        const { figW: w, figH: h } = latest.current;
        if (!w) return;
        g.fit = {
          ...g.fit,
          dx: g.fit.dx + (e.translationX - g.lastX) / w,
          dy: g.fit.dy + (e.translationY - g.lastY) / h,
        };
        g.lastX = e.translationX;
        g.lastY = e.translationY;
        publish();
      })
      .onEnd(finish);

    const pinch = Gesture.Pinch()
      .runOnJS(true)
      .onStart(() => {
        g.lastScale = 1;
        start();
      })
      .onUpdate((e) => {
        const factor = e.scale / g.lastScale;
        g.lastScale = e.scale;
        const clampScale = (v: number) => Math.min(2.5, Math.max(0.4, v));
        g.fit = { ...g.fit, sx: clampScale(g.fit.sx * factor), sy: clampScale(g.fit.sy * factor) };
        publish();
      })
      .onEnd(finish);

    const tap = Gesture.Tap()
      .runOnJS(true)
      .onEnd((e) => {
        const hit = latest.current.hitTest(e.x, e.y);
        setEditKey(hit);
        if (typeof hit === 'number') setDraft({ activeTop: hit });
      });

    return Gesture.Race(Gesture.Simultaneous(pan, pinch), tap);
  }, [setDraft]);

  /* eslint-enable react-hooks/refs */

  // ---- Interfaccia --------------------------------------------------------

  const onStageLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setStage({ w: width, h: height });
  };

  const openSave = () => {
    if (!draft.bottom && draft.tops.length === 0) {
      Alert.alert('Outfit vuoto', 'Indossa almeno un capo prima di salvare.');
      return;
    }
    setEditKey(null);
    router.push('/save-outfit');
  };

  const startNew = () => {
    resetDraft();
    setEditKey(null);
  };

  const hasGarments = garments.length > 0;
  const peeks: { zone: Zone; y: number }[] = [
    { zone: 'top', y: figY + ((body.shoulderY + body.hipY) / 2) * figH },
    { zone: 'bottom', y: figY + ((body.crotchY + body.kneeY) / 2) * figH },
  ];
  const editedGarment =
    editKey === null
      ? undefined
      : garmentsById.get((editKey === 'bottom' ? draft.bottom : draft.tops[editKey])?.garmentId ?? '');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.title} numberOfLines={1}>
            Crea il tuo outfit
          </Text>
          {editingOutfit && (
            <Pressable onPress={startNew} hitSlop={8}>
              <Text style={styles.editingLabel} numberOfLines={1}>
                {`Stai modificando “${editingOutfit.name}” · `}
                <Text style={styles.link}>Nuovo outfit</Text>
              </Text>
            </Pressable>
          )}
        </View>
        <View style={styles.pill}>
          <Pressable
            onPress={() => router.push('/garment-search')}
            accessibilityLabel="Cerca un capo da indossare"
            hitSlop={6}
            style={styles.pillButton}>
            <Icon name="magnify" size={24} />
          </Pressable>
          <Pressable onPress={openSave} accessibilityLabel="Salva nei preferiti" hitSlop={6} style={styles.pillButton}>
            <Icon name={editingOutfit ? 'heart' : 'heart-outline'} size={24} color={editingOutfit ? Colors.heart : Colors.text} />
          </Pressable>
        </View>
      </View>

      <View style={styles.stage} onLayout={onStageLayout}>
        {figW > 0 && (
          <>
            {editKey === null &&
              peeks.map(({ zone, y }) => {
                if (listFor(zone).length < 2) return null;
                const prev = neighbour(draft, zone, -1);
                const next = neighbour(draft, zone, 1);
                return (
                  <View key={zone} pointerEvents="none" style={StyleSheet.absoluteFill}>
                    {prev && <Peek garment={prev} style={{ left: -PEEK_W * 0.42, top: y - PEEK_H / 2 }} />}
                    {next && <Peek garment={next} style={{ right: -PEEK_W * 0.42, top: y - PEEK_H / 2 }} />}
                  </View>
                );
              })}

            <GestureDetector gesture={editKey === null ? browseGesture : editGesture}>
              <View style={StyleSheet.absoluteFill} collapsable={false}>
                <View style={{ position: 'absolute', left: figX, top: figY }} pointerEvents="none">
                  <Figure
                    width={figW}
                    look={draft}
                    garmentsById={garmentsById}
                    profile={profile}
                    selected={editKey}
                    override={liveFit}
                    swipe={swipe}
                    activeTop={draft.activeTop}
                  />
                </View>
              </View>
            </GestureDetector>

            {!hasGarments && (
              <View style={styles.emptyOverlay} pointerEvents="box-none">
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>Il tuo armadio è vuoto</Text>
                  <Text style={styles.emptyText}>Aggiungi qualche capo per provarlo sulla tua figura.</Text>
                  <Button title="Aggiungi un capo" icon="plus" onPress={() => router.push('/add-item')} />
                </View>
              </View>
            )}
          </>
        )}
      </View>

      <View style={styles.controls}>
        {editKey !== null ? (
          <View style={styles.editPanel}>
            <Text style={styles.editTitle} numberOfLines={1}>
              {editedGarment ? `Sistema: ${editedGarment.name}` : 'Sistema il capo'}
            </Text>
            <View style={styles.editRow}>
              <ToolButton icon="arrow-collapse-horizontal" label="Stringi" onPress={() => adjust({ sx: 0.95 })} />
              <ToolButton icon="arrow-expand-horizontal" label="Allarga" onPress={() => adjust({ sx: 1.05 })} />
              <ToolButton icon="arrow-collapse-vertical" label="Accorcia" onPress={() => adjust({ sy: 0.95 })} />
              <ToolButton icon="arrow-expand-vertical" label="Allunga" onPress={() => adjust({ sy: 1.05 })} />
              <ToolButton icon="restore" label="Ripristina" onPress={() => commitFit(editKey, { ...DEFAULT_FIT })} />
              <ToolButton icon="check" label="Fatto" primary onPress={() => setEditKey(null)} />
            </View>
            <Text style={styles.hint}>Trascina per spostare · Pizzica per ridimensionare</Text>
          </View>
        ) : (
          <>
            {draft.tops.length > 1 && (
              <View style={styles.layers}>
                {draft.tops.map((t, i) => {
                  const g = garmentsById.get(t.garmentId);
                  const active = i === draft.activeTop;
                  return (
                    <Pressable
                      key={`${i}-${t.garmentId}`}
                      onPress={() => setDraft({ activeTop: i })}
                      style={[styles.layerChip, active && styles.layerChipActive]}
                      accessibilityLabel={`Strato ${i + 1}: ${g?.name ?? ''}`}>
                      <Text style={[styles.layerText, active && styles.layerTextActive]} numberOfLines={1}>
                        {i + 1} · {g?.name ?? 'Capo'}
                      </Text>
                      <Pressable
                        onPress={() => removeLayer(i)}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={`Rimuovi lo strato ${i + 1}`}>
                        <Icon name="close" size={16} color={active ? Colors.white : Colors.textSecondary} />
                      </Pressable>
                    </Pressable>
                  );
                })}
              </View>
            )}
            {hasGarments && (
              <Text style={styles.hint}>
                {draft.tops.length > 1
                  ? 'Scorri per cambiare lo strato · Tocca un capo per sistemarlo'
                  : 'Tieni premuto per aggiungere uno strato'}
              </Text>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function Peek({ garment, style }: { garment: Garment; style: object }) {
  return (
    <View style={[styles.peek, style]}>
      <Image source={{ uri: resolveImageUri(garment.image) }} style={StyleSheet.absoluteFill} contentFit="contain" />
    </View>
  );
}

function ToolButton({
  icon,
  label,
  onPress,
  primary,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={styles.tool} accessibilityRole="button" accessibilityLabel={label}>
      <View style={[styles.toolIcon, primary && styles.toolIconPrimary]}>
        <Icon name={icon} size={20} color={primary ? Colors.white : Colors.text} />
      </View>
      <Text style={styles.toolLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
  },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  editingLabel: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  link: { color: Colors.primary, fontWeight: '600' },
  pill: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 6,
    ...Shadow.card,
  },
  pillButton: { width: 44, height: 46, alignItems: 'center', justifyContent: 'center' },
  stage: { flex: 1, overflow: 'hidden' },
  peek: { position: 'absolute', width: PEEK_W, height: PEEK_H, opacity: 0.9 },
  emptyOverlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyCard: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: Radius.lg,
    padding: 20,
    gap: 10,
    alignItems: 'center',
    ...Shadow.floating,
  },
  emptyTitle: { fontSize: 19, fontWeight: '700', color: Colors.text },
  emptyText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },
  controls: { minHeight: 64, paddingHorizontal: 16, paddingBottom: TAB_BAR_SPACE - 8, justifyContent: 'flex-end' },
  hint: { textAlign: 'center', color: Colors.textSecondary, fontSize: 15, marginTop: 6 },
  layers: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  layerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingLeft: 12,
    paddingRight: 10,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    maxWidth: 180,
  },
  layerChipActive: { backgroundColor: Colors.primary },
  layerText: { fontSize: 14, color: Colors.text, fontWeight: '500', flexShrink: 1 },
  layerTextActive: { color: Colors.white },
  editPanel: { gap: 8 },
  editTitle: { textAlign: 'center', fontSize: 15, fontWeight: '600', color: Colors.text },
  editRow: { flexDirection: 'row', justifyContent: 'space-between' },
  tool: { alignItems: 'center', gap: 4, flex: 1 },
  toolIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolIconPrimary: { backgroundColor: Colors.primary },
  toolLabel: { fontSize: 11, color: Colors.textSecondary },
});
