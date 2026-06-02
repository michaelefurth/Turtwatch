import { useMemo, useState } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { useStore, isCloudMode } from "@/store/useStore";
import { useFeedback } from "@/components/feedback";
import { setEntryShared, friendErr } from "@/lib/friends";
import { shareTurtleCard } from "@/lib/shareCard";
import { Card, PillButton, StateBadge, TurtlePhoto, BackButton } from "@/components/common";
import { ConfirmModal } from "@/components/ConfirmModal";
import { moodEmoji } from "@/components/MoodPicker";
import { prettyDate, todayKey } from "@/logic/dates";
import { computeStreak } from "@/logic/streak";
import { STICKER_EMOJI } from "@/data/shopItems";
import { equippedFrame, equippedSticker } from "@/store/selectors";

export function EntryDetail() {
  const { date = "" } = useParams();
  const nav = useNavigate();
  const { toast } = useFeedback();
  const entries = useStore((s) => s.entries);
  const entry = entries[date];
  const inventory = useStore((s) => s.inventory);
  const del = useStore((s) => s.deleteEntry);
  const [confirmDel, setConfirmDel] = useState(false);
  const [shared, setShared] = useState(!!entry?.shared);
  const [sharing, setSharing] = useState(false);

  const toggleShare = async () => {
    const next = !shared;
    setShared(next); setSharing(true);
    try {
      await setEntryShared(date, next);
      toast(next ? "Shared with your friends 🐢" : "No longer shared", next ? "💚" : "🐢");
    } catch (e) {
      setShared(!next); // revert
      toast(friendErr(e), "😢");
    } finally { setSharing(false); }
  };

  // preview the streak impact of deleting this entry
  const streakDelta = useMemo(() => {
    if (!entry) return null;
    const before = computeStreak(entries).current;
    const rest = { ...entries };
    delete rest[date];
    const after = computeStreak(rest).current;
    return { before, after };
  }, [entries, entry, date]);

  if (!entry) {
    // empty past day → send to repair; today → upload
    return <Navigate to={date === todayKey() ? "/upload" : `/repair/${date}`} replace />;
  }

  const onShareCard = async () => {
    const res = await shareTurtleCard({
      photoUrl: entry.photoUrl,
      name: entry.turtleName || "A lovely turtle",
      dateLabel: prettyDate(date),
      streak: computeStreak(entries).current,
      earned: entry.earnedTurtbux,
      badge: moodEmoji(entry.mood) || "🐢",
    });
    if (res === "downloaded") toast("Saved your turtle card 📥", "🐢");
    else if (res === "failed") toast("Couldn't make the card 😢", "🐢");
  };

  const frameClass = equippedFrame(inventory) ?? "";
  const sticker = STICKER_EMOJI[equippedSticker(inventory) ?? ""];

  return (
    <div className="screen stack">
      <div className="between">
        <BackButton />
        <StateBadge state={entry.state} />
      </div>

      <h1 style={{ marginBottom: 0 }}>{entry.turtleName || "A lovely turtle"}</h1>
      <span className="muted" style={{ fontWeight: 700 }}>{prettyDate(date)}</span>

      <Card className="center">
        {entry.photoUrl ? (
          <TurtlePhoto src={entry.photoUrl} frameClass={frameClass} sticker={sticker} radius={18} style={{ width: "84%" }} />
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
          {entry.location && (
            <div className="muted">📍 {entry.location.label}
              {entry.location.lat != null && (
                <> · <a href={`https://www.openstreetmap.org/?mlat=${entry.location.lat}&mlon=${entry.location.lng}#map=15/${entry.location.lat}/${entry.location.lng}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary-deep)", fontWeight: 700 }}>view on map</a></>
              )}
            </div>
          )}
        </Card>
      )}

      {entry.notes && (
        <Card>
          <h3>Notes</h3>
          <p style={{ margin: 0 }}>{entry.notes}</p>
        </Card>
      )}

      {entry.earnedTurtbux > 0 && <span className="chip gold" style={{ alignSelf: "flex-start" }}>Earned +{entry.earnedTurtbux} 🪙</span>}

      {isCloudMode() && entry.photoUrl && (
        <button className={`chip ${shared ? "selected" : "outline"}`} style={{ alignSelf: "flex-start" }} aria-pressed={shared} disabled={sharing} onClick={toggleShare}>
          {shared ? "✓ Shared with friends" : "👋 Share with friends"}
        </button>
      )}

      <div className="stack mt">
        {entry.photoUrl && <PillButton variant="secondary" onClick={onShareCard}>📤 Share card</PillButton>}
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
        <p className="center muted" style={{ margin: 0 }}>
          {streakDelta && streakDelta.before !== streakDelta.after
            ? `Your streak will drop from ${streakDelta.before} to ${streakDelta.after} days. The day goes back to napping 😴`
            : "The day will go back to napping 😴 (your current streak is safe)."}
        </p>
      </ConfirmModal>
    </div>
  );
}
