/** Turn a probability vector over the species list into UI-ready, honestly worded results. */

// Tune these with tools/evaluate.py (confidence-calibration table). Zero-shot scores over a closed
// list tend to be over-confident, so wording stays cautious.
export const LIKELY = 0.6;
export const POSSIBLE = 0.25;

export function tierFor(score) {
  if (score >= LIKELY) return { id: 'likely', label: 'Likely match' };
  if (score >= POSSIBLE) return { id: 'possible', label: 'Possible match' };
  return { id: 'unsure', label: 'Not sure' };
}

export function rankResults(probs, speciesList, k = 5) {
  const idx = Array.from(probs.keys()).sort((a, b) => probs[b] - probs[a]).slice(0, k);
  const top = idx.map((i) => ({ species: speciesList[i], score: probs[i] }));
  // Genus-level fallback: if one genus holds most of the probability mass but no species stands
  // out, say so instead of guessing a species.
  const g = new Map();
  for (let i = 0; i < probs.length; i++) {
    const key = speciesList[i].genus;
    g.set(key, (g.get(key) || 0) + probs[i]);
  }
  let genus = null;
  for (const [name, score] of g) if (!genus || score > genus.score) genus = { name, score };
  const tier = tierFor(top[0].score);
  const genusHint = tier.id !== 'likely' && genus.score >= 0.5 && top.filter((t) => t.species.genus === genus.name).length >= 2 ? genus : null;
  return { top, tier, genusHint };
}
