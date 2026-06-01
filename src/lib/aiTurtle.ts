// AI Turtle Rescue image generation. Tries the server-side image generator
// (Edge Function `ai-rescue`) when the cloud backend is configured and the user
// is signed in; otherwise falls back to a charming local procedural turtle so
// the feature always works offline.

import { getSupabase, isSupabaseEnabled } from "@/lib/supabase";
import { generateAiTurtle } from "@/data/sampleTurtles";

export interface AiTurtleResult {
  image: string; // data URL
  source: "ai" | "local";
}

export async function generateAiTurtleImage(seed: string): Promise<AiTurtleResult> {
  if (isSupabaseEnabled) {
    const sb = getSupabase();
    try {
      const { data: userData } = await sb!.auth.getUser();
      if (userData.user) {
        // cap the wait so a hung model call can't trap the UI — fall back locally
        const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error("ai-timeout")), 15000));
        const result = (await Promise.race([
          sb!.functions.invoke("ai-rescue", { body: { seed } }),
          timeout,
        ])) as { data?: { image?: string }; error?: unknown };
        if (!result.error && typeof result.data?.image === "string") {
          return { image: result.data.image, source: "ai" };
        }
      }
    } catch {
      /* timeout / network / provider error → local fallback */
    }
  }
  return { image: generateAiTurtle(seed), source: "local" };
}
