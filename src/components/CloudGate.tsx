import { useEffect, useRef, useState, type ReactNode } from "react";
import { getSupabase, isSupabaseEnabled } from "@/lib/supabase";
import { useStore, setEconomyReconciler, getPersistableState } from "@/store/useStore";
import { economyReconcile, rehydrate, migrateLocalUp } from "@/lib/cloudEconomy";
import { CloudAuth } from "@/screens/CloudAuth";
import { Mascot } from "@/components/Mascot";

type Phase = "loading" | "auth" | "ready" | "error";

/**
 * In cloud (server-authoritative) mode, requires login and hydrates the store
 * from the relational DB before showing the app. In local mode it's a pass-through,
 * so nothing changes for offline play.
 */
export function CloudGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>(isSupabaseEnabled ? "loading" : "ready");
  const [errMsg, setErrMsg] = useState("");
  const setup = useRef(false);
  const wasSignedIn = useRef(false);

  useEffect(() => {
    if (!isSupabaseEnabled) return;
    // getSupabase() calls createClient(), which throws on a malformed URL/key —
    // catch it so a bad env var shows an error instead of a blank green screen.
    let sb: ReturnType<typeof getSupabase>;
    try {
      sb = getSupabase();
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "Could not reach the cloud.");
      setPhase("error");
      return;
    }
    if (!sb) {
      setPhase("ready");
      return;
    }
    let mounted = true;

    // Don't let a hung network leave the user staring at the green loading
    // screen forever — bail to an error state if hydration takes too long.
    const watchdog = setTimeout(() => {
      if (mounted && !setup.current) {
        setErrMsg("This is taking longer than usual. Check your connection.");
        setPhase("error");
      }
    }, 15000);

    const onSession = async (hasSession: boolean) => {
      if (!hasSession) {
        // a real sign-out (was signed in -> now not): clear this device's data so
        // the next account doesn't inherit it. Don't clear on the initial no-session,
        // or we'd wipe local data before it can migrate up on first sign-in.
        if (wasSignedIn.current) useStore.getState().reset();
        wasSignedIn.current = false;
        setEconomyReconciler(null);
        setup.current = false;
        clearTimeout(watchdog);
        if (mounted) setPhase("auth");
        return;
      }
      if (setup.current) return;
      setup.current = true;
      wasSignedIn.current = true;
      setEconomyReconciler(economyReconcile);
      try {
        try {
          await migrateLocalUp(getPersistableState()); // first sign-in: push local data up (no-op if account has data)
        } catch { /* migration is best-effort */ }
        await rehydrate();
        // surface the signed-in email in the store so Settings/Account reflect it
        // (hydration resets cloud meta, and the login wall never set it).
        try {
          const u = (await sb.auth.getUser()).data.user;
          if (u?.email) useStore.getState().setCloud({ email: u.email });
        } catch { /* non-fatal */ }
        clearTimeout(watchdog);
        if (mounted) setPhase("ready");
      } catch (e) {
        // hydration failed (schema not applied, RLS, offline…) — surface it
        // instead of hanging on the loading screen.
        clearTimeout(watchdog);
        setup.current = false;
        setEconomyReconciler(null);
        if (mounted) {
          setErrMsg(e instanceof Error ? e.message : "Could not load your pond.");
          setPhase("error");
        }
      }
    };

    sb.auth.getSession()
      .then(({ data }) => onSession(!!data.session))
      .catch((e) => {
        clearTimeout(watchdog);
        if (mounted) {
          setErrMsg(e instanceof Error ? e.message : "Could not reach the cloud.");
          setPhase("error");
        }
      });
    const { data } = sb.auth.onAuthStateChange((_e, session) => onSession(!!session));
    return () => {
      mounted = false;
      setup.current = false; // allow re-setup after a StrictMode remount
      clearTimeout(watchdog);
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
  if (phase === "error") {
    return (
      <div className="app">
        <div className="screen center stack" style={{ alignItems: "center", justifyContent: "center", minHeight: "75vh", textAlign: "center", gap: 14 }} role="alert">
          <Mascot mascot="turtley" mood="worried" size={110} />
          <h1 style={{ margin: 0 }}>Couldn't reach the pond</h1>
          <p className="muted" style={{ marginTop: 0, maxWidth: 320 }}>{errMsg || "Something went wrong connecting to the cloud."}</p>
          <button className="pill" onClick={() => window.location.reload()}>Try again</button>
          <button
            className="pill ghost"
            onClick={async () => { try { await getSupabase()?.auth.signOut(); } catch { /* ignore */ } window.location.reload(); }}
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }
  if (phase === "auth") return <CloudAuth />;
  return <>{children}</>;
}
