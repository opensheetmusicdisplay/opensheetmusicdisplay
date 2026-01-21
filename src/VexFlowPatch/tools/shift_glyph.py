#!/usr/bin/env python3
"""Shift a VexFlow glyph by font units. Writes to src/VexFlowPatch/vexflow_font.js."""
"""Usage:
  python src/VexFlowPatch/tools/shift_glyph.py glyph x [y]

  # shift glyph v9a (downstem flag) by 10 font degrees to the right
  python src/VexFlowPatch/tools/shift_glyph.py v9a 10

  # shift glyph v9a downwards by 10 font degrees
  python src/VexFlowPatch/tools/shift_glyph.py v9a 0 -10
"""
import argparse
import re
import sys
from pathlib import Path


def _format_num(value: float) -> str:
    if abs(value - int(value)) < 1e-9:
        return str(int(value))
    return f"{value:.6f}".rstrip("0").rstrip(".")


def _shift_outline(outline: str, dx: float, dy: float) -> str:
    tokens = outline.split()
    out = []
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
                    val += dx
                else:
                    val += dy
                out.append(_format_num(val))
            i += count
        else:
            out.append(tok)
            i += 1
    return " ".join(out)


def shift_glyph(font_path: Path, glyph: str, dx: float, dy: float) -> None:
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

    x_min = float(x_min_match.group(1))
    x_max = float(x_max_match.group(1))
    outline = outline_match.group(1)

    new_outline = _shift_outline(outline, dx, dy)
    new_x_min = x_min + dx
    new_x_max = x_max + dx

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
        description="Shift a VexFlow glyph by font units."
    )
    parser.add_argument("glyph", help="Glyph name, e.g. v9a")
    parser.add_argument("dx", type=float, help="Horizontal shift in font units")
    parser.add_argument(
        "dy",
        type=float,
        nargs="?",
        default=0.0,
        help="Vertical shift in font units (default: 0)",
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
        shift_glyph(args.font, args.glyph, args.dx, args.dy)
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        return 1

    print(
        f"Shifted {args.glyph} by dx={args.dx}, dy={args.dy} units in {args.font}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
