/**
 * Server-side IST (Asia/Kolkata) helpers. Mirror the small subset of
 * src/lib/dateIst.ts that the API needs for filtering past slots and for
 * formatting human dates inside email templates.
 */

const TZ = 'Asia/Kolkata';

/** Today in IST as YYYY-MM-DD. */
export const todayIstISO = () => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date());
  const get = (t) => parts.find(p => p.type === t)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
};

/** Current HH:mm in IST. */
export const currentHHMMIst = () => {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false })
    .formatToParts(new Date());
  const get = (t) => parts.find(p => p.type === t)?.value || '';
  return `${get('hour')}:${get('minute')}`;
};

/**
 * True if HH:mm on YYYY-MM-DD is already in the past in IST.
 * Used to remove past slots from today's slot grid response.
 */
export const isSlotPastIst = (date, time) => {
  if (!date || !time) return false;
  const today = todayIstISO();
  if (date > today) return false;
  if (date < today) return true;
  return time <= currentHHMMIst();
};

/** "Wed, 21 May 2026" */
export const formatDateIst = (d) => {
  if (!d) return '';
  const x = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  return x.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ });
};

/** "2:30 PM IST" */
export const formatTimeIst = (d) => {
  if (!d) return '';
  const x = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  return x.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TZ }) + ' IST';
};

/** "Wed, 21 May 2026 · 2:30 PM IST" */
export const formatDateTimeIst = (d) => {
  const date = formatDateIst(d);
  const time = formatTimeIst(d);
  return date && time ? `${date} · ${time}` : (date || time);
};
