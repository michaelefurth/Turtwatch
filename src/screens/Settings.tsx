import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { useFeedback } from "@/components/feedback";
import { Mascot } from "@/components/Mascot";
import { Card, PillButton } from "@/components/common";
import { ConfirmModal } from "@/components/ConfirmModal";
import { THEMES } from "@/data/shopItems";
import { exportState } from "@/store/persistence";
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
  const reset = useStore((s) => s.reset);
  const [confirmReset, setConfirmReset] = useState(false);

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
        <button className="chip outline" onClick={() => nav(-1)}>‹ Back</button>
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
        <h3 style={{ margin: 0 }}>Data & privacy</h3>
        <span className="muted" style={{ fontSize: 13 }}>Your turtles live on this device. Export a backup any time.</span>
        <PillButton variant="secondary" onClick={doExport}>📤 Export my diary (JSON)</PillButton>
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
    </div>
  );
}
