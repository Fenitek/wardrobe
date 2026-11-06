import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { CategoryId } from '@/constants/categories';
import { slotOf } from '@/constants/categories';
import { DEFAULT_FIT, DEFAULT_MANNEQUIN, type Fit, type MannequinParams } from '@/lib/body';
import { deleteStoredImage } from '@/lib/images';
import { newId } from '@/lib/id';

export type Garment = {
  id: string;
  name: string;
  category: CategoryId;
  /** Immagine salvata (nome file relativo o URI). */
  image: string;
  /** Larghezza / altezza dell'immagine. */
  aspect: number;
  /** true se lo sfondo è stato rimosso automaticamente. */
  cutout: boolean;
  createdAt: number;
};

export type Layer = {
  garmentId: string;
  fit: Fit;
};

export type Look = {
  bottom: Layer | null;
  /** Strati della parte superiore: il primo è quello a contatto col corpo. */
  tops: Layer[];
};

export type Outfit = Look & {
  id: string;
  name: string;
  occasion: string;
  createdAt: number;
};

export type AvatarMode = 'photo' | 'mannequin';

export type Profile = {
  name: string;
  avatarMode: AvatarMode;
  photo: string | null;
  photoAspect: number;
  mannequin: MannequinParams;
};

export type Draft = Look & {
  /** Indice dello strato superiore che si sta cambiando con lo scorrimento. */
  activeTop: number;
  /** Se impostato, l'outfit preferito che si sta modificando. */
  editingId: string | null;
  initialized: boolean;
};

const EMPTY_DRAFT: Draft = { bottom: null, tops: [], activeTop: 0, editingId: null, initialized: false };

type State = {
  hydrated: boolean;
  garments: Garment[];
  outfits: Outfit[];
  profile: Profile;
  draft: Draft;
  /** Immagine scelta dalla ricerca web, in attesa di essere usata in "Aggiungi un capo". */
  pendingWebImage: string | null;
};

type Actions = {
  addGarment: (g: Omit<Garment, 'id' | 'createdAt'>) => Garment;
  updateGarment: (id: string, patch: Partial<Pick<Garment, 'name' | 'category'>>) => void;
  removeGarment: (id: string) => void;

  saveOutfit: (data: { name: string; occasion: string }) => Outfit;
  removeOutfit: (id: string) => void;

  setProfile: (patch: Partial<Profile>) => void;

  setDraft: (patch: Partial<Draft>) => void;
  resetDraft: () => void;
  loadOutfitIntoDraft: (id: string) => void;
  setPendingWebImage: (uri: string | null) => void;
};

const cloneLayer = (l: Layer): Layer => ({ garmentId: l.garmentId, fit: { ...l.fit } });

export const useWardrobe = create<State & Actions>()(
  persist(
    (set, get) => ({
      hydrated: false,
      garments: [],
      outfits: [],
      profile: {
        name: '',
        avatarMode: 'mannequin',
        photo: null,
        photoAspect: 0.5,
        mannequin: DEFAULT_MANNEQUIN.male,
      },
      draft: EMPTY_DRAFT,
      pendingWebImage: null,

      addGarment: (g) => {
        const garment: Garment = { ...g, id: newId(), createdAt: Date.now() };
        set((s) => ({ garments: [garment, ...s.garments] }));
        return garment;
      },

      updateGarment: (id, patch) =>
        set((s) => ({ garments: s.garments.map((g) => (g.id === id ? { ...g, ...patch } : g)) })),

      removeGarment: (id) => {
        const garment = get().garments.find((g) => g.id === id);
        if (garment) deleteStoredImage(garment.image);
        set((s) => {
          const strip = (look: Look): Look => ({
            bottom: look.bottom?.garmentId === id ? null : look.bottom,
            tops: look.tops.filter((t) => t.garmentId !== id),
          });
          const draftLook = strip(s.draft);
          return {
            garments: s.garments.filter((g) => g.id !== id),
            outfits: s.outfits.map((o) => ({ ...o, ...strip(o) })),
            draft: {
              ...s.draft,
              ...draftLook,
              activeTop: Math.max(0, Math.min(s.draft.activeTop, draftLook.tops.length - 1)),
            },
          };
        });
      },

      saveOutfit: ({ name, occasion }) => {
        const { draft, outfits } = get();
        const look: Look = {
          bottom: draft.bottom ? cloneLayer(draft.bottom) : null,
          tops: draft.tops.map(cloneLayer),
        };
        const existing = draft.editingId ? outfits.find((o) => o.id === draft.editingId) : undefined;
        if (existing) {
          const updated: Outfit = { ...existing, ...look, name, occasion };
          set({ outfits: outfits.map((o) => (o.id === existing.id ? updated : o)) });
          return updated;
        }
        const outfit: Outfit = { ...look, id: newId(), name, occasion, createdAt: Date.now() };
        set({ outfits: [outfit, ...outfits], draft: { ...draft, editingId: outfit.id } });
        return outfit;
      },

      removeOutfit: (id) =>
        set((s) => ({
          outfits: s.outfits.filter((o) => o.id !== id),
          draft: s.draft.editingId === id ? { ...s.draft, editingId: null } : s.draft,
        })),

      setProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),

      setDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),

      resetDraft: () => set({ draft: EMPTY_DRAFT }),

      loadOutfitIntoDraft: (id) => {
        const outfit = get().outfits.find((o) => o.id === id);
        if (!outfit) return;
        set({
          draft: {
            bottom: outfit.bottom ? cloneLayer(outfit.bottom) : null,
            tops: outfit.tops.map(cloneLayer),
            activeTop: Math.max(0, outfit.tops.length - 1),
            editingId: outfit.id,
            initialized: true,
          },
        });
      },

      setPendingWebImage: (uri) => set({ pendingWebImage: uri }),
    }),
    {
      name: 'wardrobe-store',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        garments: s.garments,
        outfits: s.outfits,
        profile: s.profile,
        draft: s.draft,
      }),
      onRehydrateStorage: () => () => {
        useWardrobe.setState({ hydrated: true });
      },
    },
  ),
);

/** Crea un nuovo strato con le regolazioni di default. */
export function makeLayer(garmentId: string): Layer {
  return { garmentId, fit: { ...DEFAULT_FIT } };
}

export function topGarments(garments: Garment[]) {
  return garments.filter((g) => slotOf(g.category) === 'top');
}

export function bottomGarments(garments: Garment[]) {
  return garments.filter((g) => slotOf(g.category) === 'bottom');
}
