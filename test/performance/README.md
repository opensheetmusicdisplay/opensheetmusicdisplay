# Performance and validation tools

Tools for benchmarking and validating the skyline/bottom-line calculation
(see `GeometricSkyBottomLineContext`, `EngravingRules.UseGeometricSkyBottomLineCalculation`, #937),
generic render comparison helpers, and tools for timing, profiling and comparing OSMD bundles in Chrome
(see [Timing, profiling and output checks in Chrome](#timing-profiling-and-output-checks-in-chrome)).

OSMD calculates the skylines in one of two ways, which these tools compare:
- **geometric**, the default since 2.0.0 (`UseGeometricSkyBottomLineCalculation` true) and the fastest: from the extents
  of the VexFlow draw calls in a virtual context (`GeometricSkyBottomLineContext`), without drawing anything.
- **pixel-based**, also called **raster** (`UseGeometricSkyBottomLineCalculation` false, OSMD's method before 2.0.0):
  draws the measures on a canvas and scans its pixels, read with `getImageData`. Per staffline (a canvas per measure),
  or from `SkyBottomLineBatchMinMeasures` measures on in batches (`SkyBottomLineBatchCalculator`, the measures in table
  canvases), with the batch backend Plain (`SkyBottomLineBatchCalculatorBackendType`; "Plain" as in without WebGL: the
  WebGL backend was removed, as it was even slower).

All node tools must be run **from the repository root** and need a current build
(`npx webpack --config webpack.dev.js && cp build/opensheetmusicdisplay.js build/opensheetmusicdisplay.min.js`).

## Benchmarks

- `skylineBenchBrowser.html` — measures `osmd.render()` and the skyline phase for the geometric
  calculation (`geo`) and the pixel-based one, per staffline (`rasterSingle`) and in batches
  (`rasterBatchPlain`), in a real browser.
  Serve the repo root, e.g. `npx http-server -p 8081 .`, then open
  `http://localhost:8081/test/performance/skylineBenchBrowser.html`.
- `skylineBench.mjs` — the same comparison in node (jsdom + node-canvas). Note that node-canvas
  `getImageData` is CPU-backed, so the raster baselines are faster here than in browsers.
  `node test/performance/skylineBench.mjs [runsPerMode]`
- `skylineBenchDetail.mjs` — breakdown of the skyline phase into `format()` / `draw()` / rest.
  `node test/performance/skylineBenchDetail.mjs [sample1,sample2,...]`

## Skyline parity validation (geometric vs pixel-based)

- `skylineParity.mjs` — compares the skyline/bottomline arrays of both methods for all
  `test/data` samples and reports difference statistics.
  `node test/performance/skylineParity.mjs [filterRegex] [maxSamples] [--with-batch]`
- `skylineDrill.mjs` — for one sample: locates divergent regions, maps them to measures, and dumps
  the geometric draw calls that touched them.
  `node test/performance/skylineDrill.mjs <sampleFilename> [threshold]`

Methodology note: renders are deterministic - re-renders of a loaded sheet are identical to the
first render (verified over the whole corpus; formerly they drifted because some VexFlow state
persisted across renders, fixed by the state resets in
`VexFlowMusicSheetCalculator.calculateMeasureXLayout()`/`clearRecreatedObjects()`).
Captures therefore simply come from a fresh `load()` plus one render per compared mode;
the tools and the test (`test/MusicalScore/Graphical/GeometricSkyBottomLine_Test.ts`) do this.

## Visual A/B comparison

- `runVisualAB.sh` — renders the full sample corpus twice (working tree vs stashed `src/`, e.g.
  develop) and compares pixel-wise: `bash test/performance/runVisualAB.sh`
- `compareImages.mjs` — compares two directories of PNGs, reports differing pixel counts/regions,
  writes red-overlay `*_DIFF.png` images for the worst offenders.
  `node test/performance/compareImages.mjs <dirA> <dirB> [channelThreshold] [maxDiffImages]`
- `compareSvgDirs.mjs` — compares two directories of SVGs (e.g. from `generateImages_browserless.mjs ... svg`)
  byte by byte, raw and with VexFlow's `vf-auto####` element ids normalized (they are numbered by a global counter,
  which shifts when a change constructs more or fewer VexFlow objects).
  `node test/performance/compareSvgDirs.mjs <dirA> <dirB>`
- `layoutIdentity.mjs` — for changes that must not change the layout (node, jsdom): are the skylines of every staff line,
  the bounding boxes of all measures, staff entries, voice entries and notes, and every bounding box of every page tree
  bit-identical between bundles?
  `node test/performance/layoutIdentity.mjs <a.min.js>,<b.min.js> [filterRegex] [--pageFormat=A4_P] [--renders=2] [--alignRests=1]`

## Timing, profiling and output checks in Chrome

Timings in node (jsdom) distort the DOM-heavy parts of OSMD (e.g. drawing, reading the MusicXML), so these tools measure in
headless Chrome over the DevTools protocol (node 22+; Chrome is `CHROME_PATH` or the platform's default installation).
They serve the repository root, so the bundles to compare must be below it. Build each version with
`npx webpack --config webpack.prod.js` (after `npm run prebuild` if `src/VexFlowPatch` changed) and copy
`build/opensheetmusicdisplay.min.js` to e.g. `export/ab/develop.min.js`: not into `build/`, which every build empties.

- `chromeAB.mjs` (page `chromeAB.html`) — paired, shuffled A/B timing of bundles: all bundles in one page, each renders the
  sample once per round in a shuffled order and is compared with the first bundle of the same round, over several fresh
  page sessions; reports the median of the paired ratios per sample, the range of the session medians, and the phase
  timers (layout, skyline, drawing). Measure a bundle against a copy of itself to see the noise (~0.2-0.7% on average).
  `node test/performance/chromeAB.mjs --bundles=export/ab/develop.min.js,export/ab/branch.min.js [--mode=render|layout|frame|load]
  [--samples=...] [--sessions=4] [--rounds=12]`
  - `--mode=render` times `render()` only. The browser lays out the drawn SVG after it, which took 15-27% of the time until
    the score can be shown in measurements of October 2026 (scores without forced layouts): `--mode=layout` includes it (forced right after
    `render()`). Use it for changes
    that can move work between OSMD and the browser: e.g. avoiding the forced layouts of `SVGContext.measureText()`
    (`getBBox()`) only makes `render()` return sooner, since Chrome lays out incrementally.
  - After each timed render, the layout is forced outside the timing, so that it isn't timed in the next render (in
    `getContainerContentWidth()`), which may be another bundle's.
- `chromeSvgCompare.mjs` (page `chromeAB.html`) — are the SVGs that the bundles render in Chrome identical for the whole
  corpus, raw and with the `vf-auto` ids normalized? With `--numbers`: for differing SVGs, are they equal except for
  numbers, and by how much do these differ; with `--pixels`, the differing pages are also rasterized and compared.
  `node test/performance/chromeSvgCompare.mjs --bundles=<a.min.js>,<b.min.js> [--filter=regex] [--numbers [--pixels]]`
- `chromeProfile.mjs` (page `chromeProfile.html`) — CPU profiles of `render()` (and `load()` with `--loads=N`; a sampling
  heap profile with `--alloc`) and wall-clock phase timers. For readable profiles, profile a bundle with function names:
  `npx webpack --config test/performance/webpack.names.mjs` builds `export/bundles/names/opensheetmusicdisplay.min.js`.
  `node test/performance/chromeProfile.mjs --save=export/prof/develop [--samples=...] [--renders=10] [--alloc] [--loads=5]`
  - `profileBreakdown.mjs` — the share of the phases, of VexFlow's Formatter and of the code origins (OSMD, VexFlow,
    native DOM calls, GC), the top self time by class and method, and with `--tree` the call tree.
    `node test/performance/profileBreakdown.mjs export/prof/develop [--kind=load] [--tree --root=drawSheet --depth=4]`
  - `allocationSites.mjs` — the top allocating functions (and callers) from the heap profiles of `--alloc`.
    `node test/performance/allocationSites.mjs export/prof/develop`
- `chromeEval.mjs` (page `chromeProfile.html`) — evaluates an expression for each sample after loading and rendering it, for
  experiments (`window.osmd`, `window.OSMD`, `renderN()`, `paintN()`, `loadN()`).
  `node test/performance/chromeEval.mjs --expr="renderN(3).map(t => t.total)" [--samples=...] [--page=fakeBBox=1]`
- `chromeForcedLayouts.mjs` (page `chromeProfile.html`) — counts the forced layouts (`getBBox()`) of one render per sample
  over the corpus, by VexFlow caller and measured text, and lists the samples with the most time in them.
  `node test/performance/chromeForcedLayouts.mjs [--filter=regex]`

Run one timing tool at a time, on an otherwise idle machine: parallel load distorts the timings more than the noise above.

## Safari and WebKit

Compares the rendering speed of OSMD 2.2.1 (from npm) with this checkout in real Safari and in Playwright's WebKit, on
GitHub's macOS runners (`.github/workflows/perf-bench-safari.yml`, runs on pushes to the branch `perf/safari-bench`,
where these files are).
Made in November 2026 for the 2.3.0 release and the warm keeper (`osmd.KeepWarm`, a PR at the time), because the
maintainers have no Mac: does Safari (JavaScriptCore) also render slower after `clear()`, once the memory is collected,
like Chrome (V8)?

### Method

All builds of a comparison run on one page, each score measured with all builds back to back in random order, the score
order shuffled every round (the paired design of issue #1716's measurements), so that the machine's speed changes
cancel out. An A/A pair (`dev` vs `devAA`, the same build twice) shows the noise that's left. Results are the median over
the scores of the per-score median of the paired ratios (`browserBenchCompare.py`).

- `browserBenchWarm.html`: warm rendering, the 21 scores of issue #1716: each measurement on a new instance, `clear()` after it.
  No forced garbage collection (`gc()` before each measurement penalizes builds that free their memory, see below).
- `browserBenchClearIdle.html`: the app's score switch: one instance per build, `clear()`, then the page idles 10 s (the
  browsers collect garbage then), then `load()` + `render()` of the next score; 6 scores. `devAppKeep` keeps a small
  rendering alive (the keeper score in `browserBenchScores/`, rendered once at the start), like OSMD's warm keeper does where
  `requestIdleCallback` exists (Safari doesn't have it).
- `browserBench.mjs <webkit|safari> <page> <session> <rounds> <warmup> <out.json>`: serves the folder, opens the page in
  Playwright's WebKit or in Safari (safaridriver), appends the page's result to the JSON file.
- `browserBenchPrepare.sh`: makes `test/performance/browserBenchWork/` (gitignored) with the builds, scores, pages and build
  lists. Run after `npm install`, which builds this checkout.

Why no `gc()`: OSMD 2.2.1 kept the last rendering in memory (fixed in #1853). With a forced full GC before each
measurement and nothing of a build alive, V8 discards the optimized code it compiled for that build's objects (their
hidden classes die), and the next render runs ~70% slower: develop looked 60% slower than 2.2.1 that way, while it's
~13% faster without it.

### Results

Download a run's artifacts (`gh run download <run id> -R opensheetmusicdisplay/opensheetmusicdisplay`), then e.g.
`python browserBenchCompare.py clearidle.json v221:dev dev:devAA dev:devAppKeep`. The workflow log's last step prints the same.

Locally, Playwright's WebKit runs on Windows and Linux too: `npx playwright install webkit`, then in browserBenchWork/
`node browserBench.mjs webkit browserBenchClearIdle.html 1 3 1 clearidle.json` (with builds.json from builds-clearidle.json).
