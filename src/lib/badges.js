import { MONTHLY_GOAL } from './stats.js';

/**
 * Badges reward diversity and consistency, never raw photo counts.
 * "First Discoverer" means first in YOUR collection on this device. It does not claim the species
 * is new to science or to the world.
 */
export const BADGES = [
  { id: 'first_discoverer', emoji: '🌱', name: 'First Discoverer', group: 'Collection',
    desc: 'Recorded your first species. Your collection has begun.',
    check: (s) => s.distinctSpecies >= 1 },
  { id: 'collector_10', emoji: '🧺', name: 'Species Collector I', group: 'Collection',
    desc: '10 different species in your collection.', check: (s) => s.distinctSpecies >= 10 },
  { id: 'collector_25', emoji: '🧺', name: 'Species Collector II', group: 'Collection',
    desc: '25 different species in your collection.', check: (s) => s.distinctSpecies >= 25 },
  { id: 'collector_50', emoji: '🧺', name: 'Species Collector III', group: 'Collection',
    desc: '50 different species in your collection.', check: (s) => s.distinctSpecies >= 50 },
  { id: 'streak_7', emoji: '🔥', name: 'Streak Master: 7 days', group: 'Streaks',
    desc: 'Explored outdoors 7 days in a row.', check: (s) => s.streak.longest >= 7 },
  { id: 'streak_30', emoji: '🔥', name: 'Streak Master: 30 days', group: 'Streaks',
    desc: 'Explored outdoors 30 days in a row.', check: (s) => s.streak.longest >= 30 },
  { id: 'monthly_explorer', emoji: '🗓️', name: 'Monthly Explorer', group: 'Streaks',
    desc: `Found ${MONTHLY_GOAL} different species in one calendar month.`,
    check: (s) => s.bestMonthSpecies >= MONTHLY_GOAL },
  { id: 'king_of_exploration', emoji: '👑', name: 'King of Exploration', group: 'Legends',
    desc: '25+ distinct species and a 7-day streak. Variety and consistency.',
    check: (s) => s.distinctSpecies >= 25 && s.streak.longest >= 7 },
  { id: 'rare_life', emoji: '💎', name: 'Rare Life Discoverer', group: 'Legends',
    desc: 'A confident match of a species with a documented conservation concern (Vulnerable or worse). This is global status, not local scarcity.',
    check: (s) => s.rare },
  { id: 'bird_watcher', emoji: '🐦', name: 'Bird Watcher', group: 'Categories',
    desc: '5 different bird species.', check: (s) => s.byCategory.bird >= 5 },
  { id: 'plant_pal', emoji: '🌿', name: 'Plant Pal', group: 'Categories',
    desc: '5 different plant species.', check: (s) => s.byCategory.plant >= 5 },
  { id: 'bug_buddy', emoji: '🦋', name: 'Bug Buddy', group: 'Categories',
    desc: '5 different insect species.', check: (s) => s.byCategory.insect >= 5 },
  { id: 'fungi_finder', emoji: '🍄', name: 'Fungi Finder', group: 'Categories',
    desc: '3 different fungi (look, photograph, never eat).', check: (s) => s.byCategory.fungus >= 3 },
  { id: 'all_rounder', emoji: '🧭', name: 'All-Rounder', group: 'Categories',
    desc: 'At least one bird, plant, insect and fungus.',
    check: (s) => ['bird', 'plant', 'insect', 'fungus'].every((c) => s.byCategory[c] >= 1) }
];

export const BADGE_BY_ID = Object.fromEntries(BADGES.map((b) => [b.id, b]));

export const evaluateBadges = (stats) => BADGES.filter((b) => b.check(stats)).map((b) => b.id);

/** Highest title earned, shown on the home screen and share cards. */
export function currentTitle(earnedIds, stats) {
  const has = (id) => earnedIds.includes(id);
  if (has('king_of_exploration')) return { name: 'King of Exploration', emoji: '👑' };
  if (has('streak_30')) return { name: 'Streak Master', emoji: '🔥' };
  if (has('collector_50')) return { name: 'Master Collector', emoji: '🧺' };
  if (has('collector_25')) return { name: 'Field Naturalist', emoji: '🔭' };
  if (has('collector_10') || has('streak_7')) return { name: 'Trail Regular', emoji: '🥾' };
  if (stats.distinctSpecies >= 1) return { name: 'Sprout', emoji: '🌱' };
  return { name: 'Newcomer', emoji: '👣' };
}
