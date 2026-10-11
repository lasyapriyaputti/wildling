# Swapping the identification model

The UI only talks to an **engine**:

```js
engine = {
  id, name, demo,            // metadata
  backend,                   // "webgpu" | "wasm" | "none"
  init(onProgress),          // load everything
  identify(ImageBitmap) -> Promise<{ probs: Float32Array, ms: number }>
}
```

`probs[i]` is the probability for `species.json → species[i]`. See `src/lib/engine.js`.

## Using another CLIP-style model

1. `python tools/export_model.py --model <open_clip id>`: writes `public/model/image_encoder.onnx` + `meta.json`
   (input size, mean/std, logit scale, embedding dim).
2. `python tools/build_species.py --model <same id>`: rebuilds `public/data/embeddings.bin` from the same text encoder.
3. `python tools/evaluate.py`: measure it on your photos.

## Using a non-CLIP classifier

Write a new class next to `OnnxEngine` that returns a `probs` vector aligned with your species list
and select it in `src/App.jsx`. Nothing else in the app changes.
