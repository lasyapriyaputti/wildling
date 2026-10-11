
import csv
import time
import requests
from pathlib import Path
from collections import Counter

BASE = "https://api.gbif.org/v1"
SEED = Path("tools/species_seed.csv")
OUTPUT = Path("tools/gbif_candidates.csv")

# GBIF taxonomic keys used to discover Indian occurrence records.
# Quotas are candidate targets, not claims of verified accuracy.
GROUPS = [
    ("bird", {"classKey": 212}, 181),
    ("plant", {"kingdomKey": 6}, 231),
    ("insect", {"classKey": 216}, 188),
    ("mammal", {"classKey": 359}, 80),
    ("reptile", {"classKey": 358}, 50),
    ("amphibian", {"classKey": 131}, 50),
    ("fungus", {"kingdomKey": 5}, 62),
    ("fish", {"classKey": 204}, 100),
]

FIELDS = [
    "scientific_name", "common_name", "category",
    "iucn", "habitat", "fact"
]

session = requests.Session()
session.headers.update({"User-Agent": "WildlingSpeciesCatalogue/1.0"})


def get_json(url, params=None):
    response = session.get(url, params=params, timeout=30)
    response.raise_for_status()
    return response.json()


def normalise(name):
    return " ".join(name.strip().casefold().split())


with SEED.open(encoding="utf-8-sig", newline="") as f:
    existing_rows = list(csv.DictReader(f))

existing = {
    normalise(row["scientific_name"])
    for row in existing_rows
}

print("Existing species:", len(existing))
seen = set(existing)
candidates = []

for category, taxon_filter, target in GROUPS:
    print(f"\nCollecting {category}: target {target}")
    found = 0
    offset = 0
    page_size = 300

    while found < target:
        params = {
            **taxon_filter,
            "country": "IN",
            "taxonRank": "SPECIES",
            "occurrenceStatus": "PRESENT",
            "hasCoordinate": "true",
            "facet": "speciesKey",
            "facetLimit": page_size,
            "limit": 0,
        }

        # Offset is not supported for facet results, so one
        # facet request supplies the available candidate keys.
        try:
            data = get_json(
                f"{BASE}/occurrence/search", params
            )
        except requests.RequestException as exc:
            print("Occurrence request failed:", exc)
            break

        facets = data.get("facets", [])
        counts = facets[0].get("counts", []) if facets else []
        keys = [
            int(item["name"])
            for item in counts
            if item.get("name", "").isdigit()
        ]

        if not keys:
            print("No occurrence keys returned for this group.")
            break

        # Process each returned key only once per group.
        keys = list(dict.fromkeys(keys))
        batch_added = 0

        for key in keys:
            if found >= target:
                break

            try:
                taxon = get_json(f"{BASE}/species/{key}")
                scientific_name = (
                    taxon.get("canonicalName") or ""
                ).strip()

                if not scientific_name:
                    continue

                normalized = normalise(scientific_name)
                if normalized in seen:
                    continue

                if taxon.get("rank") != "SPECIES":
                    continue
                if taxon.get("taxonomicStatus") != "ACCEPTED":
                    continue

                # Confirm the returned taxon belongs to the
                # intended group before assigning a category.
                kingdom = (taxon.get("kingdom") or "").lower()
                class_name = (taxon.get("class") or "").lower()

                matches = {
                    "bird": class_name == "aves",
                    "plant": kingdom == "plantae",
                    "insect": class_name == "insecta",
                    "mammal": class_name == "mammalia",
                    "reptile": class_name == "reptilia",
                    "amphibian": class_name == "amphibia",
                    "fungus": kingdom == "fungi",
                    "fish": class_name == "actinopterygii",
                    "other": kingdom == "plantae",
                }

                if not matches[category]:
                    continue

                common_name = ""
                try:
                    names_data = get_json(
                        f"{BASE}/species/{key}/vernacularNames"
                    )
                    names = names_data.get("results", [])

                    english = [
                        item["vernacularName"].strip()
                        for item in names
                        if item.get("language") == "eng"
                        and item.get("vernacularName", "").strip()
                    ]
                    if english:
                        common_name = english[0]
                except requests.RequestException:
                    pass

                candidates.append({
                    "scientific_name": scientific_name,
                    "common_name": common_name,
                    "category": category,
                    "iucn": "",
                    "habitat": "",
                    "fact": "",
                })

                seen.add(normalized)
                found += 1
                batch_added += 1

                # Be polite to the public API.
                time.sleep(0.05)

            except (requests.RequestException, ValueError) as exc:
                print(f"Skipped key {key}: {exc}")

        print(f"  Added {found}/{target} candidates")

        # Facets return a limited list, not pageable species rows.
        # Avoid repeatedly requesting the exact same keys.
        if batch_added == 0 or len(keys) < page_size:
            break

        # Do not pretend offset pagination works for facets.
        # If the quota is not reached, report the shortfall.
        break

with OUTPUT.open("w", encoding="utf-8", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=FIELDS)
    writer.writeheader()
    writer.writerows(candidates)

print("\nFinished.")
print("New candidate rows:", len(candidates))
print("Categories:", dict(Counter(
    row["category"] for row in candidates
)))
print("Missing common names:", sum(
    not row["common_name"] for row in candidates
))
print("Review file:", OUTPUT)
print("Original seed file was not changed.")
