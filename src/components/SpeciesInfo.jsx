import React from 'react';
import { CAT_EMOJI, CAT_LABEL, IUCN_LABEL } from '../prompts.js';
import { useApp } from '../context.js';

/** Species card. Everything here is bundled data, so it works offline. */
export default function SpeciesInfo({ s }) {
  const { online } = useApp();
  return (
    <div className="card species">
      <div className="sp-head">
        <div>
          <h3>{s.common}</h3>
          <div className="sci">{s.sci}</div>
        </div>
        <span className="chip">{CAT_EMOJI[s.category]} {CAT_LABEL[s.category]}</span>
      </div>
      {s.desc && <p>{s.desc}</p>}
      {s.facts?.map((f, i) => <p key={i} className="fact">💡 {f}</p>)}
      {s.habitat && <p><b>Habitat:</b> {s.habitat}</p>}
      <p>
        <b>Conservation status:</b>{' '}
        {s.iucn ? <span className={'iucn ' + s.iucn}>{IUCN_LABEL[s.iucn] || s.iucn} ({s.iucn})</span>
          : <span className="muted">Not in bundled data</span>}
      </p>
      {s.category === 'fungus' && (
        <p className="warn-box">⚠️ Never eat a wild mushroom based on a photo or an app. Even experts cannot reliably identify many species from images.</p>
      )}
      {s.desc_source && <p className="muted small">Description: {s.desc_source}</p>}
      {s.wiki && (online
        ? <a className="small" href={s.wiki} target="_blank" rel="noreferrer">Read more on Wikipedia ↗ (needs internet)</a>
        : <span className="muted small">Wikipedia link available when online</span>)}
    </div>
  );
}
