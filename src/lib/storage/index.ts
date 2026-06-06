import type { ImageStorage } from "./types";
import { imageStorageProvider } from "./types";
import { dataUrlToBlob, isDataUrl } from "@/lib/image";

export type { ImageStorage } from "./types";
export { imageStorageProvider } from "./types";

let cached: ImageStorage | null | undefined;

/** Returns the configured cloud image storage, or null for local base64 mode. */
export async function getImageStorage(): Promise<ImageStorage | null> {
  if (cached !== undefined) return cached;
  const provider = imageStorageProvider();
  if (provider === "supabase") {
    const { SupabaseImageStorage } = await import("./supabaseStorage");
    cached = new SupabaseImageStorage();
  } else if (provider === "firebase") {
    const { FirebaseImageStorage } = await import("./firebaseStorage");
    cached = new FirebaseImageStorage();
  } else {
    cached = null;
  }
  return cached;
}

/**
 * If a cloud provider is configured and the photo is an inline data URL, upload
 * it and return the durable URL. Otherwise return the original (local) value.
 */
export async function persistPhoto(key: string, photoUrl?: string): Promise<string | undefined> {
  if (!isDataUrl(photoUrl)) return photoUrl;
  const storage = await getImageStorage();
  if (!storage) return photoUrl; // local mode keeps base64
  return storage.upload(key, dataUrlToBlob(photoUrl));
}
