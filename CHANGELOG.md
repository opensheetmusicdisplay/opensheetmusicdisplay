# [1.1.0](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/1.0.0...1.1.0) (2021-07-27)


### Bug Fixes

* **BPM:** Correctly parse float BPM and dotted beats ([#1045](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1045), merge [#1046](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1046)) ([aa2a0e7](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/aa2a0e7f4cdd4a43976b4df89827046495449258))
* **ChordSymbols:** Prevent multiple rest measure generated over rest measures with chords ([#955](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/955)) ([d1e454b](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/d1e454bd400060a5b305022fd87c016681a6c3f7))
* **GetNearestNote:** Handle undefined parentStaffEntry ([#1029](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1029), PR [#1031](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1031)) ([6ca4a05](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/6ca4a058c9eefb0f240655900d3ef40ed3b6ab6e))
* **Multirest:** Fix repetition measures included in multiple rest measure ([#901](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/901)) ([e624f6a](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/e624f6a058aaba1eaf3e6ad708c95b8c886ab6ab))
* **Note Alignment:** Fix notes not sharing stems/note heads ([#414](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/414)), voices not aligned ([#947](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/947)). Fix visual differences on re-render. ([d9aabab](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/d9aababa59d26d4aa3c2ef6ae93eebc3a41b8b78)), closes [#77](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/77) [#69](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/69)
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


## [0.9.5](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.9.4...0.9.5) (2021-03-03)


### Bug Fixes

* **Array.prototype:** Ease Array.prototype pollution by using Object.defineProperty, potentially solving library conflicts like with pdf.js ([#980](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/980)) ([ecc1d8f](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/ecc1d8fa5704e860c8d50c28280139e0355e9720))
* **AutoMultiRest:** Enable multiple rest measure when invisible instrument would have prevented it ([#981](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/981)) ([d406341](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/d40634105df6fcf229441d42c1f1dcdc46a904fd))
* **Build:** Add missing MusicParts exports (MusicPartManager etc) ([5349f30](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/5349f303d500b88bb79f383711a39cebab4b5893))
* **Rehearsal Marks:** Fix shifted position when sheet has a pickup measure ([#983](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/983)) ([5c4343d](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/5c4343d45a1f98784fa70c1108c8a5aad6fb5db4)), closes [#985](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/985) [#985](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/985)


### Features

* **Options:** Add options.OnXMLRead ([#982](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/982)), a function to modify the XML after reading, before parsing ([b2be3e8](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/b2be3e898deb1a24f40c4f8253a938cde526708b))



## [0.9.4](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.9.3...0.9.4) (2021-02-22)

### Bug Fixes

* **Slurs:** The parameters for slur flattening were fine tuned to not flatten mid-length, mid-angle slurs ([#971](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/971))
* **Transposing:** Some necessary changes for the transposition plugin hotfix (Sponsor early access build)

## [0.9.3](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.9.2...0.9.3) (2021-02-18)


### Bug Fixes

* **Beams:** Fix long stems for notes in beams ([#954](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/954)) when different (wrong) stems given in XML ([8b1d898](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/8b1d898750b524d2141eddcbe236173cc8705a16))
* **Clefs:** Fix mid-measure clef added at wrong position ([#954](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/954)) because of forward/backup node. ([1a77ae8](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/1a77ae8541c288ff54a24a366251a2cf104b79fd))
* **NotePositions:** GraphicalNote boundingbox position improved ([#966](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/966), [#967](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/967)), osmd.graphic.GetNearestNote working ([1fde0f6](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/1fde0f6ca364e2c7f0509001a8fbae3947f2c430))
* **Slurs:** Read slur orientation from xml ([#962](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/962)) (Sibelius alternative to placement) ([4ab1c44](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/4ab1c4403020020022cb153ff321389cf90f3007))
* **Slurs:** Reduce height of long, steep slurs by flattening them ([#971](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/971)) ([f128913](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/f128913e2cc78ef7354d087ac133fe86334797a7))
* **Stems:** Respect stem "None" in XML: don't display stems ([#964](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/964)) ([941c50b](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/941c50b6f0e564dc84311eeae11a1e81958f6e17)), closes [#951](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/951)
* **StringNumbersClassical:** Write as roman numerals, offset positioning, etc ([#957](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/957), [#949](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/949)) ([20b8cc9](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/20b8cc90e91e6fc4040b59ddc32ba17d568ee594))


### Features

* **ChordSymbols:** Add osmd.rules.RenderChordSymbols (false now supported) ([fe19427](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/fe19427f31879fca7c806240451f6e6ee85e9686))
* **Cursor:** Add rules.DefaultColorCursor ([#961](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/961)) ([3170486](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/317048691f60ce89100efbc0cb4952eeca1b71f2))
* **Drawer:** Add drawer.DrawBoundingBox() as standalone method (([#969](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/969)), ([#961](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/discussions/961)))
* **Overlays:** drawLine(), drawRectangle() etc returns removable svg node, add backend.removeNode() ([#970](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/970)) ([dc9c66a](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/dc9c66a83a6beaa40041ba6860bc7bf26421d5ed)), closes [#961](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/961) [#b5f3f5](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/b5f3f5)
* **String Numbers:** Add option osmd.rules.RenderStringNumbersClassical ([#949](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/949)) (boolean) ([5500251](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/5500251c8dfbf4a6589ca41a6307945ef6c8041a))



## [0.9.2](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.9.1...0.9.2) (2021-01-27)


### Bug Fixes

* **Cursor:** Fix bounding box/cursor position when only one vertical measure has an endClef ([#872](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/872)) ([8b40dd3](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/8b40dd395fe18f3c55d3d0aa1e0585b782241d1e)), related to [#797](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/797)


### Features

* **Chords:** Add options for chord alignment, relative x offset ([#948](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/948)) ([143899b](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/143899b74226be22c3929b61439fac4ff40c2937))
* **Rehearsal Marks:** Render Rehearsal Marks ([#919](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/919)), add several RehearsalMarks EngravingRules ([c931341](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/c93134177fa390914a06a0e2a54599011353d834))
* **Rehearsal Marks:** Add osmd.rules.RehearsalMarkXOffsetSystemStartMeasure ([#919](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/919)) (default -20[px]) ([84d60e1](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/84d60e149905e5e0c9f2e1526b7c5a50931b9005))
* **StringNumber:** Display XML String number (e.g. violin) ([#949](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/949)) ([9aba63c](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/9aba63cebde76398cbca596d7c52ba892ca0c171))



## [0.9.1](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.9.0...0.9.1) (2021-01-26)

### Bug Fixes

* **Accidentals:** Remove many unnecessary extra courtesy accidentals not given in XML ([#747](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/747)) ([7493be9](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/7493be919826e481572e327949e4f7cf59fac790))
* **PercussionOneLineXMLDisplayStep:** Display XML position correctly in all cases ([#945](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/945)) ([3eb4747](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/3eb474734fda421c3033c9f7ffc4cf64e92f24af))


# [0.9.0](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.8.7...0.9.0) (2021-01-25)


### Bug Fixes

* **Articulations:** Don't assume placement above by default ([#921](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/921)) (e.g. staccato) ([6f4dc27](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/6f4dc273dd5cf648b0ddc36920592a3f0ef17d29))
* **Chords:** Fix rare error with chords having accidentals on the wrong note ([#944](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/944)) ([5177806](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/517780643d424cc2685ee146b34a8dbfe7f7f43e))
* **Cursor:** Ignore hidden parts for cursor.next: Always move to next visible voice entry ([#929](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/929)) ([7ca20d1](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/7ca20d1b5f6031dbcbaaf4bbe2dbaceeea75f168))
* **Directions:** Fix Segno, Coda and To Coda positioning (#920): To Coda at end, Segno at beginning of measure ([9643493](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/9643493b00e8769040a0a1bb58cfe38acef6a7f5)), closes [#920](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/920) [#920](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/920) [#920](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/920)
* **Exports:** Add 4 missing exports from MusicalScore/Graphical/Vexflow ([#935](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/935)) ([cab1a23](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/cab1a2338d80d0a7f5105aafa2950d151e152b90))
* **Fingerings:** Display fingerings and arpeggios for grace notes ([#878](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/878)) ([e02556d](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/e02556db34f16795bea2513e2677b662a6508195))
* **Layout:** Fix tuplets starting with rest notes not layouted correctly (shorter length) ([#936](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/936)) ([1e70f83](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/1e70f8302922e735a137d41814dacf8b1d73b4ae))
* **Layout:** Pickup measures aren't unnecessarily wide anymore ([#938](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/938)) ([f02bce1](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/f02bce1b655b2f0b0ebbe774f3f5ac3a26a78755))
* **Layout:** Widen pickup measure per staffentry accidental ([#938](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/938)) ([e1f6277](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/e1f6277962b1fbca0bfa939ed1646c328570dcfe))
* **Lyrics:** Read and display multiple text nodes separated by elision on single syllabic ([#941](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/941)) ([1883ddd](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/1883ddd04e7fb60298afaa166f469a473837b5f6))
* **Metronome:** Better avoid collisions with tempo instructions, especially at the beginning of a sheet ([eed0606](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/eed0606efb995969f0a5b1cf51b15e87de921118))
* **Options:** SystemComposerDistance leaves same distance for single and multiple composer lines ([#917](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/917)) ([61ae292](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/61ae292b8d300615b02b954364176e424f44b02b))
* **StaveRepetitions:** Fix To Coda, D.S. etc. not positioned correctly ([#920](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/920)). Add EngravingRule RepetitionSymbolsYOffset ([06a86b0](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/06a86b07577ba30e5fa2402580ea94f80c09a6b7))
* **Stems:** Don't auto-stem beams for tuplets ([#945](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/945)), respect SetWantedStemDirectionByXml ([026db91](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/026db91d56ad5dd4fdc6d4034072b77168113e74))
* **Stems:** Don't force direction for beamed notes with SetWantedStemDirectionByXml=true ([#945](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/945)) ([40d822e](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/40d822e80e7c44246d06f1153738afd7333849bb))


### Features

* **Chords:** Display complex (Jazz) Chords correctly ([#933](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/933)), e.g. G7(b9,[#11](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/11))/B, add EngravingRules.renameChord(), addChordName() ([9ee524a](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/9ee524a34c42710bff144cdb1ba0c1a2a684d586)), closes [#930](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/930) [#873](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/873) [#590](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/590) [#786](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/786)
* **Chords:** Elongate measures for chords - prevent most chord collisions (merge PR [#928](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/928)) ([ba3ae42](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/ba3ae428b55783b42a42704bca7a530eec3fdb35))
* **Export:** Add SVG export to OSMD and generateImages_browserless.js -> png|svg option ([#670](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/670)) ([8cf4567](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/8cf4567e19dd58e37a1a8930f40960b5c71a3ef1)), closes [#932](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/932) [#932](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/932)
* **GraphicalNote:** Add osmd.rules.GNote(note) ([#660](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/660)) to get GraphicalNote from Note ([d1d12c9](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/d1d12c91ca252681097c4883d8425b0863b8267f)), closes [#559](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/559)
* **GraphicalNote:** Add static GraphicalNote.FromNote(note, osmd.rules) ([#660](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/660), [#659](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/659)) ([acf1c6e](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/acf1c6ee64366db2d30b7cf942598c51710d9424))
* **KeySignatures:** Add EngravingRules.RenderKeySignatures ([#894](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/894)) (false now supported) ([09c8c61](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/09c8c6193b22e7885b203109322b61765cb868a4))
* **Options:** Add PickupMeasureWidthMultiplier to EngravingRules ([#938](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/938)) ([530d078](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/530d078a94f11487ce39902a7cfb80cf275323fc))
* **PercussionOneLine:** Add EngravingRules.PercussionOneLineUseXMLDisplayStep ([#945](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/945)) ([33a7184](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/33a7184b5259a13c8c01e107372a23e38c91a822))
* **PercussionOneLine:** Add osmd.rules.PercussionOneLineXMLDisplayStepOctaveOffset ([#945](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/945)) ([5f5d4e9](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/5f5d4e94510f99925ebb8c645f551aeb63ce3010))



## [0.8.7](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.8.6-demofix...0.8.7) (2020-11-05)


### Bug Fixes

* **Accidentals:** Remember quarter sharp/flat, don't automatically put a natural after them ([#903](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/903)) ([0696624](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/0696624d7765144440ad47c32599196aa6debac5))
* **Beams:** Fix beams in tuplets with disconnected stems ([#907](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/907)) ([8a97d47](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/8a97d4754bc990eddc8aeb9c75e743b452088d26))
* **Beams:** Fix beams with tuplets ([#907](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/907)). Add EngravingRules FlatBeams, FlatBeamOffset, FlatBeamOffsetPerBeam ([7207676](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/7207676c2882d97fa8252221d8de8018dfadfc1e))
* **Beams:** Fix nested beams, erroneous xml beam numbers ([#909](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/909)). Save IsGrace in Note ([a0df576](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/a0df576aa6673fc89c900ed559ad07926d2c6ae1))
* **ChordSymbols:** Render Natural Harmonic ([#887](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/887))
* **Compact mode:** Compact mode is now even more compact, doesn't add system margin ([#898](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/898))
* **Empty Measures:** Prevent a Vexflow bug where a measure was empty because a modifier width was NaN ([a0dbc4f](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/a0dbc4f6254b723d15007457bd82dfe36810eeb5)), closes [#899](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/899) [#49](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/49)
* **Fingering:** Associate fingering with correct note when not all notes have fingerings, save Note.Fingering ([#889](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/889)) ([a59e5d9](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/a59e5d97398b6b22ef6b410aa8586fc8847885f3))
* **Iterator:** Fix iterator.clone(): start at iterator.currentTimeStamp if startTimeStamp undefined ([#896](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/896))
* **Layout:** Don't add first system's border to margin below title. Saves a lot of space. ([5c32ff1](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/5c32ff14be9efb0653ceda267613c500234b409a)), closes [#898](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/898)
* **Octave Shifts:** Fix ottavas (octave shifts) not generated correctly over multiple systems ([#591](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/591)) (PR [#777](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/777)) ([11e9c20](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/11e9c20beccaa01e075f4994515c95e9ec9cf896))
* **Rhythm:** Don't print rhythm twice even if given in pickup measure and following measure ([#890](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/890)) ([d34f5e4](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/d34f5e4d41d15b154e30d9fb3cae630f3430a3b2))
* **Skyline:** Replace undefined values with neighboring values. Fix some tab scores ([#911](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/911)) ([e824928](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/e824928983f84e6f72d28394f037be7621cbc56d))
* **Zoom:** Fix pageBackgroundColor not filling entire page for zoom < 1 ([#904](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/904)) ([d795e7b](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/d795e7b90f8530bbe615ef696dc217b76f4e5e7c))
* **Zoom:** Fix using += with osmd.Zoom by adding osmd.Zoom getter ([3cb7fc2](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/3cb7fc22d3ce695c3605ce74352ef47da52b4d55)), closes [mpat#75](https://github.com/mpat/issues/75)


### Features

* **Slurs:** Take slur placement from XML by default ([#827](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/827)). add EngravingRules.SlurPlacementFromXML ([4cb3de9](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/4cb3de9183697357c1039794b66ad016e6253d9f))
* **Log:** Add log level silent (no console.logs)
* **osmd.Sheet:** Add setter for TitleString, SubtitleString, ComposerString, LyricistString (no need to give Label)
* **Tremolo:** Add TremoloStrokeScale and TremoloYSpacingScale in EngravingRules ([887](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/887))



## [0.8.6](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.8.5...0.8.6)  (2020-09-15)

### Bug Fixes
* **Voltas, Tabs**: Fix regression in 0.8.5 where repetition volta shift and tabnote svg id fixes were not applied (will soon be automatically fixed by vexflow patch script)

### Miscellaneous
* **Build**: Build size down to 1.1MB again from mysterious increase to 1.3MB in 0.8.5

## [0.8.5](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.8.4...0.8.5) (2020-09-08)


### Bug Fixes

* **Container height:** Small scores don't significantly exceed bounding box anymore (SVG height). Fix PageBottomMargin ([#875](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/875)) etc ([c43565c](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/c43565c970e2344f7867d463e6885b8eaa63f204)), closes [#788](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/788)
* **Rests:** Fix rests in pickup measures (e.g. 8th pickup in 4/4 time) turned into whole measure rests or multiple measure rests. ([f1478a6](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/f1478a6e52c34b4ea3710be1cec197c3e445981f))
* **Tabs:** Fix multi-rest for tabs. Never create fingerings for tabs, for now ([ed8d174](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/ed8d174ee2137f8bdbc665ed9c70ef0d050c631a))


### Features

* **Measure Numbers:** Display measure numbers (labels) as given in XML ([#541](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/541)) ([6f5d77a](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/6f5d77a9efbe29d8e210c8715c01548f1bc067f3)), closes [#879](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/879)
* **Options:** Add drawUpToPageNumber and drawUpToSystemNumber options ([#835](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/832))



## [0.8.4](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.8.3...0.8.4) (2020-08-14)


### Bug Fixes

* **Barline:** Better detect measure ending barline from XML in some cases ([#868](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/868)) ([bfc5892](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/bfc5892f005b5d236036841de5a2773288fc14d0))
* **Beams:** Fix beams with bad slopes by always recalculating beams. ([#843](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/843)) ([7b1297e](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/7b1297ea2c2e59b69e2007f88d5d587ea9e264b7))
* **Chords:** Prevent undefined error ([2cff998](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/2cff9981d8ea2627f69f927c9fa27838579e80ab))
* **Cursor:** Attach to correct page HTMLElement (canvas) ([#817](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/817)) ([decb3f1](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/decb3f11fd2979e5e41e50d6e2aa4f789197e8aa))
* **Cursor:** Position correctly on page 2+ ([#817](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/817)) ([ca7dffc](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/ca7dffce3c5c895ae51e4b44f23e0c6b7dc1b555))
* **Cursor:** Show correctly for MultiRestMeasures, interpolated by MeasureNumber (progress) ([f80697b](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/f80697b1c8c18eec60c3a180edbed421a8e5f0ab))
* **Layout:** Don't automatically create new system after final barline. add EngravingRules.NewPartAndSystemAfterFinalBarline ([7a0a1e4](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/7a0a1e4867d210611495919934ac599e4373cee0))
* **Layout:** Fix lyrics dashes causing errors with drawUpToMeasureNumber ([#838](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/838)), fix dynamic expressions missing ([1128c8b](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/1128c8b748913506d1958d53a101487b7a0f8948))
* **MeasureNumbers:** Don't reset measure number count if this.rules.NewPartAndSystemAfterFinalBarline disabled ([0991aac](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/0991aac86ac0bb5e3a485fd926d4d21e646f9646))
* **Metronome marks:** Draw all metronome marks, not just in first measure ([#804](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/804)) ([f37cabb](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/f37cabba987cc7ba57f50e66d3f1fe6e0c9f136a)), closes [#848](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/848)
* **OctaveShift:** Fix occasional error when no start or end note found ([#860](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/860)) ([f91e5d0](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/f91e5d0b9a7812612a8397014e27d7002cc87a3f))
* **OctaveShift:** Fix rare null error ([#860](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/860)) ([deb21e3](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/deb21e38017c7e06556e9656f0bf88bf99a35210))
* **Ornaments:** Mordent and inverted mordent reversed (mordent with line), according to MusicXML definition ([#866](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/866)) ([1237bec](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/1237bec904bb76947598b35366869a02aa831041))
* **Rest note positioning:** Rest notes respect the display-step and display-octave tags now ([#759](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/759)) ([e894bc8](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/e894bc80164d6ddc4e8b0464f6a1e8aa8c3fabe3)), closes [#852](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/852)
* **Tabs:** By default, don't draw tuplet numbers in tabs ([#805](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/805)) ([89a9f0f](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/89a9f0f5ab970dc88c02438c078b786f5b83aee4))
* **Tabs:** Fix setLedgerLineStyle not found on rests ([907fede](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/907fede813176057db5022b761ddd14a3e5dc914))
* **Ties:** Ties render correctly again, fix tie cross-up ([#844](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/844)) ([efee071](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/efee0714a1a61b44b7b59dd71f0a80c893978a32))
* **Tuplet:** Respect placement below from XML ([#867](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/867)) ([cf7ecfe](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/cf7ecfe0c21e93f946c57edb6abc8eeef3936b6b))
* **Visible:** Fix some errors when setting sheet.Instrument[i].Visible to false on multiple instruments. ([9037f67](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/9037f67beb3360c715c82437460965b99593cc9e))
* **Volta:** Fix y-alignment for multiple rest measures (fix [#789](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/789)) ([539e7d0](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/539e7d0015df6e17bd3e0102682d5681eb871a41))


### Features

* **Fonts:** Read and apply fontStyle for UnknownExpressions like dolce ([#348](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/348)) ([28b313d](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/28b313d73a2ea53869982d1b83bd8eb6d567ab75))
* **Labels:** Add option for additional spacing between multiline text labels (EngravingRules.SpacingBetweenTextLines) ([b530316](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/b5303169be0fea7f160cec62ae12abbe413a62c3))
* **Multirest:** Auto-generate multirest measure from subsequent rest-only measures ([#861](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/861)) ([f7d6424](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/f7d642489bfe365d59ef27057f44aa31867db84b))
* **Options:** Add option StretchLastSystemLine to stretch last system to full width ([#842](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/842)) ([88d1a5a](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/88d1a5a225765ea2
