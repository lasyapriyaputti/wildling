
import csv
from pathlib import Path
from collections import Counter

seed_file = Path("tools/species_seed.csv")
candidate_files = [
    Path("tools/gbif_candidates.csv"),
    Path("tools/reptiles_fish_candidates.csv"),
]
output_file = Path("tools/species_seed_merged.csv")

fields = [
    "scientific_name", "common_name", "category",
    "iucn", "habitat", "fact"
]

def read_csv(path):
    if not path.exists():
        print("Missing file:", path)
        return []
    with path.open(encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))

original = read_csv(seed_file)
merged = []
seen = set()

def add_rows(rows, source):
    added = 0
    for row in rows:
        scientific_name = row.get("scientific_name", "").strip()
        if not scientific_name:
            continue

        key = " ".join(scientific_name.casefold().split())
        if key in seen:
            continue

        seen.add(key)
        merged.append({
            field: (row.get(field) or "").strip()
            for field in fields
        })
        added += 1

    print(f"{source}: added {added}")

add_rows(original, "Original catalogue")

for path in candidate_files:
    add_rows(read_csv(path), path.name)

print("\nTotal unique species:", len(merged))
print("Categories:", dict(Counter(
    row["category"] for row in merged
)))
print("Missing common names:", sum(
    not row["common_name"] for row in merged
))
print("Missing facts:", sum(
    not row["fact"] for row in merged
))

with output_file.open("w", encoding="utf-8", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=fields)
    writer.writeheader()
    writer.writerows(merged)

print("\nSaved review file:", output_file)
print("Original species_seed.csv was not changed.")
