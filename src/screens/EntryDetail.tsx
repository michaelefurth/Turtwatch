import { useState } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { useFeedback } from "@/components/feedback";
import { Card, PillButton, StateBadge } from "@/components/common";
import { ConfirmModal } from "@/components/ConfirmModal";
import { moodEmoji } from "@/components/MoodPicker";
import { prettyDate, todayKey } from "@/logic/dates";
import { equippedFrame } from "@/store/selectors";

export function EntryDetail() {
  const { date = "" } = useParams();
  const nav = useNavigate();
  const { toast } = useFeedback();
  const entry = useStore((s) => s.entries[date]);
  const inventory = useStore((s) => s.inventory);
  const del = useStore((s) => s.deleteEntry);
  const [confirmDel, setConfirmDel] = useState(false);

  if (!entry) {
    // empty past day → send to repair; today → upload
    return <Navigate to={date === todayKey() ? "/upload" : `/repair/${date}`} replace />;
  }

  const frameClass = equippedFrame(inventory) ?? "";

  return (
    <div className="screen stack">
      <div className="between">
        <button className="chip outline" onClick={() => nav(-1)}>‹ Back</button>
        <StateBadge state={entry.state} />
      </div>

      <h1 style={{ marginBottom: 0 }}>{entry.turtleName || "A lovely turtle"}</h1>
      <span className="muted" style={{ fontWeight: 700 }}>{prettyDate(date)}</span>

      <Card className="center">
        {entry.photoUrl ? (
          <img src={entry.photoUrl} alt="turtle" className={frameClass} style={{ width: "84%", borderRadius: 18, aspectRatio: "1", objectFit: "cover" }} />
        ) : (
          <div className="center" style={{ padding: 24 }}>
            <div style={{ fontSize: 56 }}>🛡️</div>
            <b>Shielded day</b>
            <p className="muted">No photo — your streak was protected by a Shell Shield.</p>
          </div>
        )}
      </Card>

      {(entry.mood || entry.tags.length > 0 || entry.location) && (
        <Card className="stack">
          {entry.mood && <div className="row"><span style={{ fontSize: 22 }}>{moodEmoji(entry.mood)}</span><b style={{ textTransform: "capitalize" }}>{entry.mood}</b></div>}
          {entry.tags.length > 0 && (
            <div className="row wrap gap8">
              {entry.tags.map((t) => <span key={t} className="chip">#{t}</span>)}
            </div>
          )}
          {entry.location && <div className="muted">📍 {entry.location.label}</div>}
        </Card>
      )}

      {entry.notes && (
        <Card>
          <h3>Notes</h3>
          <p style={{ margin: 0 }}>{entry.notes}</p>
        </Card>
      )}

      {entry.earnedTurtbux > 0 && <span className="chip gold" style={{ alignSelf: "flex-start" }}>Earned +{entry.earnedTurtbux} 🪙</span>}

      <div className="stack mt">
        <PillButton variant="secondary" onClick={() => nav(date === todayKey() ? "/upload" : `/upload?date=${date}`)}>
          ✏️ Edit {date === todayKey() ? "today's turtle" : "entry"}
        </PillButton>
        <PillButton variant="danger" onClick={() => setConfirmDel(true)}>🗑️ Delete entry</PillButton>
      </div>

      <ConfirmModal
        open={confirmDel}
        emoji="😢"
        title="Delete this turtle?"
        confirmLabel="Delete"
        danger
        onCancel={() => setConfirmDel(false)}
        onConfirm={() => {
          del(date);
          toast("Entry deleted", "🗑️");
          nav("/calendar");
        }}
      >
        <p className="center muted" style={{ margin: 0 }}>This may affect your streak. The day will go back to napping.</p>
      </ConfirmModal>
    </div>
  );
}
