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
* **Options:** Add option StretchLastSystemLine to stretch last system to full width ([#842](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/842)) ([88d1a5a](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/88d1a5a225765ea2447494775355043221c623cc)), closes [#847](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/847)
* **Options:** Add osmd.EngravingRules.LyricsYOffsetToStaffHeight ([#865](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/865)) ([3ca5dd0](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/3ca5dd08a257e2aba70222c72cb6c2ca84da313b))
* **Rests:** For rests encircled by beamed notes, if no display-step given, put the rest on the same y-height as previous note to avoid collisions. ([a74d77b](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/a74d77b964c862dd92e28f0870018c1d675d6c1a)), closes [#66](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/66)



## [0.8.3](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.8.2...0.8.3) (2020-07-28)


### Bug Fixes

* **MetronomeMark:** render correct beat unit (e.g. half instead of quarter). fix [#828](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/828) ([b2fb539](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/b2fb539f800e83c1adbb9bcdee76acc3d1e78f2c))
* **Parsing:** fix missing default-y value for credit-words causing parse error ([4773487](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/47734879482a89068286cbd79f63b00db46ebff4)), closes [#62](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/62)
* **Repeat:** don't draw vertical line at the beginning of a system for single staff systems ([#834](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/834)) ([e556978](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/e55697812581e1f1b60f391cdaadfdca38fca2d5))
* **Slur:** Slurs avoid note collision ([c114296](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/c114296369e2705ac7e528d00129c58d4d7a5b39))
* **Slur:** Slurs avoid note collision ([#802](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/802)) ([18397f2](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/18397f2be60f1ea4f134d807c437bcbdc5eb5090))
* **Slur:** Tweaks to slur rendering from matt-uib ([b6d628f](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/b6d628f0b02296979632e1ac3a5fe5491f4c865a))
* **Tabs:** by default, don't draw tuplet numbers in tabs ([#805](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/805)) ([89a9f0f](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/89a9f0f5ab970dc88c02438c078b786f5b83aee4))
* **Transparency:** ledger lines of invisible notes are now invisible as well. ([#799](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/799)) ([d73e8ac](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/d73e8acddfeddb1d68f8e927d541d8ed3819ce40))
* fixed right alignment (and also x-center alingment) of text lines in multi-line-label (e.g. for Composer on the right side) ([3988fde](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/3988fdec09bf698f62cb7c39a0b07d324f05a705))


### Features

* **Articulation:** render marcato, up and down ([8104dfa](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/8104dfa415a1b8abc915bac2cfd761402819fb79))
* **Label:** Add support for no-print on part names ([c3e6c8d](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/c3e6c8d878ab2ed64afbcc562ef6cc2cb7af61a1))
* **Label:** Add support for multiline labels ([#801](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/801)) ([eda4cbf](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/eda4cbf40b17f8781f45bb1abf40730dc80a2640))
* **Lyrics:** Spacing: add maximum measure elongation factor in EngravingRules. ([b575746](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/b575746af1318916984b5a2be307ca99aaf1ac02))
* **MultipleRest:** Render multiple measure rests. add option to not render them. ([#506](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/506)) ([7a04814](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/7a04814e7f77a3c59006116a95ba7d3010f489f6))
* **Noteheads:** support breve type (brevis) ([#803](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/803)) ([09fc5e7](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/09fc5e74e46edb4dbc37349638fe1003e99190ec))
* **Options:** add EngravingRules.PageBottomExtraWhiteSpace ([#788](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/788)). merge [#822](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/822) ([6e5ae88](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/6e5ae88b4b84dbd6c0296deccbd5969f6c4ebc9e))
* **Options:** add new EngravingRules for notationFontScale, stemWidth, staffLineColor ([#836](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/836)) ([2e1ab25](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/2e1ab25fe02cc88af06e334098eae5aef090c3df))
* **Options:** add option to draw measure numbers only at the start of a system (line) ([ca9b88e](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/ca9b88ee7d135f0ff830e65320cce0e4a993d5d6)), closes [#59](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/59)
* **Options:** add option to not render time signatures (drawTimeSignatures: false). ([#793](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/793)) ([21b089b](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/21b089b4841c648ec22f7c34c685dbaa945972d6))
* **Options:** set default ledger line color to black (instead of grey). set in EngravingRules.LedgerLineColorDefault ([cb31c98](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/cb31c9817b91c72ed1758659b02939168d269ffe)), closes [#799](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/799)
* **Spacing:** Tweaks to compress spacing more ([#820](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/820)) ([682f77c](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/682f77c613d764882a0d449d864a30417b6a7368))
* **Spacing:** optimize vexflow voice spacing/scaling, refactor ([817762a](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/817762a593aeb8bd13b49e550203b28ece698843))
* **Tabs:** Add Slides, Bends, Hammer-on and Pull-offs (PR [#839](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/839)) ([8de1400](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/8de1400ce0b51c55050d9961d1d2db16a0cb2d37))



## [0.8.2](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.8.1...0.8.2) (2020-06-13)


### Features

* **PDF:** Remove createPDF from OSMD object (move to demo), reducing bundle size (from 1.5MB to 1.1MB). Fix FileReader pollution ([64c8ccf](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/64c8ccff943bbbedbfb85306f516d16ad7dfa0b8))


## [0.8.1](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.8.0...0.8.1) (2020-06-10)

### Bug Fixes

* **OctaveShift:** avoid some errors when end of octaveshift not found ([#778](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/778)) ([86e6726](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/86e6726f4b3cf7f1ebde4deb7e33de5c57237167)), closes [#777](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/777) [#591](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/591)

# [0.8.0](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.7.6...0.8.0) (2020-06-10)


### Bug Fixes

* **Beams:** Recalculate beams on resize, so they fit to stem ([#724](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/724)) ([50b0864](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/50b08643c1c980f709bda1cb8134a0f995a40c0f))
* **ChordSymbols:** add 5 for power chord (e.g. C5, C plus fifth) ([#760](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/760)) ([6e1558d](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/6e1558d031452338a5cf0a0479f971337c6abbaf))
* **ChordSymbols:** read augmented and dim in abbreviated form (aug, dim) ([a291f6f](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/a291f6f7c1fa023aaf0926fdfd05d4b97cd8fabe))
* **ChordSymbols:** write Cm(maj7) for C kind 'major-minor' ([#784](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/784)) ([d00f29e](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/d00f29ed32b2496ce06d6955a481de2d8bcfc626))
* **Cursor:** fix cursor undefined for canvas backend, improve cursor creation ([#736](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/736)) ([cb193d2](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/cb193d2270d4aec4e7847615b1c811e7ef4ba25a))
* **Layout:** more lenient Measure Number Label collision checks, place them slightly to left ([#782](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/782)) ([616de17](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/616de1738b9e6466b0474bb1caa5985b11ae3bb1))
* **Rendering:** catch Vexflow errors while rendering a measure, prevent render loop stopping. ([#773](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/773)) ([e2079a3](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/e2079a3f9de1183c3c9bb4593f5badbc4da50783))
* Refactor undefined checks to also check null (#783) ([12766fb](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/12766fbf635ea3ec3e7c7b71fc05640354d726e2))
* **Options:** drawPartNames: false now also disables drawPartAbbreviations, unless set explicitly ([#388](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/388)) ([cd50b68](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/cd50b68c4430ccbc05300aa1a231ec65dbe987c0))
* **Skyline:** Fix Measure number skyline offset ([b97439e](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/b97439e3e5d8c3845e4e55c3b30fc0c92c726a11))
* fixed breaking the system if the last measure has an endline (thin-bold line) ([9d98357](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/9d9835703ae2c7d4e6f18d6781294ff22a6b8c5b))
* implemented always showing the current rhythm if there was an end line given in the last system. ([b2b31bf](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/b2b31bff84291672a3e8395d15799dc501a2a14d))
* **Expressions:** don't align expressions when there are no edges involved. manual merge of [#768](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/768) ([ff77b46](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/ff77b467c76695fb419957c191bfdbf753d68cce))
* **Expressions:** fix alignment in most cases, fix distance calculation ([#758](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/758), [#768](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/768)) ([6d5e752](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/6d5e75222d67f867d13c1273483c8019f6d32182))
* improved chord symbol text output and fixed transposing code. ([de2ef57](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/de2ef57c278a220e1b0a985520b41fc1fe354bdd))
* improved slur fix - removed magic number. Should work now for tabs as well. ([f67428c](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/f67428ca4103d1dce9d5d41126fe4a08c541e2bf))
* removed doublettes check for dynamic expressions, as they might make sense for e.g. a repetition start, where another dynamic was used at the end of the repetition. ([9ea9814](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/9ea9814d6e61d0e1500959f02745814e4d27d137))
* **Layout:** update Vexflow to 1.2.91 (now 1.2.93), fixing time signature yPos. adapt vexflow import. [#706](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/706) ([7de0f7d](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/7de0f7deaff462abf45a17e86db2d5bbb85ba697))
* **Subtitle:** don't add comma before work number if subtitle is otherwise empty ([36e4e2a](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/36e4e2add7f3a7c4dbb0977ba0f3376623d4a6e4))


### Features

* **Cursor:** restore cursor state after resize and re-render ([#734](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/734)) if option set (default true) ([a08e957](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/a08e9578c24d6ef66917617dcf71e3dc2d5b72e7))
* **Cursor:** unique HTMLElement id (cursor.cursorElementId) ([d8a15b2](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/d8a15b26762248711443c0115306f085dc29d091))
* **Font:** can set fontFamily per label ([#737](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/737)), refactor: don't set defaultFontStyle per label ([a7af16b](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/a7af16bb49c09862a68f92350597d088d41a2204))
* **Iterator:** clone() optionally starts from a given startTimeStamp (not fully tested) ([5d52d18](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/5d52d186ad9b165a08b8adcc51b26247aa3e6f94))
* **Options:** able to set ledger line width and style (color) in EngravingRules. ([f4c2fc3](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/f4c2fc306d329a64bb14d0fbfd1d753fd3536dac))
* **Options:** add option to not draw metronome marks ([#680](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/680)) ([42a1ebe](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/42a1ebe32034239aab82f377e308d2e373cc5b7b))
* **Options:** can modify chord symbol text for all chords (except major). ([#784](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/784)) ([6f53f1c](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/6f53f1c1bf05d9af23f0392eb41d28249f66bde9))
* **Text:** can set the fontStyle of a label, e.g. Bold (1) or BoldItalic (3). new option defaultFontStyle ([#739](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/739)) ([894868b](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/894868b051fa7d0eefd07a29d49d2f7065b357e9))



## [0.7.6](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.7.5...0.7.6) (2020-04-17)

### Features

* **Layout:** support XML page breaks optionally. new option newPageFromXML. [#702](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/702) ([2bcec40](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/2bcec40e70c6209675a1d521630ef268eeb6d3a1))
* **Options:** start new system ("line break") when given in XML and OSMDOptions.newSystemFromXML set ([#702](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/702)) ([5284aaa](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/5284aaa5e0a400731182d5ff36afc6e725465f55))
* **Options:** add drawingparameter "compacttight" for reduced margins and tighter spacing ([085ff1a](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/085ff1a91beb080376f769070382554e3bc298af))


## [0.7.5](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.7.4...0.7.5) (2020-04-15)


### Bug Fixes

* **Slurs:** fix undefined slur error in beethoven moonlight sonata ([#679](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/679)) ([d23581f](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/d23581fa6f80ad2da9fcbfef248cb19d2f0f9932))
* **Beams:** fix beams retaining old slope after zooming ([#655](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/655))  ([447c4f9](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/447c4f9a22be4348356761498c50a1f0a916894b))
* **Tuplets:** fix rendering for half note tuplets (were displayed as whole notes) ([#700](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/700) ([9512c3a](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/9512c3aaf013034370545f47748c4d156e144b58))

### Features
* **Options:** Instances of osmd don't share static options/EngravingRules anymore. Can have multiple independently on one page ([#559](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/559)) ([fc095ad](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/fc095ad4b5c2fbc68a220ccd518c70fbbf26a477))
* **Tabs/Testing:** Add function test and testing/demo sample for guitar tabs ([e18f133](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/e18f1331facae39cd47e3ffb383448af8752a764))

## [0.7.4](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.7.3...0.7.4) (2020-04-14)

### Bug Fixes

* **BackendSelection:** can now create and remove canvas backend (again), backend option only changed when given, improve backend creation code ([#662](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/662)) ([c0a522c](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/c0a522cf68398c8e346fd204d6f4d1a43fa59733))
* **CanvasBackend:** limit canvas dimensions to browser limitation of 32767, for now ([#678](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/678)) ([55ef164](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/55ef164e33166dde865d97724ffe7ea352378f46))
* **Clefs:** fix clef not detected when exported with invalid clef number (Sibelius) ([#635](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/635)) ([3250842](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/325084285373c3b0203d5eee031d3689853e5538))
* **Color:** fix defaultColorRest and defaultColorNotehead not applied ([7f5e1c9](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/7f5e1c9872733e2f2fd9fe3c1d81c1dd0f5f4c65))
* **Color:** fix EngravingRules.ColorStemsLikeNoteheads, ColorBeams not respected for false ([9a6ac74](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/9a6ac74bae7b3d8fdc55db4af5d218a03ce38010))
* **Demo:** fix optional zoom controls not shown, improve hiding/unhiding of control elements ([#661](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/661)) ([9783204](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/97832042f462b5b890711ea4d4a78fd8a59dcaf1))
* **Demo/Embedding:** hide debug controls before rendering, always check showHeader option, only show debug controls by default on dev server ([#661](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/661)) ([8b60397](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/8b6039794ccf0617c1446f633cd2367a55e3b15b))
* **Fingering:** fix all TechnicalInstructions counted as fingering, fix fingering for tabs (don't display on tab clef) ([ee80e91](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/ee80e911c85e33bb1c96daf14be9af4420e59c22)), closes [#711](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/711)
* **Lyrics:** fix null reference for lyrics dashes when drawing range set ([a19b3cd](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/a19b3cd6b8f74859d534a685343c45776bcea42f))
* **Repetition:** don't render a downward jog at type 'discontinue' ([#656](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/656)) ([996847d](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/996847db098859b6934dc74b3610eb1a3e40b594))
* **Ties:** prevent undefined tieNotes from creating a Vexflow error and crashing rendering ([6209cd3](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/6209cd32257fb0639e3801e2a87e9f47cf0f9efa))
* **Vexflow:** update vexflow to 1.2.90, fixing rests displayed twice (see OSMD function test invisible notes) ([a713d20](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/a713d20f44f3bb8314e2b9d417dd6cf4808f6817))


### Features

* **Tabs:** OSMD can now render guitar tabulature from MusicXML, see [PR #716](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/pull/716) and [issue #126](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/126#issuecomment-613615380)
* **Color:** new option pageBackgroundColor. can set canvas color e.g. to white instead of transparent. ([#670](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/670)) ([4e5043c](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/4e5043c3440db6eb25fb9c85ab28ed62b703c3a9))
* **Demo:** add showPageFormatControl, showExportPdfControl parameter, fix showZoomControl, hide header/controls before loading ([#661](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/661)) ([126d88e](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/126d88e1f0b4c6d86b24cce58912cf7deb56352e))
* **Embedding:** add parameters for compact mode, measure range, page format. Revise PageFormat argument handling. ([#661](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/661)) ([5dc780e](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/5dc780edf0356a91a77a686a8509b9f9e81e753b))
* **Embedding:** create backend option ([#661](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/661)), also, give warning when PDF is created on Canvas background. ([49dd902](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/49dd902f4196c9f978a1b1c8eb08c634e7c692ec))
* **ExportPNG:** generate pngs for multiple pages when PageFormat given. add pageWidth/Height parameters ([#670](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/670), [#676](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/676)) ([0353fac](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/0353facfbe2e1ebcfb14bfc14f46ca83ab3c1301))
* **GeneratePNGs:** can generate PNGs browserless by node script, improved speed ([#670](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/670)) ([4089a59](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/4089a59c555750866487e147dfb6a20a95711cf4))
* **PageFormat:** warn if a page can't fit a single MusicSystem. ([1483403](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/148340303f2589d96bbdad16f52d406c3655b579))
* **Rendering:** add option renderSingleHorizontalStaffline ([#681](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/681)) ([b1c298d](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/b1c298d55e56b6a0a1509d349dec4ca1205046fd))
* **Rendering:** add osmd.Drawer.DrawOverlayLine, which allows the user to render colored lines on any MusicPage ([#651](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/651)) ([6d8b9fc](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/6d8b9fc03e1d11f2cc622d1e30f43629d63a14f6))
* **Testing:** add visual regression testing script, generating diffs for all OSMD samples ([c17a3c7](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/c17a3c72847dce0e8aef3caf49a9f9a9e8d52bc9))



## [0.7.3](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.7.2...0.7.3) (2020-01-15)


### Bug Fixes

* **Arpeggio:** fix up/down direction (wrong in Vexflow), remove Vexflow dependency ([450b2d9](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/450b2d9)), closes [#645](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/645)
* **Dynamics, drawing range:** fix crescendo crashing when partially out of drawing range ([#644](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/644)) ([8105270](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/8105270))

### Etc
* **Imports:** Remove many Vexflow dependencies in core OSMD classes (Arpeggio, MusicSheetCalculator, other /Graphical/ classes) ([450b2d9](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/450b2d91bb4d52a60aeb6fa3425865e58efffebc), [90d93b9](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/90d93b907315b8b1d93586d4849d96c41fb60661))
* **Cursor:** Improve Follow Cursor performance (thanks to @praisethemoon) ([#639](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/pull/639))



## [0.7.2](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.7.1...0.7.2) (2019-12-13)


### Bug Fixes

* **Arpeggio:** don't draw one-note arpeggios ([#617](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/617)) ([5f7e183](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/5f7e183))
* **Arpeggios:** prevent infinite height bug, arpeggio always going across voices ([#546](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/546)) ([3fbed99](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/3fbed99))
* **autoBeam:** don't beam over half notes or beat, prevent separate beams connecting ([da464aa](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/da464aa)), closes [#574](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/574)
* **autoBeamOption:** don't beam notes of type quarter or longer in tuplets ([c3b3b5a](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/c3b3b5a))
* **barline:** don't automatically end piece with final barline if not specified ([#569](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/569)) ([8ae7938](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/8ae7938))
* **barlines:** fix left barline added to end barline ([#588](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/588)) ([6608f17](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/6608f17))
* **ChordSymbols:** save and show all chords on single note ([#599](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/599)) ([2d7e265](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/2d7e265))
* **credits placement:** fix title and composer label placement, now in relation to Staffline width ([b7af9b8](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/b7af9b8)), closes [#578](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/578)
* **Cursor:** starts and ends at selected range of measures to draw ([#566](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/566)) ([3fe770e](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/3fe770e))
* **demo:** set and reset options for specific test samples correctly ([b28b5dc](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/b28b5dc))
* **empty measures:** not filled with whole rests by default anymore. new option fillEmptyMeasuresWithWholeRest ([#625](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/625)) ([00522db](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/00522db))
* **exports:** export Vexflow graphical classes (e.g. VexflowGraphicalNote) ([06ef2f3](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/06ef2f3)), closes [#549](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/549)
* **Fractions:** add gt and gte methods, replace some > and < occurences ([#518](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/518)) ([c80fea6](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/c80fea6))
* **lyrics Placement:** fix support for Sibelius format ([#583](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/583)) ([084f308](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/084f308))
* **octaveShift, drawRange:** start and end at within draw range, fix error ([9f6bb82](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/9f6bb82)), closes [#586](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/586)
* **SkyBottomLineCalculator:** prevent infinity bug with startIndex = endIndex and .slice ([554d277](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/554d277)), closes [#575](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/575)
* **stemColor:** respect ColoringEnabled, re-color to default if disabled ([#614](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/614)) ([52928cb](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/52928cb))
* **whole rest bbox:** fix whole rest bounding box in non-4/4 time ([#609](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/609)) ([2b91655](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/2b91655)), closes [#616](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/616) [#605](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/605)


### Features

* **alignRests:** add auto option (alignRests: 2) which only aligns rests if measure contains simultaneous voices ([1c8de9f](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/1c8de9f)), closes [#621](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/621)
* **API:** Allow updating the graphical sheet from the music sheet ([#622](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/622)) ([55c3d8a](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/55c3d8a))
* **API:** save ActiveTimeSignature in SourceMeasure ([4927727](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/4927727))
* **barline:** able to not draw barlines (fix barline none) ([#391](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/391)) ([7524287](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/7524287))
* **ChordSymbols:** show all chordsymbols over a single note/staffEntry (spacing WIP) ([#599](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/599)) ([6eb97fa](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/6eb97fa))
* **exports:** Add module exports for VoiceData ([#631](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/631)) ([a2ce3a2](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/a2ce3a2))
* **open same-origin xml url:** supported ([#603](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/603)) ([0ac0132](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/0ac0132)), closes [#576](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/576)
* **options:** add option to (not) draw slurs ([#602](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/602)) ([1333195](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/1333195))
* **options:** add option to align rests and avoid rest collisions, which also aligns rests with voices ([#621](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/621)) ([ca6d730](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/ca6d730))
* **options:** can set font family for labels (default Times New Roman) ([35ee9e2](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/35ee9e2)), closes [#477](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/477)
* **options:** offer options to disable measure numbers, set their interval ([0d5af7a](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/0d5af7a))
* **Options:** add drawLyrics option ([#602](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/602)) ([9d09586](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/9d09586))




<a name="0.7.1"></a>
## [0.7.1](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.7.0...0.7.1) (2019-08-19)


### Bug Fixes

* **part names:** drawPartNames = false does not leave left x-spacing in first line anymore ([595f8ab](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/595f8ab)), closes [#515](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/515)
* **stemColor:** respect colorStemsLikeNoteheads option in XML color mode as well ([6548c57](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/6548c57)), closes [#486](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/486)
* **Ties:** fix not displaying ties because measure to graphicalMeasure dictionary didn't work ([27d3645](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/27d3645)), closes [#503](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/503)


### Features

* **drawFromMeasureNumber:** can now specify first measure to draw from as well as last,
closes [#528](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/528) [#482](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/482)
* **bar lines:** Add support for double and final bar lines ([#519](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/519)) ([e05b99a](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/e05b99a))
* **color:** add colorStemsLikeNoteheads option, color beams like stems as well if matching ([b631879](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/b631879)), closes [#486](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/486)
* **tempo:** Save measures' BPM ([#558](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/558)) ([cf199ad](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/cf199ad)), closes [#557](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/557)
* **transparency:** add invisible notes as transparent StaveNotes instead of GhostNotes ([d0211a7](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/d0211a7))
* **transparency:** allow transparency after re-render with Note.PrintObject = false ([52212d6](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/52212d6)), closes [#509](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/509)
* **demo:** add option to follow cursor (, add function test selectMeasuresToDraw)



<a name="0.7.0"></a>
# [0.7.0](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.6.8...0.7.0) (2019-03-25)


### Bug Fixes

* **Ajax Timeout:** Ajax timeout was not handled for IE and node ([2a66245](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/2a66245)), closes [#479](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/479)
* **Octava display error:** Fixed the octave shift bracket to be shown over the note line ([0e7f9f7](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/0e7f9f7)), closes [#490](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/490)
* **options:** fix drawing parameters always being created in setOptions, causing some options to be reset with {} arguments ([419c39d](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/419c39d))
* **partAbbreviations:** don't draw part abbreviations for solo parts, add option to not draw abbreviations ([945d6a1](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/945d6a1))
* **partNames:** fix showing only one of multiple parts with same instrument name ([3bee67e](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/3bee67e))
* **ties:** fix error in tie handling when no end note found ([3757db5](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/3757db5))
* **tremolo:** enable half note tremolo between two different half notes. ([eefadf8](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/eefadf8)), closes [#472](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/472)
* **tuplet:** correct tuplet label for number of notes not equal to tuplet label ([bf5aaa1](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/bf5aaa1)), closes [#485](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/485)
* **tuplet:** fix duplet, quadruplet, tuplet layout ([596e794](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/596e794)), closes [#488](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/488)


### Features

* **Coloring:** Add automatic Boomwhacker coloring scheme ([#494](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/494)) ([adaecc4](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/adaecc4)), closes [#486](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/486)
* **Instrument label abbreviations:** Add instrument label abbreviations ([a67dc00](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/a67dc00)), closes [#466](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/466)
* **Types:** OSMD uses TS types from Definitely typed now, improved Vexflow compatibility in TS ([53f2c44](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/53f2c44))
* **Options:** implement DrawCredits ([8c6df97](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/8c6df97))
* **Parts:** read and display XML part abbreviations (e.g. Vln for Violin) ([9fe031e](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/9fe031e))
* **Tremolo:** display single note tremolos ([db1840c](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/db1840c)), closes [#431](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/431)



## [0.6.8](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.6.6...0.6.8) (2019-02-08)

### Bug Fixes

* **alignment:** fix alignment of notes following dotted rest ([a7eb53d](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/a7eb53d)), closes [#484](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/484)

## [0.6.7](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.6.6...0.6.7) (2019-01-16)


### Bug Fixes

* **beams:** ignore beams between notes => quarter (tremolo) causing error ([2eb2a92](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/2eb2a92)), closes [#472](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/472)

### Various
* added osmd.Version getter to check OSMD version
* exported more classes for TS import (/Graphical/*) (#454)
* Packages updated (webpack-dev-server, etc.)

<a name="0.6.6"></a>
## [0.6.6](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.6.5...0.6.6) (2018-12-04)

### Package
* **devDependencies**: Remove browserify and tsify dependencies. Fixes unnecessary npm audit warnings.

### Bug Fixes

* **color:** use color instead of colorXml for coloring notehead, stem. ([590e281](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/590e281)),
**export missing TS classes** - closes [#462](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/462)

<a name="0.6.5"></a>
## [0.6.5](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.6.4...0.6.5) (2018-11-29)


### Features

* **ChordSymbols:** Chord symbols update their bounding box in the skyline. ([#467](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/467)) ([70ffe0b](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/70ffe0b)), closes [#464](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/464)
* **options:** add drawUpToMeasureNumber option ([f319541](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/f319541)), closes [#409](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/409)
* **tempo:** Add Graphical metronome mark ([#468](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/468)) ([6ff4fcb](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/6ff4fcb))



<a name="0.6.4"></a>
## [0.6.4](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.6.3...0.6.4) (2018-11-14)

### Features

* **export:** export all classes for TS import ([#458](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/458)) ([3364b52](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/3364b52))



<a name="0.6.3"></a>
## [0.6.3](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.6.2...0.6.3) (2018-11-08)


### Bug Fixes

* **color:** correctly parse XML color with alpha channel. ([0c28816](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/0c28816))
* **color:** notes are re-colored during render() ([3e3d9b3](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/3e3d9b3)), closes [#440](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/440) [#448](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/448)
* **color:** set default colors during render(). ([298632f](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/298632f)), closes [#440](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/440)

### Features

* **color:** can set defaultColorLabel, defaultColorTitle ([91a6b1f](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/91a6b1f)), closes [#440](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/440)
* **osmd:** Grant public access to osmd and cursor member elements ([#452)](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/pull/452))

<a name="0.6.2"></a>
## [0.6.2](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.6.1...0.6.2) (2018-10-25)

### Bug Fixes

* **noteheadshape:** add color attribute null check ([3d8da1e](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/3d8da1e))


### Features

* **color:** enable defaultColor options for notehead, stem, rest, ([3323664](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/3323664)), closes [#438](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/438), ([f1b33ab](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/f1b33ab))

<a name="0.6.1"></a>
## [0.6.1](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.6.0...0.6.1) (2018-10-25)

### Bug Fixes

* **cue notes:** parse cue element ([9443163](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/9443163))
* **grace notes:** fix stem direction for beamed grace note connected to beamed main note ([28fc01e](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/28fc01e))


### Features

* **color:** color Notehead/Stem, flags, beams. parsed by XML ([#436](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/436)) ([4126133](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/4126133))
add options to enable or disable coloring ([f78524e](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/f78524e))
**demo:** add function test color ([abfd252](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/abfd252))

<a name="0.6.0"></a>
# [0.6.0](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.5.1...0.6.0) (2018-10-18)


### Bug Fixes

* **accidentalOctaveShift:** place notes with octave brackets correctly ([#424](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/424)) ([43f13d5](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/43f13d5))
* **ChordSymbolReader:** replace old <AccidentalEnum> conversions. fixes chord symbol reading (e.g. Ab). ([b8d41de](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/b8d41de)), closes [#418](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/418)
* **ChordSymbols:** add y spacing so stems don't collide ([78cd2ed](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/78cd2ed))
* **cue notes:** add as VF.GraceNote instead of VF.StaveNote ([8d1371f](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/8d1371f))
* **grace notes:** can be at end of measure, after main note ([37f145d](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/37f145d))
* **grace notes:** grace note beams handled like other beams now, can have any grace note beams ([94cc6b5](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/94cc6b5))
* **invisible notes:** invisible rests formatting partly fixed by adding ghost notes ([3b0e19d](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/3b0e19d))
* **resize:** handling, set autoResize at runtime, add osmd.clear(), demo null checks ([#428](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/428)) ([cf2111e](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/cf2111e)), closes [#403](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/403) [#387](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/387)
* **stemDirection:** fix beam with grace note in middle bug ([#413](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/413)) ([a71496c](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/a71496c))
* **tests:** fix null pointer in setStemDirection (Haydn test fail) ([ad89d96](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/ad89d96))
* **VexFlowUpdate:** update to 1.2.87, fixes npm audit vulnerabilities

### Features

* **Expressions/Dynamics:** Add Crescendo wedges, texts, spacing, etc. ([#410](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/pull/410))
* **Arpeggios:** Display arpeggios ([#411](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/411)) ([90ae82f](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/90ae82f))
* **autoBeam:** add option to automatically beam notes ([09170a2](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/09170a2))
* **cue notes: add cue notes as smaller notes.** grace notes can have articulations ([0094f1f](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/0094f1f)), closes [#349](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/349)
* **fingering:** add fingerings to right, above, below, auto ([#406](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/406)) ([0e50f89](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/0e50f89)), closes [#350](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/350)
* **fingering:** draw fingering using Vexflow, can be disabled by option ([628562b](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/628562b))
* **NoteHeadShapes:** add square, rectangle note head ([b6a15ef](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/b6a15ef)), closes [#404](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/404)
* **options:** Options now settable during runtime: public setOptions() ([76bd9bf](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/76bd9bf)), closes [#407](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/407)
* **stemDirection:** use xml stem direction. (optionally) ([6373d58](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/6373d58)), closes [#415](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/415)

<a name="0.5.1"></a>
## [0.5.1](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.5.0...0.5.1) (2018-09-26)

### Bug Fixes

* **Bbox/Cursor:** fix bbox and cursor position for whole rests ([#383](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/383)) ([3d1894d](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/3d1894d)), closes [#380](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/380)
* **Cursor:** Fix Cursor jumping incorrectly on Next() ([#377](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/377)) ([f43e305](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/f43e305)), closes [#376](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/376)
* **DrawingParameters:** switching default and compact mode during runtime correctly renders each mode after re-render. ([96bf081](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/96bf081))
* **Error handling:** Fix error loading empty score, improve error handling ([#367](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/367)) ([aa65792](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/aa65792)), closes [#358](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/358)
* **Invisible notes:** do not display invisible notes and double rests. ([a6ac78c](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/a6ac78c))
* **NoteHead:** info instead of warn for unsupported NoteHead, use triangle for "do" ([f1d4b47](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/f1d4b47))
* **Zooming on mobile devices crashed OSMD:** Skip Bottomline Update if the zoom gets too much for vexflow ([#375](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/375)) ([c562a96](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/c562a96)), closes [#373](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/373)

### Features

* **Invisible notes:** Do not display invisible time signature. ([af0770a](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/af0770a))
* **Invisible notes:** Do not display invisible notes. Invisible notes are parsed, with invisible (printObject) flag ([ccf860e](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/ccf860e))
* **Options:** add options interface for osmd constructor ([#368](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/368)) ([9da9cb4](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/9da9cb4))
* **Options:** implement compact mode, drawPartNames, drawTitle, drawSubtitle, drawComposer, drawLyricist ([9cec507](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/9cec507))
* **Tuplets:** Read and display tuplet bracket setting from XML. Do not display tuplet ratios by default. ([f568e51](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/f568e51))
* **Demo:** Add Re-render button, add column to layout ([#361](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/pull/361))

<a name="0.5.0"></a>
# [0.5.0](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.3.1...0.5.0) (2018-09-05)


### Bug Fixes

* **Skyline:** Labels affect height of skyline now. Start and end ([b5f3bcd](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/b5f3bcd))
* **Cursor:** Fix x-position of cursor ([6887f20](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/6887f20))
* **Demo:** Fix console warning on init ([#332](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/332)) ([0845c6d](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/0845c6d))
* **Demo:** Sample file names more consistent ([c9fcbae](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/c9fcbae))
* **Expressions:** Octaveshift line breaks work now ([e2b1780](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/e2b1780)), closes [#309](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/309)
* **In-measure clef layout:** add as NoteSubGroup instead of ClefNote directly. ([97a0043](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/97a0043)), closes [#307](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/307) [#311](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/311)
* **LyricsSpacing:** eliminate overlap between lyrics labels by extending measures ([622f346](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/622f346))
* **LyricsSpacing/Dashes:** reduce lyrics spacing and number of dashes ([7565bb0](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/7565bb01515885ed7b75bf9521f74f582e51bd38))
* **Lyrics:** Shorten lyrics y offset ([0c8eb28](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/0c8eb28))
* **Demo:** add OSMD function test files to index.js ([fe260c0](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/fe260c0))
* **Relative Bounding Positions:** Relative x positions in bounding boxes were not adjusted to note head ([af21d7e](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/af21d7e)), closes [#309](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/309)
* **VexFlowMusicSheetCalculator:** fix vexflow formatting error caused by align_rests = true ([4fa7b4e](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/4fa7b4e))
* **TimeSignatures**: Display Common/Alla Breve time symbols instead of numbers, fix key signature without mode ([6e99997](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/6e999976e06e1f39f15e97647bc727e574d2b0a9)), closes [#305](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/pull/305)
* **VexFlow**: Update to VexFlow version 1.2.85, fixes rerender issues with grace notes, ornaments, etc. ([a840ea3](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/a840ea37678b25c5cd42cee1dfe903cad60d7817))
* **Repetitions**: Fix drawing repetition endings using VexFlow Voltas ([c32ba9d](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/c32ba9dc83e241c42c5060b6fc208b57d96e97ec))

### Features

* **Slurs:** Display Slurs ([1123251](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/1123251d5a85dedc3305f7e1d29ca32bac3d1198)) [#359](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/pull/359)
* **Ornaments:** Display Ornaments ([7032fdc](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/7032fdc484d7c3f28481feba92c8d9294e561b86))
* **GraceNotes:** Display GraceNotes ([3412e9a](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/3412e9a)), closes [#293](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/293)
* **GraceNotes:** Display Grace slur (boolean) ([2525e92](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/2525e92)), closes [#293](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/293)
* **Accidentals:** Display quarter tones, triple sharps/flats ([024b95e](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/024b95e)), closes [#215](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/215) [#284](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/284)
* **In-Measure Clefs:** Display in-measure clefs ([3158eb4](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/3158eb4))
* **NoteHeads:** Add Note Head Shapes (Percussion: Slash, Triangle, Diamond, X) ([#337](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/337)) ([4599d51](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/4599d51)), closes [#327](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/327) [#325](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/325)
* **Lyrics:** Draw LyricsExtends (_), fix lyricsSpacing ([#322](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/322)) ([e9da9e1](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/e9da9e1))
* **Dynamics:** Display Dynamics (Instantaneous expressions) ([29337c9](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/29337c9))
* **Lyrics:** Left-Alignment (default), Center optional, fix lyricsSpacing ([#356](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/356)) ([6205fe3](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/6205fe3))
* **Tempo Expressions:** Add all tempo expressions ([83d59c8](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/83d59c8)), closes [#309](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/309)


<a name="0.3.1"></a>
## [0.3.1](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.3.0...0.3.1) (2018-06-25)


### Bug Fixes

* Fixed a bug where vexflow does not support having `8va` and the `bass` type ([ad0630d](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/ad0630d))
* Added fix in repetition comparer (from [#251](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/251)) ([9c7e164](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/9c7e164))
* Fixed UTF-8 encoding in AJAX loader. Fixes [#252](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/252) [#254](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/254)
* Fixed ajax loader for mxl using old mimetype. ([ae8c5e1](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/ae8c5e1))
* Fixed a little bug at the extra instruction measure ([da0ba9d](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/da0ba9d))
* Fixed tie drawing bug - now all ties of a chord are drawn. ([4021833](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/4021833))
* Fixed whole notes not being in the middle of a measure, see [#260](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/260)) ([ee2f706](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/ee2f706))

### Features
* Improved ghostnote positioning and a ghost note converter ([6dc0460](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/6dc0460))
* Added `GraphicalVoiceEntry` for displaying lyrics ([471ee19](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/471ee19))


## [0.3.0](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.1.0...0.3.0) (2018-05-03)


### Bug Fixes

* **logging:** fixed problems connected to loglevel type definition changes ([eea535d](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/eea535d))
* corrected begin instructions width (begin modifiers) to work also for extra instruction measures. ([1509a81](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/1509a81))
* fixed a bug in stem calculation which made all stems up for a single voice. ([aeb670e](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/aeb670e))
* fixed all broken file references in demo file selector. ([3659fec](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/3659fec))
* fixed showing the staveconnector of multi-staved instruments at the end of the system. ([46ca911](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/46ca911))
* refined position of Articulations (always close to note head). Remaining problem: Beam calculations change initial stem direction. Articulation positions need to be set after beams. ([22de162](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/22de162))
* using backend select value already for initial OSMD constructor ([97aad81](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/97aad81))


### Features

* **Articulations:** Added ArticulationReader - articulations are read from xml ([f529f45](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/f529f45))
* **clef:** Improved conversion of ClefInstructions to VexFlow clefs. Lines are now respected during ([473c85a](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/473c85a)), closes [#110](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/110)
* **engraving:** allow to change system labels' right margin ([#131](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/131)) ([be03289](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/be03289))
* implemented setting stem direction automatically from voice type (main or linked voice) ([e7f9e10](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/e7f9e10))
* optional element mode in key signature ([e85117a](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/e85117a)), closes [#108](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/108)


### Styles

* moved linting from grunt to npm script ([8dafc27](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/8dafc27))


### BREAKING CHANGES

* Running `grunt lint` is no longer possible.


## [0.2.0](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.1.0...0.2.0) (2017-04-08)


## [0.1.0](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.1.0-beta.5...0.1.0) (2016-09-23)

### Added
- Added Reset button for cursor for demo
- Added more xml files for demo and testing
- Added unit tests for reading and calculating the xml files
- Added logo as favicon and as img for demo site

### Changed
- html site layout of demo

### Bugfixes
- Fixed cursor functionality in demo

## [0.1.0-beta.5] - 2016-09-21
### Changed
- Updated Github pages deployment ([645c428](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/645c42874ea1c43f62d163203d2b96aa6667accf))

## [0.1.0-beta.4] - 2016-09-21
### Changed
- Updated Github pages deployment ([e5a8771](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/e5a877153f76d32db89c826c0d86b9b3f3c09276))

## [0.1.0-beta.3] - 2016-09-21
### Changed
- Updated Github pages deployment ([64a332c](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/64a332c9f75fa60fb74e5f3b9dabb291ed7062e6))

## [0.1.0-beta.2] - 2016-09-21
### Changed
- Updated Github pages deploy script ([4ac4dbb](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/4ac4dbbebf578db0eddfbaa64f90091a32e915fb))

## [0.1.0-beta.1] - 2016-09-21
### Changed
- Changed Travis CI deploy configuration ([a550e48](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/a550e4899af03564be1e4e4ae420442044390300))

## [0.1.0-beta] - 2016-09-21
### Added
- Prepared for brace and bracket generation with VexFlow ([fd40c22](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/fd40c22d813279ed714028250625cbbdfd5ad633))
- Class documentation ([73d319f](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/73d319fb17b4663fcfa001343647b8b662c17cee))
- OSMD is now usable via script tags  ([091dab9](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/091dab9d82d6c477b7e88de2d424024696d126fa))
- Set up `loglevel` as logging framework ([c00b5a8](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/c00b5a8ee789ece21bf8e8eb02cfa4f13b498e70))
- Support for ocatvated clefs ([567b3b3](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/567b3b3ec69fad492da68946039517804567cb25))
- Demo is now automatically built and published to https://opensheetmusicdisplay.github.io/demo/ ([1c63f82](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/1c63f82ea5c7b0ae978f43cf1cc60675026e4060))
- Class documentation generated with typedoc, published to https://opensheetmusicdisplay.github.io/ ([bc91091](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/bc91091099f76ea5b9145f674bfcea2f36ca6712))
- Added rendering tuplets
- Added rendering ties
- Added rendering dots
- Added documentation for VexFlow and other graphical objects
- Proper title display
- Cursor on first StaffEntry by default
- Better grunt tasks
- Included demo for better debugging
- Added tests for container's width
- Small fixes for correct x-layouting
- Support for loading MusicXML files by URL
- Support for Promises in loading sheet music
- Better tests for `OSMD`

### Changed
- Compiled files are no longer under version control ([6b01a8f](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/6b01a8f81b2762dfc702d541442108b459b486f1))
- Renamed test files according to '_Test' convention
- Removed workaround for title labels
- Renamed files to reflect class names

### Bugfixes
- Measure and clef size fixes ([aa7c96d](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/aa7c96d7bf73be142d44706a3033f4e6f4467e07))
- MusicXML reader exception due to wrong file encodings ([9af59d6](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/9af59d684a21a6d07609e4a8b72c0d39a9e32e64))
- Fixed bug in measure number calculation
- Fixed a bug in calculator
- Fixed bug with beginInstructionWidth
- Fixed bug with response HTTP status

## [0.0.1-alpha.1] - 2016-07-15
### Added
- Auto resize to window width
- Preliminary MXL support from URLs
- Tests for OSMD
- Implemented a basic cursor object to browse the sheet
- Public API: Rename `MusicSheetAPI` (renamed to `OSMD`)
- Fallback title display
- Better usage of VexFlow measure size
- Fixed duplicated beams when redrawing

## [0.0.1-alpha.0] - 2016-07-08
### Added
- First public pre-release

[0.1.0-beta.5]: https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.1.0-beta.4...0.1.0-beta.5
[0.1.0-beta.4]: https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.1.0-beta.3...0.1.0-beta.4
[0.1.0-beta.3]: https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.1.0-beta.2...0.1.0-beta.3
[0.1.0-beta.2]: https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.1.0-beta.1...0.1.0-beta.2
[0.1.0-beta.1]: https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.1.0-beta...0.1.0-beta.1
[0.1.0-beta]: https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.0.1-alpha.1...0.1.0-beta
[0.0.1-alpha.1]: https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.0.1-alpha.0...0.0.1-alpha.1
