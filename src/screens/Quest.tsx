import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/store/useStore";
import { useFeedback } from "@/components/feedback";
import { Card, PillButton, EmptyState } from "@/components/common";
import {
  STEPS_PER_LEG, TASK_DAILY_CAP, destinationFor, lastReached, progressInLeg,
  reachedCount, questStreakDisplay, type Landmark,
} from "@/logic/quest";
import { todayKey, yesterdayKey } from "@/logic/dates";

const SUGGESTIONS = ["Upload a turtle 📸", "Read a turtle fact 📖", "Do a mantra 🧘", "Drink some water 💧", "Take a short walk 🚶", "Tidy one thing 🧹", "Stretch for a minute 🤸", "Message a friend 💌"];

export function Quest() {
  const nav = useNavigate();
  const { celebrate, toast } = useFeedback();
  const quest = useStore((s) => s.quest);
  const ensureDaily = useStore((s) => s.ensureQuestDaily);
  const addTask = useStore((s) => s.addTask);
  const removeTask = useStore((s) => s.removeTask);
  const toggleTask = useStore((s) => s.toggleTask);

  const [text, setText] = useState("");
  const [arrival, setArrival] = useState<Landmark | null>(null);

  useEffect(() => { ensureDaily(); }, [ensureDaily]);

  const today = todayKey();
  const yesterday = yesterdayKey();
  const steps = quest?.steps ?? 0;
  const tasks = quest?.tasks ?? [];
  const doneCount = tasks.filter((t) => t.done).length;
  const streak = questStreakDisplay(quest, today, yesterday);
  const dest = destinationFor(steps);
  const last = lastReached(steps);
  const prog = progressInLeg(steps);
  const placesVisited = reachedCount(steps);
  const earnedToday = quest?.reward?.date === today ? quest.reward.earned : 0;

  const onToggle = (id: string, wasDone: boolean) => {
    const res = toggleTask(id);
    if (!wasDone && res.rewarded > 0) {
      celebrate(res.arrived ? ["🗺️", "🐢", "✨", "🎉"] : ["🐢", "🌿", "✨", "🪷"]);
      toast(res.arrived ? `Arrived at ${res.arrived.name}! +${res.rewarded} 🪙` : `Goal done! +${res.rewarded} 🪙`, res.arrived ? res.arrived.emoji : "✅");
      if (res.arrived) setArrival(res.arrived);
    }
  };

  const add = (t: string) => { addTask(t); setText(""); };

  return (
    <div className="screen stack">
      <div className="between">
        <h1>Turtle Trek 🗺️</h1>
        <button className="chip outline" onClick={() => nav(-1)}>‹ Back</button>
      </div>

      {/* journey map */}
      <Card>
        <div className="between" style={{ marginBottom: 8 }}>
          <span className="chip">🔥 {streak}-day goal streak</span>
          <span className="chip gold">{placesVisited} place{placesVisited === 1 ? "" : "s"} 🗺️</span>
        </div>
        <div className="center" style={{ fontWeight: 800, marginBottom: 6 }}>
          Heading to {dest.emoji} {dest.name}
        </div>

        <div className="trek-track">
          <div className="trek-line" />
          <div className="trek-dots">
            {Array.from({ length: STEPS_PER_LEG }).map((_, i) => (
              <span key={i} className={`trek-dot ${i < prog ? "filled" : ""}`} aria-hidden />
            ))}
          </div>
          <span className="trek-goal" aria-hidden>{dest.emoji}</span>
          <motion.span
            className="trek-turtle"
            aria-hidden
            initial={false}
            animate={{ left: `${(prog / STEPS_PER_LEG) * 82 + 4}%` }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
          >
            🐢
          </motion.span>
        </div>

        <div className="center muted" style={{ fontSize: 12, fontWeight: 700, marginTop: 6 }}>
          {STEPS_PER_LEG - prog} goal{STEPS_PER_LEG - prog === 1 ? "" : "s"} to the next place
          {last ? ` · last stop ${last.emoji} ${last.name}` : ""}
        </div>
      </Card>

      {/* tasks */}
      <Card className="stack">
        <div className="between">
          <h3 style={{ margin: 0 }}>Today's goals</h3>
          <span className="chip">{doneCount}/{tasks.length} done</span>
        </div>

        <div className="row gap8">
          <input
            className="input grow"
            placeholder="Add a goal for today…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) add(text); }}
            aria-label="New goal"
          />
          <PillButton small onClick={() => text.trim() && add(text)}>Add</PillButton>
        </div>

        {tasks.length === 0 ? (
          <EmptyState emoji="🎯" title="Set a few tiny goals" sub="Tick them off to send your turtle on a journey to new places." />
        ) : (
          <div className="stack" style={{ gap: 8 }}>
            {tasks.map((t) => (
              <div key={t.id} className="task-row">
                <button
                  className={`task-check ${t.done ? "done" : ""}`}
                  aria-pressed={t.done}
                  aria-label={t.done ? `Mark ${t.title} not done` : `Mark ${t.title} done`}
                  onClick={() => onToggle(t.id, t.done)}
                >
                  {t.done ? "✓" : ""}
                </button>
                <span className={`grow ${t.done ? "task-done" : ""}`}>{t.title}</span>
                <button className="task-del" aria-label="Delete goal" onClick={() => removeTask(t.id)}>✕</button>
              </div>
            ))}
          </div>
        )}

        <div className="row wrap gap8">
          {SUGGESTIONS.filter((s) => !tasks.some((t) => t.title === s)).slice(0, 4).map((s) => (
            <button key={s} className="chip outline" onClick={() => add(s)}>+ {s}</button>
          ))}
        </div>
      </Card>

      <p className="muted center" style={{ fontSize: 12, margin: 0 }}>
        Earned today: {earnedToday}/{TASK_DAILY_CAP} 🪙 · each goal moves your turtle one step
      </p>

      {/* arrival reveal */}
      <AnimatePresence>
        {arrival && (
          <div className="scrim" onClick={() => setArrival(null)}>
            <motion.div
              className="sheet center"
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
            >
              <div style={{ fontSize: 56 }}>{arrival.emoji}</div>
              <h2 style={{ margin: "4px 0" }}>You reached {arrival.name}!</h2>
              <p className="muted" style={{ marginTop: 0 }}>{arrival.lore}</p>
              <span className="chip gold">+20 Turtbux bonus 🪙</span>
              <div className="mt"><PillButton onClick={() => setArrival(null)}>Keep swimming 🐢</PillButton></div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
