#!/usr/bin/env python3
"""Measure how well the model really identifies your categories, before you claim anything.

Put test photos in:   tools/test_images/<category>/<Scientific_name>/*.jpg
  e.g. tools/test_images/bird/Pavo_cristatus/img1.jpg
Use your own photos or openly licensed iNaturalist photos (keep the licence/credit list).

    python tools/evaluate.py

Reports per-category top-1 / top-5 / genus accuracy, latency, and a confidence-calibration
table (use it to choose the 'likely' / 'possible' thresholds in src/lib/rank.js).
Results are also written to tools/eval_results.md (paste real numbers into your post).
"""
import json, time
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
TEST = Path(__file__).resolve().parent / "test_images"


def preprocess(img, size, mean, std):
    img = img.convert("RGB")
    w, h = img.size
    s = min(w, h)  # same centre-square crop as the web app, then resize
    img = img.crop(((w - s) // 2, (h - s) // 2, (w - s) // 2 + s, (h - s) // 2 + s)).resize((size, size), Image.BICUBIC)
    x = np.asarray(img, dtype=np.float32) / 255.0
    x = (x - np.array(mean, dtype=np.float32)) / np.array(std, dtype=np.float32)
    return x.transpose(2, 0, 1)[None]


def main():
    import onnxruntime as ort
    meta = json.loads((ROOT / "public/model/meta.json").read_text())
    data = json.loads((ROOT / "public/data/species.json").read_text())
    species = data["species"]
    D = data["meta"]["dim"]
    emb = np.frombuffer((ROOT / "public/data/embeddings.bin").read_bytes(), dtype="<f4").reshape(-1, D)
    sess = ort.InferenceSession(str(ROOT / "public/model" / meta["file"]), providers=["CPUExecutionProvider"])
    index = {s["id"]: i for i, s in enumerate(species)}

    res, times, calib = {}, [], []
    for cat_dir in sorted(p for p in TEST.glob("*") if p.is_dir()):
        for sp_dir in sorted(p for p in cat_dir.glob("*") if p.is_dir()):
            sci = sp_dir.name.replace("_", " ")
            if sci not in index:
                print(f"skip {sci}: not in species list (add it to the seed CSV)")
                continue
            truth = index[sci]
            for f in list(sp_dir.glob("*.jpg")) + list(sp_dir.glob("*.jpeg")) + list(sp_dir.glob("*.png")):
                x = preprocess(Image.open(f), meta["image_size"], meta["mean"], meta["std"])
                t = time.time()
                e = sess.run(None, {sess.get_inputs()[0].name: x})[0][0]
                times.append(time.time() - t)
                e = e / np.linalg.norm(e)
                logits = meta["logit_scale"] * (emb @ e)
                p = np.exp(logits - logits.max()); p /= p.sum()
                order = np.argsort(-p)
                top1 = order[0] == truth
                r = res.setdefault(cat_dir.name, dict(n=0, top1=0, top5=0, genus=0))
                r["n"] += 1; r["top1"] += int(top1); r["top5"] += int(truth in order[:5])
                r["genus"] += int(species[order[0]]["genus"] == species[truth]["genus"])
                calib.append((float(p[order[0]]), bool(top1)))

    lines = ["| Category | Photos | Top-1 | Top-5 | Genus-level |", "|---|---|---|---|---|"]
    for c, r in res.items():
        n = max(r["n"], 1)
        lines.append(f"| {c} | {r['n']} | {r['top1']/n:.0%} | {r['top5']/n:.0%} | {r['genus']/n:.0%} |")
    if times:
        lines += ["", f"Latency (CPU, onnxruntime): median {np.median(times)*1000:.0f} ms over {len(times)} images"]
        lines += ["", "| Confidence bin | Photos | Actually correct |", "|---|---|---|"]
        for lo, hi in [(0, .15), (.15, .25), (.25, .6), (.6, 1.01)]:
            b = [ok for c, ok in calib if lo <= c < hi]
            if b:
                lines.append(f"| {lo:.2f}-{min(hi,1):.2f} | {len(b)} | {sum(b)/len(b):.0%} |")
    out = "\n".join(lines)
    print(out)
    (Path(__file__).parent / "eval_results.md").write_text(out + "\n")


if __name__ == "__main__":
    main()
