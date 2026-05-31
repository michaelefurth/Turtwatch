import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { useStore, getPersistableState } from "@/store/useStore";
import { useFeedback } from "@/components/feedback";
import { Card, PillButton } from "@/components/common";
import { ConfirmModal } from "@/components/ConfirmModal";
import * as cloud from "@/lib/cloud";

export function Account() {
  const nav = useNavigate();
  const { toast } = useFeedback();
  const cloudMeta = useStore((s) => s.cloud);
  const setCloud = useStore((s) => s.setCloud);
  const hydrate = useStore((s) => s.hydrateState);

  const [email, setEmail] = useState(cloudMeta?.email ?? "");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<User | null>(cloud.currentUser());
  const [busy, setBusy] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);

  useEffect(() => {
    if (cloud.isSupabaseEnabled) cloud.refreshUser().then(setUser);
  }, []);

  // ---- not configured: explain local mode ----
  if (!cloud.isSupabaseEnabled) {
    return (
      <div className="screen stack">
        <div className="between">
          <h1>Account ☁️</h1>
          <button className="chip outline" onClick={() => nav(-1)}>‹ Back</button>
        </div>
        <Card className="center stack">
          <div style={{ fontSize: 44 }}>🐢💾</div>
          <h2 style={{ margin: 0 }}>Saved on this device</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Your turtles live safely on this device. Cloud accounts (to sync photos
            across devices) turn on when this build is connected to Supabase
            (<code>VITE_TURTWATCH_BACKEND=supabase</code>).
          </p>
          <PillButton variant="secondary" onClick={() => nav("/settings")}>📤 Export a backup instead</PillButton>
        </Card>
        <p className="muted center" style={{ fontSize: 12 }}>See docs/14 for storage setup.</p>
      </div>
    );
  }

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Something went wrong", "😢");
    } finally {
      setBusy(false);
    }
  };

  const doSignUp = () =>
    run(async () => {
      await cloud.signUp(email.trim(), password);
      const u = cloud.currentUser();
      setUser(u);
      if (u) {
        setCloud({ email: email.trim() });
        toast("Account created! 🐢", "🎉");
      } else {
        // email confirmation required — no session yet
        toast("Almost there — check your email to confirm 📧", "🐢");
      }
    });

  const doSignIn = () =>
    run(async () => {
      await cloud.signIn(email.trim(), password);
      setUser(cloud.currentUser());
      setCloud({ email: email.trim() });
      toast("Signed in! 💚", "🐢");
    });

  const doBackup = () =>
    run(async () => {
      const snap = await cloud.backup(getPersistableState());
      hydrate(snap);
      setCloud({ lastBackupAt: new Date().toISOString(), email: user?.email ?? email.trim() });
      toast("Backed up to the cloud ☁️", "✅");
    });

  const doRestore = () =>
    run(async () => {
      const remote = await cloud.restore();
      setConfirmRestore(false);
      if (!remote) {
        toast("No cloud backup found yet", "🤔");
        return;
      }
      hydrate(remote);
      // keep THIS device's cloud preferences; don't inherit the snapshot's
      setCloud({ autoBackup: cloudMeta?.autoBackup ?? false, email: user?.email ?? email.trim(), lastBackupAt: undefined });
      toast("Restored your turtles! 🐢", "✨");
      nav("/");
    });

  const doSignOut = () =>
    run(async () => {
      await cloud.signOut();
      setUser(null);
      setCloud({ autoBackup: false, email: undefined, lastBackupAt: undefined });
      toast("Signed out", "👋");
    });

  const localCount = Object.keys(useStore.getState().entries).length;

  return (
    <div className="screen stack">
      <div className="between">
        <h1>Account ☁️</h1>
        <button className="chip outline" onClick={() => nav(-1)}>‹ Back</button>
      </div>

      {!user ? (
        <Card className="stack">
          <h3 style={{ margin: 0 }}>Sign in to sync your turtles</h3>
          <span className="muted" style={{ fontSize: 13 }}>Back up your streak, Turtbux & photos — reach them on any device.</span>
          <label className="field" htmlFor="ac-email">Email</label>
          <input id="ac-email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@pond.com" />
          <label className="field" htmlFor="ac-pw">Password</label>
          <input id="ac-pw" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          <PillButton onClick={doSignIn} disabled={busy || !email || !password}>Log in</PillButton>
          <PillButton variant="secondary" onClick={doSignUp} disabled={busy || !email || !password}>Create account</PillButton>
        </Card>
      ) : (
        <>
          <Card className="center">
            <div style={{ fontSize: 40 }}>🐢☁️</div>
            <h2 style={{ margin: "4px 0 2px" }}>Signed in</h2>
            <span className="muted">{user.email}</span>
            {cloudMeta?.lastBackupAt && (
              <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>
                Last backup: {new Date(cloudMeta.lastBackupAt).toLocaleString()}
              </p>
            )}
          </Card>

          <Card className="stack">
            <PillButton onClick={doBackup} disabled={busy}>☁️ Back up now</PillButton>
            <PillButton variant="secondary" onClick={() => setConfirmRestore(true)} disabled={busy}>⤵️ Restore from cloud</PillButton>
            <div className="between">
              <div>
                <b>Auto-backup</b>
                <div className="muted" style={{ fontSize: 12 }}>Save changes to the cloud automatically</div>
              </div>
              <button
                className={`chip ${cloudMeta?.autoBackup ? "selected" : "outline"}`}
                aria-pressed={!!cloudMeta?.autoBackup}
                onClick={() => setCloud({ autoBackup: !cloudMeta?.autoBackup })}
              >
                {cloudMeta?.autoBackup ? "On" : "Off"}
              </button>
            </div>
          </Card>

          <PillButton variant="ghost" onClick={doSignOut} disabled={busy}>Sign out</PillButton>
        </>
      )}

      <ConfirmModal
        open={confirmRestore}
        emoji="⤵️"
        title="Restore from cloud?"
        confirmLabel="Restore & replace"
        onCancel={() => setConfirmRestore(false)}
        onConfirm={doRestore}
      >
        <p className="center muted" style={{ margin: 0 }}>
          This replaces the {localCount} turtle{localCount === 1 ? "" : "s"} on this device with your cloud backup. Local-only changes will be lost.
        </p>
      </ConfirmModal>
    </div>
  );
}
