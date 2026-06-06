import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useStore } from "@/store/useStore";
import { useFeedback } from "@/components/feedback";
import { Mascot } from "@/components/Mascot";
import { Card, PillButton } from "@/components/common";
import { THEMES } from "@/data/shopItems";
import { ONBOARDING_GIFT } from "@/logic/turtbux";
import { requestNotificationPermission } from "@/lib/notifications";
import type { Mascot as MascotType } from "@/types";

const SLIDES = [
  { emoji: "📸", title: "Upload a turtle a day", body: "Snap or pick one turtle photo every day. That's the whole ritual!" },
  { emoji: "🔥", title: "Build your streak", body: "Keep the streak alive and watch Turtley do a happy shell-wiggle." },
  { emoji: "🪙", title: "Earn Turtbux", body: "Spend them on themes, stickers, Shell Shields, and AI turtle rescues." },
];

export function Onboarding() {
  const onboarded = useStore((s) => s.onboarded);
  const complete = useStore((s) => s.completeOnboarding);
  const nav = useNavigate();
  const { celebrate, toast } = useFeedback();

  const [step, setStep] = useState(0);
  const [mascot, setMascot] = useState<MascotType>("turtley");
  const [name, setName] = useState("");
  const [themeId, setThemeId] = useState("pond_mint");
  const [reminderTime, setReminderTime] = useState("19:00");
  const [reminders, setReminders] = useState(true);
  const [feel, setFeel] = useState<"calm" | "standard">("standard");

  if (onboarded) return <Navigate to="/" replace />;

  const finish = () => {
    const nick = name.trim();
    complete({
      mascot,
      mascotName: nick || (mascot === "turtley" ? "Turtley" : "Shelldon"),
      themeId,
      displayName: nick || "Pond Keeper",
    });
    useStore.getState().updateNotifications({ dailyReminderEnabled: reminders, reminderTime });
    // comfort preset: "Cozy & calm" turns on low-stimulation + gentle, no-pressure framing
    if (feel === "calm") useStore.getState().updatePrefs({ calmMode: true, gentleStreak: true });
    if (reminders) void requestNotificationPermission();
    celebrate(["🪙", "🐢", "✨"]);
    toast(`Welcome! +${ONBOARDING_GIFT} Turtbux to start 🪙`, "🎉");
    nav("/");
  };

  return (
    <div className="app">
      <div className="screen stack" style={{ paddingBottom: 28 }}>
        {step < 3 ? (
          <>
            <div className="center" style={{ marginTop: 24 }}>
              <Mascot mascot="turtley" mood="happy" wave size={140} />
            </div>
            <motion.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="center">
                <div style={{ fontSize: 48 }}>{SLIDES[step].emoji}</div>
                <h1>{SLIDES[step].title}</h1>
                <p className="muted">{SLIDES[step].body}</p>
              </Card>
            </motion.div>
            <div className="row" style={{ justifyContent: "center", gap: 6 }}>
              {SLIDES.map((_, i) => (
                <span key={i} className="sw" style={{ width: 9, height: 9, borderRadius: 999, background: i === step ? "var(--primary-deep)" : "var(--line)" }} />
              ))}
            </div>
            <PillButton onClick={() => setStep(step + 1)}>{step === 2 ? "Let's set up! 🐢" : "Next"}</PillButton>
            {step < 2 && <PillButton variant="ghost" onClick={() => setStep(3)}>Skip intro</PillButton>}
          </>
        ) : (
          <>
            <h1 className="center" style={{ marginTop: 12 }}>Make it yours 🌿</h1>

            <Card>
              <h3>Choose your mascot</h3>
              <div className="grid2">
                {(["turtley", "shelldon"] as MascotType[]).map((m) => (
                  <button
                    key={m}
                    className="stat center"
                    style={{ border: mascot === m ? "3px solid var(--primary-deep)" : "3px solid transparent" }}
                    onClick={() => setMascot(m)}
                  >
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <Mascot mascot={m} size={84} mood="happy" />
                    </div>
                    <b style={{ fontSize: 15, textTransform: "capitalize" }}>{m}</b>
                  </button>
                ))}
              </div>
              <label className="field" htmlFor="ob-name" style={{ marginTop: 12 }}>Your name (optional)</label>
              <input id="ob-name" className="input" placeholder="e.g. Shellbert" value={name} onChange={(e) => setName(e.target.value)} />
              <span className="muted" style={{ fontSize: 12 }}>We'll greet you and name your mascot with this.</span>
            </Card>

            <Card>
              <h3>Pick a pond palette</h3>
              <div className="row wrap gap8">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    className={`chip ${themeId === t.id ? "selected" : "outline"}`}
                    onClick={() => setThemeId(t.id)}
                  >
                    <span className="sw" style={{ background: t.primary }} /> {t.name}
                  </button>
                ))}
              </div>
            </Card>

            <Card>
              <h3>How should it feel?</h3>
              <span className="muted" style={{ fontSize: 13 }}>You can change this anytime in Settings.</span>
              <div className="grid2" style={{ marginTop: 10 }}>
                <button className="stat center" style={{ border: feel === "standard" ? "3px solid var(--primary-deep)" : "3px solid transparent" }} onClick={() => setFeel("standard")}>
                  <div style={{ fontSize: 30 }}>✨</div>
                  <b style={{ fontSize: 14 }}>Standard</b>
                  <span className="muted" style={{ fontSize: 11 }}>Playful & lively</span>
                </button>
                <button className="stat center" style={{ border: feel === "calm" ? "3px solid var(--primary-deep)" : "3px solid transparent" }} onClick={() => setFeel("calm")}>
                  <div style={{ fontSize: 30 }}>🌿</div>
                  <b style={{ fontSize: 14 }}>Cozy & calm</b>
                  <span className="muted" style={{ fontSize: 11 }}>Less motion, no pressure</span>
                </button>
              </div>
            </Card>

            <Card>
              <div className="between">
                <div>
                  <h3 style={{ margin: 0 }}>Daily reminders</h3>
                  <span className="muted" style={{ fontSize: 13 }}>Turtley will gently nudge you</span>
                </div>
                <button className={`chip ${reminders ? "selected" : "outline"}`} onClick={() => setReminders((r) => !r)}>
                  {reminders ? "On" : "Off"}
                </button>
              </div>
              {reminders && (
                <>
                  <label className="field" style={{ marginTop: 12 }}>Reminder time</label>
                  <input className="input" type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} />
                </>
              )}
            </Card>

            <PillButton onClick={finish}>Get started 🐢✨</PillButton>
          </>
        )}
      </div>
    </div>
  );
}
