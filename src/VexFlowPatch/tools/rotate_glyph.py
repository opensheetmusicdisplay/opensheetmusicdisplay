#!/usr/bin/env python3
"""Rotate a VexFlow glyph by degrees (clockwise by default). Writes to src/VexFlowPatch/vexflow_font.js."""
"""Usage:
  python src/VexFlowPatch/tools/rotate_glyph.py glyph degrees [ccw]
  #ccw = counter-clockwise

  # rotate glyph v9a (downstem flag) by 12 degrees clockwise
  python src/VexFlowPatch/tools/rotate_glyph.py v9a 12

  # rotate glyph v9a by 12 degrees counter-clockwise
  python src/VexFlowPatch/tools/rotate_glyph.py v9a 12 ccw
"""
import argparse
import math
import re
import sys
from pathlib import Path
from typing import List, Tuple


def _format_num(value: float) -> str:
    if abs(value - int(value)) < 1e-9:
        return str(int(value))
    return f"{value:.6f}".rstrip("0").rstrip(".")


def _rotate_point(x: float, y: float, radians: float) -> Tuple[float, float]:
    cos_a = math.cos(radians)
    sin_a = math.sin(radians)
    return (x * cos_a - y * sin_a, x * sin_a + y * cos_a)


def _rotate_outline(outline: str, radians: float) -> Tuple[str, List[float]]:
    tokens = outline.split()
    out = []
    xs: List[float] = []
    i = 0
    while i < len(tokens):
        tok = tokens[i]
        if tok in {"m", "l", "b", "q"}:
            out.append(tok)
            i += 1
            if tok in {"m", "l"}:
                count = 2
            elif tok == "b":
                count = 6
            else:
                count = 4
            nums = tokens[i : i + count]
            if len(nums) != count:
                raise ValueError("Unexpected outline token count.")
            for j, num in enumerate(nums):
                val = float(num)
                if j % 2 == 0:
                    x = val
                    y = float(nums[j + 1])
                    new_x, new_y = _rotate_point(x, y, radians)
                    xs.append(new_x)
                    out.append(_format_num(new_x))
                    out.append(_format_num(new_y))
                else:
                    continue
            i += count
        else:
            out.append(tok)
            i += 1
    return " ".join(out), xs


def rotate_glyph(font_path: Path, glyph: str, degrees: float, clockwise: bool) -> None:
    text = font_path.read_text(encoding="utf-8")
    pattern = rf'"{re.escape(glyph)}"\s*:\s*\{{[^}}]*?\}}'
    match = re.search(pattern, text, re.DOTALL)
    if not match:
        raise ValueError(f"Glyph '{glyph}' not found in {font_path}.")

    entry = match.group(0)
    x_min_match = re.search(r'"x_min"\s*:\s*(-?\d+(?:\.\d+)?)', entry)
    x_max_match = re.search(r'"x_max"\s*:\s*(-?\d+(?:\.\d+)?)', entry)
    outline_match = re.search(r'"o"\s*:\s*"([^"]*)"', entry)
    if not (x_min_match and x_max_match and outline_match):
        raise ValueError(f"Glyph '{glyph}' entry is missing expected fields.")

    outline = outline_match.group(1)
    radians = math.radians(-degrees if clockwise else degrees)

    new_outline, xs = _rotate_outline(outline, radians)
    if not xs:
        raise ValueError("No x-coordinates found in outline.")
    new_x_min = min(xs)
    new_x_max = max(xs)

    updated = entry
    updated = re.sub(
        r'("x_min"\s*:\s*)-?\d+(?:\.\d+)?',
        lambda m: m.group(1) + _format_num(new_x_min),
        updated,
        count=1,
    )
    updated = re.sub(
        r'("x_max"\s*:\s*)-?\d+(?:\.\d+)?',
        lambda m: m.group(1) + _format_num(new_x_max),
        updated,
        count=1,
    )
    updated = re.sub(
        r'("o"\s*:\s*")[^"]*(")',
        lambda m: m.group(1) + new_outline + m.group(2),
        updated,
        count=1,
    )

    new_text = text[: match.start()] + updated + text[match.end() :]
    font_path.write_text(new_text, encoding="utf-8")


def main() -> int:
    default_font = (
        Path(__file__).resolve().parent.parent / "src" / "fonts" / "vexflow_font.js"
    )
    parser = argparse.ArgumentParser(
        description="Rotate a VexFlow glyph by degrees (clockwise by default)."
    )
    parser.add_argument("glyph", help="Glyph name, e.g. v9a")
    parser.add_argument("degrees", type=float, help="Rotation degrees")
    parser.add_argument(
        "direction",
        nargs="?",
        default="cw",
        choices=["cw", "ccw"],
        help="Rotation direction: cw (default) or ccw",
    )
    parser.add_argument(
        "--font",
        type=Path,
        default=default_font,
        help=f"Path to font file (default: {default_font})",
    )
    args = parser.parse_args()

    if not args.font.exists():
        print(f"Font file not found: {args.font}", file=sys.stderr)
        return 1

    try:
        rotate_glyph(args.font, args.glyph, args.degrees, args.direction == "cw")
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        return 1

    print(
        f"Rotated {args.glyph} by {args.degrees} degrees ({args.direction}) in {args.font}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
