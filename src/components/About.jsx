import React, { useEffect, useState } from 'react';
import { useApp } from '../context.js';
import { getSetting, setSetting } from '../lib/db.js';
import { wipeAll } from '../lib/collection.js';

export default function About() {
  const { model, online } = useApp();
  const [loc, setLoc] = useState(false);
  useEffect(() => { getSetting('useLocation', false).then(setLoc); }, []);
  const ready = model.status === 'ready';
  const meta = model.engine?.meta;

  const rows = [
    ['Camera capture', 'Offline', true],
    ['Identification', ready ? 'Offline (model cached on this device)' : 'Offline once the model has downloaded', ready],
    ['Species info, conservation status', 'Offline (bundled)', true],
    ['Collection, streaks, badges', 'Offline (stored on this device)', true],
    ['Achievement cards', 'Offline', true],
    ['“Read more” Wikipedia links', 'Needs internet', false],
    ['Community photos of the same species', 'Needs internet (planned, not in v1)', false]
  ];

  return (
    <div className="stack">
      <h2>About Wildling</h2>
      <section className="card">
        <b>Why open AI?</b>
        <ul className="plain">
          <li><b>Offline:</b> the model runs in your browser, so it works on a trail with no signal.</li>
          <li><b>Private:</b> photos are identified and stored on your device. There is no server and no account.</li>
          <li><b>Free to run:</b> no per-photo API fee.</li>
          <li><b>Swappable:</b> any compatible ONNX image encoder can replace the default model.</li>
        </ul>
      </section>

      <section className="card">
        <b>Model</b>
        <p>{model.engine?.name || '…'} {model.engine?.demo && <span className="tag demo">DEMO</span>}</p>
        {meta && <p className="muted small">Backend: {model.engine.backend} · input {meta.image_size}px · quantization: {meta.quantization} · <a href={meta.source} target="_blank" rel="noreferrer">model card</a><br />{meta.license}</p>}
        <p className="muted small">Identification is a suggestion, never a confirmed ID. It only knows the species bundled in this app, and accuracy varies by group (fungi and insects are hardest). Never eat anything based on this app.</p>
      </section>

      <section className="card">
        <b>What works offline?</b> <span className={'pill ' + (online ? 'on' : 'off')}>{online ? 'online now' : 'offline now'}</span>
        <table className="offline">
          <tbody>{rows.map(([f, s, ok]) => <tr key={f}><td>{f}</td><td className={ok ? 'ok' : 'net'}>{ok ? '✓' : '🌐'} {s}</td></tr>)}</tbody>
        </table>
      </section>

      <section className="card">
        <label className="toggle">
          <input type="checkbox" checked={loc} onChange={async (e) => { setLoc(e.target.checked); await setSetting('useLocation', e.target.checked); }} />
          <span>Save approximate location with observations (optional, stored only on this device, rounded to ~100 m)</span>
        </label>
      </section>

      <section className="card">
        <b>Your data</b>
        <p className="muted small">Everything is stored locally in your browser. Clearing it cannot be undone.</p>
        <button className="btn danger" onClick={async () => { if (confirm('Delete ALL observations, streaks and badges from this device?')) { await wipeAll(); } }}>Delete all my data</button>
      </section>
      <p className="muted small center">Wildling is open source. Built for the Hacktoberfest 2026 “Touch Grass” challenge.</p>
    </div>
  );
}
