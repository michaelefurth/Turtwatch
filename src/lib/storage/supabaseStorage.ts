import type { ImageStorage } from "./types";
import { getSupabase } from "@/lib/supabase";

const BUCKET = "turtles";

/** Supabase Storage adapter. Bucket policies live in supabase/README.md. */
export class SupabaseImageStorage implements ImageStorage {
  async upload(key: string, data: Blob): Promise<string> {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase not configured");
    const path = `${key}.jpg`;
    const { error } = await sb.storage
      .from(BUCKET)
      .upload(path, data, { contentType: data.type || "image/jpeg", upsert: true });
    if (error) throw error;
    return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  async remove(key: string): Promise<void> {
    const sb = getSupabase();
    if (!sb) return;
    await sb.storage.from(BUCKET).remove([`${key}.jpg`]);
  }
}
