/** Calendar helpers in Africa/Lagos (date-only, no wall-clock math). */

export const STUDIO_TZ = "Africa/Lagos";
export const AMBASSADOR_SEATS = 2;

export function todayInStudio(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: STUDIO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function startOfWeek(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
  const weekday = date.getUTCDay();
  const back = weekday === 0 ? 6 : weekday - 1;
  date.setUTCDate(date.getUTCDate() - back);
  return date.toISOString().slice(0, 10);
}

export function startOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

export function endOfMonth(iso: string): string {
  const [year, month] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month ?? 1, 0));
  return date.toISOString().slice(0, 10);
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function weekdayShort(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
  return date.toLocaleDateString("en-NG", { weekday: "short", timeZone: "UTC" });
}

export function monthLabel(iso: string): string {
  const [year, month] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, 1));
  return date.toLocaleDateString("en-NG", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function deltaPct(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export type DayPoint = {
  date: string;
  label: string;
  bookings: number;
  successful: number;
  revenue: number;
};

export function emptyRange(from: string, to: string): DayPoint[] {
  const points: DayPoint[] = [];
  let cursor = from;
  while (cursor <= to) {
    points.push({
      date: cursor,
      label: weekdayShort(cursor),
      bookings: 0,
      successful: 0,
      revenue: 0,
    });
    cursor = addDays(cursor, 1);
    if (points.length > 40) break;
  }
  return points;
}
