import json
from collections import Counter
from pathlib import Path

path = Path("public/data/species.json")

with path.open(encoding="utf-8") as f:
    data = json.load(f)

species = data["species"]

print("Total species:", len(species))
print("Metadata:", data["meta"])
print("Categories:", dict(Counter(
    item["category"] for item in species
)))
print("Arachnids:", sum(
    item["category"] == "arachnid" for item in species
))
print("Molluscs:", sum(
    item["category"] == "mollusc" for item in species
))