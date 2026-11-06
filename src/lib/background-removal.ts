import { requireOptionalNativeModule } from 'expo';
import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { newId } from '@/lib/id';
import { getImageSize } from '@/lib/images';

type NativeBackgroundRemover = {
  isSupported(): boolean;
  removeBackgroundAsync(uri: string): Promise<{ uri: string; width: number; height: number }>;
};

/**
 * Il modulo nativo è presente solo nella versione installabile dell'app (build EAS / dev build).
 * In Expo Go e sul web non esiste: in quel caso l'immagine viene usata così com'è.
 */
const native = requireOptionalNativeModule<NativeBackgroundRemover>('BackgroundRemover');

export function isBackgroundRemovalAvailable(): boolean {
  try {
    return !!native && native.isSupported();
  } catch {
    return false;
  }
}

export type PreparedImage = {
  uri: string;
  width: number;
  height: number;
  /** true se lo sfondo è stato rimosso. */
  cutout: boolean;
  /** Motivo per cui lo sfondo non è stato rimosso, se applicabile. */
  note?: string;
};

/** Porta in locale un'immagine remota (serve al riconoscimento del soggetto). */
async function toLocal(uri: string): Promise<string> {
  if (Platform.OS === 'web') return uri;
  if (uri.startsWith('data:')) {
    const [header, base64] = uri.split(',', 2);
    const ext = header.includes('png') ? 'png' : header.includes('webp') ? 'webp' : 'jpg';
    const file = new File(Paths.cache, `web-${newId()}.${ext}`);
    file.create();
    file.write(base64, { encoding: 'base64' });
    return file.uri;
  }
  if (!/^https?:/i.test(uri)) return uri;
  const file = await File.downloadFileAsync(uri, new File(Paths.cache, `web-${newId()}.jpg`), {
    idempotent: true,
  });
  return file.uri;
}

/** Scarica (se serve) l'immagine e prova a rimuoverne lo sfondo. */
export async function prepareImage(sourceUri: string): Promise<PreparedImage> {
  const local = await toLocal(sourceUri);

  if (isBackgroundRemovalAvailable() && native) {
    try {
      const result = await native.removeBackgroundAsync(local);
      return { ...result, cutout: true };
    } catch (e) {
      const size = await getImageSize(local).catch(() => ({ width: 1, height: 1 }));
      return {
        uri: local,
        ...size,
        cutout: false,
        note: e instanceof Error ? e.message : 'Sfondo non rimosso',
      };
    }
  }

  const size = await getImageSize(local).catch(() => ({ width: 1, height: 1 }));
  return {
    uri: local,
    ...size,
    cutout: false,
    note:
      Platform.OS === 'web'
        ? 'La rimozione dello sfondo funziona solo sul telefono.'
        : "La rimozione dello sfondo è disponibile nella versione installabile dell'app (non in Expo Go).",
  };
}
