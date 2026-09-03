# VexFlow 5 migration rationale

## Problem statement

This work began from a practical voice-and-piano engraving problem. The VexFlow 1.2 formatter path produced weak lyric-to-note relationships, uneven rhythmic spacing, fragile rerenders, and slur geometry that was difficult to improve without access to finalized notation geometry. A mechanical API port would make the code compile, but would preserve the renderer assumptions that caused those problems.

The work therefore uses VexFlow 5's formatter and finalized geometry as a new base and judges compatibility by musical meaning, stable layout, and browser-rendered output rather than pixel identity with VexFlow 1.2. Dorico was one visual reference during development, not a source-code or serialized-geometry dependency.

## What the expanded migration does

- Moves OSMD to the modern VexFlow API while removing the obsolete `VexFlowPatch` archive only after its active behavior has been classified.
- Centralizes the package-entry decision in `VexFlowAdapter.ts`; renderer classes no longer import a VexFlow distribution entry point directly.
- Uses the modern formatter, then repairs assumptions around rhythmic spacing, lyric footprints, rests, barlines, repeats, voltas, ties, slurs, articulations, dynamics, and harmony.
- Preserves semantic MusicXML data and recalculates geometry from the current score. Imported slur Bézier coordinates are deliberately not treated as authoritative engraving geometry.
- Retains structured annotation diagnostics for spacing, skyline, fonts, articulations, slur obstacles, generated candidates, rejection reasons, scores, and selected results.
- Requires repeat renders to be geometrically stable and tests hidden-instrument rebuilds rather than treating the first render as the only lifecycle.

## Why this is not a pixel-preserving port

Trying to reproduce the old formatter pixel-for-pixel would make every new VexFlow improvement look like a regression and encourage compensating offsets. Instead, the acceptance rules are objective where possible:

- no load/render errors or non-finite geometry;
- no missing required fonts or inherited notation-font ambiguity;
- unchanged musical ownership and articulation counts across rebuilds;
- hard notation and lyric clearances remain hard after justification;
- second-render geometry matches first-render geometry;
- focused engraving cases remain readable at 900, 1200, and 1600 px.

Heuristic collision and aesthetic findings remain review annotations, not automatic failures. The comparison renderer can load arbitrary old and new bundles, so the migration can still be examined side by side without keeping two production layout engines.

## Review boundaries

The migration, font contract, renderer refinements, and diagnostic harness are independently reviewable. Harmony presentation is also separable from the renderer port if maintainers prefer to review that engraving policy independently.

See [font-profiles.md](font-profiles.md) for the font contract and [vexflow-5-patch-disposition.md](vexflow-5-patch-disposition.md) for the prerequisite and patch audit.
