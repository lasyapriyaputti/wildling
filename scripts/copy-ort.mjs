// Copies the onnxruntime-web WASM runtime into public/ort so inference works fully offline
// (no CDN). Runs automatically after `npm install`.
import { cpSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const src = join('node_modules', 'onnxruntime-web', 'dist');
const dst = join('public', 'ort');
if (!existsSync(src)) {
  console.warn('[copy-ort] onnxruntime-web not installed yet, skipping.');
  process.exit(0);
}
mkdirSync(dst, { recursive: true });
let n = 0;
for (const f of readdirSync(src)) {
  if (/^ort-wasm-simd-threaded(\.jsep)?\.(wasm|mjs)$/.test(f)) {
    cpSync(join(src, f), join(dst, f));
    n++;
  }
}
console.log(`[copy-ort] copied ${n} runtime files to public/ort`);
