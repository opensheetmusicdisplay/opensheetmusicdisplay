# TAB rhythm dots: original comparison fixture

`tab-rhythm-reference.mscx` is an original, programmatically authored native
MuseScore score. `tab-rhythm-reference.musicxml` was exported from that score
by MuseScore Studio 4.7.5. This is not a third-party song or an imported
MusicXML score presented as a native reference.

The five measures contain a dotted quarter, double-dotted quarter, dotted
chord, beamed dotted eighth/sixteenth, and dotted whole note in 6/4. Four
parts repeat these on rhythmic TAB with stems down, rhythmic TAB with stems
up, stemless TAB, and paired standard notation plus stemless TAB.

## What to compare

- Rhythmic TAB: one dot set per note/chord, beside the rhythm stem, outside
  the fret staff; the double dot and beamed note keep their source duration.
- Stemless TAB: no floating rhythm dots. The paired standard staff supplies
  the rhythm without duplicating dots on its TAB staff.
- Whole notes: the native MuseScore reference has no stem or rhythm dot on
  TAB; the standard staff retains its dotted whole note.

The new OSMD option is **off by default**:

```ts
osmd.EngravingRules.TabRhythmRendered = true;
await osmd.load(musicxml);
osmd.render();
```

It enables VexFlow's existing TAB stems/flags and adds augmentation dot glyphs.
Explicit `<stem>none</stem>`, whole notes, and grace notes retain their existing
TAB rendering. `TabBeamsRendered` still controls XML beams independently.
Up/down directions use OSMD's existing wanted-stem policy; an unspecified
single-voice TAB stem defaults up. Refresh with `updateGraphic()` when changing
`SetWantedStemDirectionByXml` on a loaded score.

This uses VexFlow's stem and flag shapes, rather than reproducing MuseScore's
fonts, half-note stem style, or spacing. It does not add TAB rests or change
MusicMaster's detached-stem styling. The images are an engraving comparison,
not a claim of pixel equivalence between the engines.

## Images and reproduction

- `musescore-1.png`: actual PNG exported by the installed MuseScore executable
  from the native `.mscx`, at 130 DPI.
- `osmd-default.png`: this branch with the default stemless setting.
- `osmd-rhythmic.png`: this branch with `TabRhythmRendered = true`.

From the repository root:

```sh
npm run build:webpack
node test/data/tab-rhythm-dots/render-comparison.mjs
```

The screenshot script uses the installed Chrome browser through Playwright.
To compare default output with a separately built upstream bundle, set
`OSMD_BASELINE_BUNDLE` to its absolute path. Against upstream `944390fd`, the
whole-score default PNGs had identical SHA-256 hashes with this fixture.
The generated optional `osmd-upstream.png` is not checked in.

To export again with MuseScore on macOS, use fresh output filenames:

```sh
"/Applications/MuseScore 4.app/Contents/MacOS/mscore" \
  -o /tmp/tab-rhythm-reference.musicxml \
  test/data/tab-rhythm-dots/tab-rhythm-reference.mscx
"/Applications/MuseScore 4.app/Contents/MacOS/mscore" \
  -r 130 -o /tmp/tab-rhythm-reference.png \
  test/data/tab-rhythm-dots/tab-rhythm-reference.mscx
```

MuseScore creates the page image as `/tmp/tab-rhythm-reference-1.png`.
The local MuseScore CLI sometimes exits during shutdown after writing its
exports; the exported XML, five-measure content and PNG were checked directly.

## Validation (2026-11-05)

The focused tests use this exported MusicXML, cloned before each load. They
check dot positions relative to the stem base, chord dot count, exact logical
durations, up/down directions, explicit stemless TAB, whole notes, beam
suppression, redraw/reflow, coloring/visibility, and canvas rendering.

- Chrome suite and TypeScript: **964 passed**, including five focused tests.
- Lint and production webpack build: pass (three performance warnings).
- Default screenshot: identical to upstream for this reference.
- Firefox and the full screenshot corpus have not been run.
