/**
 * Centralised IST (Asia/Kolkata) date/time formatters.
 *
 * Ehsaas Therapy Centre operates from India and every session, intro call,
 * interview, reminder etc. is scheduled in IST. Browser-default
 * `toLocaleDateString` / `toLocaleString` will format using the *user's*
 * timezone — meaning a client in another timezone could see a different
 * time for the same booking. Always go through these helpers so the
 * displayed time matches what was actually booked.
 */

const TZ = 'Asia/Kolkata';
const LOCALE = 'en-IN';

const safeDate = (input: Date | string | number | null | undefined): Date | null => {
  if (input == null) return null;
  const d = input instanceof Date ? input : new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Wed, 21 May 2026 */
export const formatDateIst = (input: Date | string | number | null | undefined, opts: Intl.DateTimeFormatOptions = {}): string => {
  const d = safeDate(input);
  if (!d) return '';
  return d.toLocaleDateString(LOCALE, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ, ...opts });
};

/** 2:30 PM IST */
export const formatTimeIst = (input: Date | string | number | null | undefined, opts: Intl.DateTimeFormatOptions = {}): string => {
  const d = safeDate(input);
  if (!d) return '';
  return d.toLocaleTimeString(LOCALE, { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TZ, ...opts }) + ' IST';
};

/** Wed, 21 May 2026 · 2:30 PM IST */
export const formatDateTimeIst = (input: Date | string | number | null | undefined): string => {
  const d = safeDate(input);
  if (!d) return '';
  return `${formatDateIst(d)} · ${formatTimeIst(d)}`;
};

/** Today's calendar date in IST as YYYY-MM-DD (for <input type="date" min={…}>) */
export const todayIstISO = (): string => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date());
  const get = (t: string) => parts.find(p => p.type === t)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
};

/** Current HH:mm in IST (for filtering past slots in today's slot grid) */
export const currentHHMMIst = (): string => {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false })
    .formatToParts(new Date());
  const get = (t: string) => parts.find(p => p.type === t)?.value || '';
  return `${get('hour')}:${get('minute')}`;
};

/**
 * True if `time` (HH:mm) on `date` (YYYY-MM-DD) is in the past in IST.
 * Used to filter slots that are now unbookable in today's grid.
 */
export const isSlotPastIst = (date: string, time: string): boolean => {
  if (!date || !time) return false;
  const today = todayIstISO();
  if (date > today) return false;
  if (date < today) return true;
  return time <= currentHHMMIst();
};
