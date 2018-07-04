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
