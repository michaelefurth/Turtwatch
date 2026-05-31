import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { useFeedback } from "@/components/feedback";
import { Card, PillButton } from "@/components/common";
import { MoodPicker } from "@/components/MoodPicker";
import { TagInput } from "@/components/TagInput";
import { SAMPLE_TURTLES } from "@/data/sampleTurtles";
import { ACHIEVEMENTS } from "@/data/achievements";
import { computeStreak } from "@/logic/streak";
import { estimateUpload } from "@/logic/turtbux";
import { todayKey } from "@/logic/dates";
import type { Mood, PhotoSource } from "@/types";

export function DailyUpload() {
  const nav = useNavigate();
  const { celebrate, toast } = useFeedback();
  const entries = useStore((s) => s.entries);
  const save = useStore((s) => s.saveTodayEntry);
  const update = useStore((s) => s.updateEntry);
  const fileRef = useRef<HTMLInputElement>(null);

  const today = todayKey();
  const existing = entries[today];

  const [photoUrl, setPhotoUrl] = useState<string | undefined>(existing?.photoUrl);
  const [photoSource, setPhotoSource] = useState<PhotoSource>("sample");
  const [turtleName, setTurtleName] = useState(existing?.turtleName ?? "");
  const [mood, setMood] = useState<Mood | undefined>(existing?.mood);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [tags, setTags] = useState<string[]>(existing?.tags ?? []);
  const [useLocation, setUseLocation] = useState(!!existing?.location);
  const [locationLabel, setLocationLabel] = useState(existing?.location?.label ?? "");

  const streakNow = useMemo(() => computeStreak(entries).current, [entries]);
  const hasNotes = notes.trim().length >= 10;
  const hasMeta = !!mood && tags.length > 0;
  const estimate = estimateUpload(existing ? streakNow - 1 : streakNow, hasNotes, hasMeta);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUrl(URL.createObjectURL(file));
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
    // Editing today's entry must not re-award the base upload (anti-farm).
    const reward = existing ? update(today, draft) : save(draft);
    celebrate();
    if (reward.total > 0) toast(`+${reward.total} Turtbux! 🪙`, "🎉");
    else toast("Saved! 💾", "🐢");
    reward.newAchievements.forEach((id) => {
      const a = ACHIEVEMENTS.find((x) => x.id === id);
      if (a) setTimeout(() => toast(`Achievement: ${a.title}`, a.emoji), 400);
    });
    nav("/");
  };

  return (
    <div className="screen stack">
      <div className="between">
        <h1>{existing ? "Edit today's turtle" : "Today's turtle 📸"}</h1>
        <span className="chip gold">~{estimate} 🪙</span>
      </div>

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
          <label className="field">Turtle name</label>
          <input className="input" placeholder="Sir Reginald Shellsworth" value={turtleName} onChange={(e) => setTurtleName(e.target.value)} />
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

      <PillButton onClick={onSave}>{existing ? "Save changes 💾" : "Save turtle 🐢✨"}</PillButton>
      <PillButton variant="ghost" onClick={() => nav(-1)}>Cancel</PillButton>
    </div>
  );
}
