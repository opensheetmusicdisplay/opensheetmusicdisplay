# Font profiles and bundle contract

## Entry-point policy

OSMD renderer code imports VexFlow only through `VexFlowAdapter.ts`. The adapter currently selects `vexflow/core`, because OSMD explicitly owns font loading and does not need VexFlow's larger multi-font bundle. This is one reviewable packaging decision, not an assumption repeated throughout the renderer.

Two OSMD bundles are built:

- `opensheetmusicdisplay.min.js` is self-contained. It embeds and awaits full Bravura, subsetted Bravura Text, and Academico regular, italic, and bold.
- `opensheetmusicdisplay-core.min.js` contains no font binary data. Its default typed profile declares the same five required faces and produces a clear load error if the host has not supplied them.

Both bundles expose `IOSMDFontProfile` and `IOSMDFontFace`. A consumer can pass a different complete profile through `fontProfile`, including ordinary URLs or data URLs.

The selected family names are propagated through VexFlow and OSMD-owned notation runs. This includes dynamics, chord-symbol SMuFL text, and ordinary score text; a custom profile therefore does not depend on hidden `Bravura` or `Academico` literals in those paths.

## Measurement and export guarantees

`OpenSheetMusicDisplay.load()` awaits `loadFonts()` before MusicXML parsing creates graphical geometry. Each required style and weight is loaded through the browser Font Loading API and validated independently; VexFlow's active music/text families are selected only afterward.

Standalone SVG exports embed every source in the active profile by default. Set `embedFontProfileInSvg: false` to opt out. A core-bundle profile can only create a fully portable SVG when its supplied sources are themselves portable, such as data URLs.

## Why Bravura Text is subsetted but Bravura is not

OSMD directly controls its music-text and chord-symbol code points, so Bravura Text has a small auditable glyph surface. VexFlow can select notation glyphs indirectly through internal tables, so source-code scanning alone cannot prove a complete Bravura subset. The default profile therefore keeps Bravura complete while subsetting Bravura Text.

The exact files, hashes, subset range, and SIL OFL texts are published under [`fonts/`](../fonts/README.md). `npm run test:font-bundles` verifies that the default build has exactly five embedded WOFF2 payloads and the core build has none.

## Temporary VexFlow pin

While the prerequisite VexFlow changes are under review, the draft uses immutable integration commit `e9ae567e1e25d75075d8c4fae4fd8119cd6b0b08`. That integration-only commit adds a package `prepare` hook so a Git install produces the CommonJS and declaration outputs VexFlow's package exports promise, including when npm prepares a source snapshot without `.git` metadata. The OSMD dependency must move to an official released VexFlow version before merge.
