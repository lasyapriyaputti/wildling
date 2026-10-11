import { db, getSetting } from './db.js';
import { dayKey } from './dates.js';
import { buildStats, MIN_COUNT_SCORE } from './stats.js';
import { evaluateBadges, BADGE_BY_ID } from './badges.js';

async function makeThumb(blob, max = 480) {
  const bmp = await createImageBitmap(blob);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return new Promise((r) => c.toBlob(r, 'image/jpeg', 0.8));
}

function getCoarseLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: +p.coords.latitude.toFixed(3), lng: +p.coords.longitude.toFixed(3) }), // ~100 m, on purpose
      () => resolve(null),
      { timeout: 4000, maximumAge: 600000 }
    );
  });
}

/**
 * Saves a reviewed observation and returns { id, firstInCollection, counts, newBadges, stats }.
 * `candidate` is {species, score} chosen by the user, or null to save as unidentified.
 */
export async function saveObservation({ blob, candidate, engine, alternatives }) {
  const [thumb, locEnabled] = await Promise.all([makeThumb(blob), getSetting('useLocation', false)]);
  const loc = locEnabled ? await getCoarseLocation() : null;
  const now = new Date();
  const sp = candidate?.species || null;
  const counts = !!sp && candidate.score >= MIN_COUNT_SCORE;
  const prior = sp ? await db.observations.where('speciesId').equals(sp.id).filter((o) => o.counts).count() : 0;
  const obs = {
    createdAt: now.getTime(),
    dayKey: dayKey(now),
    speciesId: sp?.id ?? null,
    sci: sp?.sci ?? null,
    common: sp?.common ?? 'Unidentified',
    category: sp?.category ?? 'other',
    iucn: sp?.iucn ?? null,
    score: candidate?.score ?? 0,
    counts,
    firstInCollection: counts && prior === 0,
    alternatives: (alternatives || []).slice(0, 5).map((a) => ({ id: a.species.id, score: +a.score.toFixed(4) })),
    modelId: engine.id,
    demo: !!engine.demo,
    lat: loc?.lat ?? null,
    lng: loc?.lng ?? null,
    thumb
  };
  const id = await db.observations.add(obs);
  await db.photos.put({ obsId: id, blob });

  const stats = buildStats(await db.observations.toArray(), dayKey(now));
  const earned = new Set((await db.badges.toArray()).map((b) => b.id));
  const newIds = evaluateBadges(stats).filter((b) => !earned.has(b));
  for (const b of newIds) await db.badges.put({ id: b, earnedAt: now.getTime(), obsId: id });
  return { id, firstInCollection: obs.firstInCollection, counts, newBadges: newIds.map((b) => BADGE_BY_ID[b]), stats };
}

export async function deleteObservation(id) {
  await db.observations.delete(id);
  await db.photos.delete(id);
}

export async function wipeAll() {
  await Promise.all([db.observations.clear(), db.photos.clear(), db.badges.clear()]);
}
