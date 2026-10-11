
import json
import numpy as np
from pathlib import Path

data_dir = Path("public/data")

with (data_dir / "species.json").open(encoding="utf-8") as f:
    data = json.load(f)

species = data["species"]
meta = data["meta"]
embedding_path = data_dir / "embeddings.bin"

embeddings = np.fromfile(embedding_path, dtype="<f4")

expected_values = len(species) * meta["dim"]
print("Species:", len(species))
print("Embedding dimension:", meta["dim"])
print("Expected float values:", expected_values)
print("Actual float values:", len(embeddings))
print("Binary size (bytes):", embedding_path.stat().st_size)

assert meta["has_embeddings"] is True
assert meta["count"] == len(species)
assert len(embeddings) == expected_values
assert np.isfinite(embeddings).all()

matrix = embeddings.reshape(len(species), meta["dim"])
norms = np.linalg.norm(matrix, axis=1)

print("All values finite:", np.isfinite(embeddings).all())
print("All embeddings normalized:", np.allclose(norms, 1.0, atol=1e-3))
print("Verification passed!")
