"""
Normalize MXL/XML score files for visual regression pipeline.

Loads each score via Partitura (force_note_ids=True), re-exports as .musicxml
with stable note IDs. Outputs to a separate directory so generateImages and
tests can consume deterministic files.

Usage:
    python test/Util/normalize_visual_scores.py [--input DIR] [--output DIR]

Defaults:
    --input  test/data/
    --output test/data_normalized/
"""

import argparse
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from __patch__.partitura.io.exportmusicxml import save_musicxml
from __patch__.partitura.io.importmusicxml import load_musicxml

SCORE_EXTS: set[str] = {".mxl", ".xml", ".musicxml"}


def _is_score_file(path: Path) -> bool:
    return path.suffix.lower() in SCORE_EXTS and path.is_file()


def normalize(input_dir: Path, output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)

    score_files: list[Path] = sorted(
        p for p in input_dir.iterdir() if _is_score_file(p)
    )
    if not score_files:
        print(f"No score files found in {input_dir}")
        return

    ok = 0
    skipped = 0
    failed = 0

    for src in score_files:
        # Output filename: replace original ext with .musicxml
        out_name = src.stem + ".musicxml"
        out_path = output_dir / out_name

        # Skip if output newer than source (mtime)
        if out_path.exists():
            src_mtime = src.stat().st_mtime
            out_mtime = out_path.stat().st_mtime
            if out_mtime >= src_mtime:
                skipped += 1
                continue

        try:
            score = load_musicxml(str(src), validate=False, force_note_ids=True)
            xml_data = save_musicxml(score)
            full_xml = xml_data.decode("utf-8") if isinstance(xml_data, bytes) else xml_data
            # Strip DOCTYPE — avoids DTD fetch hangs in test DOMParser
            full_xml = re.sub(r"<!DOCTYPE[^>]*>", "", full_xml, count=1)
            out_path.write_text(full_xml, encoding="utf-8")
            ok += 1
        except Exception as exc:
            print(f"  FAIL {src.name}: {exc}")
            failed += 1

    total = len(score_files)
    print(f"Normalized {ok}/{total} ({skipped} up-to-date, {failed} failed)")


def main():
    parser = argparse.ArgumentParser(
        description="Normalize score files via Partitura for visual regression"
    )
    default_input = Path(__file__).resolve().parents[2] / "test" / "data"
    default_output = Path(__file__).resolve().parents[2] / "test" / "data_normalized"

    parser.add_argument("--input", type=Path, default=default_input,
                        help=f"Input directory (default: {default_input})")
    parser.add_argument("--output", type=Path, default=default_output,
                        help=f"Output directory (default: {default_output})")
    args = parser.parse_args()

    normalize(args.input.resolve(), args.output.resolve())


if __name__ == "__main__":
    main()
