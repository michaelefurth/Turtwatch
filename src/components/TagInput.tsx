import { useState, type KeyboardEvent } from "react";

const SUGGESTED = ["pond", "sunbathing", "chonky", "swimming", "sleepy", "snack-time", "majestic"];

export function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [text, setText] = useState("");

  const add = (raw: string) => {
    const t = raw.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setText("");
  };
  const remove = (t: string) => onChange(tags.filter((x) => x !== t));

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(text);
    }
  };

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row wrap gap8">
        {tags.map((t) => (
          <button key={t} className="chip selected" type="button" onClick={() => remove(t)}>
            #{t} ✕
          </button>
        ))}
      </div>
      <input
        className="input"
        placeholder="Add a tag and press Enter…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKey}
      />
      <div className="row wrap gap8">
        {SUGGESTED.filter((s) => !tags.includes(s)).slice(0, 5).map((s) => (
          <button key={s} className="chip outline" type="button" onClick={() => add(s)}>
            + {s}
          </button>
        ))}
      </div>
    </div>
  );
}
