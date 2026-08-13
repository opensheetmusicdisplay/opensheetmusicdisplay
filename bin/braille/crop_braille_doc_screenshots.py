#!/usr/bin/env python
"""Crop the raw demo screenshots into the Music Braille user guide images.

Reads export/braille_doc_shots/manifest.json (written by
bin/braille/generate_braille_doc_screenshots.mjs, which normally runs this script itself),
crops each raw full-viewport screenshot per the manifest, and installs the results
into src/Plugins/Braille/img/ -- the images embedded by UserGuide.md and its PDF.

Prerequisites: pip install Pillow
Usage: python bin/braille/crop_braille_doc_screenshots.py
"""
import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from PIL import Image

REPO = Path(__file__).resolve().parents[2]
SHOTS = REPO / "export" / "braille_doc_shots"
IMG_DIR = REPO / "src" / "Plugins" / "Braille" / "img"

manifest_path = SHOTS / "manifest.json"
if not manifest_path.exists():
    sys.exit(f"{manifest_path} not found -- run bin/braille/generate_braille_doc_screenshots.mjs first.")

manifest = json.loads(manifest_path.read_text())
dsf = manifest["dsf"]
for crop in manifest["crops"]:
    img = Image.open(SHOTS / crop["raw"])
    # raw shots are full-viewport captures at 1600 CSS px width; scaled by the manifest's
    # deviceScaleFactor. A different width means the capture setup changed -- refuse to guess.
    if img.width != 1600 * dsf:
        sys.exit(f"{crop['raw']}: unexpected width {img.width} (expected {1600 * dsf})")
    left = max(0, int(crop["x"] * dsf))
    top = max(0, int(crop["y"] * dsf))
    right = min(img.width, int((crop["x"] + crop["w"]) * dsf))
    bottom = min(img.height, int((crop["y"] + crop["h"]) * dsf))
    out_path = IMG_DIR / crop["out"]
    img.crop((left, top, right, bottom)).save(out_path, optimize=True)
    with Image.open(out_path) as out_img:
        print(f"{crop['out']}: {out_img.width}x{out_img.height}"
              f" ({out_path.stat().st_size // 1024} KB) -> {out_path.relative_to(REPO)}")
print("done -- review with git diff, then commit the changed images.")
