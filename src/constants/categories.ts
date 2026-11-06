export type CategoryId = 'felpe' | 'pantaloni' | 'maglie' | 'camicie' | 'canotte' | 'giacche';

export type Slot = 'top' | 'bottom';

export type Category = {
  id: CategoryId;
  label: string;
  slot: Slot;
};

/** Ordine usato nei filtri dell'armadio (come da requisiti). */
export const CATEGORIES: Category[] = [
  { id: 'felpe', label: 'Felpe e Maglioni', slot: 'top' },
  { id: 'pantaloni', label: 'Pantaloni', slot: 'bottom' },
  { id: 'maglie', label: 'Maglie', slot: 'top' },
  { id: 'camicie', label: 'Camicie', slot: 'top' },
  { id: 'canotte', label: 'Canotte', slot: 'top' },
  { id: 'giacche', label: 'Giacche e Cappotti', slot: 'top' },
];

/** Ordine usato nel pannello "Aggiungi un capo" (come nel concept). */
export const ADD_ITEM_CATEGORY_ORDER: CategoryId[] = [
  'maglie',
  'pantaloni',
  'camicie',
  'canotte',
  'felpe',
  'giacche',
];

export function getCategory(id: CategoryId): Category {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
}

export function slotOf(id: CategoryId): Slot {
  return getCategory(id).slot;
}

export const OCCASIONS = ['Casual', 'Elegante', 'Sportivo', 'Lavoro', 'Serata', 'Scuola'] as const;
