import test from 'node:test';
import assert from 'node:assert/strict';
import { computeStreaks } from '../src/lib/streak.js';
import { buildStats } from '../src/lib/stats.js';
import { evaluateBadges, currentTitle } from '../src/lib/badges.js';
import { rankResults, tierFor } from '../src/lib/rank.js';

test('streak: empty', () => {
  const s = computeStreaks([], '2026-10-10');
  assert.equal(s.current, 0); assert.equal(s.longest, 0);
});

test('streak: consecutive days ending today', () => {
  const s = computeStreaks(['2026-10-08', '2026-10-09', '2026-10-10'], '2026-10-10');
  assert.equal(s.current, 3); assert.equal(s.longest, 3); assert.equal(s.activeToday, true);
  assert.equal(s.nextMilestone, 7);
});

test('streak: still alive if last day was yesterday, flagged at risk', () => {
  const s = computeStreaks(['2026-10-08', '2026-10-09'], '2026-10-10');
  assert.equal(s.current, 2); assert.equal(s.atRisk, true);
});

test('streak: broken after a missed day, longest preserved', () => {
  const s = computeStreaks(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-08'], '2026-10-10');
  assert.equal(s.current, 0); assert.equal(s.longest, 4);
});

test('streak: duplicates on the same day count once; month boundaries work', () => {
  const s = computeStreaks(['2026-09-30', '2026-09-30', '2026-10-01'], '2026-10-01');
  assert.equal(s.current, 2);
});

const obs = (i, speciesId, category, day, extra = {}) => ({
  id: i, speciesId, category, dayKey: day, counts: true, score: 0.8, iucn: null, ...extra
});

test('stats: only counted observations contribute; duplicates do not inflate species', () => {
  const list = [
    obs(1, 'A', 'bird', '2026-10-09'),
    obs(2, 'A', 'bird', '2026-10-10'),
    obs(3, 'B', 'plant', '2026-10-10', { counts: false })
  ];
  const s = buildStats(list, '2026-10-10');
  assert.equal(s.distinctSpecies, 1);
  assert.equal(s.byCategory.plant, 0);
  assert.equal(s.streak.current, 2);
});

test('badges: spamming one species earns no collector badge', () => {
  const list = Array.from({ length: 40 }, (_, i) => obs(i, 'A', 'bird', '2026-10-10'));
  const ids = evaluateBadges(buildStats(list, '2026-10-10'));
  assert.ok(ids.includes('first_discoverer'));
  assert.ok(!ids.includes('collector_10'));
});

test('badges: king of exploration needs variety AND consistency', () => {
  const list = [];
  for (let i = 0; i < 25; i++) list.push(obs(i, 'S' + i, 'plant', `2026-10-${String((i % 10) + 1).padStart(2, '0')}`));
  const s = buildStats(list, '2026-10-10');
  const ids = evaluateBadges(s);
  assert.ok(ids.includes('collector_25'));
  assert.ok(ids.includes('streak_7'));
  assert.ok(ids.includes('king_of_exploration'));
  assert.equal(currentTitle(ids, s).name, 'King of Exploration');
});

test('badges: rare life needs a confident match of a threatened species', () => {
  const low = buildStats([obs(1, 'G', 'bird', '2026-10-10', { iucn: 'VU', score: 0.3 })], '2026-10-10');
  const lc = buildStats([obs(1, 'G', 'bird', '2026-10-10', { iucn: 'LC', score: 0.9 })], '2026-10-10');
  const ok = buildStats([obs(1, 'G', 'bird', '2026-10-10', { iucn: 'EN', score: 0.9 })], '2026-10-10');
  assert.ok(!evaluateBadges(low).includes('rare_life'));
  assert.ok(!evaluateBadges(lc).includes('rare_life'));
  assert.ok(evaluateBadges(ok).includes('rare_life'));
});

test('rank: tiers and genus hint', () => {
  assert.equal(tierFor(0.9).id, 'likely');
  assert.equal(tierFor(0.3).id, 'possible');
  assert.equal(tierFor(0.05).id, 'unsure');
  const list = [{ genus: 'Ficus' }, { genus: 'Ficus' }, { genus: 'Pavo' }, { genus: 'Zea' }];
  const r = rankResults(Float32Array.from([0.3, 0.3, 0.2, 0.2]), list, 3);
  assert.equal(r.tier.id, 'possible');
  assert.equal(r.genusHint.name, 'Ficus');
});
