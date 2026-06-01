import { useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { useFeedback } from "@/components/feedback";
import { Card, PillButton } from "@/components/common";
import { MoodPicker } from "@/components/MoodPicker";
import { TagInput } from "@/components/TagInput";
import { SAMPLE_TURTLES } from "@/data/sampleTurtles";
import { ACHIEVEMENTS } from "@/data/achievements";
import { computeStreak } from "@/logic/streak";
import { estimateUpload } from "@/logic/turtbux";
import { todayKey, prettyDate, isFuture } from "@/logic/dates";
import { fileToStorableDataUrl } from "@/lib/image";
import { generateTurtleName } from "@/data/turtleNames";
import { POOLS } from "@/lib/variety";
import type { Mood, PhotoSource } from "@/types";

interface Receipt {
  total: number;
  parts: { label: string; amount: number }[];
}

export function DailyUpload() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { celebrate, toast } = useFeedback();
  const entries = useStore((s) => s.entries);
  const save = useStore((s) => s.saveTodayEntry);
  const update = useStore((s) => s.updateEntry);
  const fileRef = useRef<HTMLInputElement>(null);

  const today = todayKey();
  // Editing a past entry uses ?date=YYYY-MM-DD; otherwise it's today's upload.
  const date = params.get("date") || today;
  const existing = entries[date];
  const isEditing = !!existing;

  const [photoUrl, setPhotoUrl] = useState<string | undefined>(existing?.photoUrl);
  const [photoSource, setPhotoSource] = useState<PhotoSource>(existing?.photoSource ?? "sample");
  const [turtleName, setTurtleName] = useState(existing?.turtleName ?? "");
  const [mood, setMood] = useState<Mood | undefined>(existing?.mood);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [tags, setTags] = useState<string[]>(existing?.tags ?? []);
  const [useLocation, setUseLocation] = useState(!!existing?.location);
  const [locationLabel, setLocationLabel] = useState(existing?.location?.label ?? "");
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const streakNow = useMemo(() => computeStreak(entries).current, [entries]);
  const hasNotes = notes.trim().length >= 10;
  const hasMeta = !!mood && tags.length > 0;
  const estimate = estimateUpload(streakNow, hasNotes, hasMeta);

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Persist a downscaled base64 copy — blob: URLs don't survive a reload.
    const dataUrl = await fileToStorableDataUrl(file);
    setPhotoUrl(dataUrl);
    setPhotoSource("library");
  };

  const onSave = () => {
    if (!photoUrl) {
      toast("Pick a turtle photo first! 🐢", "📸");
      return;
    }
    const draft = {
      photoUrl,
      photoSource,
      turtleName: turtleName.trim() || undefined,
      mood,
      notes: notes.trim() || undefined,
      tags,
      location: useLocation && locationLabel.trim() ? { label: locationLabel.trim() } : undefined,
    };
    // A new turtle is only ever created for TODAY. Editing (today or a past day)
    // routes through updateEntry so the base upload reward can't be re-farmed.
    const startedBroken = !isEditing && streakNow === 0;
    const reward = isEditing ? update(date, draft) : save(draft);
    const jackpot = reward.parts.some((p) => p.label.includes("milestone") || p.label.includes("Golden")) || reward.total >= 45;
    celebrate(jackpot ? POOLS.perfect : POOLS.upload);
    reward.newAchievements.forEach((id, i) => {
      const a = ACHIEVEMENTS.find((x) => x.id === id);
      if (a) setTimeout(() => toast(`Achievement: ${a.title}`, a.emoji), 700 + i * 250);
    });

    if (isEditing) {
      toast(reward.total > 0 ? `+${reward.total} Turtbux! 🪙` : "Saved! 💾", "🐢");
      nav(date !== today ? `/day/${date}` : "/");
      return;
    }
    // new upload → show a reward "receipt" moment, then home
    if (startedBroken) setTimeout(() => toast("New streak started! 🌱", "🐢"), 300);
    setReceipt(reward);
  };

  // Creating is only valid for today. A past date with no entry → repair flow.
  if (!isEditing && date !== today) {
    return <Navigate to={isFuture(date) ? "/calendar" : `/repair/${date}`} replace />;
  }

  return (
    <div className="screen stack">
      <div className="between">
        <h1>{isEditing ? (date === today ? "Edit today's turtle" : "Edit turtle 🐢") : "Today's turtle 📸"}</h1>
        {!isEditing && <span className="chip gold">~{estimate} 🪙</span>}
      </div>
      {isEditing && date !== today && (
        <span className="muted" style={{ fontWeight: 700, marginTop: -8 }}>{prettyDate(date)}</span>
      )}

      <Card>
        {photoUrl ? (
          <img src={photoUrl} alt="chosen turtle" style={{ width: "100%", borderRadius: 18, aspectRatio: "1", objectFit: "cover" }} />
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            style={{ width: "100%", aspectRatio: "1.4", border: "3px dashed var(--line)", borderRadius: 18, background: "transparent", color: "var(--muted)", fontWeight: 800 }}
          >
            <div style={{ fontSize: 44 }}>🐢</div>
            Tap to choose a photo
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} />
        <div className="row mt">
          <PillButton variant="secondary" small onClick={() => fileRef.current?.click()}>📂 Choose photo</PillButton>
        </div>
        <h3 className="mt-sm">…or pick a sample turtle</h3>
        <div className="row wrap gap8">
          {SAMPLE_TURTLES.map((t) => (
            <button
              key={t.id}
              onClick={() => { setPhotoUrl(t.url); setPhotoSource("sample"); }}
              style={{ border: photoUrl === t.url ? "3px solid var(--primary-deep)" : "3px solid transparent", borderRadius: 14, padding: 0, background: "none" }}
            >
              <img src={t.url} alt={t.label} style={{ width: 56, height: 56, borderRadius: 12, display: "block" }} />
            </button>
          ))}
        </div>
      </Card>

      <Card className="stack">
        <div>
          <label className="field" htmlFor="turtle-name">Turtle name</label>
          <div className="row gap8">
            <input id="turtle-name" className="input grow" placeholder="Sir Reginald Shellsworth" value={turtleName} onChange={(e) => setTurtleName(e.target.value)} />
            <button type="button" className="chip outline" aria-label="Generate a random turtle name" title="Random name" onClick={() => setTurtleName(generateTurtleName())} style={{ fontSize: 20, padding: "10px 12px" }}>🎲</button>
          </div>
        </div>
        <div>
          <label className="field">Mood</label>
          <MoodPicker value={mood} onChange={setMood} />
        </div>
        <div>
          <label className="field">Notes</label>
          <textarea className="textarea" placeholder="What was this little guy up to today?" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <span className="muted" style={{ fontSize: 12 }}>{hasNotes ? "+3 Turtbux for notes ✨" : "Write 10+ chars for +3 Turtbux"}</span>
        </div>
        <div>
          <label className="field">Tags</label>
          <TagInput tags={tags} onChange={setTags} />
        </div>
        <div>
          <div className="between">
            <label className="field" style={{ margin: 0 }}>📍 Add location</label>
            <button className={`chip ${useLocation ? "selected" : "outline"}`} onClick={() => setUseLocation((v) => !v)}>{useLocation ? "On" : "Off"}</button>
          </div>
          {useLocation && (
            <input className="input mt-sm" placeholder="Backyard pond" value={locationLabel} onChange={(e) => setLocationLabel(e.target.value)} />
          )}
        </div>
      </Card>

      <PillButton onClick={onSave}>{isEditing ? "Save changes 💾" : "Save turtle 🐢✨"}</PillButton>
      <PillButton variant="ghost" onClick={() => nav(-1)}>Cancel</PillButton>

      {receipt && (
        <div className="scrim" onClick={() => nav("/")}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Reward summary" onClick={(e) => e.stopPropagation()}>
            <div className="center" style={{ fontSize: 40 }}>🐢✨</div>
            <h2 className="center" style={{ margin: "4px 0 10px" }}>Turtle saved!</h2>
            <div className="stack" style={{ gap: 6 }}>
              {receipt.parts.map((p, i) => (
                <div key={i} className="between">
                  <span className={p.label.includes("Golden") || p.label.includes("milestone") ? "" : "muted"} style={{ fontWeight: 700 }}>{p.label}</span>
                  <b>+{p.amount} 🪙</b>
                </div>
              ))}
              <div className="between" style={{ borderTop: "2px solid var(--line)", paddingTop: 8, marginTop: 2 }}>
                <b>Total</b>
                <b className="chip gold">+{receipt.total} 🪙</b>
              </div>
            </div>
            <div className="mt"><PillButton onClick={() => nav("/")}>Sweet! 🐢</PillButton></div>
          </div>
        </div>
      )}
    </div>
  );
}
