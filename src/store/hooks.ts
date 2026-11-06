import { useMemo } from 'react';

import { useWardrobe, type Garment } from '@/store/wardrobe';

export function useGarmentsById(): Map<string, Garment> {
  const garments = useWardrobe((s) => s.garments);
  return useMemo(() => new Map(garments.map((g) => [g.id, g])), [garments]);
}
