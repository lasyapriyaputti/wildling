# 🌿 Wildling: touch grass, find life

**Working title.** Check that the name is free before you publish.

A camera-only, offline-first nature exploration PWA. You go outside, photograph a living thing
with the in-app camera, and an **open-weight biology model running on your own device**
(BioCLIP 2 by default) suggests who you met. You save it to a private collection, build a
streak, earn badges that reward *variety* and *consistency*, and share an achievement card.

Built for the Hacktoberfest 2026 Week 1 "Touch Grass" DEV challenge.

---

## Honest status

| Part | State |
|---|---|
| UI, camera, collection, streaks, badges, share cards | Written. The production build passes and the streak/badge/ranking logic is unit-tested (`npm test`, 10 tests). |
| Offline PWA (service worker, IndexedDB) | Written. **You need to test it on a real phone** (airplane-mode check below). |
| BioCLIP 2 export, species embeddings, evaluation | **Scripts are written but were not run here**, because the Hugging Face model could not be downloaded in the authoring environment. Run them (steps 2-4). |
| Accuracy / speed numbers | **None yet.** Do not claim any until `tools/evaluate.py` produces them on your own photos. |
| Without a model | The app runs in a clearly labelled **DEMO mode** (random guesses) so you can try the whole UI. |

## Quick start (UI only, demo mode)

```bash
npm install          # also copies the ONNX WASM runtime into public/ort
npm run dev          # http://localhost:5173  (camera works on localhost)
npm test
```

On a phone, the camera needs HTTPS. Use `npm run build && npm run preview` behind a tunnel
(for example `cloudflared tunnel --url http://localhost:4173`), or deploy the static `dist/` folder.

## Install the model (real identification)

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r tools/requirements.txt

# 1. Species catalogue + taxonomy + descriptions (needs internet once; --skip-network to skip)
#    then text embeddings from BioCLIP 2:
python tools/build_species.py

# 2. Export the image encoder to ONNX (about 1.2 GB fp32 for ViT-L/14)
python tools/export_model.py                    # fp32
python tools/export_model.py --quantize int8    # smaller / faster on WASM; verify accuracy!

# Smaller fallback model (same pipeline, rebuild embeddings with the same --model):
#   python tools/export_model.py --model hf-hub:imageomics/bioclip
#   python tools/build_species.py --model hf-hub:imageomics/bioclip
```

Rules: the **same model id** must be used for `export_model.py` and `build_species.py`.
Check the model card and dataset licences on Hugging Face before redistributing weights.
Model and embeddings are git-ignored; host them yourself or have each user's browser fetch them from your static host.

## Measure before you promise

Put photos in `tools/test_images/<category>/<Scientific_name>/*.jpg` (your own, or openly licensed
iNaturalist photos with credits kept), then:

```bash
python tools/evaluate.py
```

It prints top-1 / top-5 / genus-level accuracy per category, median latency, and a
confidence-calibration table. Use the calibration table to tune `LIKELY` and `POSSIBLE` in
`src/lib/rank.js`. Paste the real numbers into your post, including the failures.

Also measure in the browser (WebGPU vs WASM, phone vs laptop): the status pill shows the backend
and each result shows its inference time.

## The airplane-mode demo

1. Open the deployed app online once and wait for the pill to say **AI ready**.
2. Reload once so the service worker controls the page.
3. Switch to airplane mode, open the app, photograph something, identify, save.
4. Show the **Offline** pill in your recording.

## How it works

```
camera (getUserMedia, no file input)
   -> ImageBitmap -> Web Worker (onnxruntime-web, WebGPU or WASM)
   -> image embedding -> cosine similarity with precomputed species text embeddings
   -> softmax -> top-5 + genus fallback + honest wording ("Likely/Possible/Not sure")
   -> user picks a candidate -> IndexedDB (photo, species, date, optional coarse location)
   -> streak + badge engine -> share-card canvas (PNG, Web Share API)
```

Key design choices:

* **Zero-shot over a curated list.** Browsers cannot hold 450k taxa, so identification is limited to
  `tools/species_seed.csv` (66 India-flavoured species to start). Extend it for your region.
  Species outside the list cannot be identified, and the UI says so when confidence is low.
* **Never "confirmed".** Results are always suggestions with confidence tiers.
* **Honest badges.** "First Discoverer" = first in *your* collection, never first in the world.
  "Rare Life Discoverer" needs a confident match **and** a documented IUCN status of VU or worse
  from the bundled data (global status, not local scarcity). IUCN values in the seed CSV were entered by hand, are only
  filled where known, and should be verified; blank shows "Not in bundled data".
* **Variety over volume.** Badges count distinct species. A day counts for the streak only if a
  saved observation had model confidence ≥ 15% (`MIN_COUNT_SCORE`). Lower-confidence entries are
  saved but don't count.
* **Camera-only.** No `<input type="file">`, no gallery. This raises the effort of cheating; it cannot stop
  someone photographing a screen.
* **Privacy.** No server, no accounts, no analytics. Location is optional, rounded to ~100 m, stored locally.

## Project layout

```
src/lib/        streak, stats, badges, rank (pure logic, tested) · engine + worker (open model) · db · share
src/components/ Explore, Camera, Result, Collection, Progress, About, ShareModal
tools/          build_species.py · export_model.py · evaluate.py · species_seed.csv
public/         sw.js (offline), manifest, data/species.json (+ embeddings.bin, model/ after setup)
docs/           MODEL_INTERFACE.md · DEV_POST_TEMPLATE.md
tests/          logic.test.js
```

## Swapping the model

See `docs/MODEL_INTERFACE.md`. Any ONNX image encoder with a matching `meta.json` and embeddings file works.

## Not in v1 (future work)

iNaturalist community gallery (check API terms and image licences), maps, social features,
research-grade exports to GBIF/iNaturalist, observation verification, bird-call identification.

## Known limitations

* Fungi photo identification is unreliable. The app warns never to eat anything.
* Large model on low-end phones may be slow or run out of memory; try int8 or BioCLIP 1.
* iOS Safari: WebGPU availability varies; WASM fallback is used. Test on your device.
* The in-browser preprocessing (centre crop + canvas resize) is close to, but not bit-identical with,
  the Python pipeline; `evaluate.py` mirrors the browser's crop to keep numbers representative.
* Service-worker offline caching needs the model downloaded once while online.

## Licences

Code: choose one (MIT suggested). Model weights, Wikipedia text (CC BY-SA) and any photos have their own licences.
