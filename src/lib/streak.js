import { dayNum } from './dates.js';

export const MILESTONES = [3, 7, 14, 30, 60, 100];

/**
 * @param {string[]} dayKeys  local days (YYYY-MM-DD) that have at least one qualifying observation
 * @param {string} todayKey   today's local day key
 * A streak stays alive until the end of the day after your last observation, so you have the
 * whole of today to keep it going.
 */
export function computeStreaks(dayKeys, todayKey) {
  const nums = [...new Set(dayKeys.map(dayNum))].sort((a, b) => a - b);
  if (!nums.length) {
    return { current: 0, longest: 0, activeToday: false, atRisk: false, lastDay: null, nextMilestone: MILESTONES[0] };
  }
  let longest = 1, run = 1;
  for (let i = 1; i < nums.length; i++) {
    run = nums[i] === nums[i - 1] + 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }
  const today = dayNum(todayKey);
  const last = nums[nums.length - 1];
  let current = 0;
  if (last >= today - 1) {
    current = 1;
    for (let i = nums.length - 1; i > 0 && nums[i] === nums[i - 1] + 1; i--) current++;
  }
  const activeToday = last >= today;
  return {
    current,
    longest,
    activeToday,
    atRisk: current > 0 && !activeToday,
    lastDay: last,
    nextMilestone: MILESTONES.find((m) => m > current) ?? null
  };
}
