// TurtWatch — scheduled push sender (reminders & good mornings).
//
// Run hourly via a Supabase scheduled trigger (cron). For each user with a push
// subscription it reads their cloud state (user_state) and, in their local
// timezone, sends:
//   • a "good morning" once in the morning window, and
//   • a daily reminder at their chosen time if they haven't uploaded today.
//
// The hourly cadence + matching on the local hour keeps it to ~once each.
//
// Setup:
//   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:you@pond.com
//   supabase functions deploy send-reminders
//   then add a cron schedule (see docs/17-push-notifications.md).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

// deno-lint-ignore no-explicit-any
const Deno: any = (globalThis as any).Deno;

const MORNING_HOUR = 8; // local hour for the "good morning"
const GOOD_MORNINGS = [
  { title: "Good morning! 🌅", body: "A fresh pond day awaits — got a turtle for me? 🐢" },
  { title: "Rise and shell! 🐢", body: "Turtley's been basking. Snap today's turtle when you can 🌿" },
  { title: "Morning, friend ☀️", body: "Your lily pad is warm and ready. Have a lovely day! 🪷" },
];
const REMINDERS = [
  { title: "🐢 Turtle check-in!", body: "Your daily turtle is waiting. Snap one before bedtime?" },
  { title: "Pond's calling 🌿", body: "One photo keeps the streak alive. You've got this!" },
  { title: "Turtley misses you 🐢💚", body: "It's been a slow day in the pond. Got a turtle for me?" },
];

function localParts(tz: string, now: Date) {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false });
  const p = Object.fromEntries(fmt.formatToParts(now).map((x) => [x.type, x.value]));
  return { dateKey: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) };
}
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

Deno.serve(async () => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  webpush.setVapidDetails(
    Deno.env.get("VAPID_SUBJECT") || "mailto:hello@turtwatch.app",
    Deno.env.get("VAPID_PUBLIC_KEY")!,
    Deno.env.get("VAPID_PRIVATE_KEY")!,
  );

  const now = new Date();
  const { data: subs } = await supabase.from("push_subscriptions").select("user_id, subscription, endpoint");
  if (!subs?.length) return new Response(JSON.stringify({ sent: 0 }), { headers: { "Content-Type": "application/json" } });

  // group subscriptions by user
  const byUser = new Map<string, { subscription: unknown; endpoint: string }[]>();
  for (const s of subs) {
    const arr = byUser.get(s.user_id) ?? [];
    arr.push({ subscription: s.subscription, endpoint: s.endpoint });
    byUser.set(s.user_id, arr);
  }

  let sent = 0;
  for (const [userId, userSubs] of byUser) {
    const { data: row } = await supabase.from("user_state").select("state").eq("user_id", userId).maybeSingle();
    const state = row?.state as
      | { entries?: Record<string, unknown>; notifications?: { dailyReminderEnabled?: boolean; reminderTime?: string; pushEnabled?: boolean }; profile?: { timezone?: string } }
      | undefined;
    if (!state) continue;
    const n = state.notifications ?? {};
    if (n.pushEnabled === false) continue;
    const tz = state.profile?.timezone || "UTC";
    const { dateKey, hour } = localParts(tz, now);

    let payload: { title: string; body: string; url: string } | null = null;
    const doneToday = !!state.entries?.[dateKey];
    const reminderHour = Number((n.reminderTime ?? "19:00").split(":")[0]);

    if (hour === MORNING_HOUR) {
      payload = { ...pick(GOOD_MORNINGS), url: "/" };
    } else if (n.dailyReminderEnabled !== false && hour === reminderHour && !doneToday) {
      payload = { ...pick(REMINDERS), url: "/upload" };
    }
    if (!payload) continue;

    for (const { subscription, endpoint } of userSubs) {
      try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
        sent++;
      } catch (e) {
        // prune expired/invalid subscriptions
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
      }
    }
  }

  return new Response(JSON.stringify({ sent }), { headers: { "Content-Type": "application/json" } });
});
