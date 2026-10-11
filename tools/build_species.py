#!/usr/bin/env python3
"""Build the species catalogue + text embeddings that the app ships with.

BioCLIP-style zero-shot classification compares a photo embedding with text embeddings of
candidate taxa. The browser can't embed 400k taxa, so we precompute embeddings for a curated
list (tools/species_seed.csv) and ship them as a flat float32 file.

    python tools/build_species.py                       # taxonomy + descriptions + embeddings
    python tools/build_species.py --skip-network        # no GBIF / Wikipedia lookups
    python tools/build_species.py --skip-embeddings     # only species.json (UI demo mode)
    python tools/build_species.py --seed my_list.csv    # your own region / species list

Outputs (in public/data/): species.json, embeddings.bin (row i = species i, L2-normalised float32).

Data sources / licences (check their terms before redistributing):
  * GBIF species match API  -> taxonomy (CC0 backbone)
  * Wikipedia REST summary  -> descriptions (CC BY-SA; attribution is stored in each record)
  * IUCN status             -> typed by hand in the seed CSV. Leave blank when you don't have a
                               source; the app then shows "Not in bundled data".
"""
import argparse, csv, json, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = Path(__file__).resolve().parent / ".cache"
OUT = ROOT / "public" / "data"
RANKS = ["kingdom", "phylum", "class", "order", "family", "genus"]
UA = {"User-Agent": "wildling-hacktoberfest/0.1 (open-source nature app)"}


def cached_json(name):
    CACHE.mkdir(exist_ok=True)
    p = CACHE / name
    return p, (json.loads(p.read_text()) if p.exists() else {})


def gbif_taxonomy(sci, cache):
    import requests
    if sci in cache:
        return cache[sci]
    try:
        r = requests.get("https://api.gbif.org/v1/species/match", params={"name": sci, "strict": "false"},
                         headers=UA, timeout=15)
        j = r.json()
        tax = {k: j.get(k, "") for k in RANKS}
        tax["gbif_key"] = j.get("usageKey")
        tax["matched_name"] = j.get("scientificName", "")
    except Exception as e:  # network hiccup: leave blank
        print(f"  ! GBIF failed for {sci}: {e}", file=sys.stderr)
        tax = {}
    cache[sci] = tax
    time.sleep(0.1)
    return tax


def wiki_summary(sci, cache):
    import requests
    if sci in cache:
        return cache[sci]
    out = {}
    try:
        title = sci.replace(" ", "_")
        r = requests.get(f"https://en.wikipedia.org/api/rest_v1/page/summary/{title}", headers=UA, timeout=15)
        if r.ok:
            j = r.json()
            if j.get("type") == "standard" and j.get("extract"):
                out = {"desc": j["extract"],
                       "wiki": j.get("content_urls", {}).get("desktop", {}).get("page", ""),
                       "desc_source": "Wikipedia (CC BY-SA 4.0)"}
    except Exception as e:
        print(f"  ! Wikipedia failed for {sci}: {e}", file=sys.stderr)
    cache[sci] = out
    time.sleep(0.1)
    return out


def taxon_text(rec):
    """Text prompt in the 'taxonomic + common name' style BioCLIP was trained with."""
    parts = [rec.get(r, "") for r in RANKS if rec.get(r)]
    parts.append(rec["sci"])
    base = " ".join(parts)
    return f"a photo of {base}, {rec['common']}."


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed", default=str(Path(__file__).parent / "species_seed.csv"))
    ap.add_argument("--skip-network", action="store_true")
    ap.add_argument("--skip-embeddings", action="store_true")
    ap.add_argument("--model", default="hf-hub:imageomics/bioclip-2", help="open_clip model id")
    args = ap.parse_args()

    rows = list(csv.DictReader(open(args.seed, encoding="utf-8")))
    gp, gcache = cached_json("gbif.json")
    wp, wcache = cached_json("wiki.json")

    species = []
    for i, row in enumerate(rows):
        sci = row["scientific_name"].strip()
        rec = {
            "id": sci,
            "sci": sci,
            "common": row["common_name"].strip(),
            "category": row["category"].strip(),
            "iucn": row.get("iucn", "").strip() or None,
            "habitat": row.get("habitat", "").strip(),
            "facts": [row["fact"].strip()] if row.get("fact", "").strip() else [],
            "genus": sci.split()[0],
        }
        if not args.skip_network:
            print(f"[{i+1}/{len(rows)}] {sci}")
            rec.update({k: v for k, v in gbif_taxonomy(sci, gcache).items() if v})
            rec.update(wiki_summary(sci, wcache))
        species.append(rec)
    if not args.skip_network:
        gp.write_text(json.dumps(gcache, indent=1)); wp.write_text(json.dumps(wcache, indent=1))

    OUT.mkdir(parents=True, exist_ok=True)
    meta = {"count": len(species), "dim": 0, "model": None, "has_embeddings": False}

    if not args.skip_embeddings:
        import numpy as np, torch, open_clip
        print("Loading", args.model)
        model, _, _ = open_clip.create_model_and_transforms(args.model)
        tok = open_clip.get_tokenizer(args.model)
        model.eval()
        texts = [taxon_text(s) for s in species]
        feats = []
        with torch.no_grad():
            for i in range(0, len(texts), 64):
                f = model.encode_text(tok(texts[i:i + 64]))
                feats.append(torch.nn.functional.normalize(f, dim=-1).cpu().numpy())
        emb = np.concatenate(feats).astype("<f4")
        (OUT / "embeddings.bin").write_bytes(emb.tobytes())
        meta.update(dim=int(emb.shape[1]), model=args.model, has_embeddings=True)
        print("embeddings", emb.shape)

    (OUT / "species.json").write_text(
    json.dumps(
        {"meta": meta, "species": species},
        ensure_ascii=True,
        indent=1,
    ),
    encoding="utf-8",
)
    print(f"Wrote {len(species)} species to {OUT}")


if __name__ == "__main__":
    main()
