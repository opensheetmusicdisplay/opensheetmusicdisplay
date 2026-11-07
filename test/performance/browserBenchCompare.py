"""Paired comparison of builds of a bench-multi.html (or jsdom-bench.mjs) run: for each pair of labels and metric, the change
per score (median of the ratios measured in the same round), its median and geometric mean over the scores, the medians per
session, and per score the render() change with the first label's time and the SVG element counts.
Usage: python compare_pairs.py results.json[,more.json] A:B [C:D ...]   (+ = B slower than A)"""
import json
import math
import statistics
import sys

sessions = [s for path in sys.argv[1].split(",") for s in json.load(open(path))]
pairs = [arg.split(":") for arg in sys.argv[2:]]
by_key = {}
for s in sessions:
    for r in s["results"]:
        by_key.setdefault((r["session"], r["round"], r["score"]), {})[r["build"]] = r
    if s["errors"]:
        print("errors in session", s["session"], len(s["errors"]), s["errors"][:2])
scores = sorted({k[2] for k in by_key})
session_ids = sorted({k[0] for k in by_key})
metrics = [m for m in ("render", "renderLayout", "load") if all(m in r for k, row in by_key.items() for r in row.values())]


def ratios(a, b, metric, score, session=None):
    return [m[b][metric] / m[a][metric] for (se, _r, sc), m in by_key.items()
            if sc == score and (session is None or se == session) and a in m and b in m]


def median_change(per_score):
    return (statistics.median(per_score) - 1) * 100


def first(label, score, field):
    return statistics.median([m[label][field] for k, m in by_key.items() if k[2] == score and label in m])


pair_count = len(ratios(*pairs[0], "render", scores[0]))
print(f"{len(sessions)} sessions, {pair_count} pairs per score, {len(scores)} scores; % time, + = slower")
for a, b in pairs:
    print(f"\n=== {b} vs {a}")
    for metric in metrics:
        per_score = [statistics.median(ratios(a, b, metric, sc)) for sc in scores]
        geomean = (math.exp(statistics.mean(math.log(v) for v in per_score)) - 1) * 100
        slower = sum(1 for v in per_score if v > 1)
        per_session = [median_change([statistics.median(ratios(a, b, metric, sc, se)) for sc in scores]) for se in session_ids]
        print(f"  {metric:12} median {median_change(per_score):+5.1f}%, geomean {geomean:+5.1f}%, slower in {slower:2}/{len(scores)};"
              f" per session {' / '.join(f'{v:+.1f}%' for v in per_session)}")
    has_layout = "renderLayout" in metrics
    print(f"  {'score':54} {'render':>7} {'+layout' if has_layout else '':>7} {a + ' ms':>9}  SVG elements")
    for sc in sorted(scores, key=lambda sc: -first(a, sc, "render")):
        render = (statistics.median(ratios(a, b, "render", sc)) - 1) * 100
        layout = f"{(statistics.median(ratios(a, b, 'renderLayout', sc)) - 1) * 100:+6.1f}%" if has_layout else ""
        print(f"  {sc[:54]:54} {render:+6.1f}% {layout:>7} {first(a, sc, 'render'):9.1f}  "
              f"{first(a, sc, 'svgElements'):7.0f} -> {first(b, sc, 'svgElements'):7.0f}")
