const MS_DAY = 86_400_000;

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + diff);
  return d;
}

export function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function isInWeek(iso: string, ref: Date): boolean {
  const t = new Date(iso).getTime();
  return t >= startOfWeek(ref).getTime() && t <= endOfWeek(ref).getTime();
}

export function weekRangeLabel(ref: Date): string {
  const start = startOfWeek(ref);
  const end = endOfWeek(ref);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function last7DayKeys(ref: Date): string[] {
  const keys: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(ref);
    d.setDate(d.getDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

export function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

export function formatLogTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatLogDay(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (dayKey(iso) === dayKey(today.toISOString())) return "Today";
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return "Yesterday";
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function hoursSince(iso: string, ref = new Date()): number {
  const ms = ref.getTime() - new Date(iso).getTime();
  return Math.max(0, Math.round(ms / 3_600_000));
}

export { MS_DAY };
