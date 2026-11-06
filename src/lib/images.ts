import { Directory, File, Paths } from 'expo-file-system';
import { Image, Platform } from 'react-native';

import { newId } from '@/lib/id';

const FOLDER = 'wardrobe';

const isAbsolute = (uri: string) => /^(file|content|https?|data|blob|ph|assets-library):/i.test(uri);

function folder(): Directory {
  const dir = new Directory(Paths.document, FOLDER);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

/**
 * Le immagini salvate vengono memorizzate con il solo nome del file, perché su iOS
 * il percorso assoluto della cartella dell'app può cambiare dopo un aggiornamento.
 */
export function resolveImageUri(stored: string | null | undefined): string | undefined {
  if (!stored) return undefined;
  if (isAbsolute(stored) || Platform.OS === 'web') return stored;
  return new File(Paths.document, FOLDER, stored).uri;
}

function extensionFor(uri: string): string {
  const match = /\.(png|jpe?g|webp|heic)(\?|#|$)/i.exec(uri);
  return match ? match[1].toLowerCase().replace('jpeg', 'jpg') : 'jpg';
}

async function blobToDataUrl(uri: string): Promise<string> {
  const blob = await (await fetch(uri)).blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Copia un'immagine (locale, remota o data URI) nella cartella dell'app e restituisce il nome salvato. */
export async function persistImage(sourceUri: string): Promise<string> {
  if (Platform.OS === 'web') {
    // Sul web non c'è un file system: si salva l'immagine come data URI.
    return sourceUri.startsWith('data:') ? sourceUri : await blobToDataUrl(sourceUri);
  }

  if (sourceUri.startsWith('data:')) {
    const [header, base64] = sourceUri.split(',', 2);
    const ext = header.includes('png') ? 'png' : header.includes('webp') ? 'webp' : 'jpg';
    const file = new File(folder(), `${newId()}.${ext}`);
    file.create();
    file.write(base64, { encoding: 'base64' });
    return file.name;
  }

  if (/^https?:/i.test(sourceUri)) {
    const target = new File(folder(), `${newId()}.${extensionFor(sourceUri)}`);
    const downloaded = await File.downloadFileAsync(sourceUri, target);
    return downloaded.name;
  }

  const source = new File(sourceUri);
  const target = new File(folder(), `${newId()}.${extensionFor(sourceUri)}`);
  await source.copy(target);
  return target.name;
}

export function deleteStoredImage(stored: string | null | undefined) {
  if (!stored || Platform.OS === 'web' || isAbsolute(stored)) return;
  try {
    const file = new File(Paths.document, FOLDER, stored);
    if (file.exists) file.delete();
  } catch {
    // Il file potrebbe essere già stato rimosso: non è un problema.
  }
}

export function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}
