import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore, isCloudMode } from "@/store/useStore";
import { useFeedback } from "@/components/feedback";
import { Mascot } from "@/components/Mascot";
import { Card, PillButton, BackButton } from "@/components/common";
import { ConfirmModal } from "@/components/ConfirmModal";
import { THEMES } from "@/data/shopItems";
import { exportState, parseImportedState } from "@/store/persistence";
import type { AppState } from "@/types";
import { requestNotificationPermission, notificationPermission, notificationsSupported } from "@/lib/notifications";
import { pushSupported, enablePush, disablePush } from "@/lib/push";
import type { Mascot as MascotType } from "@/types";

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button className={`chip ${on ? "selected" : "outline"}`} aria-pressed={on} onClick={onClick}>
      {on ? "On" : "Off"}
    </button>
  );
}

export function Settings() {
  const nav = useNavigate();
  const { toast } = useFeedback();
  const profile = useStore((s) => s.profile);
  const cloud = useStore((s) => s.cloud);
  const notifications = useStore((s) => s.notifications);
  const inventory = useStore((s) => s.inventory);
  const updateProfile = useStore((s) => s.updateProfile);
  const updateNotifications = useStore((s) => s.updateNotifications);
  const prefs = useStore((s) => s.prefs);
  const updatePrefs = useStore((s) => s.updatePrefs);
  const reset = useStore((s) => s.reset);
  const hydrateState = useStore((s) => s.hydrateState);
  const [confirmReset, setConfirmReset] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<AppState | null>(null);

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-importing the same file
    if (!file) return;
    const state = parseImportedState(await file.text());
    if (!state) { toast("That doesn't look like a TurtWatch backup 🐢", "😢"); return; }
    setPendingImport(state);
  };

  const ownedThemeIds = new Set(["pond_mint", ...THEMES.filter((t) => inventory[`theme_${t.id}`]).map((t) => t.id)]);

  const doExport = () => {
    const json = exportState(useStore.getState());
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "turtwatch-backup.json";
    a.click();
    URL.revokeObjectURL(url);
    toast("Exported your turtle diary 🐢", "📤");
  };

  return (
    <div className="screen stack">
      <div className="between">
        <h1>Settings ⚙️</h1>
        <BackButton />
      </div>

      <Card onClick={() => nav("/account")}>
        <div className="between">
          <div className="row">
            <span style={{ fontSize: 28 }} aria-hidden>☁️</span>
            <div>
              <h3 style={{ margin: 0 }}>Account & cloud sync</h3>
              <span className="muted" style={{ fontSize: 13 }}>
                {cloud?.email ? `Signed in as ${cloud.email}` : "Save your turtles to the cloud →"}
              </span>
            </div>
          </div>
          <span className="chip">{cloud?.email ? "Manage" : "Set up"}</span>
        </div>
      </Card>

      <Card>
        <h3>Your name</h3>
        <input className="input" value={profile.displayName} onChange={(e) => updateProfile({ displayName: e.target.value })} />
      </Card>

      <Card>
        <h3>Mascot</h3>
        <div className="grid2">
          {(["turtley", "shelldon"] as MascotType[]).map((m) => (
            <button key={m} className="stat center" style={{ border: profile.mascot === m ? "3px solid var(--primary-deep)" : "3px solid transparent" }} onClick={() => updateProfile({ mascot: m })}>
              <div style={{ display: "flex", justifyContent: "center" }}><Mascot mascot={m} size={70} /></div>
              <b style={{ textTransform: "capitalize" }}>{m}</b>
            </button>
          ))}
        </div>
        <label className="field" style={{ marginTop: 12 }}>Mascot nickname</label>
        <input className="input" value={profile.mascotName ?? ""} onChange={(e) => updateProfile({ mascotName: e.target.value })} />
      </Card>

      <Card>
        <h3>Theme</h3>
        <div className="row wrap gap8">
          {THEMES.map((t) => {
            const owned = ownedThemeIds.has(t.id);
            return (
              <button
                key={t.id}
                className={`chip ${profile.themeId === t.id ? "selected" : "outline"}`}
                onClick={() => owned ? updateProfile({ themeId: t.id }) : toast("Unlock this theme in the Shop 🛍️", "🔒")}
              >
                <span className="sw" style={{ background: t.primary }} /> {t.name} {owned ? "" : "🔒"}
              </button>
            );
          })}
        </div>
        <p className="muted" style={{ fontSize: 12, margin: "8px 0 0" }}>Unlock more palettes in the Turtbux Shop.</p>
      </Card>

      <Card className="stack">
        <h3 style={{ margin: 0 }}>Notifications</h3>
        <div className="between">
          <span>Daily reminder</span>
          <Toggle
            on={notifications.dailyReminderEnabled}
            onClick={async () => {
              const next = !notifications.dailyReminderEnabled;
              updateNotifications({ dailyReminderEnabled: next });
              if (next) {
                const perm = await requestNotificationPermission();
                if (perm !== "granted") toast("Allow notifications in your browser to get reminders", "🔔");
              }
            }}
          />
        </div>
        {!notificationsSupported() && (
          <span className="muted" style={{ fontSize: 12 }}>This browser doesn't support notifications.</span>
        )}
        {notificationsSupported() && notifications.dailyReminderEnabled && notificationPermission() !== "granted" && (
          <span className="muted" style={{ fontSize: 12 }}>⚠️ Permission not granted — reminders won't show until you allow them.</span>
        )}
        {notifications.dailyReminderEnabled && (
          <div className="between"><span>Reminder time</span><input className="input" style={{ width: 130 }} type="time" value={notifications.reminderTime} onChange={(e) => updateNotifications({ reminderTime: e.target.value })} /></div>
        )}
        <div className="between"><span>Streak-at-risk alerts</span><Toggle on={notifications.streakRiskEnabled} onClick={() => updateNotifications({ streakRiskEnabled: !notifications.streakRiskEnabled })} /></div>
        <div className="between"><span>Fact of the day</span><Toggle on={notifications.factOfDayEnabled} onClick={() => updateNotifications({ factOfDayEnabled: !notifications.factOfDayEnabled })} /></div>
        <div className="between"><span>Celebration sounds</span><Toggle on={!!notifications.soundEnabled} onClick={() => updateNotifications({ soundEnabled: !notifications.soundEnabled })} /></div>
        <div className="between"><span>Haptic feedback</span><Toggle on={notifications.hapticsEnabled !== false} onClick={() => updateNotifications({ hapticsEnabled: notifications.hapticsEnabled === false })} /></div>
        {pushSupported() && (
          <>
            <div className="between">
              <div><span>Browser push</span><div className="muted" style={{ fontSize: 12 }}>Reminders & good mornings, even when closed</div></div>
              <Toggle
                on={!!notifications.pushEnabled}
                onClick={async () => {
                  if (notifications.pushEnabled) {
                    await disablePush();
                    updateNotifications({ pushEnabled: false });
                    toast("Push turned off", "🔕");
                    return;
                  }
                  const res = await enablePush();
                  if (res.ok) {
                    updateNotifications({ pushEnabled: true });
                    toast(res.mode === "push" ? "Push on — see you each morning! 🌅" : "Notifications allowed 🔔", "🐢");
                  } else {
                    toast(res.mode === "denied" ? "Allow notifications in your browser first" : "Push isn't available here", "🔔");
                  }
                }}
              />
            </div>
            {notifications.pushEnabled && notificationPermission() !== "granted" && (
              <span className="muted" style={{ fontSize: 12 }}>⚠️ Notification permission revoked — re-allow it for push to work.</span>
            )}
            {notifications.pushEnabled && notificationPermission() === "granted" && !import.meta.env.VITE_VAPID_PUBLIC_KEY && (
              <span className="muted" style={{ fontSize: 12 }}>Closed-app push needs server setup (see docs/17); in-app reminders work now.</span>
            )}
          </>
        )}
      </Card>

      <Card className="stack">
        <h3 style={{ margin: 0 }}>Comfort & focus 🌿</h3>
        <span className="muted" style={{ fontSize: 13 }}>Make TurtWatch calmer and easier to focus with. Nothing here changes your turtles.</span>
        <div className="between">
          <div><span>Calm mode</span><div className="muted" style={{ fontSize: 12 }}>Low stimulation: less motion, no confetti, solid surfaces</div></div>
          <Toggle on={prefs.calmMode} onClick={() => updatePrefs({ calmMode: !prefs.calmMode })} />
        </div>
        {!prefs.calmMode && (
          <>
            <div className="between"><span>Reduce motion</span><Toggle on={prefs.reduceMotion} onClick={() => updatePrefs({ reduceMotion: !prefs.reduceMotion })} /></div>
            <div className="between"><span>Reduce transparency</span><Toggle on={prefs.reduceTransparency} onClick={() => updatePrefs({ reduceTransparency: !prefs.reduceTransparency })} /></div>
          </>
        )}
        <div className="between"><span>Higher contrast</span><Toggle on={prefs.highContrast} onClick={() => updatePrefs({ highContrast: !prefs.highContrast })} /></div>
        <div className="between"><span>Larger text</span><Toggle on={prefs.largeText} onClick={() => updatePrefs({ largeText: !prefs.largeText })} /></div>
        <div className="between">
          <div><span>Focus mode</span><div className="muted" style={{ fontSize: 12 }}>Home shows only the next action + today's checklist</div></div>
          <Toggle on={prefs.focusMode} onClick={() => updatePrefs({ focusMode: !prefs.focusMode })} />
        </div>
        <div className="between">
          <div><span>Gentle streak</span><div className="muted" style={{ fontSize: 12 }}>Softer, no-pressure framing — showing up is what counts</div></div>
          <Toggle on={prefs.gentleStreak} onClick={() => updatePrefs({ gentleStreak: !prefs.gentleStreak })} />
        </div>
        <div className="between">
          <div><span>Surprise bonuses</span><div className="muted" style={{ fontSize: 12 }}>Random lucky/zen rewards. Off = steady, predictable rewards</div></div>
          <Toggle on={prefs.surpriseBonuses !== false} onClick={() => updatePrefs({ surpriseBonuses: prefs.surpriseBonuses === false })} />
        </div>
        <div className="between">
          <div><span>Break reminders</span><div className="muted" style={{ fontSize: 12 }}>A gentle "take a break?" after long play/focus sessions</div></div>
          <Toggle on={prefs.breakNudges !== false} onClick={() => updatePrefs({ breakNudges: prefs.breakNudges === false })} />
        </div>
      </Card>

      <Card className="stack">
        <h3 style={{ margin: 0 }}>Data & privacy</h3>
        <span className="muted" style={{ fontSize: 13 }}>Your turtles live on this device. Export a backup any time{isCloudMode() ? "" : ", or restore one"}.</span>
        <PillButton variant="secondary" onClick={doExport}>📤 Export my diary (JSON)</PillButton>
        {!isCloudMode() && (
          <>
            <PillButton variant="secondary" onClick={() => importRef.current?.click()}>📥 Import a backup</PillButton>
            <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={onImportFile} />
          </>
        )}
        <PillButton variant="danger" onClick={() => setConfirmReset(true)}>🗑️ Reset everything</PillButton>
      </Card>

      <p className="muted center" style={{ fontSize: 12 }}>TurtWatch · a cozy turtle diary 🐢</p>

      <ConfirmModal
        open={confirmReset}
        emoji="😮"
        title="Reset all data?"
        confirmLabel="Yes, start fresh"
        danger
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => { reset(); toast("Fresh pond! 🌿", "🐢"); nav("/onboarding"); }}
      >
        <p className="center muted" style={{ margin: 0 }}>This deletes every turtle, your streak, and your Turtbux. Cannot be undone.</p>
      </ConfirmModal>

      <ConfirmModal
        open={!!pendingImport}
        emoji="📥"
        title="Restore this backup?"
        confirmLabel="Replace & restore"
        onCancel={() => setPendingImport(null)}
        onConfirm={() => {
          if (pendingImport) hydrateState(pendingImport);
          setPendingImport(null);
          toast("Backup restored! 🐢", "✨");
          nav("/");
        }}
      >
        <p className="center muted" style={{ margin: 0 }}>
          This replaces everything on this device — {pendingImport ? Object.keys(pendingImport.entries).length : 0} turtle{pendingImport && Object.keys(pendingImport.entries).length === 1 ? "" : "s"} from the backup will take over.
        </p>
      </ConfirmModal>
    </div>
  );
}
