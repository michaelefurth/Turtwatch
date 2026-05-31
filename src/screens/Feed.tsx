import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { Card, StateBadge, EmptyState, TurtlePhoto } from "@/components/common";
import { moodEmoji, MOODS } from "@/components/MoodPicker";
import { prettyDate } from "@/logic/dates";
import { STICKER_EMOJI } from "@/data/shopItems";
import { distinctTurtleNames, equippedFrame, equippedSticker } from "@/store/selectors";
import type { Mood } from "@/types";

export function Feed() {
  const nav = useNavigate();
  const entries = useStore((s) => s.entries);
  const inventory = useStore((s) => s.inventory);
  const frame = equippedFrame(inventory) ?? "";
  const sticker = STICKER_EMOJI[equippedSticker(inventory) ?? ""];

  const [q, setQ] = useState("");
  const [mood, setMood] = useState<Mood | "all">("all");
  const [name, setName] = useState<string>("all");

  const names = useMemo(() => distinctTurtleNames(entries), [entries]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return Object.values(entries)
      .filter((e) => {
        if (mood !== "all" && e.mood !== mood) return false;
        if (name !== "all" && (e.turtleName ?? "") !== name) return false;
        if (!term) return true;
        const hay = [e.turtleName, e.notes, ...(e.tags ?? [])].join(" ").toLowerCase();
        return hay.includes(term);
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [entries, q, mood, name]);

  const total = Object.keys(entries).length;

  return (
    <div className="screen stack">
      <h1>Turtle Diary 📔</h1>

      <input
        className="input"
        placeholder="🔎 Search names, notes, tags…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Search entries"
      />

      <div className="row wrap gap8">
        <button className={`chip ${mood === "all" && name === "all" ? "selected" : "outline"}`} onClick={() => { setMood("all"); setName("all"); }}>All</button>
        {MOODS.map((m) => (
          <button key={m.id} className={`chip ${mood === m.id ? "selected" : "outline"}`} aria-pressed={mood === m.id} onClick={() => setMood(mood === m.id ? "all" : m.id)}>
            {m.emoji}
          </button>
        ))}
      </div>

      {names.length > 1 && (
        <div className="row wrap gap8">
          <span className="muted" style={{ fontWeight: 800, fontSize: 12, alignSelf: "center" }}>🐢</span>
          {names.map((n) => (
            <button key={n} className={`chip ${name === n ? "selected" : "outline"}`} aria-pressed={name === n} onClick={() => setName(name === n ? "all" : n)}>
              {n}
            </button>
          ))}
        </div>
      )}

      {total === 0 ? (
        <EmptyState emoji="🐢" title="No turtles yet" sub="Upload your first turtle and your diary will fill up here." />
      ) : list.length === 0 ? (
        <EmptyState emoji="🔍" title="No matches" sub="Try a different search or filter." />
      ) : (
        <div className="stack">
          {list.map((e) => (
            <Card key={e.date} className="tight" onClick={() => nav(`/day/${e.date}`)}>
              <div className="row" style={{ alignItems: "center" }}>
                {e.photoUrl ? (
                  <TurtlePhoto src={e.photoUrl} frameClass={frame} sticker={sticker} size={64} radius={14} style={{ flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 64, height: 64, borderRadius: 14, background: "var(--line)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 }}>🛡️</div>
                )}
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="between">
                    <b style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.turtleName || "A lovely turtle"}</b>
                    <span aria-hidden>{moodEmoji(e.mood)}</span>
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>{prettyDate(e.date)}</div>
                  <div className="row gap8" style={{ marginTop: 4 }}>
                    <StateBadge state={e.state} />
                    {e.tags.slice(0, 2).map((t) => <span key={t} className="muted" style={{ fontSize: 11 }}>#{t}</span>)}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
