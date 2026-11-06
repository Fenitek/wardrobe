import { View } from 'react-native';

import { Figure } from '@/components/Figure';
import { FIGURE_ASPECT } from '@/lib/body';
import { useGarmentsById } from '@/store/hooks';
import { useWardrobe, type Look } from '@/store/wardrobe';

/** Anteprima di un outfit indossato dalla figura scelta nel profilo (foto o manichino). */
export function OutfitPreview({ look, height }: { look: Look; height: number }) {
  const profile = useWardrobe((s) => s.profile);
  const garmentsById = useGarmentsById();
  const width = height / FIGURE_ASPECT;
  return (
    <View style={{ width, height }} pointerEvents="none">
      <Figure width={width} look={look} garmentsById={garmentsById} profile={profile} />
    </View>
  );
}
