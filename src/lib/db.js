import Dexie from 'dexie';

/** Everything lives in IndexedDB on the user's device. Nothing is uploaded anywhere. */
export const db = new Dexie('wildling');
db.version(1).stores({
  observations: '++id, speciesId, dayKey, category, createdAt',
  photos: 'obsId',
  badges: 'id',
  settings: 'key'
});

export async function getSetting(key, fallback) {
  const row = await db.settings.get(key);
  return row ? row.value : fallback;
}
export const setSetting = (key, value) => db.settings.put({ key, value });
