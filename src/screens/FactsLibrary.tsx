import { useState } from "react";
import { useStore } from "@/store/useStore";
import { useFeedback } from "@/components/feedback";
import { Card } from "@/components/common";
import { FactCard } from "@/components/FactCard";
import { FACTS } from "@/data/facts";
import type { FactCategory } from "@/types";

const FILTERS: { id: FactCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "biology", label: "🐢 Biology" },
  { id: "record", label: "🏆 Records" },
  { id: "history", label: "📜 History" },
  { id: "silly", label: "🤪 Silly" },
  { id: "care", label: "💚 Care" },
];

export function FactsLibrary() {
  const { toast } = useFeedback();
  const factsRead = useStore((s) => s.factsRead);
  const readFact = useStore((s) => s.readFact);
  const [filter, setFilter] = useState<FactCategory | "all">("all");

  const readCount = Object.keys(factsRead).length;
  const shown = FACTS.filter((f) => filter === "all" || f.category === filter);

  const onRead = (id: string) => {
    const reward = readFact(id);
    if (reward > 0) toast(`+${reward} Turtbux for learning! 🪙`, "📖");
  };

  return (
    <div className="screen stack">
      <h1>Turtle Facts 📖</h1>
      <Card className="flat">
        <div className="between">
          <b>Collection</b>
          <span className="chip">{readCount}/{FACTS.length} collected</span>
        </div>
        <div className="progress mt-sm"><div style={{ width: `${(readCount / FACTS.length) * 100}%` }} /></div>
      </Card>

      <div className="row wrap gap8">
        {FILTERS.map((f) => (
          <button key={f.id} className={`chip ${filter === f.id ? "selected" : "outline"}`} onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid2">
        {shown.map((f) => (
          <FactCard key={f.id} fact={f} read={!!factsRead[f.id]} onRead={() => onRead(f.id)} />
        ))}
      </div>
    </div>
  );
}
