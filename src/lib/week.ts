const MS_DAY = 86_400_000;

/** UTC calendar date YYYY-MM-DD — matches X stats day boundaries */
export function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function startOfWeek(date: Date): Date {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

export function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  end.setUTCHours(23, 59, 59, 999);
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
    d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function last7DayKeys(ref: Date): string[] {
  const keys: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(
      Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate() - i),
    );
    keys.push(utcDayKey(d));
  }
  return keys;
}

/** Local time for journal display */
export function formatLogTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatLogDay(iso: string): string {
  const now = new Date();
  const yesterday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1),
  );

  if (dayKey(iso) === utcDayKey(now)) return "Today";
  if (dayKey(iso) === utcDayKey(yesterday)) return "Yesterday";

  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function hoursSince(iso: string, ref = new Date()): number {
  const ms = ref.getTime() - new Date(iso).getTime();
  return Math.max(0, Math.round(ms / 3_600_000));
}

export { MS_DAY };
