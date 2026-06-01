import { useEffect } from "react";
import { useStore } from "@/store/useStore";
import { todayKey } from "@/logic/dates";
import { computeStreak } from "@/logic/streak";
import { reminderTimeReached, showLocalNotification, notificationPermission } from "@/lib/notifications";

const REMINDER_COPY = [
  { title: "🐢 Turtle check-in!", body: "Your daily turtle is waiting. Snap one before bedtime?" },
  { title: "Pond's calling 🌿", body: "One photo keeps the streak alive. You've got this!" },
  { title: "Turtley misses you 🐢💚", body: "It's been a slow day in the pond. Got a turtle for me?" },
];
const streakRiskCopy = (n: number) => ({
  title: `🔥 Don't break your ${n}-day streak!`,
  body: "A quick turtle photo keeps it alive — just one before midnight!",
});

/**
 * Fires a local reminder at most once per day when permission is granted, the
 * reminder time has passed, and today isn't done. Honors the daily-reminder and
 * streak-risk toggles independently (streak-risk uses more urgent copy). Re-checks
 * on focus and on a 60s timer so a tab left open all evening still reminds you.
 */
export function useReminders() {
  useEffect(() => {
    const check = () => {
      const s = useStore.getState();
      const today = todayKey();
      if (notificationPermission() !== "granted") return;
      if (s.entries[today]) return; // already uploaded today
      if (s.lastReminderOn === today) return; // already reminded today
      if (!reminderTimeReached(s.notifications.reminderTime)) return;

      // urgent streak-risk copy when that toggle is on and a streak is on the line,
      // otherwise the gentle daily nudge. If neither toggle applies, stay quiet.
      const streak = computeStreak(s.entries).current;
      const atRisk = s.notifications.streakRiskEnabled && streak >= 1;
      const pick = atRisk
        ? streakRiskCopy(streak)
        : s.notifications.dailyReminderEnabled
          ? REMINDER_COPY[new Date().getDate() % REMINDER_COPY.length]
          : null;
      if (!pick) return;

      if (showLocalNotification(pick.title, pick.body)) {
        useStore.getState().markReminderFired();
      }
    };

    check();
    const onFocus = () => check();
    const timer = setInterval(check, 60_000); // catch the time passing while the tab stays open
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);
}
