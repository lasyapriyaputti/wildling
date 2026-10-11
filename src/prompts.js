// Gentle nudges that point at the real world, not at the app. One per day, deterministic.
export const PROMPTS = [
  'Find something with six legs.',
  'Look up. What is perching or flying near you?',
  'Find a flower and look at it for a full minute before taking a photo.',
  'Find the oldest tree on your street.',
  'Find something growing in a crack in the pavement.',
  'Listen for a bird you cannot see, then go and find it.',
  'Look under a leaf (gently, then put it back).',
  'Find something yellow that is alive.',
  'Find a plant you walk past every day and never noticed.',
  'Look near water: ponds, drains and puddles all count.',
  'Find a different kind of grass from yesterday.',
  'Find something that is feeding on a flower.',
  'Find a living thing smaller than your thumbnail.',
  'Take the long way home and see who lives there.'
];
export const promptForDay = (key) => {
  const n = key.split('-').reduce((a, v) => a * 31 + Number(v), 7);
  return PROMPTS[Math.abs(n) % PROMPTS.length];
};
export const CAT_LABEL = { bird: 'Bird', plant: 'Plant', insect: 'Insect', fungus: 'Fungus', other: 'Other life' };
export const CAT_EMOJI = { bird: '🐦', plant: '🌿', insect: '🦋', fungus: '🍄', other: '🦎' };
export const IUCN_LABEL = {
  LC: 'Least Concern', NT: 'Near Threatened', VU: 'Vulnerable', EN: 'Endangered', CR: 'Critically Endangered',
  EW: 'Extinct in the Wild', DD: 'Data Deficient'
};
