import { useEffect, useRef, useState, type ReactNode } from "react";
import { getSupabase, isSupabaseEnabled } from "@/lib/supabase";
import { useStore, setEconomyReconciler, getPersistableState } from "@/store/useStore";
import { economyReconcile, rehydrate, migrateLocalUp } from "@/lib/cloudEconomy";
import { CloudAuth } from "@/screens/CloudAuth";
import { Mascot } from "@/components/Mascot";

type Phase = "loading" | "auth" | "ready";

/**
 * In cloud (server-authoritative) mode, requires login and hydrates the store
 * from the relational DB before showing the app. In local mode it's a pass-through,
 * so nothing changes for offline play.
 */
export function CloudGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>(isSupabaseEnabled ? "loading" : "ready");
  const setup = useRef(false);

  useEffect(() => {
    if (!isSupabaseEnabled) return;
    const sb = getSupabase();
    if (!sb) {
      setPhase("ready");
      return;
    }
    let mounted = true;

    const onSession = async (hasSession: boolean) => {
      if (!hasSession) {
        setEconomyReconciler(null);
        setup.current = false;
        if (mounted) setPhase("auth");
        return;
      }
      if (setup.current) return;
      setup.current = true;
      setEconomyReconciler(economyReconcile);
      try {
        await migrateLocalUp(getPersistableState()); // first sign-in: push local data up (no-op if account has data)
      } catch { /* ignore */ }
      await rehydrate();
      if (mounted) setPhase("ready");
    };

    sb.auth.getSession().then(({ data }) => onSession(!!data.session));
    const { data } = sb.auth.onAuthStateChange((_e, session) => onSession(!!session));
    return () => {
      mounted = false;
      setup.current = false; // allow re-setup after a StrictMode remount
      setEconomyReconciler(null);
      data.subscription.unsubscribe();
    };
  }, []);

  // keep profile + notification prefs synced to the server (debounced).
  // Subscribe once; gate on readiness via a ref so we don't tear down per phase.
  const ready = useRef(false);
  ready.current = phase === "ready";
  useEffect(() => {
    if (!isSupabaseEnabled) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const unsub = useStore.subscribe((s, prev) => {
      if (!ready.current) return;
      if (s.profile === prev.profile && s.notifications === prev.notifications) return;
      if (t) clearTimeout(t);
      t = setTimeout(async () => {
        const sb = getSupabase();
        const uidv = (await sb?.auth.getUser())?.data.user?.id;
        if (!sb || !uidv) return;
        const cur = useStore.getState();
        await sb.from("app_user").update({ display_name: cur.profile.displayName, mascot: cur.profile.mascot, mascot_name: cur.profile.mascotName, theme_id: cur.profile.themeId, timezone: cur.profile.timezone }).eq("id", uidv);
        await sb.from("notification_settings").update({ daily_reminder_enabled: cur.notifications.dailyReminderEnabled, reminder_time: cur.notifications.reminderTime, streak_risk_enabled: cur.notifications.streakRiskEnabled, fact_of_day_enabled: cur.notifications.factOfDayEnabled }).eq("user_id", uidv);
      }, 1500);
    });
    return () => { unsub(); if (t) clearTimeout(t); };
  }, []);

  if (phase === "loading") {
    return (
      <div className="app">
        <div className="screen center stack" style={{ alignItems: "center", justifyContent: "center", minHeight: "70vh" }}>
          <Mascot mascot="turtley" mood="happy" size={110} />
          <p className="muted">Loading your pond…</p>
        </div>
      </div>
    );
  }
  if (phase === "auth") return <CloudAuth />;
  return <>{children}</>;
}
