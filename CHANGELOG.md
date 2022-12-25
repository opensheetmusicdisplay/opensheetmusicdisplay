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
