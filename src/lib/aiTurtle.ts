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
        const { data, error } = await sb!.functions.invoke("ai-rescue", { body: { seed } });
        if (!error && data && typeof (data as { image?: string }).image === "string") {
          return { image: (data as { image: string }).image, source: "ai" };
        }
      }
    } catch {
      /* fall through to local */
    }
  }
  return { image: generateAiTurtle(seed), source: "local" };
}
