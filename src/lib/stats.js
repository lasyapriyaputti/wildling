import { computeStreaks } from './streak.js';

/** A saved observation only counts toward streaks/badges when the user picked a candidate with at
 *  least this model score. Low-confidence saves are kept in the collection but don't count. */
export const MIN_COUNT_SCORE = 0.15;
/** A "rare life" badge needs a confident match AND a documented conservation concern. */
export const RARE_MIN_SCORE = 0.5;
export const RARE_STATUSES = ['VU', 'EN', 'CR', 'EW'];
export const MONTHLY_GOAL = 10;
export const CATEGORIES = ['bird', 'plant', 'insect', 'fungus', 'other'];

export function buildStats(observations, todayKey) {
  const counted = observations.filter((o) => o.counts);
  const species = new Map();
  const months = new Map(); // monthKey -> Set(speciesId)
  let rare = false;
  for (const o of counted) {
    if (!species.has(o.speciesId)) species.set(o.speciesId, { category: o.category, first: o.dayKey });
    const mk = o.dayKey.slice(0, 7);
    if (!months.has(mk)) months.set(mk, new Set());
    months.get(mk).add(o.speciesId);
    if (RARE_STATUSES.includes(o.iucn) && o.score >= RARE_MIN_SCORE) rare = true;
  }
  const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
  for (const s of species.values()) byCategory[s.category] = (byCategory[s.category] || 0) + 1;
  const streak = computeStreaks(counted.map((o) => o.dayKey), todayKey);
  const thisMonth = months.get(todayKey.slice(0, 7))?.size || 0;
  const bestMonth = Math.max(0, ...[...months.values()].map((s) => s.size));
  return {
    distinctSpecies: species.size,
    byCategory,
    streak,
    thisMonthSpecies: thisMonth,
    bestMonthSpecies: bestMonth,
    rare,
    totalObservations: observations.length,
    activeDays: new Set(counted.map((o) => o.dayKey))
  };
}
