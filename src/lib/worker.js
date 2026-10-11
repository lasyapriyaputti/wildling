// Runs the open-weight image encoder (ONNX) off the main thread, entirely on-device.
// Protocol:  main -> {type:'init', base, meta}   worker -> {type:'progress'|'ready'|'error'}
//            main -> {type:'identify', reqId, bitmap}   worker -> {type:'result', reqId, probs, ms}
import * as ort from 'onnxruntime-web';

let session = null, emb = null, N = 0, D = 0, meta = null, backend = 'wasm';

self.onmessage = async (e) => {
  const m = e.data;
  try {
    if (m.type === 'init') await init(m);
    else if (m.type === 'identify') await identify(m);
  } catch (err) {
    self.postMessage({ type: 'error', reqId: m.reqId, message: String(err?.message || err) });
  }
};

async function fetchBytes(url, label) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load ${url} (${res.status})`);
  const total = Number(res.headers.get('content-length')) || 0;
  const reader = res.body.getReader();
  const chunks = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    self.postMessage({ type: 'progress', label, loaded, total });
  }
  const out = new Uint8Array(loaded);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}

async function init({ base, meta: mt }) {
  meta = mt;
  ort.env.wasm.wasmPaths = base + 'ort/';
  ort.env.wasm.numThreads = 1; // avoids needing cross-origin isolation headers

  const speciesRes = await fetch(base + 'data/species.json');
  const speciesJson = await speciesRes.json();
  D = speciesJson.meta.dim;
  N = speciesJson.meta.count;
  if (!speciesJson.meta.has_embeddings) throw new Error('species.json has no embeddings. Run tools/build_species.py');

  const embBytes = await fetchBytes(base + 'data/embeddings.bin', 'Species embeddings');
  if (embBytes.byteLength !== N * D * 4) throw new Error(`embeddings.bin size mismatch (${embBytes.byteLength} vs ${N * D * 4})`);
  emb = new Float32Array(embBytes.buffer, embBytes.byteOffset, N * D);

  const modelBytes = await fetchBytes(base + 'model/' + meta.file, 'Model');
  const tryProviders = typeof navigator !== 'undefined' && navigator.gpu ? [['webgpu'], ['wasm']] : [['wasm']];
  let lastErr;
  for (const eps of tryProviders) {
    try {
      session = await ort.InferenceSession.create(modelBytes, { executionProviders: eps, graphOptimizationLevel: 'all' });
      backend = eps[0];
      lastErr = null;
      break;
    } catch (err) { lastErr = err; }
  }
  if (!session) throw lastErr || new Error('Could not create inference session');

  // Warm-up so the first real photo is not slow.
  const S = meta.image_size;
  await session.run({ [session.inputNames[0]]: new ort.Tensor('float32', new Float32Array(3 * S * S), [1, 3, S, S]) });
  self.postMessage({ type: 'ready', backend });
}

async function identify({ reqId, bitmap }) {
  const S = meta.image_size;
  const canvas = new OffscreenCanvas(S, S);
  const g = canvas.getContext('2d', { willReadFrequently: true });
  const side = Math.min(bitmap.width, bitmap.height); // centre-square crop, like tools/evaluate.py
  g.imageSmoothingQuality = 'high';
  g.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, S, S);
  bitmap.close?.();
  const { data } = g.getImageData(0, 0, S, S);
  const x = new Float32Array(3 * S * S);
  for (let i = 0; i < S * S; i++) {
    for (let c = 0; c < 3; c++) x[c * S * S + i] = (data[i * 4 + c] / 255 - meta.mean[c]) / meta.std[c];
  }
  const t0 = performance.now();
  const out = await session.run({ [session.inputNames[0]]: new ort.Tensor('float32', x, [1, 3, S, S]) });
  const f = out[session.outputNames[0]].data;
  let norm = 0;
  for (let i = 0; i < D; i++) norm += f[i] * f[i];
  norm = Math.sqrt(norm) || 1;

  const logits = new Float32Array(N);
  let max = -Infinity;
  for (let n = 0; n < N; n++) {
    let dot = 0;
    const o = n * D;
    for (let i = 0; i < D; i++) dot += emb[o + i] * f[i];
    logits[n] = (meta.logit_scale * dot) / norm;
    if (logits[n] > max) max = logits[n];
  }
  let sum = 0;
  for (let n = 0; n < N; n++) { logits[n] = Math.exp(logits[n] - max); sum += logits[n]; }
  for (let n = 0; n < N; n++) logits[n] /= sum;
  self.postMessage({ type: 'result', reqId, probs: logits, ms: Math.round(performance.now() - t0) }, [logits.buffer]);
}
