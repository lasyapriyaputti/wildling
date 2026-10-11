#!/usr/bin/env python3
"""Export a CLIP-style image encoder (default: BioCLIP 2) to ONNX for in-browser inference.

    python tools/export_model.py                         # fp32 (about 1.2 GB for ViT-L/14)
    python tools/export_model.py --quantize int8         # smaller + faster on WASM, check accuracy!
    python tools/export_model.py --model hf-hub:imageomics/bioclip   # smaller BioCLIP 1 (ViT-B/16)

Writes public/model/image_encoder.onnx and public/model/meta.json.
IMPORTANT: embeddings.bin must be produced by build_species.py with the SAME --model.
Always run tools/evaluate.py afterwards: quantisation can change accuracy.
"""
import argparse, json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "model"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="hf-hub:imageomics/bioclip-2")
    ap.add_argument("--quantize", choices=["none", "int8"], default="none")
    ap.add_argument("--opset", type=int, default=17)
    args = ap.parse_args()

    import torch, open_clip

    model, _, preprocess = open_clip.create_model_and_transforms(args.model)
    model.eval()
    cfg = getattr(model.visual, "preprocess_cfg", None) or {}
    size = cfg.get("size", 224)
    size = size[0] if isinstance(size, (tuple, list)) else size
    mean = list(cfg.get("mean", (0.48145466, 0.4578275, 0.40821073)))
    std = list(cfg.get("std", (0.26862954, 0.26130258, 0.27577711)))
    logit_scale = float(model.logit_scale.exp().item()) if hasattr(model, "logit_scale") else 100.0

    class ImageEncoder(torch.nn.Module):
        def __init__(self, m):
            super().__init__()
            self.m = m

        def forward(self, image):
            f = self.m.encode_image(image)
            return torch.nn.functional.normalize(f, dim=-1)

    enc = ImageEncoder(model).eval()
    dummy = torch.randn(1, 3, size, size)
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / "image_encoder.onnx"
    with torch.no_grad():
        torch.onnx.export(
            enc,
            dummy,
            str(path),
            input_names=["image"],
            output_names=["embedding"],
            dynamic_axes={"image": {0: "batch"}, "embedding": {0: "batch"}},
            opset_version=18,
            do_constant_folding=True,
            external_data=False,
            )
    if args.quantize == "int8":
        from onnxruntime.quantization import quantize_dynamic, QuantType
        q = OUT / "image_encoder.int8.onnx"
        quantize_dynamic(str(path), str(q), weight_type=QuantType.QInt8)
        path.unlink()
        q.rename(path)

    dim = int(enc(dummy).shape[-1])
    meta = {
        "model_id": args.model,
        "name": "BioCLIP 2" if "bioclip-2" in args.model else args.model,
        "file": "image_encoder.onnx",
        "image_size": int(size),
        "mean": mean,
        "std": std,
        "logit_scale": logit_scale,
        "dim": dim,
        "quantization": args.quantize,
        "license": "See the model card on Hugging Face for the licence of the weights.",
        "source": "https://huggingface.co/" + args.model.replace("hf-hub:", ""),
    }
    (OUT / "meta.json").write_text(json.dumps(meta, indent=2))
    print(f"Wrote {path} ({path.stat().st_size/1e6:.0f} MB) and meta.json (dim={dim})")


if __name__ == "__main__":
    main()
