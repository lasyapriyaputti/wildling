
import requests

url = "https://api.gbif.org/v1/species/match"

names = [
    "Naja naja",
    "Labeo rohita",
    "Python molurus",
    "Varanus bengalensis",
    "Catla catla",
]

for name in names:
    try:
        response = requests.get(
            url,
            params={"name": name},
            timeout=20,
        )
        response.raise_for_status()
        data = response.json()

        print(
            name,
            "| matched:", data.get("scientificName"),
            "| rank:", data.get("rank"),
            "| key:", data.get("usageKey"),
            "| class:", data.get("class"),
            "| order:", data.get("order"),
            "| status:", data.get("status"),
        )

    except requests.RequestException as error:
        print(name, "| ERROR:", error)
