// TurtWatch — AI Turtle generator (Edge Function).
//
// TurtWatch is local-first: the app handles the Turtbux economy and the entry
// itself. This function's only job is to GENERATE a cute turtle image with a
// fixed, wholesome prompt and return it as a data URL — so the image-model key
// stays server-side and is never shipped to the client.
//
// Safety: the prompt is fixed; no user free-text reaches the model. Requires a
// signed-in user (rate-limit / abuse protection). If no provider key is set, it
// returns 501 and the client falls back to a local procedural turtle.
//
// Deploy:  supabase functions deploy ai-rescue
// Secret:  supabase secrets set OPENAI_API_KEY=sk-...

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";

// deno-lint-ignore no-explicit-any
const Deno: any = (globalThis as any).Deno;

const PROMPT =
  "A cute, wholesome pastel cartoon turtle sticker, soft rounded shapes, big " +
  "friendly eyes, sitting on a lily pad in a cozy pond, kawaii style, flat " +
  "illustration, pastel mint and peach palette, centered, no text.";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  try {
    // Require a signed-in user (forward the caller's JWT so auth.uid() applies).
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) return json({ error: "AUTH_REQUIRED" }, 401);

    const key = Deno.env.get("OPENAI_API_KEY");
    if (!key) return json({ error: "NO_IMAGE_PROVIDER" }, 501); // client falls back locally

    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-image-1", prompt: PROMPT, size: "512x512", n: 1 }),
    });
    if (!res.ok) return json({ error: "GENERATION_FAILED", status: res.status }, 502);
    const data = await res.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) return json({ error: "NO_IMAGE_RETURNED" }, 502);

    return json({ image: `data:image/png;base64,${b64}` });
  } catch (e) {
    return json({ error: "BAD_REQUEST", detail: String(e) }, 400);
  }
});
