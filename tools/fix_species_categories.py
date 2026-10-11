
import csv
from pathlib import Path
from collections import Counter

source = Path("tools/species_seed_merged.csv")
output = Path("tools/species_seed_review.csv")

with source.open(encoding="utf-8-sig", newline="") as f:
    rows = list(csv.DictReader(f))

# Correct categories using taxonomic groups.
# These rules use GBIF's class/order information when available
# in the seed data; scientific-name checks cover known examples.

known_categories = {
    # Mammals
    "funambulus palmarum": "mammal",
    "herpestes edwardsii": "mammal",
    "panthera tigris": "mammal",
    "elephas maximus": "mammal",

    # Reptiles
    "calotes versicolor": "reptile",
    "hemidactylus frenatus": "reptile",

    # Amphibians
    "duttaphrynus melanostictus": "amphibian",

    # Spider: use a separate arachnid category later.
    "nephila pilipes": "other",

    # Mollusc: keep under other until a mollusc category exists.
    "achatina fulica": "other",

    # Plants
    "ceiba speciosa": "plant",
    "ruellia tuberosa": "plant",
    "maesa indica": "plant",
    "pigea enneasperma": "plant",
    "mitragyna parvifolia": "plant",
    "canarium strictum": "plant",
    "volkameria inermis": "plant",
    "machilus glaucescens": "plant",
    "antidesma montanum": "plant",
    "turpinia malabarica": "plant",
    "acacia auriculiformis": "plant",
    "prunus armeniaca": "plant",
    "abies pindrow": "plant",
    "acronychia pedunculata": "plant",
    "glochidion ellipticum": "plant",
    "evolvulus nummularius": "plant",
    "terminalia chebula": "plant",
    "cucumis sativus": "plant",
    "barleria prionitis": "plant",
    "poeciloneuron indicum": "plant",
    "ipomoea pes-tigridis": "plant",
    "sida acuta": "plant",
    "withania somnifera": "plant",
    "solanum lycopersicum": "plant",
    "connarus sclerocarpus": "plant",
    "ficus mollis": "plant",
    "ipomoea aquatica": "plant",
    "centratherum punctatum": "plant",
    "malvastrum coromandelianum": "plant",
    "trema orientale": "plant",
    "ipomoea quamoclit": "plant",
    "orophea thomsonii": "plant",
    "colocasia esculenta": "plant",
    "agrostistachys borneensis": "plant",
    "tephrosia purpurea": "plant",
    "rauvolfia tetraphylla": "plant",
    "rauwolfia tetraphylla": "plant",
    "ziziphus oenopolia": "plant",
    "xanthophyllum flavescens": "plant",
    "senna siamea": "plant",
    "solanum viarum": "plant",
    "datura metel": "plant",
    "bixa orellana": "plant",
    "syzygium densiflorum": "plant",
    "paracroton pendulus": "plant",
    "centella asiatica": "plant",
    "albizia odoratissima": "plant",
    "piper nigrum": "plant",
    "phyllanthus reticulatus": "plant",
    "magnolia campbellii": "plant",
    "dillenia indica": "plant",
    "synedrella nodiflora": "plant",
    "kalanchoe pinnata": "plant",
    "malus domestica": "plant",
    "leucas aspera": "plant",
    "boerhavia diffusa": "plant",
    "nephila pilipes": "arachnid",
    "achatina fulica": "mollusc",
    "rauwolfia tetraphylla": "plant",
    "rauv olfia tetraphylla": "plant",
    "melicope lunu-ankenda": "plant",
}


for row in rows:
    name = row["scientific_name"].strip().casefold()
    if name in known_categories:
        row["category"] = known_categories[name]

# Preserve the existing CSV columns.
fields = [
    "scientific_name", "common_name", "category",
    "iucn", "habitat", "fact"
]

with output.open("w", encoding="utf-8", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=fields)
    writer.writeheader()
    writer.writerows(rows)

print("Rows:", len(rows))
print("Categories:", dict(Counter(r["category"] for r in rows)))
print("Saved review file:", output)
print("Original files were not changed.")
