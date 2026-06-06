// Minimal real local notifications using the Web Notification API. The native
// build would use expo-notifications with scheduled triggers + push (see
// docs/06 + docs/08); this gives the web prototype an honest implementation.

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission(): NotificationPermission {
  return notificationsSupported() ? Notification.permission : "denied";
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return "denied";
  if (Notification.permission === "default") {
    try {
      return await Notification.requestPermission();
    } catch {
      return Notification.permission;
    }
  }
  return Notification.permission;
}

export function showLocalNotification(title: string, body: string): boolean {
  if (notificationsSupported() && Notification.permission === "granted") {
    try {
      new Notification(title, { body, icon: "/turtle.svg" });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/** "HH:mm" reminder time reached for today's local clock? */
export function reminderTimeReached(reminderTime: string, now: Date = new Date()): boolean {
  const [h, m] = reminderTime.split(":").map(Number);
  return now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m);
}
