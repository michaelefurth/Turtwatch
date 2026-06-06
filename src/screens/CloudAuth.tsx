import { useState } from "react";
import { useFeedback } from "@/components/feedback";
import { Mascot } from "@/components/Mascot";
import { Card, PillButton } from "@/components/common";
import * as cloud from "@/lib/cloud";

/** Login wall shown in cloud (server-authoritative) mode before the app loads. */
export function CloudAuth() {
  const { toast } = useFeedback();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"in" | "up">("in");

  const submit = async () => {
    if (!email.trim() || !password) return;
    setBusy(true);
    try {
      if (mode === "in") await cloud.signIn(email.trim(), password);
      else await cloud.signUp(email.trim(), password);
      // onAuthStateChange in CloudGate takes over from here
      if (mode === "up" && !cloud.currentUser()) toast("Check your email to confirm 📧", "🐢");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Something went wrong", "😢");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app">
      <div className="screen stack" style={{ paddingTop: 40 }}>
        <div className="center stack" style={{ alignItems: "center" }}>
          <Mascot mascot="turtley" mood="happy" wave size={120} />
          <h1 style={{ marginBottom: 0 }}>Welcome to TurtWatch 🐢</h1>
          <p className="muted" style={{ marginTop: 0 }}>Sign in to sync your pond across devices.</p>
        </div>

        <Card className="stack">
          <label className="field" htmlFor="cl-email">Email</label>
          <input id="cl-email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@pond.com" />
          <label className="field" htmlFor="cl-pw">Password</label>
          <input id="cl-pw" className="input" type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={(e) => { if (e.key === "Enter") submit(); }} />
          <PillButton onClick={submit} disabled={busy || !email || !password}>
            {mode === "in" ? "Log in" : "Create account"}
          </PillButton>
          <PillButton variant="ghost" onClick={() => setMode(mode === "in" ? "up" : "in")}>
            {mode === "in" ? "New here? Create an account" : "Already have an account? Log in"}
          </PillButton>
        </Card>
        <p className="muted center" style={{ fontSize: 12 }}>Your turtles are saved securely to your account.</p>
      </div>
    </div>
  );
}
