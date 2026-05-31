// Pure local-date helpers. We key days by YYYY-MM-DD in the user's local time.
// Using date keys (not raw 24h math) keeps streaks correct across DST.

export function toKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(now: Date = new Date()): string {
  return toKey(now);
}

export function addDays(key: string, n: number): string {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

export function yesterdayKey(now: Date = new Date()): string {
  return addDays(toKey(now), -1);
}

/** Inclusive difference in days between two date keys (a - b). */
export function diffDays(a: string, b: string): number {
  const ms = fromKey(a).getTime() - fromKey(b).getTime();
  return Math.round(ms / 86_400_000);
}

export function isFuture(key: string, now: Date = new Date()): boolean {
  return diffDays(key, toKey(now)) > 0;
}

export function isPast(key: string, now: Date = new Date()): boolean {
  return diffDays(key, toKey(now)) < 0;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function monthLabel(year: number, month0: number): string {
  return `${MONTHS[month0]} ${year}`;
}

export function prettyDate(key: string): string {
  const d = fromKey(key);
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
  return `${wd}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** Days of a month as date keys, plus leading blanks for grid alignment. */
export function monthGrid(year: number, month0: number): (string | null)[] {
  const first = new Date(year, month0, 1);
  const startWeekday = first.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(toKey(new Date(year, month0, d)));
  return cells;
}
