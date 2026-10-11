export const pad = (n) => String(n).padStart(2, '0');
/** Local calendar day, e.g. "2026-10-10". Streaks follow the user's own midnight. */
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const monthKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
export function dayNum(key) {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}
export const daysInMonth = (year, month0) => new Date(year, month0 + 1, 0).getDate();
