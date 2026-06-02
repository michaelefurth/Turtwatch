import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore, isCloudMode } from "@/store/useStore";
import { useFeedback } from "@/components/feedback";
import { Mascot } from "@/components/Mascot";
import { Card, PillButton, BackButton, TurtlePhoto } from "@/components/common";
import { useSheetFocus } from "@/hooks/useSheetFocus";
import { prettyDate } from "@/logic/dates";
import {
  listFriends, pendingRequests, sendFriendRequest, respondFriendRequest,
  removeFriend, setUsername, friendTurtles, friendErr,
  listCheers, sendCheer, CHEER_EMOJI,
  listGroupGoals, createGroupGoal, respondGroupGoal, leaveGroupGoal,
  type Friend, type PendingRequest, type OutgoingRequest, type FriendTurtle, type Cheer, type GroupGoal,
} from "@/lib/friends";

const handleOf = (u: string | null) => (u ? `@${u}` : "no handle yet");

export function Friends() {
  const { toast } = useFeedback();
  const profile = useStore((s) => s.profile);
  const updateProfile = useStore((s) => s.updateProfile);

  const [handle, setHandle] = useState(profile.username ?? "");
  const [add, setAdd] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<PendingRequest[]>([]);
  const [outgoing, setOutgoing] = useState<OutgoingRequest[]>([]);
  const [cheers, setCheers] = useState<Cheer[]>([]);
  const [goals, setGoals] = useState<GroupGoal[]>([]);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalTarget, setGoalTarget] = useState(20);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [view, setView] = useState<{ friend: Friend; turtles: FriendTurtle[] } | null>(null);
  const viewRef = useSheetFocus<HTMLDivElement>(!!view, () => setView(null));

  const cloud = isCloudMode();

  const refresh = async () => {
    try {
      const [fs, reqs, ch, gg] = await Promise.all([listFriends(), pendingRequests(), listCheers(), listGroupGoals()]);
      setFriends(fs);
      setIncoming(reqs.incoming);
      setOutgoing(reqs.outgoing);
      setCheers(ch.cheers);
      setGoals(gg);
      setLoadError(false);
    } catch { setLoadError(true); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (cloud) refresh(); else setLoading(false); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!cloud) {
    return (
      <div className="screen stack">
        <div className="between"><h1>Friends 👋</h1><BackButton /></div>
        <Card className="center stack">
          <Mascot mascot="turtley" mood="happy" size={96} />
          <h2 style={{ margin: 0 }}>Pond pals need an account</h2>
          <p className="muted" style={{ marginTop: 0 }}>Sign in to cloud sync to add friends, share turtles, and cheer each other's streaks.</p>
        </Card>
      </div>
    );
  }

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } catch (e) { toast(friendErr(e), "😢"); } finally { setBusy(false); }
  };

  const saveHandle = () => run(async () => {
    const res = await setUsername(handle);
    updateProfile({ username: res.username });
    toast(`You're @${res.username} 🎉`, "🐢");
  });

  const doAdd = () => run(async () => {
    await sendFriendRequest(add);
    setAdd("");
    toast("Friend request sent! 🐢", "💌");
    await refresh();
  });

  const respond = (id: string, accept: boolean) => run(async () => {
    await respondFriendRequest(id, accept);
    toast(accept ? "You're now pond pals! 💚" : "Request dismissed", accept ? "🎉" : "🐢");
    await refresh();
  });

  const unfriend = (f: Friend) => run(async () => {
    await removeFriend(f.id);
    setView(null); // close the sheet only after the remove actually succeeds
    toast("Friend removed", "🐢");
    await refresh();
  });

  const openFriend = (f: Friend) => run(async () => {
    const turtles = await friendTurtles(f.id);
    setView({ friend: f, turtles });
  });

  const cheer = (friendId: string, emoji: string) => run(async () => {
    await sendCheer(friendId, emoji);
    toast(`Cheer sent! ${emoji}`, "💌");
    await refresh();
  });

  const startGoal = (friendId: string) => run(async () => {
    await createGroupGoal(friendId, goalTitle.trim() || "Turtles together", goalTarget);
    setGoalTitle("");
    setView(null);
    toast("Shared goal sent! 🎯", "🐢");
    await refresh();
  });

  const respondGoal = (id: string, accept: boolean) => run(async () => {
    await respondGroupGoal(id, accept);
    toast(accept ? "You joined the goal! 🎯" : "Goal dismissed", "🐢");
    await refresh();
  });

  const leaveGoal = (id: string) => run(async () => {
    await leaveGroupGoal(id);
    toast("Left the goal", "🐢");
    await refresh();
  });

  return (
    <div className="screen stack">
      <div className="between"><h1>Friends 👋</h1><BackButton /></div>

      {/* your handle */}
      <Card className="stack">
        <h3 style={{ margin: 0 }}>Your handle</h3>
        <span className="muted" style={{ fontSize: 13 }}>Friends find you by this @handle.</span>
        <div className="row" style={{ gap: 8 }}>
          <span style={{ fontWeight: 800, color: "var(--primary-deep)" }}>@</span>
          <input className="input" value={handle} placeholder="pond_keeper" maxLength={20}
            onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} aria-label="Your handle" />
        </div>
        <PillButton small onClick={saveHandle} disabled={busy || handle.length < 3 || handle === profile.username}>
          {profile.username ? "Update handle" : "Claim handle"}
        </PillButton>
      </Card>

      {/* add a friend */}
      <Card className="stack">
        <h3 style={{ margin: 0 }}>Add a friend</h3>
        <div className="row" style={{ gap: 8 }}>
          <span style={{ fontWeight: 800, color: "var(--primary-deep)" }}>@</span>
          <input className="input" value={add} placeholder="their_handle" maxLength={20}
            onChange={(e) => setAdd(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            onKeyDown={(e) => { if (e.key === "Enter") doAdd(); }} aria-label="Friend's handle" />
        </div>
        <PillButton small onClick={doAdd} disabled={busy || add.length < 3 || !profile.username}>Send request 💌</PillButton>
        {!profile.username && <span className="muted" style={{ fontSize: 12 }}>Claim your handle first so friends can connect back.</span>}
      </Card>

      {/* incoming requests */}
      {incoming.length > 0 && (
        <Card className="stack">
          <h3 style={{ margin: 0 }}>Requests</h3>
          {incoming.map((r) => (
            <div key={r.id} className="between">
              <div className="row"><Mascot mascot={r.mascot} size={36} /><div><b>{r.displayName}</b><div className="muted" style={{ fontSize: 12 }}>{handleOf(r.username)}</div></div></div>
              <div className="row" style={{ gap: 6 }}>
                <button className="chip selected" disabled={busy} onClick={() => respond(r.id, true)}>Accept</button>
                <button className="chip outline" disabled={busy} onClick={() => respond(r.id, false)}>Decline</button>
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* cheers received */}
      {cheers.length > 0 && (
        <Card className="stack">
          <h3 style={{ margin: 0 }}>Cheers received 👏</h3>
          {cheers.slice(0, 8).map((c) => (
            <div key={c.id} className="row" style={{ gap: 8 }}>
              <span style={{ fontSize: 22 }} aria-hidden>{c.emoji}</span>
              <span><b>{c.displayName}</b> <span className="muted" style={{ fontSize: 12 }}>cheered you on</span></span>
            </div>
          ))}
        </Card>
      )}

      {/* shared goals */}
      {goals.length > 0 && (
        <>
          <h2 style={{ margin: "4px 0 0" }}>Shared goals 🎯</h2>
          {goals.map((g) => {
            const pct = Math.min(100, Math.round((g.total / g.target) * 100));
            const reached = g.total >= g.target;
            return (
              <Card key={g.id} className="stack">
                <div className="between">
                  <b>{g.title}</b>
                  <span className={`chip ${reached ? "gold" : ""}`}>{g.total}/{g.target}{reached ? " ✓" : ""}</span>
                </div>
                <div className="progress"><div style={{ width: `${pct}%` }} /></div>
                <div className="row wrap gap8">
                  {g.members.map((m) => (
                    <span key={m.id} className={`chip ${m.status === "pending" ? "outline" : ""}`}>
                      {m.displayName.split(" ")[0]}: {m.status === "pending" ? "invited" : `${m.contribution} 🐢`}
                    </span>
                  ))}
                </div>
                {g.myStatus === "pending" ? (
                  <div className="row" style={{ gap: 8 }}>
                    <button className="chip selected" disabled={busy} onClick={() => respondGoal(g.id, true)}>Join goal</button>
                    <button className="chip outline" disabled={busy} onClick={() => respondGoal(g.id, false)}>Decline</button>
                  </div>
                ) : (
                  <button className="chip outline" style={{ alignSelf: "flex-start" }} disabled={busy} onClick={() => leaveGoal(g.id)}>Leave goal</button>
                )}
              </Card>
            );
          })}
        </>
      )}

      {/* friends list */}
      <div className="between"><h2 style={{ margin: 0 }}>Pond pals</h2>{friends.length > 0 && <span className="chip">{friends.length}</span>}</div>
      {loading ? (
        <p className="muted center">Loading…</p>
      ) : loadError && friends.length === 0 ? (
        <Card className="center stack"><div style={{ fontSize: 40 }}>🐢📡</div><b>Couldn't reach the pond</b><p className="muted" style={{ marginTop: 0 }}>Check your connection and try again.</p><PillButton small variant="secondary" onClick={() => { setLoading(true); refresh(); }}>Retry</PillButton></Card>
      ) : friends.length === 0 ? (
        <Card className="center stack"><div style={{ fontSize: 40 }}>🐢🫧</div><b>No pals yet</b><p className="muted" style={{ marginTop: 0 }}>Share your @handle and send a request above.</p></Card>
      ) : (
        <div className="stack">
          {friends.map((f) => (
            <Card key={f.id} className="tight" onClick={() => openFriend(f)}>
              <div className="row" style={{ alignItems: "center" }}>
                {f.lastShared?.photoUrl ? (
                  <TurtlePhoto src={f.lastShared.photoUrl} size={56} radius={14} style={{ flexShrink: 0 }} />
                ) : (
                  <div style={{ flexShrink: 0 }}><Mascot mascot={f.mascot} size={52} /></div>
                )}
                <div className="grow" style={{ minWidth: 0 }}>
                  <b style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{f.displayName}</b>
                  <div className="muted" style={{ fontSize: 12 }}>{handleOf(f.username)}</div>
                  <div className="row gap8" style={{ marginTop: 4 }}>
                    <span className="chip">🔥 {f.streak}</span>
                    <span className="chip">🗺️ {f.trekStreak}</span>
                    {f.sharedCount > 0 && <span className="chip gold">🐢 {f.sharedCount}</span>}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {outgoing.length > 0 && (
        <p className="muted center" style={{ fontSize: 12 }}>
          Pending sent: {outgoing.map((o) => handleOf(o.username)).join(", ")}
        </p>
      )}

      {/* friend's shared turtles */}
      <AnimatePresence>
        {view && (
          <div className="scrim" onClick={() => setView(null)}>
            <motion.div ref={viewRef} className="sheet" role="dialog" aria-modal="true" aria-labelledby="friend-title" onClick={(e) => e.stopPropagation()} initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}>
              <div className="between">
                <div className="row"><Mascot mascot={view.friend.mascot} size={44} /><div><h2 id="friend-title" style={{ margin: 0 }}>{view.friend.displayName}</h2><span className="muted" style={{ fontSize: 12 }}>{handleOf(view.friend.username)} · 🔥 {view.friend.streak} · 🗺️ {view.friend.trekStreak}</span></div></div>
              </div>
              <div className="row wrap gap8" style={{ marginTop: 12 }}>
                <span className="muted" style={{ fontSize: 12, fontWeight: 800, alignSelf: "center" }}>Send a cheer:</span>
                {CHEER_EMOJI.map((e) => (
                  <button key={e} className="chip outline" disabled={busy} onClick={() => cheer(view.friend.id, e)} aria-label={`Send ${e} cheer`}>{e}</button>
                ))}
              </div>

              <div className="stack" style={{ marginTop: 14, gap: 8 }}>
                <b style={{ fontSize: 14 }}>Start a shared goal 🎯</b>
                <input className="input" placeholder="e.g. 20 turtles together" maxLength={60} value={goalTitle} onChange={(e) => setGoalTitle(e.target.value)} aria-label="Goal title" />
                <div className="row" style={{ gap: 8 }}>
                  <span className="muted" style={{ fontSize: 13, alignSelf: "center" }}>Target</span>
                  <input className="input" type="number" min={1} max={1000} style={{ width: 100 }} value={goalTarget} onChange={(e) => setGoalTarget(Math.max(1, Math.min(1000, +e.target.value || 1)))} aria-label="Goal target" />
                  <PillButton small onClick={() => startGoal(view.friend.id)} disabled={busy}>Invite</PillButton>
                </div>
              </div>
              {view.turtles.length === 0 ? (
                <p className="muted center" style={{ marginTop: 16 }}>No shared turtles yet 🐢</p>
              ) : (
                <div className="grid2" style={{ marginTop: 14 }}>
                  {view.turtles.map((t) => (
                    <div key={t.date} className="stack" style={{ gap: 4 }}>
                      {t.photoUrl ? <TurtlePhoto src={t.photoUrl} radius={14} /> : <div style={{ aspectRatio: 1, borderRadius: 14, background: "var(--line)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🛡️</div>}
                      <b style={{ fontSize: 13 }}>{t.turtleName || "A turtle"}</b>
                      <span className="muted" style={{ fontSize: 11 }}>{prettyDate(t.date)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt"><PillButton variant="ghost" disabled={busy} onClick={() => unfriend(view.friend)}>Remove friend</PillButton></div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
