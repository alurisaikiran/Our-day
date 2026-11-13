export const TZ = process.env.APP_TIMEZONE || 'America/New_York';

/** 'YYYY-MM-DD' for today in the app's time zone. */
export function today(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

/** 'HH:MM' right now in the app's time zone. */
export function nowHM(): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
  return parts.replace(/^24/, '00');
}

export function addDays(day: string, n: number): string {
  const d = new Date(day + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function isDay(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/** '07:40' → '7:40 AM' */
export function fmtTime(t?: string | null): string {
  if (!t || !/^\d{1,2}:\d{2}/.test(t)) return '';
  const [hs, m] = t.split(':');
  const h = Number(hs);
  return `${h % 12 || 12}:${m.slice(0, 2)} ${h >= 12 ? 'PM' : 'AM'}`;
}

export function fmtDay(day: string, opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }): string {
  return new Intl.DateTimeFormat('en-US', { ...opts, timeZone: 'UTC' }).format(new Date(day + 'T12:00:00Z'));
}

export function fmtStamp(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat('en-US', { timeZone: TZ, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}

/** Minutes between two 'HH:MM' times, wrapping past midnight. */
export function minutesBetween(from: string, to: string): number {
  const [fh, fm] = from.split(':').map(Number);
  const [th, tm] = to.split(':').map(Number);
  let diff = th * 60 + tm - (fh * 60 + fm);
  if (diff <= 0) diff += 24 * 60;
  return diff;
}

export function fmtDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? (m ? `${h} h ${m} m` : `${h} h`) : `${m} m`;
}
