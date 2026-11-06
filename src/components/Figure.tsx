import { Image } from 'expo-image';
import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Mannequin } from '@/components/Mannequin';
import { Colors } from '@/constants/theme';
import { applyFit, computeBody, defaultGarmentFrame, FIGURE_ASPECT, type Body, type Fit, type Frame } from '@/lib/body';
import { resolveImageUri } from '@/lib/images';
import type { Garment, Layer, Look, Profile } from '@/store/wardrobe';

/** Identifica uno strato: 'bottom' oppure l'indice dello strato superiore. */
export type LayerKey = 'bottom' | number;

export type PlacedLayer = {
  key: LayerKey;
  garment: Garment;
  layer: Layer;
  /** Riquadro in pixel. */
  rect: Frame;
};

/** Calcola la posizione in pixel di ogni capo indossato, dal più interno al più esterno. */
export function placeLayers(
  look: Look,
  garmentsById: Map<string, Garment>,
  body: Body,
  width: number,
  override?: { key: LayerKey; fit: Fit } | null,
): PlacedLayer[] {
  const height = width * FIGURE_ASPECT;
  const out: PlacedLayer[] = [];
  const place = (key: LayerKey, layer: Layer | null) => {
    if (!layer) return;
    const garment = garmentsById.get(layer.garmentId);
    if (!garment) return;
    const fit = override && override.key === key ? override.fit : layer.fit;
    const f = applyFit(defaultGarmentFrame(body, garment.category, garment.aspect), fit);
    out.push({ key, garment, layer, rect: { x: f.x * width, y: f.y * height, w: f.w * width, h: f.h * height } });
  };
  place('bottom', look.bottom);
  look.tops.forEach((t, i) => place(i, t));
  return out;
}

type Props = {
  width: number;
  look: Look;
  garmentsById: Map<string, Garment>;
  profile: Profile;
  /** Strato evidenziato (in modifica). */
  selected?: LayerKey | null;
  /** Regolazione temporanea durante un gesto. */
  override?: { key: LayerKey; fit: Fit } | null;
  /** Spostamento orizzontale temporaneo (scorrimento dei capi). */
  swipe?: { zone: 'top' | 'bottom'; dx: number } | null;
  /** Indice dello strato superiore che si sta scorrendo. */
  activeTop?: number;
};

/** La figura (foto o manichino) con i capi indossati sopra. */
export const Figure = memo(function Figure({
  width,
  look,
  garmentsById,
  profile,
  selected,
  override,
  swipe,
  activeTop,
}: Props) {
  const height = width * FIGURE_ASPECT;
  const body = useMemo(() => computeBody(profile.mannequin), [profile.mannequin]);
  const layers = useMemo(
    () => placeLayers(look, garmentsById, body, width, override),
    [look, garmentsById, body, width, override],
  );
  const photoUri = profile.avatarMode === 'photo' ? resolveImageUri(profile.photo) : undefined;

  return (
    <View style={{ width, height }}>
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} contentFit="contain" />
      ) : (
        <Mannequin params={profile.mannequin} width={width} />
      )}

      {layers.map(({ key, garment, rect }) => {
        const swiping =
          swipe &&
          ((swipe.zone === 'bottom' && key === 'bottom') || (swipe.zone === 'top' && key === activeTop));
        return (
          <View
            key={`${key}-${garment.id}`}
            pointerEvents="none"
            style={[
              styles.layer,
              {
                left: rect.x,
                top: rect.y,
                width: rect.w,
                height: rect.h,
                transform: swiping ? [{ translateX: swipe.dx }] : undefined,
                opacity: swiping ? Math.max(0.35, 1 - Math.abs(swipe.dx) / (width * 1.2)) : 1,
              },
            ]}>
            <Image
              source={{ uri: resolveImageUri(garment.image) }}
              style={StyleSheet.absoluteFill}
              contentFit="fill"
              transition={120}
            />
            {selected === key && <View style={styles.selection} />}
          </View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  layer: { position: 'absolute' },
  selection: {
    ...StyleSheet.absoluteFill,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: 6,
  },
});
