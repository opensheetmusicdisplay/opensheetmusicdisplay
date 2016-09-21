# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/) 
and this project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased]
### Added
### Changed
### Bugfixes

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
- Brace and bracket generation using VexFlow ([fd40c22](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/fd40c22d813279ed714028250625cbbdfd5ad633))
- Class documentation ([73d319f](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/73d319fb17b4663fcfa001343647b8b662c17cee))
- OSMD is now usable via script tags  ([091dab9](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/091dab9d82d6c477b7e88de2d424024696d126fa))
- Set up `loglevel` as logging framework ([c00b5a8](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/c00b5a8ee789ece21bf8e8eb02cfa4f13b498e70))
- Support for ocatvated clefs ([567b3b3](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/567b3b3ec69fad492da68946039517804567cb25))
- Demo is now automatically built and published to https://opensheetmusicdisplay.github.io/demo/ ([1c63f82](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/1c63f82ea5c7b0ae978f43cf1cc60675026e4060))
- Class documentation generated with typedoc, published to https://opensheetmusicdisplay.github.io/ ([bc91091](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/commit/bc91091099f76ea5b9145f674bfcea2f36ca6712))
- Added ties
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

[Unreleased]: https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.1.0-beta.3...HEAD
[0.1.0-beta.3]: https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.1.0-beta.2...0.1.0-beta.3
[0.1.0-beta.2]: https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.1.0-beta.1...0.1.0-beta.2
[0.1.0-beta.1]: https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.1.0-beta...0.1.0-beta.1
[0.1.0-beta]: https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.0.1-alpha.1...0.1.0-beta
[0.0.1-alpha.1]: https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/compare/0.0.1-alpha.0...0.0.1-alpha.1
