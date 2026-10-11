const W = 1080, H = 1350;

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrap(ctx, text, x, y, maxW, lh, maxLines = 3) {
  const words = String(text).split(' ');
  let line = '', n = 0;
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) {
      ctx.fillText(line, x, y);
      y += lh; n++; line = w;
      if (n >= maxLines - 1) break;
    } else line = t;
  }
  ctx.fillText(line, x, y);
  return y + lh;
}

/** Draws a 1080x1350 (4:5) achievement card and returns a PNG Blob. Runs fully offline. */
export async function renderShareCard({ emoji, headline, sub, photoBlob, stats = [], note }) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#1d3b2a'); bg.addColorStop(1, '#0f2318');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  // soft sun
  const sun = g.createRadialGradient(W - 140, 120, 10, W - 140, 120, 420);
  sun.addColorStop(0, 'rgba(242,184,75,0.35)'); sun.addColorStop(1, 'rgba(242,184,75,0)');
  g.fillStyle = sun; g.fillRect(0, 0, W, H);

  g.fillStyle = '#f4f0e2'; g.textAlign = 'left';
  g.font = '700 44px Georgia, serif'; g.fillText('Wildling', 64, 96);
  g.font = '500 26px system-ui, sans-serif'; g.fillStyle = '#9fcf8f'; g.fillText('touch grass, find life', 64, 134);

  const px = 64, py = 180, pw = W - 128, ph = 620;
  g.save(); rr(g, px, py, pw, ph, 36); g.clip();
  if (photoBlob) {
    const bmp = await createImageBitmap(photoBlob);
    const s = Math.max(pw / bmp.width, ph / bmp.height);
    const dw = bmp.width * s, dh = bmp.height * s;
    g.drawImage(bmp, px + (pw - dw) / 2, py + (ph - dh) / 2, dw, dh);
    bmp.close();
  } else { g.fillStyle = '#2d5a3d'; g.fillRect(px, py, pw, ph); }
  g.restore();
  g.lineWidth = 6; g.strokeStyle = '#f4f0e2'; rr(g, px, py, pw, ph, 36); g.stroke();

  // emblem
  g.fillStyle = '#f2b84b'; g.beginPath(); g.arc(W / 2, py + ph, 78, 0, Math.PI * 2); g.fill();
  g.lineWidth = 8; g.strokeStyle = '#1d3b2a'; g.stroke();
  g.textAlign = 'center'; g.font = '84px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  g.fillStyle = '#1d3b2a'; g.fillText(emoji || '🌿', W / 2, py + ph + 30);

  g.fillStyle = '#f4f0e2'; g.font = '700 70px Georgia, serif';
  let y = wrap(g, headline, W / 2, 940, W - 160, 78, 2);
  if (sub) { g.fillStyle = '#9fcf8f'; g.font = 'italic 36px Georgia, serif'; y = wrap(g, sub, W / 2, y - 6, W - 160, 44, 2); }
  if (note) { g.fillStyle = 'rgba(244,240,226,0.8)'; g.font = '500 30px system-ui, sans-serif'; wrap(g, note, W / 2, y + 6, W - 200, 40, 2); }

  const n = stats.length;
  if (n) {
    const bw = 280, gap = 30, total = n * bw + (n - 1) * gap;
    stats.forEach((s, i) => {
      const x = (W - total) / 2 + i * (bw + gap), by = 1128;
      g.fillStyle = 'rgba(244,240,226,0.1)'; rr(g, x, by, bw, 120, 24); g.fill();
      g.fillStyle = '#f2b84b'; g.font = '700 54px Georgia, serif'; g.fillText(String(s.value), x + bw / 2, by + 64);
      g.fillStyle = '#f4f0e2'; g.font = '500 24px system-ui, sans-serif'; g.fillText(s.label, x + bw / 2, by + 100);
    });
  }
  g.fillStyle = 'rgba(244,240,226,0.6)'; g.font = '500 24px system-ui, sans-serif';
  g.fillText('Found outdoors · identified on-device with an open-weight model', W / 2, 1306);
  return new Promise((r) => c.toBlob(r, 'image/png'));
}

/** Web Share with files where supported (phones), otherwise download. */
export async function shareOrDownload(blob, filename, text) {
  const file = new File([blob], filename, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], text, title: 'Wildling' }); return 'shared'; }
    catch (e) { if (e.name === 'AbortError') return 'cancelled'; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'downloaded';
}
