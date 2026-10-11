
import csv
import requests
import time
from pathlib import Path

BASE = "https://api.gbif.org/v1"
OUTPUT = Path("tools/reptiles_fish_candidates.csv")

session = requests.Session()
session.headers.update({
    "User-Agent": "WildlingSpeciesCatalogue/1.0"
})

# Known Indian reptiles and fish to seed the collection.
# GBIF will verify each name; these are not the final catalogue.
NAMES = [
    ("Naja naja", "reptile"),
    ("Python molurus", "reptile"),
    ("Varanus bengalensis", "reptile"),
    ("Crocodylus palustris", "reptile"),
    ("Labeo rohita", "fish"),
    ("Catla catla", "fish"),
    ("Cirrhinus mrigala", "fish"),
    ("Gadus morhua", "fish"),
]

def get_json(url, params=None):
    response = session.get(url, params=params, timeout=25)
    response.raise_for_status()
    return response.json()

rows = []
seen = set()

for name, category in NAMES:
    try:
        match = get_json(
            f"{BASE}/species/match",
            {"name": name}
        )

        if match.get("rank") != "SPECIES":
            print("Skipped non-species:", name)
            continue

        if match.get("status") != "ACCEPTED":
            print("Skipped non-accepted name:", name, match.get("status"))
            continue

        scientific_name = match.get("canonicalName") or name
        key = match.get("usageKey")

        if not key or scientific_name.casefold() in seen:
            continue

        # Check for Indian occurrence records.
        occurrences = get_json(
            f"{BASE}/occurrence/search",
            {
                "taxonKey": key,
                "country": "IN",
                "occurrenceStatus": "PRESENT",
                "limit": 1,
            }
        )

        if occurrences.get("count", 0) == 0:
            print("No Indian occurrence:", scientific_name)
            continue

        common_name = ""
        try:
            names = get_json(
                f"{BASE}/species/{key}/vernacularNames"
            ).get("results", [])

            english = [
                item["vernacularName"]
                for item in names
                if item.get("language") == "eng"
                and item.get("vernacularName")
            ]
            if english:
                common_name = english[0]
        except requests.RequestException:
            pass

        rows.append({
            "scientific_name": scientific_name,
            "common_name": common_name,
            "category": category,
            "iucn": "",
            "habitat": "",
            "fact": "",
        })

        seen.add(scientific_name.casefold())
        print("Added:", scientific_name, "|", category)
        time.sleep(0.1)

    except requests.RequestException as error:
        print("Request failed for", name, ":", error)

fields = [
    "scientific_name", "common_name", "category",
    "iucn", "habitat", "fact"
]

with OUTPUT.open("w", encoding="utf-8", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=fields)
    writer.writeheader()
    writer.writerows(rows)

print("\nCandidates saved:", len(rows))
print("File:", OUTPUT)
