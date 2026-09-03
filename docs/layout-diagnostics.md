# Layout diagnostics

The layout diagnostics harness renders MusicXML through a real Chrome browser and publishes a searchable HTML gallery. It keeps visual review separate from normal unit tests while making each run reproducible and machine-checkable.

## Full corpus

Install dependencies, build OSMD, and render every score under `test/data` at 1200 px:

```bash
npm install
npx playwright install chromium
npm run build
npm run render:layout-corpus
```

Open `build/layout-corpus/index.html`. The gallery includes:

- search plus feature and severity filters;
- a bounded overview and per-score pages with previous/next navigation;
- plain and annotated SVG/PNG views;
- structured metrics and diagnostic layers for spacing, lyrics, slurs, skyline, articulations, fonts, dynamics, and harmony;
- required-font validation and non-finite SVG/metric checks;
- a second `updateGraphic()`/`render()` pass with geometry-drift detection; and
- OSMD/VexFlow revisions and browser, bundle, harness, option, score, and font fingerprints in `results.json`.

Only objective faults fail the command: load/render errors, missing SVG, non-finite geometry, required-font failures, and first/second-render drift. Heuristic collision findings remain review badges.

## Focused and comparison runs

Run `node scripts/render-layout-corpus.mjs --help` for all options. The harness accepts:

- one or more MusicXML files or directories;
- one or more labeled OSMD bundles for side-by-side output;
- earlier `results.json` files as comparison baselines;
- 900/1200/1600 px or custom render widths;
- composable diagnostic layers and the `stage5`/`stage6` aliases;
- regular-expression filters and exclusions;
- MusicXML feature filters;
- one-based sharding and up to two workers; and
- checkpointing with `--resume`.

Generated galleries belong under `build/` and are not committed.
