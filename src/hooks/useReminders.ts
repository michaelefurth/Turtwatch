import { useEffect } from "react";
import { useStore } from "@/store/useStore";
import { todayKey } from "@/logic/dates";
import { reminderTimeReached, showLocalNotification, notificationPermission } from "@/lib/notifications";

const REMINDER_COPY = [
  { title: "🐢 Turtle check-in!", body: "Your daily turtle is waiting. Snap one before bedtime?" },
  { title: "Pond's calling 🌿", body: "One photo keeps the streak alive. You've got this!" },
  { title: "Turtley misses you 🐢💚", body: "It's been a slow day in the pond. Got a turtle for me?" },
];

/**
 * Fires a local daily reminder at most once per day when: reminders are enabled,
 * permission is granted, the reminder time has passed, and today isn't done yet.
 * Re-checks on app focus so a tab left open still reminds you.
 */
export function useReminders() {
  useEffect(() => {
    const check = () => {
      const s = useStore.getState();
      const today = todayKey();
      if (!s.notifications.dailyReminderEnabled) return;
      if (notificationPermission() !== "granted") return;
      if (s.entries[today]) return; // already uploaded today
      if (s.lastReminderOn === today) return; // already reminded today
      if (!reminderTimeReached(s.notifications.reminderTime)) return;

      const pick = REMINDER_COPY[new Date().getDate() % REMINDER_COPY.length];
      if (showLocalNotification(pick.title, pick.body)) {
        useStore.getState().markReminderFired();
      }
    };

    check();
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);
}
