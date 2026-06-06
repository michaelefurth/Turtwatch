// Pluggable image storage. User turtle photos can live as base64 in local state
// (default prototype), or in Supabase Storage, or Firebase Storage — chosen by
// the VITE_IMAGE_STORAGE env var. The cloud repository uploads through this port
// so the rest of the app only ever deals with a URL.

export interface ImageStorage {
  /** Upload an image and return a durable URL. `key` is e.g. "<uid>/<date>". */
  upload(key: string, data: Blob): Promise<string>;
  /** Best-effort delete; optional. */
  remove?(key: string): Promise<void>;
}

export type ImageStorageProvider = "local" | "supabase" | "firebase";

export function imageStorageProvider(): ImageStorageProvider {
  const v = import.meta.env.VITE_IMAGE_STORAGE;
  if (v === "supabase" || v === "firebase") return v;
  return "local";
}
