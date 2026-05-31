// TurtWatch — AI Turtle Rescue Edge Function (Deno / Supabase).
//
// Flow (server-authoritative, see docs/11):
//   authz → reserve Turtbux (idempotent debit via apply_turtbux) →
//   generate a wholesome cartoon turtle image → upload to Storage →
//   insert an `ai_rescued` turtle_entry → return it.
//   On generation failure, refund the reserved Turtbux.
//
// Safety: the image prompt is a FIXED wholesome template. No user free-text is
// ever passed to the image model (prevents prompt-injection / abuse).
//
// Deploy: supabase functions deploy ai-rescue
// Secrets: supabase secrets set OPENAI_API_KEY=... (or your image provider)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";

const AI_RESCUE_COST = 60;
const PROMPT =
  "A cute, wholesome pastel cartoon turtle sticker, soft rounded shapes, " +
  "big friendly eyes, sitting on a lily pad in a cozy pond, kawaii style, " +
  "flat illustration, pastel mint and peach palette, no text.";

// deno-lint-ignore no-explicit-any
const Deno: any = (globalThis as any).Deno;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const { date } = await req.json();
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return json({ error: "INVALID_DATE" }, 422);
    }

    // Auth: forward the caller's JWT so RLS + auth.uid() apply.
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) return json({ error: "AUTH_REQUIRED" }, 401);
    const userId = userData.user.id;

    const idempotency = `ai_rescue:${userId}:${date}`;

    // 1) Reserve (debit) Turtbux — idempotent. Throws INSUFFICIENT_FUNDS via RLS RPC.
    const { error: debitErr } = await supabase.rpc("apply_turtbux", {
      p_delta: -AI_RESCUE_COST,
      p_reason: "ai_rescue",
      p_ref_type: "entry",
      p_ref_id: date,
      p_idempotency: idempotency,
    });
    if (debitErr) {
      const msg = debitErr.message.includes("INSUFFICIENT_FUNDS")
        ? "INSUFFICIENT_FUNDS"
        : debitErr.message;
      return json({ error: msg }, 402);
    }

    // 2) Generate the image (provider-agnostic; refund on failure).
    let imageBlob: Uint8Array;
    try {
      imageBlob = await generateTurtle();
    } catch (genErr) {
      await supabase.rpc("apply_turtbux", {
        p_delta: AI_RESCUE_COST,
        p_reason: "refund",
        p_ref_type: "entry",
        p_ref_id: date,
        p_idempotency: `${idempotency}:refund`,
      });
      return json({ error: "GENERATION_FAILED", detail: String(genErr) }, 502);
    }

    // 3) Store the image.
    const path = `${userId}/${date}.png`;
    const { error: upErr } = await supabase.storage
      .from("turtles")
      .upload(path, imageBlob, { contentType: "image/png", upsert: true });
    if (upErr) return json({ error: "UPLOAD_FAILED", detail: upErr.message }, 500);
    const { data: pub } = supabase.storage.from("turtles").getPublicUrl(path);

    // 4) Create the rescued entry (idempotent on unique (user_id, entry_date)).
    const { data: entry, error: insErr } = await supabase
      .from("turtle_entry")
      .insert({
        user_id: userId,
        entry_date: date,
        state: "ai_rescued",
        photo_url: pub.publicUrl,
        photo_source: "ai",
        turtle_name: "Mystery AI Turtle",
        tags: ["ai-rescued"],
      })
      .select()
      .single();
    if (insErr) return json({ error: "ENTRY_EXISTS", detail: insErr.message }, 409);

    return json({ entry });
  } catch (e) {
    return json({ error: "BAD_REQUEST", detail: String(e) }, 400);
  }
});

/** Calls the configured image provider. Replace with your model of choice. */
async function generateTurtle(): Promise<Uint8Array> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("NO_IMAGE_PROVIDER_CONFIGURED");
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-image-1", prompt: PROMPT, size: "512x512", n: 1 }),
  });
  if (!res.ok) throw new Error(`provider ${res.status}`);
  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error("no image returned");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}
