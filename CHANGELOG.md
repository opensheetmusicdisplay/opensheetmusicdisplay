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
