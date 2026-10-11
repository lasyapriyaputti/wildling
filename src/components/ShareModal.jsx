import React, { useEffect, useState } from 'react';
import { renderShareCard, shareOrDownload } from '../lib/share.js';
import { useObjectUrl } from '../hooks.js';

export default function ShareModal({ card, filename, text, onClose }) {
  const [blob, setBlob] = useState(null);
  const [msg, setMsg] = useState('');
  const url = useObjectUrl(blob);
  useEffect(() => { renderShareCard(card).then(setBlob); }, []);
  return (
    <div className="overlay modal" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {url ? <img className="share-preview" src={url} alt="Achievement card preview" /> : <div className="spinner" />}
        <div className="row">
          <button className="btn primary" disabled={!blob} onClick={async () => setMsg(await shareOrDownload(blob, filename, text))}>
            Share / Save image
          </button>
          <button className="btn ghost" onClick={onClose}>Close</button>
        </div>
        <p className="muted small">{msg === 'downloaded' ? 'Saved to your downloads. Post it anywhere.' : 'Works offline. Shares to Instagram, WhatsApp and more where your device supports it.'}</p>
      </div>
    </div>
  );
}
