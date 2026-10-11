import React, { useState } from 'react';
import { useApp } from '../context.js';
import { useObjectUrl } from '../hooks.js';
import { db } from '../lib/db.js';
import { deleteObservation } from '../lib/collection.js';
import { CAT_EMOJI, CAT_LABEL } from '../prompts.js';
import SpeciesInfo from './SpeciesInfo.jsx';
import ShareButton from './ShareButton.jsx';

export default function Collection() {
  const { observations, stats, species } = useApp();
  const [cat, setCat] = useState('all');
  const [open, setOpen] = useState(null);
  const list = observations.filter((o) => cat === 'all' || o.category === cat);

  return (
    <div className="stack">
      <h2>My collection</h2>
      <p className="muted">{stats.distinctSpecies} species · {stats.totalObservations} observations</p>
      <div className="chips">
        {['all', 'bird', 'plant', 'insect', 'fungus', 'other'].map((c) => (
          <button key={c} className={'chip' + (cat === c ? ' on' : '')} onClick={() => setCat(c)}>
            {c === 'all' ? 'All' : `${CAT_EMOJI[c]} ${CAT_LABEL[c]}`}
          </button>
        ))}
      </div>
      {!list.length && <div className="card center muted">Nothing here yet. Head outside and find something.</div>}
      <div className="grid-photos">{list.map((o) => <Tile key={o.id} o={o} onOpen={() => setOpen(o)} />)}</div>
      {open && <Detail o={open} sp={species.byId.get(open.speciesId)} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Tile({ o, onOpen }) {
  const url = useObjectUrl(o.thumb);
  return (
    <button className="tile" onClick={onOpen}>
      {url && <img src={url} alt={o.common} />}
      <span className="tile-label">{o.common}</span>
      {o.demo && <span className="tag demo">DEMO</span>}
      {!o.counts && <span className="tag">not counted</span>}
    </button>
  );
}

function Detail({ o, sp, onClose }) {
  const [photo, setPhoto] = useState(null);
  React.useEffect(() => { db.photos.get(o.id).then((r) => setPhoto(r?.blob || o.thumb)); }, [o.id]);
  const url = useObjectUrl(photo);
  return (
    <div className="overlay sheet">
      <div className="sheet-head"><button className="link" onClick={onClose}>← Back</button><b>{o.common}</b><span /></div>
      <div className="sheet-body">
        {url && <img className="hero-img" src={url} alt={o.common} />}
        <div className="card">
          <p><b>Seen:</b> {new Date(o.createdAt).toLocaleString()}</p>
          {o.lat != null && <p><b>Approx. location:</b> {o.lat}, {o.lng}</p>}
          <p><b>Model confidence:</b> {Math.round(o.score * 100)}% <span className="muted small">({o.demo ? 'DEMO, random' : o.modelId})</span></p>
          {o.firstInCollection && <span className="chip gold">✨ First in your collection</span>}
        </div>
        {sp && <SpeciesInfo s={sp} />}
        {sp && <ShareButton kind="find" species={sp} photoBlob={photo} label="Share this find" />}
        <button className="btn danger" onClick={async () => { if (confirm('Delete this observation?')) { await deleteObservation(o.id); onClose(); } }}>Delete observation</button>
      </div>
    </div>
  );
}
