import { assetUrl } from './assets.js';

/**
 * The identification engine is deliberately tiny and swappable:
 *
 *   engine = { id, name, demo, backend, init(onProgress), identify(ImageBitmap) -> {probs, ms} }
 *
 * `probs` is a Float32Array aligned with species.json. To use another model, export it with
 * tools/export_model.py (or any ONNX encoder with a matching meta.json) and rebuild embeddings.
 * See docs/MODEL_INTERFACE.md.
 */

export async function loadSpecies() {
  const res = await fetch(assetUrl('data/species.json'));
  const j = await res.json();
  j.species.forEach((s, i) => { s.idx = i; });
  return { meta: j.meta, list: j.species, byId: new Map(j.species.map((s) => [s.id, s])) };
}

/** Returns meta.json when a model is installed, else null (the dev server answers unknown paths with HTML, so check the type). */
export async function readModelMeta() {
  try {
    const r = await fetch(assetUrl('model/meta.json'));
    if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) return null;
    return await r.json();
  } catch { return null; }
}

export class OnnxEngine {
  demo = false;
  backend = null;
  #pending = new Map();
  #seq = 0;
  constructor(meta) {
    this.meta = meta;
    this.id = meta.model_id || 'onnx-model';
    this.name = meta.name || this.id;
  }
  init(onProgress) {
    return new Promise((resolve, reject) => {
      this.worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
      this.worker.onmessage = (e) => {
        const m = e.data;
        if (m.type === 'progress') onProgress?.(m);
        else if (m.type === 'ready') { this.backend = m.backend; resolve(m); }
        else if (m.type === 'result') { this.#pending.get(m.reqId)?.resolve(m); this.#pending.delete(m.reqId); }
        else if (m.type === 'error') {
          if (m.reqId) { this.#pending.get(m.reqId)?.reject(new Error(m.message)); this.#pending.delete(m.reqId); }
          else reject(new Error(m.message));
        }
      };
      this.worker.onerror = (e) => reject(new Error(e.message || 'Inference worker failed to start'));
      this.worker.postMessage({ type: 'init', base: assetUrl(''), meta: this.meta });
    });
  }
  identify(bitmap) {
    const reqId = ++this.#seq;
    return new Promise((resolve, reject) => {
      this.#pending.set(reqId, { resolve, reject });
      this.worker.postMessage({ type: 'identify', reqId, bitmap }, [bitmap]);
    }).then((m) => ({ probs: m.probs, ms: m.ms }));
  }
}

/**
 * Used ONLY when no model is installed, so the UI, streaks and badges can be developed and tried.
 * It returns pseudo-random guesses and the app labels everything it produces as DEMO.
 */
export class DemoEngine {
  demo = true;
  id = 'demo';
  name = 'Demo mode (no model installed)';
  backend = 'none';
  constructor(count) { this.count = count; }
  async init() {}
  async identify(bitmap) {
    const c = new OffscreenCanvas(8, 8);
    const g = c.getContext('2d');
    g.drawImage(bitmap, 0, 0, 8, 8);
    bitmap.close?.();
    const px = g.getImageData(0, 0, 8, 8).data;
    let seed = 2166136261;
    for (const v of px) seed = Math.imul(seed ^ v, 16777619) >>> 0;
    const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
    const logits = Float32Array.from({ length: this.count }, () => rnd() * 4);
    logits[Math.floor(rnd() * this.count)] += 4.5;
    let sum = 0;
    for (let i = 0; i < logits.length; i++) { logits[i] = Math.exp(logits[i]); sum += logits[i]; }
    for (let i = 0; i < logits.length; i++) logits[i] /= sum;
    await new Promise((r) => setTimeout(r, 600));
    return { probs: logits, ms: 600 };
  }
}
