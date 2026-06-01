// Browser push (Web Push) for reminders & good mornings. Requires a Service
// Worker (public/sw.js), a VAPID public key (VITE_VAPID_PUBLIC_KEY), and the
// Supabase `send-reminders` Edge Function to actually deliver pushes when the
// app is closed. Without a VAPID key this still grants permission and the
// in-app reminder hook covers the tab-open case. See docs/17.

import { getSupabase } from "@/lib/supabase";

export function pushSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * Request permission and (if a VAPID key + backend are configured) subscribe to
 * push and store the subscription. Returns a status so the UI can explain.
 */
export async function enablePush(): Promise<{ ok: boolean; mode: "push" | "local" | "denied" | "unsupported"; reason?: string }> {
  if (!pushSupported()) return { ok: false, mode: "unsupported" };
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, mode: "denied" };

  const reg = await registerServiceWorker();
  const vapid = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (!reg || !vapid) return { ok: true, mode: "local" }; // permission granted; no server push configured

  try {
    const existing = await reg.pushManager.getSubscription();
    const sub =
      existing ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid) as unknown as BufferSource,
      }));
    await saveSubscription(sub);
    return { ok: true, mode: "push" };
  } catch (e) {
    return { ok: false, mode: "denied", reason: String(e) };
  }
}

export async function disablePush(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await removeSubscription(sub.endpoint);
    await sub.unsubscribe().catch(() => {});
  }
}

async function saveSubscription(sub: PushSubscription): Promise<void> {
  const sb = getSupabase();
  if (!sb) return; // local-only mode keeps the subscription in the browser
  const { data } = await sb.auth.getUser();
  if (!data.user) return;
  await sb.from("push_subscriptions").upsert(
    { user_id: data.user.id, endpoint: sub.endpoint, subscription: sub.toJSON(), updated_at: new Date().toISOString() },
    { onConflict: "endpoint" },
  );
}

async function removeSubscription(endpoint: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("push_subscriptions").delete().eq("endpoint", endpoint);
}
