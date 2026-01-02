# PianoTree Fork Changes

**78 commits** on `master-tree` (v1.9.3 → v1.9.52) — sorted by release date (newest first)

---

## v1.9.52 (2026-01-02)

_No feature changes — release only_

---

## v1.9.51 (2025-12-29)

### Fingering Positioning Fix
Fix fingering positioning in dense note layouts.

> Release: **v1.9.51** — Commit: `faae2397`

**Files:** `MusicSheetCalculator.ts`

---

## v1.9.49 (2025-12-29)

### Chord Symbol X Alignment
Fix chord symbol X alignment for scores with harmony on bass staff.

> Release: **v1.9.49** — Commit: `22bb9edb`

**Files:** `MusicSheetCalculator.ts`, `InstrumentReader.ts`, `EngravingRules.ts`

---

## v1.9.48 (2025-12-23)

### Multi-Voice Rest Collision
Configurable multi-voice rest collision calculation for improved layout.

> Release: **v1.9.48** — Commit: `d8b60e6f`

**Files:** `EngravingRules.ts`, `VexFlowConverter.ts`, `OSMDOptions.ts`, `OpenSheetMusicDisplay.ts`

---

## v1.9.46 (2025-12-11)

### Cursor Initial Scroll Fix
Prevent cursor following/scrolling at initial position to avoid unwanted scrolling on load/reset.

> Release: **v1.9.46** — Commit: `83c28e72`

**Files:** `Cursor.ts`

---

## v1.9.44 (2025-12-10)

### System Stretch Fix
Avoid stretching last system forcefully.

> Release: **v1.9.44** — Commit: `28c01515`

**Files:** `MusicSystemBuilder.ts`

---

## v1.9.43 (2025-11-29)

### Cursor Flicker Fix
Fix "vertical flicker" on cursor advance.

> Release: **v1.9.43** — Commit: `36955af8`

**Files:** `Cursor.ts`

---

## v1.9.39–v1.9.42 (2025-11-19)

### Smooth Scroll (iOS Safari)
Custom polyfill for iOS Safari which doesn't support native smooth scrolling.

> Release: **v1.9.39** — Commits: `963e9109`, `f9b1096b`, `6488d126`

**Files:** `SmoothScroll.ts` (NEW - 179 lines), `Cursor.ts`

### Scroll Behavior Tweaks
Various cursor scroll behavior adjustments.

> Releases: **v1.9.36–v1.9.38** — Commits: `0be1fc21`, `3a2996b4`, `145d449a`

**Files:** `Cursor.ts`

---

## v1.9.30 (2025-11-13)

### Cursor Transparency
Make cursor div transparent + custom cursor options.

> Release: **v1.9.30** — Commits: `bd739a8f`, `e476174d`, `4c20ac98`

**Files:** `Cursor.ts`, `OSMDOptions.ts`, `OpenSheetMusicDisplay.ts`

---

## v1.9.28 (2025-11-11)

### Blur Staff Index
Added staff index support for voice blur.

> Release: **v1.9.28** — Commit: `ca562f5f`

**Files:** `OpenSheetMusicDisplay.ts`

---

## v1.9.26–v1.9.27 (2025-11-09 – 2025-11-10)

### Metronome / Tempo API
Metronome marks preserved when filtering measures + new tempo method.

```typescript
osmd.getBPMTempoFromTimestamp(timestamp: Fraction): number
```

> Release: **v1.9.26** — Commits: `da6bb3fe`, `a8c2767b`

**Files:** `OpenSheetMusicDisplay.ts`, `MusicPartManagerIterator.ts`

---

## v1.9.17 (2025-11-01)

### Chords & Lyrics Interactivity
Made chord symbols and lyrics clickable/hoverable.

> Release: **v1.9.17** — Commit: `0e7e8d9c`

**Files:** `GraphicalLabel.ts` (+64 lines), `GraphicalLyricEntry.ts` (+26 lines)

---

## v1.9.14–v1.9.15 (2025-10-30)

### Octave Shift (8va) API
New methods for querying active octave shifts + fix for 8va brackets when filtering measures.

```typescript
osmd.getActiveOctaveShift(timestamp, staffIndex, measureIndex): OctaveShift
osmd.hasActiveOctaveShift(timestamp, staffIndex, measureIndex): boolean
```

> Release: **v1.9.14** — Commits: `d88c8b4a`, `964c176a`

**Files:** `OpenSheetMusicDisplay.ts`, `MusicSheetCalculator.ts`

---

## v1.9.13–v1.9.14 (2025-10-27 – 2025-10-28)

### Voice Blur API
New methods to blur (reduce opacity of) specific voices for practice mode.

```typescript
osmd.blurVoice(voiceId: number, opacity?: number): void
osmd.blurVoices(voiceIds: number[], opacity?: number): void
osmd.blurAllVoicesExceptVoice(voiceId: number, opacity?: number): void
osmd.blurAllVoicesExceptVoices(voiceIds: number[], opacity?: number): void
osmd.resetVoiceBlur(): void
```

> Release: **v1.9.11** — Commits: `7055d3c2`, `d089c4d9`, `c2c7ce1b`, `57b1e607`

**Files:** `OpenSheetMusicDisplay.ts`, `VexFlowGraphicalNote.ts` (+144 lines), `GraphicalNote.ts`

---

## v1.9.4–v1.9.5 (2025-10-25 – 2025-10-26)

### Anacrusis/Pickup Measure Sizing
Pickup measures sized correctly (not just measure 0).

> Release: **v1.9.4** — Commits: `6b251a4c`, `0cdeacc7`

**Files:** `VexFlowMusicSheetCalculator.ts`

### Clef Filtering Fix
Fix wrong clef being shown when filtering/looping measures.

> Release: **v1.9.4** — Commit: `53d6a261`

**Files:** `MusicSystemBuilder.ts`

### Cursor Height Fix
Fix cursor height issues.

> Release: **v1.9.3** — Commit: `f08f8a9f`

**Files:** `Cursor.ts`

---

## v1.9.3 (2025-10-14 – 2025-10-25)

### Rest Positioning Fix
Fix rests positioning in lead sheets with multiple voices.

> Release: **v1.9.3** — Commit: `1075125c`

**Files:** `VexFlowMusicSheetCalculator.ts`

### Build Infrastructure
Added build and release scripts.

> Release: **v1.9.3** — Commits: `b1f6ce4a`, `9b2c0ba5`, `e0fbe6fc`

**Files:** `scripts/build-package.sh` (NEW), `scripts/release.sh` (NEW), `package.json`

---

## Summary: Files Changed

| File | Lines |
|------|-------|
| `OpenSheetMusicDisplay.ts` | +427 |
| `SmoothScroll.ts` | +179 (NEW) |
| `VexFlowGraphicalNote.ts` | +144 |
| `MusicSheetCalculator.ts` | +107 |
| `Cursor.ts` | +101 |
| `GraphicalLabel.ts` | +64 |
| `MusicSystemBuilder.ts` | +53 |
| `GraphicalMusicSheet.ts` | +49 |
| `VexFlowMusicSheetCalculator.ts` | +31 |
| `GraphicalNote.ts` | +28 |
| `GraphicalLyricEntry.ts` | +26 |
| `MusicPartManagerIterator.ts` | +24 |
| `InstrumentReader.ts` | +19 |
| `OSMDOptions.ts` | +17 |
