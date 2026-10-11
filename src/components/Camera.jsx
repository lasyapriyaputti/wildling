import React, { useEffect, useRef, useState } from 'react';

/**
 * Camera-only capture. There is intentionally NO <input type="file"> and no gallery picker.
 * Nothing can stop someone photographing a screen, but this removes the easy route of
 * collecting achievements from downloaded images.
 */
export default function Camera({ onClose, onCapture }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [facing, setFacing] = useState('environment');
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setReady(false); setError(null);
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setError('The camera needs a secure connection (HTTPS or localhost).');
        return;
      }
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false
        });
        if (cancelled) { s.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = s;
        videoRef.current.srcObject = s;
        await videoRef.current.play();
        setReady(true);
      } catch (e) {
        setError(e.name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow camera access in your browser settings to record discoveries.'
          : 'No usable camera was found on this device.');
      }
    })();
    return () => { cancelled = true; streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, [facing]);

  async function snap() {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const scale = Math.min(1, 1600 / Math.max(v.videoWidth, v.videoHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(v.videoWidth * scale);
    c.height = Math.round(v.videoHeight * scale);
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.9));
    onCapture(blob);
  }

  return (
    <div className="overlay camera">
      <video ref={videoRef} playsInline muted className="viewfinder" />
      {error && (
        <div className="cam-error">
          <p>{error}</p>
          <p className="muted">Wildling only accepts live camera photos, not saved images, so every entry is a real encounter.</p>
        </div>
      )}
      <div className="cam-top">
        <button className="round" onClick={onClose} aria-label="Close">✕</button>
        <span className="cam-hint">Get close. Fill the frame with one organism.</span>
        <button className="round" onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))} aria-label="Switch camera">🔄</button>
      </div>
      <div className="cam-bottom">
        <button className="shutter" disabled={!ready} onClick={snap} aria-label="Take photo" />
      </div>
    </div>
  );
}
