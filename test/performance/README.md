# Performance and validation tools

Tools for benchmarking and validating the skyline/bottom-line calculation
(see `GeometricSkyBottomLineContext`, `EngravingRules.UseGeometricSkyBottomLineCalculation`, #937),
plus generic render comparison helpers.

All node tools must be run **from the repository root** and need a current build
(`npx webpack --config webpack.dev.js && cp build/opensheetmusicdisplay.js build/opensheetmusicdisplay.min.js`).

## Benchmarks

- `skylineBenchBrowser.html` — measures `osmd.render()` and the skyline phase for all four
  calculation methods (geometric, per-staffline raster, batch Plain, batch WebGL) in a real browser.
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
the tools and the karma test (`test/MusicalScore/Graphical/GeometricSkyBottomLine_Test.ts`) do this.

## Visual A/B comparison

- `runVisualAB.sh` — renders the full sample corpus twice (working tree vs stashed `src/`, e.g.
  develop) and compares pixel-wise: `bash test/performance/runVisualAB.sh`
- `compareImages.mjs` — compares two directories of PNGs, reports differing pixel counts/regions,
  writes red-overlay `*_DIFF.png` images for the worst offenders.
  `node test/performance/compareImages.mjs <dirA> <dirB> [channelThreshold] [maxDiffImages]`
