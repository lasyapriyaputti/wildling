import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context.js';
import { useObjectUrl } from '../hooks.js';
import { rankResults } from '../lib/rank.js';
import { MIN_COUNT_SCORE } from '../lib/stats.js';
import { saveObservation } from '../lib/collection.js';
import SpeciesInfo from './SpeciesInfo.jsx';
import ShareButton from './ShareButton.jsx';

export default function Result({ blob, onRetake, onDone }) {
  const { model, species } = useApp();
  const url = useObjectUrl(blob);
  const [state, setState] = useState({ phase: 'working', ms: null, error: null, probs: null });
  const [pick, setPick] = useState(0);
  const [saved, setSaved] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (model.status === 'loading') { setState({ phase: 'waiting' }); return; }
      if (!model.engine) { setState({ phase: 'error', error: 'The AI model is not available.' }); return; }
      try {
        setState({ phase: 'working' });
        const bmp = await createImageBitmap(blob);
        const { probs, ms } = await model.engine.identify(bmp);
        if (alive) setState({ phase: 'done', probs, ms });
      } catch (e) { if (alive) setState({ phase: 'error', error: e.message }); }
    })();
    return () => { alive = false; };
  }, [blob, model.status]);

  const ranked = useMemo(() => (state.probs ? rankResults(state.probs, species.list) : null), [state.probs, species]);
  const chosen = ranked && pick >= 0 ? ranked.top[pick] : null;

  async function save(candidate) {
    setSaving(true);
    const r = await saveObservation({ blob, candidate, engine: model.engine, alternatives: ranked?.top });
    setSaving(false);
    setSaved({ ...r, candidate });
  }

  if (saved) return <Saved saved={saved} blob={blob} onDone={onDone} />;

  return (
    <div className="overlay sheet">
      <div className="sheet-head">
        <button className="link" onClick={onRetake}>← Retake</button>
        <b>What did you find?</b>
        <span />
      </div>
      <div className="sheet-body">
        {url && <img className="hero-img" src={url} alt="Your photo" />}
        {(state.phase === 'working' || state.phase === 'waiting') && (
          <div className="card center"><div className="spinner" />
            <p>{state.phase === 'waiting' ? 'Waiting for the AI model to finish loading…' : 'Identifying on your device…'}</p>
            <p className="muted small">No photo leaves your phone.</p>
          </div>
        )}
        {state.phase === 'error' && <div className="card bad">Identification failed: {state.error}</div>}
        {ranked && (
          <>
            {model.engine.demo && <div className="banner warn">DEMO: random result, not a real identification.</div>}
            <div className={'card verdict ' + ranked.tier.id}>
              <div className="verdict-label">{ranked.tier.label}</div>
              <p className="muted small">
                This is an AI suggestion, not a confirmed identification. Check the details below against what you can see.
                {state.ms != null && ` (${state.ms} ms on this device)`}
              </p>
              {ranked.tier.id === 'unsure' && (
                <p>The model isn’t sure. The organism may not be in this app’s species list. Try a closer, sharper photo of a distinctive part (flower, wing, cap, head).</p>
              )}
              {ranked.genusHint && (
                <p>It leans towards the genus <i>{ranked.genusHint.name}</i> but can’t separate the species.</p>
              )}
            </div>
            <div className="card">
              <b>Possible matches</b>
              <ul className="cands">
                {ranked.top.map((c, i) => (
                  <li key={c.species.id}>
                    <label className={pick === i ? 'sel' : ''}>
                      <input type="radio" name="cand" checked={pick === i} onChange={() => setPick(i)} />
                      <span className="cand-name">{c.species.common}<i>{c.species.sci}</i></span>
                      <span className="bar"><span style={{ width: `${Math.max(2, c.score * 100)}%` }} /></span>
                      <span className="pct">{Math.round(c.score * 100)}%</span>
                    </label>
                  </li>
                ))}
              </ul>
              <p className="muted small">Percentages compare only the species in this app’s list.</p>
            </div>
            {chosen && <SpeciesInfo s={chosen.species} />}
            {chosen && chosen.score < MIN_COUNT_SCORE && (
              <p className="muted small">Confidence is low, so this entry will be saved but won’t count toward streaks or badges.</p>
            )}
          </>
        )}
      </div>
      {ranked && (
        <div className="sheet-foot">
          <button className="btn primary" disabled={saving || !chosen} onClick={() => save(chosen)}>
            {saving ? 'Saving…' : `Save “${chosen?.species.common}” to my collection`}
          </button>
          <button className="btn ghost" disabled={saving} onClick={() => save(null)}>Save as unidentified</button>
        </div>
      )}
    </div>
  );
}

function Saved({ saved, blob, onDone }) {
  const { stats, title } = useApp();
  const sp = saved.candidate?.species;
  return (
    <div className="overlay sheet">
      <div className="sheet-body center pad">
        <div className="big-emoji">{saved.counts ? '🎉' : '📌'}</div>
        <h2>{sp ? sp.common : 'Saved'}</h2>
        {saved.firstInCollection && <span className="chip gold">✨ First in your collection</span>}
        {!saved.counts && <p className="muted">Saved, but it didn’t count toward streaks or badges (unidentified or low confidence).</p>}
        {saved.counts && (
          <p>
            Streak: <b>{saved.stats.streak.current}</b> day{saved.stats.streak.current === 1 ? '' : 's'} ·
            Species: <b>{saved.stats.distinctSpecies}</b>
          </p>
        )}
        {saved.newBadges.map((b) => (
          <div className="card badge-new" key={b.id}>
            <div className="big-emoji">{b.emoji}</div>
            <b>New badge: {b.name}</b>
            <p className="muted small">{b.desc}</p>
            <ShareButton kind="badge" badge={b} photoBlob={blob} species={sp} />
          </div>
        ))}
        {saved.counts && !saved.newBadges.length && sp && (
          <ShareButton kind="find" photoBlob={blob} species={sp} label="Share this find" />
        )}
        <p className="nudge">Now put your phone away. What else is living within ten steps of you?</p>
        <button className="btn primary" onClick={() => onDone(null)}>Back outside</button>
        <button className="btn ghost" onClick={() => onDone('collection')}>See my collection</button>
      </div>
    </div>
  );
}
