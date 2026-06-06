import type { Mood } from "@/types";

export const MOODS: { id: Mood; emoji: string; label: string }[] = [
  { id: "happy", emoji: "😊", label: "Happy" },
  { id: "sleepy", emoji: "😴", label: "Sleepy" },
  { id: "derpy", emoji: "🤪", label: "Derpy" },
  { id: "majestic", emoji: "👑", label: "Majestic" },
  { id: "shy", emoji: "🙈", label: "Shy" },
  { id: "hungry", emoji: "🍓", label: "Hungry" },
];

export function moodEmoji(mood?: Mood): string {
  return MOODS.find((m) => m.id === mood)?.emoji ?? "";
}

export function MoodPicker({ value, onChange }: { value?: Mood; onChange: (m: Mood) => void }) {
  return (
    <div className="row wrap gap8">
      {MOODS.map((m) => (
        <button
          key={m.id}
          className={`chip ${value === m.id ? "selected" : "outline"}`}
          aria-pressed={value === m.id}
          onClick={() => onChange(m.id)}
          type="button"
        >
          {m.emoji} {m.label}
        </button>
      ))}
    </div>
  );
}
