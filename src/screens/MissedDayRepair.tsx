import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { useFeedback } from "@/components/feedback";
import { Card, PillButton, formatNum } from "@/components/common";
import { ConfirmModal } from "@/components/ConfirmModal";
import { SAMPLE_TURTLES } from "@/data/sampleTurtles";
import { REPAIR_COST, AI_RESCUE_COST, SHIELD_PRICE } from "@/logic/recovery";
import { prettyDate, todayKey, isFuture } from "@/logic/dates";
import { availableShields } from "@/store/selectors";
import { generateAiTurtleImage } from "@/lib/aiTurtle";

type Choice = "repair" | "ai_rescue" | "shield" | null;

export function MissedDayRepair() {
  const { date = "" } = useParams();
  const nav = useNavigate();
  const { celebrate, toast } = useFeedback();

  const balance = useStore((s) => s.wallet.balance);
  const entries = useStore((s) => s.entries);
  const shields = useStore((s) => s.shields);
  const repairDay = useStore((s) => s.repairDay);
  const aiRescueDay = useStore((s) => s.aiRescueDay);
  const shieldDay = useStore((s) => s.shieldDay);
  const buyShield = useStore((s) => s.buyShield);

  const profileName = useStore((s) => s.profile.displayName);
  const [choice, setChoice] = useState<Choice>(null);
  const [photo, setPhoto] = useState<string>(SAMPLE_TURTLES[0].url);
  const [generating, setGenerating] = useState(false);
  const cancelledRef = useRef(false);
  useEffect(() => () => { cancelledRef.current = true; }, []); // abort on unmount

  if (entries[date]) return <Navigate to={`/day/${date}`} replace />;
  if (date === todayKey() || isFuture(date)) return <Navigate to="/calendar" replace />;

  const shieldCount = availableShields(shields);

  const doRepair = () => {
    const r = repairDay(date, { photoUrl: photo, photoSource: "library", tags: ["backfilled"] });
    finish(r.ok, r.reason, "🩹", "Day repaired!");
  };
  const doRescue = async () => {
    if (balance < AI_RESCUE_COST) {
      finish(false, "Not enough Turtbux.", "✨", "");
      return;
    }
    cancelledRef.current = false;
    setGenerating(true);
    const { image } = await generateAiTurtleImage(date + profileName); // never throws
    if (cancelledRef.current) return; // user aborted or navigated away — don't charge
    setGenerating(false);
    const r = aiRescueDay(date, image);
    finish(r.ok, r.reason, "✨", "AI turtle rescued the day!");
  };
  const doShield = () => {
    if (shieldCount === 0) {
      const bought = buyShield();
      if (!bought.ok) { toast(bought.reason ?? "Couldn't buy shield", "😢"); return; }
    }
    const r = shieldDay(date);
    finish(r.ok, r.reason, "🛡️", "Shell Shield applied!");
  };

  const finish = (ok: boolean, reason: string | undefined, emoji: string, msg: string) => {
    setChoice(null);
    if (!ok) { toast(reason ?? "Something went wrong", "😢"); return; }
    celebrate([emoji, "🐢", "✨", "🌱", "💚", "🎉", "🌿"]);
    toast(msg, emoji);
    nav(`/day/${date}`);
  };

  const opt = (kind: Exclude<Choice, null>) => {
    if (kind === "repair") return { emoji: "🩹", title: "Backfill a photo", desc: "Upload a turtle for this day. Counts as a repaired day.", cost: REPAIR_COST, disabled: balance < REPAIR_COST };
    if (kind === "ai_rescue") return { emoji: "✨", title: "AI Turtle Rescue", desc: "Generate a one-of-a-kind AI turtle to fill the gap.", cost: AI_RESCUE_COST, disabled: balance < AI_RESCUE_COST };
    return {
      emoji: "🛡️",
      title: "Use a Shell Shield",
      desc: shieldCount > 0 ? `You have ${shieldCount} shield${shieldCount > 1 ? "s" : ""}. Protect this day for free!` : `No shields — buy one for ${SHIELD_PRICE} 🪙 and apply it.`,
      cost: shieldCount > 0 ? 0 : SHIELD_PRICE,
      disabled: shieldCount === 0 && balance < SHIELD_PRICE,
    };
  };

  return (
    <div className="screen stack">
      <button className="chip outline" style={{ alignSelf: "flex-start" }} onClick={() => { if (!generating) nav(-1); }}>‹ Back</button>

      <Card className="center">
        <div style={{ fontSize: 56 }}>😴</div>
        <h1 style={{ marginBottom: 2 }}>This day took a nap</h1>
        <span className="muted" style={{ fontWeight: 700 }}>{prettyDate(date)}</span>
        <p className="muted" style={{ marginBottom: 0 }}>That's totally okay! Leave it blank, or bring it back to life:</p>
      </Card>

      <span className="chip gold" style={{ alignSelf: "center" }}>🪙 {formatNum(balance)} Turtbux</span>

      {(["repair", "ai_rescue", "shield"] as const).map((k) => {
        const o = opt(k);
        return (
          <Card key={k} className={o.disabled ? "" : "flat"} onClick={() => !o.disabled && setChoice(k)}>
            <div className="between">
              <div className="row">
                <span style={{ fontSize: 30 }}>{o.emoji}</span>
                <div>
                  <h3 style={{ margin: 0 }}>{o.title}</h3>
                  <span className="muted" style={{ fontSize: 13 }}>{o.desc}</span>
                </div>
              </div>
              <span className={`chip ${o.disabled ? "outline" : "gold"}`}>{o.cost === 0 ? "Free" : `${o.cost} 🪙`}</span>
            </div>
          </Card>
        );
      })}

      <PillButton variant="ghost" onClick={() => { if (!generating) nav("/calendar"); }}>Leave this day blank</PillButton>

      {/* repair photo picker */}
      <ConfirmModal
        open={choice === "repair"}
        emoji="🩹"
        title="Pick a backfill turtle"
        confirmLabel={`Repair for ${REPAIR_COST} 🪙`}
        onCancel={() => setChoice(null)}
        onConfirm={doRepair}
      >
        <div className="row wrap gap8" style={{ justifyContent: "center" }}>
          {SAMPLE_TURTLES.map((t) => (
            <button key={t.id} onClick={() => setPhoto(t.url)} style={{ border: photo === t.url ? "3px solid var(--primary-deep)" : "3px solid transparent", borderRadius: 14, padding: 0, background: "none" }}>
              <img src={t.url} alt={t.label} style={{ width: 54, height: 54, borderRadius: 12, display: "block" }} />
            </button>
          ))}
        </div>
      </ConfirmModal>

      <ConfirmModal
        open={choice === "ai_rescue"}
        emoji="✨"
        title={generating ? "Summoning a turtle…" : "Summon an AI turtle?"}
        confirmLabel={generating ? "Summoning… 🐢" : `Rescue for ${AI_RESCUE_COST} 🪙`}
        confirmDisabled={generating}
        busy={generating}
        onCancel={() => {
          // allow aborting an in-flight generation (don't trap the user)
          if (generating) { cancelledRef.current = true; setGenerating(false); toast("Maybe next time 🐢", "🐢"); }
          setChoice(null);
        }}
        onConfirm={doRescue}
      >
        <p className="center muted" style={{ margin: 0 }}>We'll generate a unique cute turtle for this day. Balance after: {balance - AI_RESCUE_COST} 🪙</p>
      </ConfirmModal>

      <ConfirmModal
        open={choice === "shield"}
        emoji="🛡️"
        title={shieldCount > 0 ? "Use a Shell Shield?" : "Buy & use a Shell Shield?"}
        confirmLabel={shieldCount > 0 ? "Protect this day" : `Buy & apply (${SHIELD_PRICE} 🪙)`}
        onCancel={() => setChoice(null)}
        onConfirm={doShield}
      >
        <p className="center muted" style={{ margin: 0 }}>Shields keep your streak intact with no photo needed.</p>
      </ConfirmModal>
    </div>
  );
}
