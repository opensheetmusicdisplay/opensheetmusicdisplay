## [1.8.5](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/1.8.4...1.8.5) (2024-01-09)


### Bug Fixes

* **Buzz Roll:** Fix error in SVG export for buzz rolls (PR [#1493](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1493), [#1413](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1413)) ([e565af1](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/e565af114ca065f9266c2f96ecee9460e19233dc))
* **Crescendo:** Fix crescendo wedges for multi instrument scores ([#1480](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1480), PR [#1499](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1499)) ([3d60d46](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/3d60d4678ad5d68a6ead1f0432bd7b41d4c31ea6))
* **Noteflight:** Fix rare error in erroneous Noteflight samples ([#1473](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1473)) ([0695159](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/06951596931ad73358519e7754e65ffb09e2a769))
* **Fontstyle:** Fix BoldItalic text displayed as Bold instead of BoldItalic ([#1487](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1487)) ([0e229dd](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/0e229ddf865b79d5899d122035a8422b862666b5)), closes [#1483](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1483) [#1483](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1483)
* **Fraction:** Fix rare infinite loop with complex rhythms and floating point inaccuracies in greatestCommonDenominator ([#1478](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1478)) ([8e33752](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/8e3375210007f357409808132de692ab3431cee2))
* **In-Measure Clefs:** Wrong clef at end of measure no longer appears in certain Sibelius-exported scores ([#1461](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1461)) ([dab58b2](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/dab58b2aeb1e9a407adf8b27577f5079088a90bd))
* **Ledger Lines:** Fix whole and half rests outside staff lines not having ledger lines ([#1142](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1142), PR [#1463](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/pull/1463)) ([e273c1c](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/e273c1cea10e638e8f55336d98091c5600a88f86)) 
* **Subtitle:** Recognize subtitle by credit-type element (even if given y value above title) ([#1456](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1456)) ([7c7329f](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/7c7329fd6754ad7d61213aaad44af4a625b36ff4))
* **SVG Export:** Fix octave shift bracket text overlapping ([#1482](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1482)) (only affects SVG export via JSDOM script). ([e62cd28](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/e62cd2800473cb059b7147ff49b63a8d7bbe79d9))
* **Tab Bends:** Fix Tab bend moving on second render (re-render) ([#1496](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1496), PR [#1497](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1497)) ([df69d9d](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/df69d9d87ce326848645d07f49b395531f32aab1))
* **Tabs:** Don't show fingerings by default in a tab staff ([#1468](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1468)). Add EngravingRule TabFingeringsRendered ([82068b7](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/82068b79a8c4428bbe0a4a3e3f627d22b4ce03f8))
* **Tabs:** Don't show time and key signature by default in a tab staff ([#1467](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1467)). Add EngravingRules TabTimeSignatureRendered, TabKeySignatureRendered ([10f9c78](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/10f9c787f767136d6ce78fabc8b8cced24faee44))
* **Tuplet:** Respect show-number="none" ([#1460](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1460)). Add EngravingRule TupletNumberUseShowNoneXMLValue ([68320ab](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/68320ab5fe824cb30850e5d5f357dfd15e7cd157))


### Features

* **Color:** Words nodes / expressions use XML color by default. Add EngravingRule ExpressionsUseXMLColor ([#1492](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1492), PR [#1498](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1498)) ([207fcd4](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/207fcd44fc7581f6e5d096b84e78bdf5849c77e2))
* **Expressions:** Show words text in bold if given in XML (PR [#1471](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1471)), add tempo expressions like allegro vivace to parsing ([4580100](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/4580100e0708c54f620253eec63a94512edd3d11))
* **Tabs:** Add EngravingRules TabKeySignatureSpacingAdded, TabTimeSignatureSpacingAdded (for tab-only scores). Fix tabs x-alignment broken (no release affected) ([#1489](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1489), PR [#1490](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1490)) ([47cdd11](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/47cdd11b3796b35fdf648bb2a7c423d13a5b4bda))



## [1.8.4](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/1.8.3...1.8.4) (2023-09-19)


### Bug Fixes

* **Error:** Fix faulty MusicXML files from Sibelius/GuitarPro erroring on open for faulty xml pedal, octaveshift ([#1450](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1450)) ([d1ea681](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/d1ea681363dace395fad3c45d4f9d91f86ee76b9))
* **iOS:** Fix memory leak when using Canvas on iOS in Safari ([#1411](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1411)) ([22d349d](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/22d349dc8ab4a393a3dad245d659f8c87759ec44))
* **Layout:** Fix invisible parts/measures affecting layout, especially when very note-dense ([#1444](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1444)) ([8bc6c6c](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/8bc6c6cd74e66c0e734f4a945868ba19960d8629))
* **Lyrics:** Fix lyrics position / staffentry x position if there's a whole rest in a secondary voice ([#1267](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1267)). Fix SourceStaffEntry.hasOnlyRests getter ([52b7116](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/52b71166bbd8d93c75a1065cdaca1f70806bd76d))
* **Percussion:** Fix position of whole rest note for 1-staffline rendering ([#1034](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1034)) ([25521e9](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/25521e92f5c2222e4d803283371669088fc58836))
* **Repetitions:** Fix volta number not read from ending node text value (Finale) ([#1367](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1367)). Respect print-object="no". ([5fb6c56](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/5fb6c569e12250278299d6f726e9d6ba31d8c1f4))
* **Subtitle:** Fix subtitle sometimes not displayed with certain MusicXML structures ([#1456](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1456)) ([642b83d](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/642b83dc27fd1671349eab691935953c903985c0))
* **Wedges:** Add missing in-between wedges for multiline crescendo/decrescendo ([#1277](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1277), PR [#1459](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1459)) ([45440a8](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/45440a82ed0809a391be1014d096f9e452dfb6b9))



## [1.8.3](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/1.8.2...1.8.3) (2023-08-17)


### Bug Fixes

* **Chord Symbols:** Fix chords not displayed when not above a note, e.g. multiple per note ([#1445](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1445), PR [#1446](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1446)) ([75a2f8a](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/75a2f8a33ece150ae07b6b691b395b507adb779d)), closes [#599](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/599) [#791](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/791) [#1443](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1443) [#1443](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1443)
* **Chord Symbols:** Chord Symbols on whole measure rests now start near the beginning of the measure, not in the middle above the rest note ([#1443](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1443)) ([0b7df62](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/0b7df6227fc509441e2dd1394aade3ef10ec94ac))
* **Fingering:** Fix multiple fingerings per note not shown/parsed (Sibelius xml syntax) ([#1442](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1442)) ([e121c0a](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/e121c0adb2909cba770852e11bfc4762bd2c2f8b))
* **Fingering:** Fix fingerings drawn if drawFingerings: false option was set, for above/below position ([6233d5a](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/6233d5a55bab11322808e4bc138200114d8dbe29)), closes [#650](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/650) [#1442](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1442)
* **OctaveShift:** Fix error for multiline shifts when (first) instrument hidden ([#1439](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1439)) ([c3d3402](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/c3d34020bb55575d0fbb155c278a451682ecf05b))
* **OctaveShift:** Fix short octave shifts (single note) overlapping text+bracket ([#1440](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1440), [#1378](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1378)). Add EngravingRule OctaveShiftOnWholeMeasureNoteUntilEndOfMeasure ([7ea0911](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/7ea0911b7a93538e369452c85240770489a47024))
* **Tabs:** Fix tab notes not x-aligned vertically when multiple ghost notes needed ([#1062](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1062)) ([6495011](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/64950112700b2ab2f24e900474a10d94f14338bd))


### Features

* **API:** Add osmd.EngravingRules.RenderCount (how many times render() was called) ([#1383](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1383), [#1420](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1420)) ([1e16c6d](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/1e16c6d341da5c26562f99a6aee93536d2aabd04))
* **Tabs:** Tab beams can be disabled optionally. Add EngravingRules.TabRenderBeams ([fb78862](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/fb78862e5280115dfec5796478a7f67698a62c04))



## [1.8.2](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/1.8.1...1.8.2) (2023-07-28)


### Bug Fixes

* **Measure Numbers:** Avoid collisions with group brackets / instrument brackets (shift measure numbers upwards) ([a43875f](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/a43875f72424091b6538db284a0662a1ce9dfdc6)), closes [#1430](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1430)
* **Metronome Marks:** Prevent multiple metronome marks per measure drawn ([#1393](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1393)). (Side effect: some marks less bold) ([c457922](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/c45792290a476fc234b9caa631d84a129c2eac39))
* **Tabs:** Fix errors for faulty tab xml files, add info log when fret, string missing ([#1432](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1432)) ([6b65369](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/6b6536928a94e6dc780096233ae9ecc0b6b7ab4f))
* **Build:** Fix npm install with node v18 and on MacOS when OSMD is a dependency, updating gl dependency etc ([#1433](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1433))


### Features

* **Tempo:** Render more tempo expressions like poco meno ([#1431](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1431)) by treating them as instant expressions graphically ([94b3dec](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/94b3dec263267fbcfba4ff20047107dc9931cddf))



## [1.8.1](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/1.8.0...1.8.1) (2023-07-14)


### Bug Fixes

* **Cursor:** Fix cursor type 3 (whole measure) when first measure(s) invisible (PR [#1429](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1429), [#1426](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1426)) ([7d085b0](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/7d085b04c4dc0fb1c023a9335ce29a8e74e5fa41))
* **Key Signature Change:** Fix wrong accidental positions for certain clefs ([#1423](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1423), PR [#1424](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1424)) ([aaaa63c](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/aaaa63c98172796831975a0cda9b789f1a307dc9))
* **X-Alignment:** Fix note x-alignment for staves with different key signatures (PR [#1427](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1427), [#1425](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1425)) ([1d8bb4f](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/1d8bb4f50b4b7615681d41b2f9707dd006745871)), closes [#1315](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1315) [0xfe/vexflow#1390](https://github.com/0xfe/vexflow/issues/1390)


### Features

* **Notehead:** Support inverted triangle notehead (PR [#1428](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1428), [#1418](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1418)) ([d62f51d](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/d62f51d90a0705f51e0c9fb4713a87b1a56ef78f))



# [1.8.0](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/1.7.6...1.8.0) (2023-06-23)


### Bug Fixes

* **Beams:** Fix beams and noteheads missing in rare cases ([#1073](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1073)) where Vexflow returns denominator 0. ([6bf4140](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/6bf414049c7b6b8a202f54877c7594732f58d0f3))
* **Chord Symbols:** Fix chord symbol centering above note for short chords ([#1396](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1396)). Add EngravingRules ChordSymbolExtraXShiftForShortChordSymbols, ChordSymbolExtraXShiftWidthThreshold ([3e7ed58](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/3e7ed583a0610c6bf675a7f2b62679c12f732b8e)), closes [#1376](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1376)
* **Dynamics:** Fix crescendo, decrescendo, wedges start x and end x, wedge overlaps. Widen most wedges ([#1404](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1404)) ([e1476b4](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/e1476b480a174b0f7e64d4227fda8d3c12edb347)), closes [#1405](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1405)
* **FixedMeasureWidth:** Fix not applied to first measure ([#1314](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1314)). Add EngravingRule FixedMeasureWidthUseForPickupMeasures, default false. ([c1f86f4](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/c1f86f425b2159d2f288acbc05c044774eae2e72))
* **Lyrics, ChordSymbols:** Fix measure elongation (to prevent overlaps) applied when lyrics or chord symbols not rendered ([#324](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/324), [#597](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/597), [#819](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/819)) ([bd0ce39](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/bd0ce39e56bc00601154ac4dda56e34e7c88e391))
* **Lyrics:** Fix short lyrics not looking vertically centered below notes. Fix dash overlap in short intervals. ([#1407](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1407), PR [#1408](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1408)) ([6798b69](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/6798b69c05f28242aa4cf689ba27a8a120560566))
* **Repeats:** Fix left barline of first measure not allowed to be repeat barline ([#1410](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1410)). Add EngravingRule RepetitionAllowFirstMeasureBeginningRepeatBarline ([525c48d](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/525c48daa3a904dae4e67b634567d02023450915))
* **Tuplets:** Fix repeated bracketed tuplet missing tuplet number with TupletNumberLimitConsecutiveRepetitions enabled ([#1402](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1402)) ([c2db9d7](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/c2db9d7f26435c82827541287c9da662c74bcf54)), closes [#1401](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1401) [#1401](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1401) [#1401](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1401)
* **Tuplets:** Fix tuplets not bracketed when not on single beam (e.g. including rest note) ([#1400](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1400), [#1401](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1401)). Add EngravingRule TupletsBracketedUseXMLValue ([a7fde50](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/a7fde50eec9dc2ed9e391a3de8d3fd3565fdae99))
* **Visual Regression Tests:** Use lower threshold ([#1398](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1398)). Fix scientific notation causing syntax error for low thresholds/hashes, not working+creating diff ([2286564](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/22865647a65d4803568eed84465a8a2b1e83cc58))


### Features

* **Cajon:** Add Option to fix note placement for 2-staffline cajon ([#1409](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1409)). Add EngravingRules.PercussionUseCajon2NoteSystem (default false) ([d2bfb90](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/d2bfb90de635cd69b9a4db28293ca24e5b13b9ed))
* **Dynamics:** Add EngravingRule IgnoreRepeatedDynamics, default false ([#767](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/767)), works for most situations (except e.g. repetition 2nd+ volta) ([2fadf05](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/2fadf058cd3d4d42844737f930b7278b9a362930))
* **Lyrics Spacing:** Reduce measure sizes for short notes with long lyrics by adding x-padding ([#1394](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1394), PR [#1395](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1395)). Add EngravingRules.LyricsUseXPaddingForShortNotes, LyricsXPaddingFactorForLongLyrics, LyricsXPaddingWidthThreshold ([8e1301f](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/8e1301f8116a6bc71cdcd1e175345496cfa20add))
* **Options:** Add EngravingRules SlurPlacementAtStems, SlurPlacementUseSkybottomLine (default false). Improve slur end articulation detection ([#1224](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1224)) ([5384272](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/5384272a4cab9cf7871153155bb1531977c19c81))
* **Tremolo:** Render Buzz Roll (unmeasured tremolo) ([#1413](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1413)). Add EngravingRule TremoloBuzzRollThickness ([4b66d1b](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/4b66d1be6623fe704fa27301dbde63318e6fe073))
* **Words:** Add option to place words inside staffline at defaultY XML value ([#1412](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1412)). Add EngravingRules PlaceWordsInsideStafflineFromXml, PlaceWordsInsideStafflineYOffset ([f884ec7](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/f884ec7a5f22a5665fbb97e40d207798fa73e428))



## [1.7.6](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/1.7.5...1.7.6) (2023-06-05)


### Bug Fixes

* **OctaveShift:** Fix error when octave shift end note/measure not found (e.g. IsExtraGraphicalMeasure). ([#1377](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1377)) ([3011019](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/301101923c390f91b7d20f3a807945aab6dc17d7)), closes [#1378](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1378) [#1376](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1376)
* **OctaveShift:** Fix octave shift not ending at measure end for multiline and whole measure notes ([#1378](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1378), PR [#1379](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1379)), make multi-line shift open-ended for in-between stafflines ([14493aa](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/14493aabce09f986cb80a30860f743c5f6b500bd)), closes [#1376](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1376)
* **OctaveShift:** Fix octave shift notes not shifted under certain conditions (end not respected) ([#1382](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1382), PR [#1386](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1386)) ([242dad0](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/242dad0ec65379f925d3f474ed1343b29200fbbc))
* **Typo:** Rename EngravingRules.AutoGenerateMutipleRestMeasuresFromRestMeasures AutoGenerateMultipleRestMeasuresFromRestMeasures (missing 'l')(PR [#1373](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1373))  ([4276613](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/427661341be7863d5b1d7df7ff370053d68f4920))


### Features

* **Copyright:** New option to render copyright: osmd.EngravingRules.RenderCopyright = true (renders identification/rights tag) ([#1365](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1365)) ([a489d47](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/a489d47a41e2200871491075a304cb877eb1f3fe)), closes [#353](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/353) [#727](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/727)
* **Expressions:** Add a few more expressions texts, e.g. ritard. now supported (PR [#1361](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1361)) ([e9859a2](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/e9859a205fe1e80a1ec0d4aaa6f9670c90ac31d4)), closes [#1357](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1357) [#1347](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1347)
* **FixedMeasureWidth:** Add EngravingRules.FixedMeasureWidth and FixedMeasureWidthFixedValue options ([#1314](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1314), PR [#1368](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1368)) ([4c31dde](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/4c31dde446ae0b962735f06340f62470ecccbec8))
* **System/Line break:** Add option newSystemFromNewPageInXML to do a system break for XML new-page even when newPageFromXML = false (PR [#1357](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1357)) ([f46c5cd](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/f46c5cd2293146335230c9c9bd70d845a95be083))



## [1.7.5](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/1.7.4...1.7.5) (2023-03-24)


### Bug Fixes

* **Chord Symbols:** Fix chord symbols associated with the wrong note/timestamp ([#1270](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1270), PR [#1342](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1342)) ([f36ab0c](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/f36ab0cda960558c2d39f05a46ce82f2e97fe39b))
* **Dorico Parsing:** Fix slur end missed when slur+tie stops simultaneous/in separate notation elements (PR [#1341](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1341)) ([cd4f125](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/cd4f125ed04fc0da609d4a6a586c22eaf5a41937))
* **EmptyMeasure:** Fix EngravingRules.FillEmptyMeasuresWithWholeRest = 1 (YesVisible) erroring when no voice was created yet (first measure) ([#1339](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1339)) ([1c1baf3](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/1c1baf333448f9310ddb071f1982e0f49a8cac3f))
* **Fingering:** Don't place above for upper staff if EngravingRules.FingeringPosition was set to Below ([#1348](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1348), PR [#1349](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1349)) ([bdb1f51](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/bdb1f51ce71ec052287bea95d7b57fce725276a7))
* **Multiple Rest Measures:** Fix an issue where the sheet containing pickup measures lead to the isReducedToMultiRest flag not set correctly ([#1327](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1327)) ([b5ba101](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/b5ba101cd71a5faefd839485a34c3929df41876b))
* **Multiple Rest Measures:** Fix repetition at the end of multiple rest measures not rendered ([#1333](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1333)) ([a7278cc](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/a7278cc1b8046c50c2a98ee4e4cbd0862b3ece13))
* **SVG Export / Tabs:** Fix tabnote not clearing/painting white rectangle around number (PR [#1321](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1321)) ([304076a](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/304076a689d970a34f71d80ec5207493bd6e63a3))


### Features

* **Options:** Add GraphicalMeasure.ShowKeySignature, EngravingRules.MultipleRestMeasureAddKeySignature options ([#1329](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1329)) ([e8439a1](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/e8439a12bd349b3322a9fee88536897943b7190b))



## [1.7.4](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/1.7.3...1.7.4) (2023-02-02)


### Bug Fixes

* **Articulation:** Support "harmonic" technical notation (naturalharmonic), e.g. drums open hi-hat ([8dcaa08](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/8dcaa081606e34153028aaa1a8957a01a2eca7fd))
* **Cursor:** Fix cursor.previous() not setting Iterator.currentTimestamp correctly when going back from full measure note ([#1309](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1309)) ([66f0e1c](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/66f0e1c398ba20d5962ca70ab6f93b90d4e0a026))
* **Cursor:** Fix EndReached position display when first instrument is hidden ([#1310](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1310)) ([e52385f](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/e52385f115dc0114a760b8c6a9f121d08fa65ffc))
* **Cursor:** If instrument at current position is now invisible, show the previous position instead of nothing ([#1312](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1312)) ([4dd73f5](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/4dd73f5a48a5c8524ce99bd17f92339917788611))
* **Cursor:** Show last position in score if hiding cursor, moving past end of sheet, then showing, instead of showing nothing ([#1308](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1308)) ([d899128](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/d899128fce288c3e0b8189ec311a07ec3b7a8e54))
* **Tremolo:** Offset tremolo strokes if note has a beam ([e30fcbc](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/e30fcbc9d63c1cbae68aaf945e265af4ae353f0a))


### Features

* **Cursor:** If going beyond confines of sheet (previous() at first note, or next() at last note), show cursor visually at start/end of measure ([#1308](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1308)), creating a visual difference to first/last note positions ([d091cd9](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/d091cd93fbbf6afb6b348263ec7f06f1e21e0d8b))
* **Glissando:** Implement glissando and slide MusicXML elements. Fix tab slides too long. Add EngravingRules.RenderGlissandi. ([#1318](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1318), PR [#1319](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1319), [#344](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/344)) ([460e920](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/460e9206c4fe54d9c14d668cae3cd2316de2d616))
* **Glissando:** Add EngravingRules.GlissandoDefaultWidth. Add GraphicalGlissando.Color ([#1318](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1318)) ([b1e67d5](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/b1e67d5cdfc1b0f5d5f52477a0d18311de0f02f8))
* **Tabs:** Add Id to tabnotes in SVG/DOM ([460e920/tabnote.js](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/460e9206c4fe54d9c14d668cae3cd2316de2d616#diff-2b9a72ab4b12049a4a7e5ed69ee664c00c847f19e2dff94447e56c2452d685e0))


## [1.7.3](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/1.7.2...1.7.3) (2023-01-23)


### Bug Fixes

* **Build:** Fix ES2017/Android API 28 incompatibility by not using Array.flat() from ES2019 ([#1299](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1299), PR [#1301](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1301)) ([cea8bf8](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/cea8bf86c301ee795bf3c61c2eee6007c3a96217))
* **Cursor:** Fix cursor not appearing on show() if previous() was executed when at the start of the sheet, going beyond the beginning ([#1303](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1303)) ([a1bfecf](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/a1bfecf2e84e2134be103949d27967c8da0f75cb))
* **Cursor:** Fix cursor.previous() infinite loop after advancing past the end of the sheet ([#1302](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1302)) ([601fc64](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/601fc6445907d28a76624e31801579aaf5d23f74))
* **Cursor:** Fix next() skipping first position in score after going beyond beginning of score (e.g. cursor.previous() after cursor.reset()) ([#1304](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1304)) ([6b31846](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/6b3184612eff800962b125c9738b38fb0c19a43b))
* **Pedal:** Fix Pedal ending at end of measure instead of before last note ([#1291(https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1291), [PR #1305](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1305)) ([09dc868](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/09dc8681373f1cb4b35b423120793a1d452a9a70))
* **Slurs:** Fix bad slur placement when SlurPlacementFromXML is used (default), but XML doesn't provide placement values ([#1298](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1298)) ([d854976](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/d854976000ba3929b64b08a63c1c05d6de796850))
* **Tuplets:** Fix consecutive tuplet label number disabling not respecting note length ([#1207](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1207), PR [#1300](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1300)) ([eb69f32](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/eb69f32ce6f0ac325a016952d6dd338eea622bbf))


### Features

* **Pedal:** Start at beginning of stave (after modifiers) if start note is whole measure rest (and e.g. measures above it have non-rest notes) ([#1306](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1306), PR [#1307](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1307)) ([92eb9b6](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/92eb9b6b28d2ebf754db3c95ee950b00123dab42))


## [1.7.2](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/1.7.1...1.7.2) (2023-01-18)


### Bug Fixes

* **Clefs:** Fix Clef at measure end in wrong measure if backup nodes used ([#1294](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1294), PR [#1295](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1295)) (e.g. Sibelius) ([9a6aa3f](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/9a6aa3feb39b9629ba57c87f48ba03a7958bce97))
* **Build:** Fix umlauts in key identifiers error [(#1293)](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1293)



## [1.7.1](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/1.7.0...1.7.1) (2022-12-30)


### Bug Fixes

* **Build:** Make Array prototype changes writeable to prevent conflicts with other libraries ([#980](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/980), [#1288](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1288), PR [#1289](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1289)) ([f69d532](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/f69d5320757998f7602cfa17b55071c4b5ea6277))
* **Lyrics:** Fix non-numeric lyric number handling, unnecessary space for unused lyric lines (PR [#1284](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1284), [#1271](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1271), [#1272](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1272)) ([fac88af](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/fac88af498039763d1c843292d2c42bcf259792e))



# [1.7.0](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/1.6.1...1.7.0) (2022-12-12)


### Bug Fixes

* **Fermata:** Fix inverted fermata placement/overlap with multiple voices ([#1278](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1278), PR [#1279](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1279)) ([15e4015](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/15e40158a5e96082cb95be0fe7e47c532b160867))
* **OctaveShift:** Fix rare error when startX greater stopX ([#1281](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1281), PR [#1282](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1282)) ([e8d89a0](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/e8d89a043b8a39c871d11656f11e77692a099b15))
* **Overlap:** Fix overlap with implicit / pickup measure after repeat with single note pickup ([#1286](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1286), [#1236](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1236)) ([f667f67](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/f667f67edd565a2cfc9e5d2e968657a1b12fc4be))
* **Overlap:** Fix overlap with implicit / pickup measure without repeat with single note pickup ([#1286](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1286), [#1236](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1236)) ([700be56](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/700be56413748845eab40e8a9719f6bd995d6697))
* **Tempo:** Increase TempoYSpacing from 0 to 0.5 (prevents (near-)overlaps, no apparent downside) ([#1243](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1243)) ([9e584d0](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/9e584d041726e5db6795e9efe2cfca5bb761e234))


### Features

* **Articulation:** Add breath mark support ([#527](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/527), PR [#1285](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1285)). Add EngravingRules.BreathMarkDistance (default 0.8 = 80%) ([f98b9a2](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/f98b9a2351dcd5c443c96be53499a741934d7350))
* **Cursor:** Add getter and setter for CursorOptions ([#1276](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1276)) ([b1b6492](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/b1b6492e0a30e66348f7a302ec5d3272f482564c))
* **Pedal:** Support pedal. Show (piano) pedal signs and brackets ([#347](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/347)). Add EngravingRule RenderPedals ([393b25f](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/393b25f32651a08233266e10c398e8ae12c7efe9))



## [1.6.1](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/1.6.0...1.6.1) (2022-11-14)


### Bug Fixes

* **Cursor: cursor.next():** Skip positions that only contain invisible notes ([#1264](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1264)) ([9805f09](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/9805f095c87045d5c647cc83c981dbd635d79a96))
* **Error:** Fix error when dynamics node has no elements, leading to an empty measure ([#1269](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1269)) ([5f98841](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/5f98841ba650b24e231edf04763e64f291436f2c))
* **Repetitions:** Fix D.C. Al Coda read as DalSegnoAlCoda ([#920](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/920)) ([8ab2a00](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/8ab2a0070be0d0895729795d7ff52cd100d468c4))
* **Repetitions:** Fix repetition symbols like D.C. or Coda too far left ([#920](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/920), PR [#1265](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1265)). Add EngravingRules.RepetitionEndInstructionXShiftAsPercentOfStaveWidth ([4ff0226](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/4ff0226885a8dce89472d817ebae24fe90e2c896))
* **Slur:** Fix double slur with different placement ignored as "duplicate" ([#1275](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1275)) ([fa14941](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/fa1494191ed57627393a9795669edbe6b026bc82))


### Features

* **Cursor:** Add cursor.previous(), moving back to previous note, counterpart to next() ([#1266](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1266)) ([ddb0189](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/ddb0189dc26a0b9835121870077871cc391b389b))



# [1.6.0](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/1.5.8...1.6.0) (2022-10-28)


### Bug Fixes

* **Brackets text:** Ignore [ ] square brackets (originally around notes) too with EngravingRules.IgnoreBracketsWords ([#1251](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1251)) ([e5b9047](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/e5b90474ca0cafd13703f54b3c1f5a465451116f))
* **Marcato:** Always place above staff ([#1261](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1261)), in line with Gould - Behind Bars ([0e7421d](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/0e7421d8de6c9081819d9eaae18a72a76b836009))
* **Ties:** Set downward tie direction for downward ties split over two systems in vexflow ([#1262](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1262)) ([5a155ef](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/5a155efbbfeab6d5aa55e450d0eba490e3d09d53))
* **Ties:** Use downward arc for ties in secondary voices ([#1262](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1262)) ([01398b9](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/01398b90c67c399b4053960092e3f41bbaa375cb))
* **Wedges:** Ignore duplicate wedges given in MusicXML (e.g. crescendo) ([#1259](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1259), PR [#1260](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1260)) ([7f235fe](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/7f235feb4367168f1b8b446daa3af2e61b92d9ca))



## [1.5.8](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/1.5.7...1.5.8) (2022-10-14)


### Bug Fixes

* **BoundingBox:** Fix bounding box of MusicSystem and SystemLeftLine too large ([#1245](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1245)) ([62cd3fa](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/62cd3faab6f26e879f104cdf85fd54a6407a93ef))
* **BoundingBox:** Fix bounding box of voice entries of whole notes with many ledger lines too large ([#1245](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1245)) ([30676bf](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/30676bf941de0216cbc08112dd27ec8318a99853))
* **BoundingBox:** Fix PageTopMargin also partly added to a bottom margin / container size in certain cases ([#1245](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1245)) ([fa5fa7c](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/fa5fa7c2defc885c43c95311d56a30e371773def))
* **Brackets:** Ignore brackets = '(  )' words/text by default ([#1251](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1251)) supposed to be around a note, but can't be matched to the note. ([32060b7](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/32060b72d5920b75a02ac566db0a5b1c8fd1700c))
* **Margins:** Fix page bounding box too long. Respect EngravingRules.PageLeftMargin and PageRightMargin for renderSingleHorizontalStaffline ([#643](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/643)) ([dbb1f18](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/dbb1f18789d9394034b6a086ac00bbae598c38e0)), closes [#1244](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1244)



## [1.5.7](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/1.5.6...1.5.7) (2022-09-28)


### Features

* **Options:** Add EngravingRules.TempoYSpacing ([#1243](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1243)) to be able to set spacing/padding for tempo (e.g. beginning "Allegro") ([194e765](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/194e7653e127137f582d82a4892b9205cddb0a53))
* **Performance:** Marginal speedup potential for getImageData by using willReadFrequently attribute for CanvasContext. Fix Chrome warning ([#1242](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1242)) ([c60c0d6](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/c60c0d6394bbb4da8cc69de25438e8ef367f4ff1)), closes [#1241](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1241)



## [1.5.6](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/1.5.5...1.5.6) (2022-09-22)


### Bug Fixes

* **Canvas:** Fix rehearsal marks not rendered in browser with Canvas backend ([a4d5a3b](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/a4d5a3bc53e77729797216b8c4d6731df5d11bdf))
* **DefaultColorLyrics:** Fix not applied on re-render ([aa1945a](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/aa1945aef72009d6d4ee21e33f1de41f757a4333))
* **DefaultColorMusic:** Fix CanvasBackend overwriting and not using DefaultColorMusic ([#1218](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1218)) ([285878e](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/285878eb5611121df0408845ea0ac1e0af35940a))
* **DefaultColorMusic:** Fix EngravingRules.DefaultColorMusic not applying to octave brackets, crescendo/decrescendo wedges ([#1218](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1218)) ([145e715](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/145e71515e13cd77794d5f5bae2ee8c3b577e066))
* **DefaultColorMusic:** Fix rehearsal marks ignoring defaultColorMusic ([#1218](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1218)) (svgcontext.rect ignoring stroke) ([2702667](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/2702667a6318d841e3988e9b48a53a4b9a0ed298))
* **EngravingRules:** Fix GraphicalVoiceEntries creating their own EngravingRules. Reduce EngravingRules creations also via DrawingParameters. ([1a96112](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/1a96112163943ffc3203a817ddbfe97532daabda))
* **Spacing:** Fix implicit measure spacing after repeat ([#1236](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1236)). Add EngravingRules.PickupMeasureRepetitionSpacing ([3da2244](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/3da2244d07fa7e34072668462fb69314e3b75014)), closes [#1234](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1234)


### Features

* **DefaultColorLyrics:** Add EngravingRules.DefaultColorLyrics, independent from DefaultColorMusic ([#1218](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1218)) ([3445343](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/34453436fdf9be305ba7fb94ff2f898aa391ab55))



## [1.5.5](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/1.5.4...1.5.5) (2022-09-15)


### Bug Fixes

* **Drums:** Fix Slash notehead overwriting other noteheads in chord/VoiceEntry ([#1228](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1228)) ([66390b1](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/66390b1391dd57b66b14dbdeee72b475d99ed26f)), closes [#1229](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1229)
* **Measure Numbers:** Fix EngravingRules.RenderMeasureNumbersOnlyAtSystemStart not showing measure number 1 after pickup measure ([2e7011f](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/2e7011fd07ba11fed6b65b8c684cbb693f335afe))



## [1.5.4](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/1.5.3...1.5.4) (2022-09-12)


### Bug Fixes

* **Layout:** Fix hiding first instrument causing shift of lyrics, dynamics, etc ([#1222](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1222)) ([280075c](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/280075c9bcdf0478205593ca96705ff836647ff5)), closes [#1223](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1223)
* **Slurs:** Fix overlap of slurs with accents on slur start note (part of [#1224](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1224)) ([229f0dd](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/229f0dddb8dee52e298dc17dda71bd57b007d2f2)), closes [#1226](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1226)
* **Slurs:** Fix slurs overlapping with articulations like staccato on slur end note (part of [#1224](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1224)) ([336b0ad](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/336b0add8f98caf4c9f38355388191c0dd9724b3)), closes [#1225](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1225)



## [1.5.3](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/1.5.2...1.5.3) (2022-09-05)


### Bug Fixes

* **Tuplets:** Fix rest notes not having TypeLength set. EngravingRules.TupletNumberLimitConsecutiveRepetitions: Fix tuplet count not reset for next voice (rare issue) ([#1207](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1207)) ([8d55514](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/8d555141ee9f12fb27486620bdacecf3da713bee))


### Features

* **GraceNotes:** Reduce unnecessary margin/spacing to main note ([#1221](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1221)). Add EngravingRules.GraceNoteGroupXMargin (default 0) ([332d625](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/332d62555abc049a97abcc81b09317a3c32becec))
* **Lyrics:** Add EngravingRules.LyricsYMarginToBottomLine ([#389](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/389)). New default 0.2 prevents overlap of stems with lyrics. ([fd6868d](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/fd6868d008f5c234196f28c717edd9e9fc3d76fb))



## [1.5.2](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/1.5.1...1.5.2) (2022-08-29)


### Bug Fixes

* **binarySearch:** Fix rare infinite loop in CollectionUtil.binarySearch ([#1201](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1201), merge [#1202](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1202)) ([552b23f](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/552b23f53034dfd606b9fa24075182213ef36d90))


### Features

* **Accents:** Support soft-accent as crescendo+decrescendo wedge on one note/entry ([#1214](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1214), merge [#1215](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1215)) ([db340ac](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/db340acb44a9f70f13791e9ddc8f34f650bcf18c))
* **Tuplets:** Add EngravingRules.TupletNumberLimitConsecutiveRepetitions (default true) etc. (breaking change) [#1207](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1207), merge [#1208](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1208) ([0744bcd](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/0744bcdd4e983767f13911cebaade4b3db6bb405))



## [1.5.1](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/1.5.0...1.5.1) (2022-07-18)


### Bug Fixes

* **generateImages:** Fix rehearsal marks not having a box around them due to node canvas restriction. ([48799ba](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/48799baf9f12ef6214caa33b6528a47ca1ca4227))
* **Layout:** Fix 12/8 rhythm with rest measures overflowing notes, other rest measure issues ([#1187](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1187), merge [#1188](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1188)) ([b524d77](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/b524d77e63fd81b398463db4ab20e50f1de134e8))
* **Rehearsal Mark:** Position correctly when EngravingRules.RehearsalMarkFontSize is increased ([#1176](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1176)) ([d32bc1a](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/d32bc1a437e700be32b61b40cb45807161908620))



# [1.5.0](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/1.4.5...1.5.0) (2022-04-22)


### Bug Fixes

* **Cursor:** Fix undefined errors when drawFromMeasureNumber changed after cursor was shown ([5a13bfb](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/5a13bfbdceb56415c808e537992eac8d1c8e4f91))
* **Tabs:** AutoBeamNotes no longer beams tab notes by default. Add EngravingRule AutoBeamTabs ([c5fa3eb](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/c5fa3eb85a712d33463b3c530630890be62bb704))
* **Ties:** Fix note.NoteTie undefined for tie end note in different voice than start note ([8f9c373](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/8f9c373dcfe2fb7298b4f26f59817d45789cadf5))


### Features

* **ChordSymbols:** Can replace accidentals via e.g. osmd.rules.ChordAccidentalTexts.setValue(1, "♭") (PR [#1154](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1154)) ([ced5cb4](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/ced5cb45dfcdf2a4ac6f8a542902454c47b52a7a))
* **Performance:** **30-60% performance boost**: Compute SkyBottomLines with WebGL and in batches depending on browser and number of measures ([#1158](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1158)) ([66ab7ce](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/66ab7ce18941d8a17b22e43faa527452cf469021))
* **Performance:** Add EngravingRules SkyBottomLineWebGLMinMeasures and AlwaysSetPreferredSkyBottomLineBackendAutomatically ([#1158](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1158)) ([e1c8826](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/e1c8826a7d140b22b6d4548f087405d94f97da66))
* **Performance:** Prefer Plain over WebGL in Firefox (and Safari) for performance ([#1158](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1158)) ([1ac2bd5](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/1ac2bd5606e7a0b1ba50322fa7a1ef00030db5ce))
* **Performance:** Add EngravingRules.DisableWebGLInFirefox and DisableWebGLInSafariAndIOS for options ([#1158](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1158)) ([c48f66d](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/c48f66d3d97afe9461b324c0e178301617271e51))
* **SVG:** Create SVG group with class for beamed note stems, put beam SVG into <g> node ([67f6ac3](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/67f6ac3de236b7f187372017ccad7e2e23417c5d))
* **TimeSignatures:** Can disable time signature for GraphicalMeasure ([#1150](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1150)) with measure.ShowTimeSignature = false ([411a35c](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/411a35c5c94961eb58a2e3d4c09ecd5d3b5327b1))



## [1.4.5](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/1.4.4...1.4.5) (2022-01-28)


### Bug Fixes

* **Wedges:** Simultaneous wedges possible, start/stop corrected ([#1131](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1131)), respect xml number attribute ([44a0dce](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/44a0dce896a3288beb64a50fc3e1136fc35b5d28)), closes [#1134](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1134)
* **OctaveShift:** Fix octave-shift not rendered when type attribute (e.g. "down") not given (even though required) ([44a0dce](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/44a0dce896a3288beb64a50fc3e1136fc35b5d28))


### Features

* **Options/Clefs:** Add osmd.EngravingRules.RenderClefsAtBeginningOfStaffline ([#1135](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1135)) ([03cb762](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/03cb76222ae0591d994fdffc62a918313733479d))



## [1.4.4](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/1.4.3...1.4.4) (2022-01-27)


### Bug Fixes

* **Release:** Fix types pointing at wrong (sub-)folder. Could solve type/import problems. ([2a18295](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/2a182956950f49dd973a814bcf69bd70c826365b))


### Features

* **Options:** Able to set osmd.EngravingRules.SheetMaximumWidth > 32767 for SVG / renderSingleHorizontalStaffline ([6ef37db](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/6ef37db5a9a4bc149204b36fd3ee4978e9083c45))



## [1.4.3](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/1.4.2...1.4.3) (2022-01-18)


### Bug Fixes

* **Ties:** Fix ties not containing all notes, created multiple times ([#1126](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1126)) ([a8fe5ae](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/a8fe5aee16e51b338186450cb7986313ba32a93c)), closes [#1097](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1097)


### Features

* **SVG:** Add group and class to SVG DOM for Clef ([7c218e2](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/7c218e2ece7b80355ac56ce6da000cbbd46d3f63)), KeySignature ([#1128](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1128)) ([1f7e710](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/1f7e7107717e7ee54f808d768b9b4505400126e9)), TimeSignature ([#1129](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1129)) ([6a95483](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/6a9548312066bb260c925e5de6c780f7c966ff6e)), GraphicalTie
* **Ties:** GraphicalTie.SVGElement() gets SVG node ([#1127](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1127)) ([84406d6](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/84406d6e5b15f30ab4355d3a7bbe5c4960857947))



## [1.4.2](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/1.4.1...1.4.2) (2022-01-17)

### Bug Fixes

* **Release:** Fix typings location for npm release ([8171984](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/81719844e99adae112dd21f480670bda73042aa4))

## [1.4.1](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/1.4.0...1.4.1) (2022-01-17)


### Bug Fixes

* **Credit Error:** Fix NaN error when <credit> element has justify attribute ([dec2f1f](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/dec2f1f45cc82dcdc69c59a2ed098e92bd3a1f58))
* **Release:** Fix typings not included in release (1.4.0) ([5829be3](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/5829be32d2601b2ca08e51e68d98ee1df7bc1630))

### Features

* **Color:** Able to set the option {defaultColorMusic: string} ([#1125](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1125)) to apply a color to the whole sheet ([2b3ea16](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/2b3ea16e50d6b993c92224f7f6400d9fe33441a1))
* **Cursor:** Visible with PageBackgroundColor set (SVG) ([#1125](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1125)), transparency dependent on PageBackgroundColor ([a10f779](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/a10f779690d6f652b108d34e130674a144134cbf))
* **Options:** Add darkMode option ([#1125](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1125)) ([d5a2d70](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/d5a2d708beea47e8713b76b419c282ad4a94ee59))



# [1.4.0](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/1.3.1...1.4.0) (2022-01-14)


### Bug Fixes

* **Beam SVG:** VexFlowGraphicalNote.getBeamSVGs() gets SVGs of all beams starting on the note ([#1108](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1108)) ([f4675fd](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/f4675fd7288a78ba6cca112ae619a7fd97364d8d))
* **Clefs**: Fix specific end of measure clef missing ([#1120](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1120))
* **Cursor:** Fix follow for multiple cursors, can set cursor.cursorOptions.follow for each ([#1111](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1111)) ([37f9002](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/37f9002c5e90a351447854cc926f53ab16107edc))
* **Grace Notes:** Don't draw multiple grace note slashes for a set of grace notes ([#1107](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1107)) ([89394db](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/89394dbf6ca885abdf0d96627ecc66b7a5fed37b))
* **GroupBrackets:** Don't draw if only one instrument visible ([b72ef4e](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/b72ef4e04f77c0cd9dc2d6a70f9166bed39630d5))
* **Note overlaps**: Fix notes overlapping / not staggering sometimes ([#1098](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1098)) (05c1ca7)
* **Cross Stave Notes:** Fix ghost notes only created for first few notes in measure, fixing cross stave positioning ([#1062](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1062)) ([0507917](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/05079175993c3a86b35ec15c1fcabe08caa0e4f1))
* **Rehearsal Marks:** Fix undefined error with multi-measure rests and rehearsal marks ([76d5252](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/76d52522bdcde7023f92497396e054af5dd91951))
* **Ties**: Fix ties missing/doubled, orientations ([#1097](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1097))


### Features

* **ChordSymbols:** Add EngravingRules.DefaultColorChordSymbol ([#1106](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1106)) ([7f00a9b](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/7f00a9b29eee4df85741bdc4554d7064b4f8fe25))
* **Note:** Store TransposedPitch (for API access) ([72633da](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/72633da238a18c0f41c1a82e24fba26955ba16cf))
* **Options:** Add EngravingRules.StaggerSameWholeNotes option to x-shift whole notes on same line ([#1098](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1098)) ([dc04dc5](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/dc04dc509eb480ee4b9c4f22f62f63d9942ca18d))
* **Slurs:** GraphicalSlurs save their SVGElement (but not GraphicalTies) ([5686daa](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/5686daa7a78ad0dd4058131297e14f0e45988a86))
* **SVG:** Stems and beams have an id in the DOM ([#1108](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1108)) ([a9b2c10](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/a9b2c1024ca7f7500f3522a0e622dfbfcb71b1f9))
* **Transposing:** Able to transpose single instrument ([#1115](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1115)) independently of other instruments ([e997df9](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/e997df9464a78c146a7dc20d39be706bb4814e32))
* **VexFlowGraphicalNote:** Add getStemSVG() and getBeamSVGs() helper methods ([#1108](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1108)) ([79b28c8](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/79b28c84bb4f6a6f6801db15acc8986ac23ee13a)) ([f4675fd](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/f4675fd7288a78ba6cca112ae619a7fd97364d8d))



## [1.3.1](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/1.3.0...1.3.1) (2021-11-26)


### Bug Fixes

* **Clefs:** Fix in-staff clefs missing or misplaced (2nd voice or with backup/forward tags) ([#1102](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1102)) ([acdf8b0](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/acdf8b0b4b63eac0aa1bde4772751a80b9bd62af)), closes [#1103](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1103)
* **Metronome:** Fix some measures with very long metronome numbers not rendering ([70e1654](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/70e1654f16322507c965bc4125a91b502403eeff))
* **OctaveShift:** Fix incorrect display octave for first of two octave shifts in measure ([#1099](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1099)) ([c090c71](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/c090c710ee4d9441a030b5766b5eb9e78b7a2262))


### Features

* **GraphicalStaffEntry:** Add helper functions getHighestYAtEntry, getSkylineMin, same for bottomline, getAbsoluteStartAndEnd ([2b364a8](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/2b364a8ce47388f2092a09af04d91d2bf3ee9cae)). For usage see [Wiki | Exploring the Demo](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/wiki/Exploring-the-Demo#drawing-overlay-lines-over-the-score-and-getting-a-notes-position)



# [1.3.0](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/1.2.0...1.3.0) (2021-11-13)


### Bug Fixes

* **Accidentals:** Render Slash-flat correctly ([#1074](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1074)) ([2394de7](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/2394de7368b6d5774778fac4c57b97cc20b4cc1d))
* **Fingerings:** Fix Fingerings collisions above/below notes ([#1081](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1081)), improve performance, implement as Labels with correct bboxes ([df9b441](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/df9b4414ca51ea2d406a1307f3603c8be5fde646)), closes [#1086](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1086)
* **Infinite Loop:** Fix rare infinite loop with certain rhythms ([#1073](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1073)) ([a09f702](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/a09f7028f564092b1cfedd9e216345302a817fa4))
* **Multiple Rest Measures:** Display clef at end of multirest measure and fix wrong clef in following measures ([#1064](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1064)) ([53a57fe](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/53a57fe4a2eb17512325228c91a895d1b7126417))
* **MusicSystemBuilder:** Prevent index error when MinMeasureToDrawIndex > 0 ([#1069](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1069)) ([293cfb4](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/293cfb4c336d9fae2117fbcb20d6be17e48abe2e))
* **OctaveShift:** Fix ExtraGraphicalMeasure used as last measure, no endnote ([#1080](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1080)) ([08640e7](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/08640e729c68488d3bb86a74a7b7271e6d7ee49f))
* **Rests:** Fix rest collisions with notes (y coordinate) ([#621](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/621), [#1076](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1076)). Add EngravingRules.RestCollisionYPadding ([32b649a](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/32b649adc8a95aff16130addc1987c57b160dda6))
* **Slash-Flat Accidentals:** Fix quarter flats shown after slash-flat accidentals ([#1075](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1075)) ([87b681f](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/87b681f79ac2838be1f79ef406b31553664c3f2d))
* **Slurs:** Fix slur starting on tie end note not shown ([#1092](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1092)) ([265fa73](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/265fa7362bee7ff61ba8d8fc63d177dd7d7cd817))
* **Tuplets:** Fix dots not corresponding to XML ([#1082](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1082)) ([3899031](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/3899031b4489c0a2ed88d8eee1289ce3439970ce))


### Features

* **Accidentals:** Support remaining microtonal accidentals available in MusicXML and Vexflow ([#1084](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1084)) ([9ccc215](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/9ccc2152dac3f3f9f59a23ade0a55b47d430fab3))
* **ChordSymbols:** Fix collision with notes, add staffline/measure alignment options ([#1087](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1087), [#934](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/934)) ([d814986](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/d81498663a6aedf5004ba132d2bc9c341fbaf436))
* **Cursor:** Add GNotesUnderCursor() function, returning GraphicalNotes ([8c0e2d1](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/8c0e2d16dcbb297c0d1a747fc5cfed3e311a9f5c))
* **Labels:** Always save SVG Node as a reference for GraphicalLabel, allowing SVG manipulation without re-render ([f888939](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/f88893971d6bd321388741fe588bb285b1d3688d)), closes [#711](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/711)



# [1.2.0](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/1.1.0...1.2.0) (2021-09-23)


### Bug Fixes

* **Note X-Positions:** Fix Cross Stave Note Position X-Shift and Ghost Notes for complex fractions ([#1063](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1063)) ([a04fd58](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/a04fd58767107beb57e6ea6974f8e6e480aa02cd)), closes [#1062](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1062)
* **Repeats:** Fix Repeat end+start (:||:) collision ([#1061](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1061)) by adding padding ([88d7467](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/88d7467bf951e5903367d59181ecf18b5984165a)). Add EngravingRule RepeatEndStartPadding (previous default 0.0, now 2.0)
* **Undefined errors:** ([#1051](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1051)) Add some more safeguards for undefined variables in complex/messy midi scores ([e0d70bc](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/e0d70bc67d26465078fc224c69615bd0789cdaa3))

### Miscellaneous
* **Dependencies:** Update JSZip to 3.7.1


# [1.1.0](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/1.0.0...1.1.0) (2021-07-27)


### Bug Fixes

* **BPM:** Correctly parse float BPM and dotted beats ([#1045](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1045), merge [#1046](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1046)) ([aa2a0e7](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/aa2a0e7f4cdd4a43976b4df89827046495449258))
* **ChordSymbols:** Prevent multiple rest measure generated over rest measures with chords ([#955](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/955)) ([d1e454b](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/d1e454bd400060a5b305022fd87c016681a6c3f7))
* **GetNearestNote:** Handle undefined parentStaffEntry ([#1029](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1029), PR [#1031](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1031)) ([6ca4a05](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/6ca4a058c9eefb0f240655900d3ef40ed3b6ab6e))
* **Multirest:** Fix repetition measures included in multiple rest measure ([#901](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/901)) ([e624f6a](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/e624f6a058aaba1eaf3e6ad708c95b8c886ab6ab))
* **Note Alignment:** Fix notes not sharing stems/note heads ([#414](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/414)), voices not aligned ([#947](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/947)). Fix visual differences on re-render. ([d9aabab](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/d9aababa59d26d4aa3c2ef6ae93eebc3a41b8b78))
* **Slurs:** Ignore measure numbers, improve staff split slurs, add optional softening mechanism ([bc71de7](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/bc71de774db0a3e4e91d8230d758fd41b15c30e1))
* **Tabs:** Correctly read number of stafflines if staff-details node is given for multiple staves ([#1041](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1041)) ([341b696](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/341b696641f0c9fba5a716a6ffa39fa83f2ac34d))



# [1.0.0](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.9.5...1.0.0) (2021-05-06)


### Bug Fixes

* **Barlines:** Correctly place thin double line as end barline/StaveConnector ([#1019](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1019)), instead of beginning ([eee1c03](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/eee1c0330caab441f27263639dbb69be039ce25d))
* **Error:** Fix error when sorting unpitched note in a chord ([#995](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/995)) ([47d7beb](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/47d7bebb2ff181dd1a166d45a4b561c31a35a8ba))
* **GraphicalNote:** Fix getSVGElement throwing exception instead of returning undefined for MultiRestMeasure ([b38693d](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/b38693d5d08b6fa33f162a137c810fb829b3d509))
* **RepetitionSymbols:** Fix d.c., d.s. x position ([#990](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/990)) ([eae08cd](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/eae08cde29691f11203916fe9e5d8f3762fbd856))
* **SingleStaffline:** FollowCursor: Don't center the vertical axis ([#1014](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1014)) ([f3bc721](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/f3bc721d8dc5a5e22f723938bdd6d06986308423))
* **Skyline:** Fix bottom line values undefined ([#992](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/992)), fixes issues with PageFormat for tabs ([8559527](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/8559527d2c0c0d19ea8310d02e5351196806b9bb))
* **Tabs:** Correctly set number of stafflines, e.g. 4 for bass guitar ([#991](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/991)) ([8d83c90](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/8d83c900a59a2313873b9f9e13dea3e95c796868))
* **Ties:** Highest tie goes upwards (orientation), lower ties downwards (in same location) ([d8af331](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/d8af331185452bdfef6614f27770493830e6191a))
* **Ties:** Read orientation from XML, reliably set it above/below for chords ([#1020](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1020)) ([070de0f](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/070de0f40595e6edb7ccc84e408eaa05b7cc25e1))
* **Tuplet/Repeat:** Fix tuplet number placement, fix repeat lines across multiple stafflines (StaveConnector) ([#1016](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/pull/1016))
* **Wedges:** Fix crescendo/decresc. lengths, positioning, etc ([3e65761](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/3e657618a0ee9d8628edfe0e3371be86f9b546ac))


### Features

* **Accidentals:** Add support for three-quarter flats and sharps ([#999](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/999)) ([98a5793](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/98a5793e127dc36b2d1d98f94e5c9596d26c735c))
* **Options:** Add osmd.rules.FingeringPositionFromXML ([#993](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/993)), can be auto by setting false now. ([d864b9e](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/d864b9ef47c900da919d51f9b602391b273cd01e))
* **Cursors:** Can now add multiple cursors, with new options like highlighting the current measure, color and alpha value, see [PR 972](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/pull/972) and [#1005 (comment)](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1005#issuecomment-833981960) for usage.
* **TransposeCalculator:** Add TransposeCalculator, allowing arbitrary transposing of sheets by x semitones. Now out of early access and open source thanks to our [Github Sponsors](https://github.com/sponsors/opensheetmusicdisplay). See [#733 (comment)](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/733#issuecomment-823530818).

Before 1.0: See [CHANGELOG_old.md](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/blob/develop/CHANGELOG_old.md) - the changelog was too big for Github to render, see [#1227](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1227).
