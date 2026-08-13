import log from "loglevel";
import { MusicSheet } from "../../MusicalScore/MusicSheet";
import { SourceMeasure } from "../../MusicalScore/VoiceData/SourceMeasure";
import { SourceStaffEntry } from "../../MusicalScore/VoiceData/SourceStaffEntry";
import { VoiceEntry } from "../../MusicalScore/VoiceData/VoiceEntry";
import { Slur } from "../../MusicalScore/VoiceData/Expressions/ContinuousExpressions/Slur";
import { GraphicalMusicSheet } from "../../MusicalScore/Graphical/GraphicalMusicSheet";
import { GraphicalMusicPage } from "../../MusicalScore/Graphical/GraphicalMusicPage";
import { MusicSystem } from "../../MusicalScore/Graphical/MusicSystem";
import { StaffLine } from "../../MusicalScore/Graphical/StaffLine";
import { GraphicalMeasure } from "../../MusicalScore/Graphical/GraphicalMeasure";
import { BrailleMeasureRenderer, BrailleState, BrailleMeasureResult, forEachVoiceEntryInMeasure } from "./BrailleMeasureRenderer";
import { BrailleOctaveTracker } from "./BrailleOctaveTracker";
import { ClefEnum, ClefInstruction } from "../../MusicalScore/VoiceData/Instructions/ClefInstruction";
import { KeyInstruction } from "../../MusicalScore/VoiceData/Instructions/KeyInstruction";
import { Fraction } from "../../Common/DataObjects/Fraction";
import {
    BRAILLE_MEASURE_SEPARATOR, BRAILLE_LINE_BREAK, BRAILLE_AUGMENTATION_DOT,
    BRAILLE_HAND_RIGHT, BRAILLE_HAND_LEFT,
    firstCharHasLowerDots,
    getClefBraille, getClefName,
} from "./BrailleSymbols";
import { BrailleNoteDebugInfo } from "./BrailleNoteRenderer";
import { BrailleBarOverBarLayout, EnsemblePartInfo } from "./BrailleBarOverBar";
import { renderKeySignature, BrailleKeySignatureResult } from "./BrailleKeySignature";
import { Instrument } from "../../MusicalScore/Instrument";
import { textToBraille, BRAILLE_ABBREV_PERIOD, BRAILLE_BLANK_CELL } from "./BrailleSymbols";
import {
    extractLyricsMeasure, buildMelismaSlurSet, collectVerseNumbers, extractFullVerse,
    LyricsMeasureResult, LyricsState,
} from "./BrailleLyrics";

/**
 * Debug information for a braille character or element.
 * Used in translation/debug mode to show what each braille symbol means.
 */
export interface BrailleDebugEntry {
    /** The braille character(s) */
    braille: string;
    /** Human-readable description, e.g. "octave 4", "quarter note C4" */
    meaning: string;
    /** Source measure number (1-based) */
    measureNumber: number;
}

/**
 * Result of a complete braille conversion.
 */
export interface BrailleOutput {
    /** The complete braille string for the entire score/part */
    text: string;
    /** Debug/translation information, one entry per braille element */
    debugEntries: BrailleDebugEntry[];
}

/**
 * Braille output format.
 * - "nonfacsimile": Standard braille music (default). Omits print-layout signs
 *   (clefs, ottavas, page numbers). Output is a continuous stream of measures.
 * - "facsimile": Mirrors visual score layout. Includes clef signs, ottava brackets,
 *   and other print-presentation signs. Line breaks match print systems.
 *   Requires GraphicalMusicSheet (after render()). See Music Braille Code 2015 §1.1.
 */
export type BrailleFormat = "nonfacsimile" | "facsimile";

/**
 * Options for braille conversion.
 */
export interface BrailleOptions {
    /** Which staff to render (0-based). Default: 0. Ignored when multiStaff is true. */
    staffIndex?: number;
    /** Whether to generate debug/translation info. Default: true */
    debugMode?: boolean;
    /** Output format. Default: "nonfacsimile" */
    format?: BrailleFormat;
    /**
     * The rendered graphical sheet. Required for facsimile mode.
     * Available from `osmd.GraphicSheet` after calling `render()`.
     * Provides system layout information for line-break placement.
     */
    graphicSheet?: GraphicalMusicSheet;
    /**
     * When true, render all staves (e.g. both hands for piano) with hand sign prefixes.
     * Each staff is rendered on its own line, separated by newlines.
     * RH (staff 0) gets right-hand sign, LH (staff 1) gets left-hand sign.
     * Key/time signatures are rendered only on the first (RH) line.
     *
     * Default: auto-detected. If staffIndex is not explicitly set and the score has
     * multiple staves, multi-staff mode is enabled automatically. Set to false to
     * force single-staff output (renders staffIndex only).
     */
    multiStaff?: boolean;
    /**
     * When true (and multiStaff is active), use bar-over-bar format instead of
     * sequential multi-staff layout. Bar-over-bar vertically aligns measures
     * between staves, with measure numbers at the left margin and a music heading
     * (key/time) centered above the first parallel. BANA standard format for
     * keyboard music (Music Braille Code 2015, Chapter 28 + Par. 29.3).
     *
     * Default: false (uses sequential M8a format).
     */
    barOverBar?: boolean;
    /**
     * Maximum cells per braille line in bar-over-bar mode.
     * Default: 40 (standard braille display width).
     */
    lineWidth?: number;
    /**
     * When true, render as an ensemble score with instrument abbreviations
     * and all chord intervals reading upward (Music Braille Code 2015, Chapter 33).
     * Each instrument gets its own line in each parallel, with abbreviation prefix.
     * Measure numbers appear in a free line above each parallel.
     *
     * Must be set explicitly — not auto-detected, since MusicXML often splits
     * keyboard instruments into separate parts which would be falsely detected.
     *
     * Default: false.
     */
    ensemble?: boolean;
    /**
     * When true, render with lyrics in word-line + music-line parallel format
     * (Music Braille Code 2015, Section 35). Word line (literary braille) at
     * cell 1, music line indented 2 cells.
     *
     * Must be set explicitly — not auto-detected, since many instrumental
     * scores carry stray lyric metadata that would falsely trigger it.
     *
     * Default: false.
     */
    lyrics?: boolean;
}

/**
 * Main orchestrator that converts a MusicSheet to braille music notation.
 * This is the primary public API for the braille module.
 *
 * Usage:
 * ```typescript
 * const converter = new BrailleConverter();
 * const output = converter.convert(osmd.Sheet);
 * console.log(output.text); // braille string
 * ```
 */
export class BrailleConverter {
    private measureRenderer: BrailleMeasureRenderer;

    constructor() {
        this.measureRenderer = new BrailleMeasureRenderer();
    }

    /**
     * Convert a MusicSheet to braille music notation.
     *
     * @param musicSheet The parsed MusicSheet from OSMD (after load())
     * @param options Conversion options (staff index, debug mode)
     * @returns BrailleOutput with text and optional debug info
     */
    public convert(musicSheet: MusicSheet, options?: BrailleOptions): BrailleOutput {
        const debugMode: boolean = options?.debugMode ?? true;
        const facsimile: boolean = (options?.format ?? "nonfacsimile") === "facsimile";

        // Ensemble mode: multiple instruments in bar-over-bar with abbreviations (M8c)
        // Only enabled when explicitly set — auto-detection is too ambiguous
        // (MusicXML often splits piano into 2 separate parts)
        if (options?.ensemble && musicSheet.Instruments.length > 1) {
            return this.convertEnsemble(musicSheet, debugMode, facsimile, options);
        }

        // Lyrics mode: word-line + music-line parallel format (M9)
        // Only enabled when explicitly set via lyrics: true option
        if (options?.lyrics) {
            return this.convertWithLyrics(musicSheet, debugMode, facsimile, options);
        }

        // Determine multi-staff mode:
        // - Explicit multiStaff option takes precedence
        // - If not specified and staffIndex is not explicitly set, auto-detect from score
        //   (render all staves when the score has multiple staves)
        // - If staffIndex is explicitly set, render only that staff (single-staff mode)
        const staffIndexExplicit: boolean = options?.staffIndex !== undefined;
        const multiStaff: boolean = options?.multiStaff ??
            (!staffIndexExplicit && musicSheet.Staves.length > 1);

        // Multi-staff mode: render all staves with hand signs
        if (multiStaff) {
            return this.convertMultiStaff(musicSheet, debugMode, facsimile, options);
        }

        const staffIndex: number = options?.staffIndex ?? 0;
        const measures: SourceMeasure[] = musicSheet.SourceMeasures;
        const slurLengths: Map<Slur, number> = BrailleConverter.computeSlurLengths(measures, staffIndex);

        const state: BrailleState = {
            octaveTracker: new BrailleOctaveTracker(),
            facsimile: facsimile,
            currentClef: ClefEnum.G,
            hadInAccord: false,
            activeSlurs: new Set(),
            slurLengths: slurLengths,
        };

        // Facsimile mode: iterate by system for line breaks matching visual layout
        if (facsimile && options?.graphicSheet) {
            return this.convertFacsimile(options.graphicSheet, staffIndex, debugMode, state);
        }

        if (facsimile && !options?.graphicSheet) {
            log.warn("BrailleConverter: format 'facsimile' requested but no graphicSheet provided. " +
                "Falling back to nonfacsimile. Pass graphicSheet: osmd.GraphicSheet (after render()) to enable facsimile mode.");
        }

        return this.convertNonfacsimile(measures, debugMode, staffIndex, state);
    }

    /**
     * Nonfacsimile conversion: linear iteration over all SourceMeasures.
     * Measures are joined with barline separators (space characters).
     */
    private convertNonfacsimile(
        measures: SourceMeasure[], debugMode: boolean, staffIndex: number, state: BrailleState
    ): BrailleOutput {
        const measureStrings: string[] = [];
        const allDebugEntries: BrailleDebugEntry[] = [];
        for (const sourceMeasure of measures) {
            const measureResult: BrailleMeasureResult = this.measureRenderer.render(sourceMeasure, staffIndex, state);

            if (measureResult.braille.length > 0) {
                measureStrings.push(measureResult.braille);
            }

            if (debugMode) {
                for (const entry of measureResult.debugEntries) {
                    allDebugEntries.push({
                        braille: entry.braille,
                        meaning: entry.meaning,
                        measureNumber: measureResult.measureNumber,
                    });
                }

                // Add barline separator debug entry (except after last measure)
                if (sourceMeasure !== measures[measures.length - 1]) {
                    allDebugEntries.push({
                        braille: BRAILLE_MEASURE_SEPARATOR,
                        meaning: "barline",
                        measureNumber: measureResult.measureNumber,
                    });
                }
            }
        }

        return {
            text: measureStrings.join(BRAILLE_MEASURE_SEPARATOR),
            debugEntries: debugMode ? allDebugEntries : [],
        };
    }

    /**
     * Multi-staff conversion: renders all staves with hand sign prefixes (M8a).
     *
     * For keyboard music (piano), this produces two lines:
     *   .>[RH measures...]\n
     *   _>[LH measures...]
     *
     * Each staff is rendered independently with its own BrailleState.
     * Key/time signatures are rendered only on the first staff (RH);
     * subsequent staves have their state pre-initialized to suppress
     * duplicate signatures.
     *
     * Hand signs (Par. 29.2):
     * - Staff 0 = right hand sign (⠨⠜)
     * - Staff 1 = left hand sign (⠸⠜)
     * - Additional staves (rare) omit hand sign but still get separate lines
     * - Octave mark is mandatory on the first note after a hand sign
     * - Dot-3 separator is added if the next sign contains dot 1, 2, or 3
     */
    private convertMultiStaff(
        musicSheet: MusicSheet, debugMode: boolean, facsimile: boolean, options?: BrailleOptions
    ): BrailleOutput {
        const measures: SourceMeasure[] = musicSheet.SourceMeasures;
        const totalStaves: number = musicSheet.Staves.length;
        const staffCount: number = Math.min(totalStaves, 2); // M8a: support up to 2 staves (RH/LH)

        if (staffCount < 2) {
            // Single staff — fall back to normal single-staff conversion
            return this.convertSingleStaffWithHandSign(musicSheet, 0, debugMode, facsimile, options);
        }

        // Bar-over-bar format (M8b): vertically aligned parallels
        if (options?.barOverBar) {
            return this.convertBarOverBar(musicSheet, debugMode, facsimile, options);
        }

        // Read initial key and time from the first measure (for LH state suppression)
        const initialKey: KeyInstruction | undefined = measures.length > 0
            ? measures[0].getKeyInstruction(0) : undefined;
        const initialTime: Fraction | undefined = measures.length > 0
            ? measures[0].ActiveTimeSignature : undefined;

        const staffLines: string[] = [];
        const allDebugEntries: BrailleDebugEntry[] = [];

        for (let si: number = 0; si < staffCount; si++) {
            const handSign: string = si === 0 ? BRAILLE_HAND_RIGHT : BRAILLE_HAND_LEFT;
            const handName: string = si === 0 ? "right hand" : "left hand";
            const defaultClef: ClefEnum = si === 0 ? ClefEnum.G : ClefEnum.F;
            const slurLengths: Map<Slur, number> = BrailleConverter.computeSlurLengths(measures, si);

            const state: BrailleState = {
                octaveTracker: new BrailleOctaveTracker(),
                facsimile: facsimile,
                currentClef: defaultClef,
                hadInAccord: false,
                activeSlurs: new Set(),
                slurLengths: slurLengths,
            };

            // For non-first staves, pre-initialize key/time to suppress duplicate rendering
            if (si > 0) {
                if (initialKey) {
                    state.currentKey = initialKey;
                }
                if (initialTime) {
                    state.currentRhythm = initialTime;
                }
            }

            // Render measures for this staff
            const staffOutput: BrailleOutput = this.convertNonfacsimile(measures, debugMode, si, state);

            // Build the staff line: hand_sign + [separator] + measures
            const needsSeparator: boolean = firstCharHasLowerDots(staffOutput.text);
            const separator: string = needsSeparator ? BRAILLE_AUGMENTATION_DOT : "";
            const staffLine: string = handSign + separator + staffOutput.text;
            staffLines.push(staffLine);

            // Add hand sign debug entry
            if (debugMode) {
                allDebugEntries.push({
                    braille: handSign + separator,
                    meaning: handName + (needsSeparator ? " (+ separator)" : ""),
                    measureNumber: 0,
                });
                // Add all measure debug entries for this staff
                for (const entry of staffOutput.debugEntries) {
                    allDebugEntries.push(entry);
                }
                // Add line-break debug entry between staves (except after last)
                if (si < staffCount - 1) {
                    allDebugEntries.push({
                        braille: BRAILLE_LINE_BREAK,
                        meaning: "staff separator (newline)",
                        measureNumber: 0,
                    });
                }
            }
        }

        return {
            text: staffLines.join(BRAILLE_LINE_BREAK),
            debugEntries: debugMode ? allDebugEntries : [],
        };
    }

    /**
     * Single-staff conversion with hand sign prefix.
     * Used when multiStaff is true but only one staff exists.
     */
    private convertSingleStaffWithHandSign(
        musicSheet: MusicSheet, staffIndex: number, debugMode: boolean,
        facsimile: boolean, options?: BrailleOptions
    ): BrailleOutput {
        const measures: SourceMeasure[] = musicSheet.SourceMeasures;
        const slurLengths: Map<Slur, number> = BrailleConverter.computeSlurLengths(measures, staffIndex);
        const state: BrailleState = {
            octaveTracker: new BrailleOctaveTracker(),
            facsimile: facsimile,
            currentClef: ClefEnum.G,
            hadInAccord: false,
            activeSlurs: new Set(),
            slurLengths: slurLengths,
        };

        const staffOutput: BrailleOutput = this.convertNonfacsimile(measures, debugMode, staffIndex, state);
        const needsSeparator: boolean = firstCharHasLowerDots(staffOutput.text);
        const separator: string = needsSeparator ? BRAILLE_AUGMENTATION_DOT : "";
        const handSign: string = BRAILLE_HAND_RIGHT;

        const allDebugEntries: BrailleDebugEntry[] = [];
        if (debugMode) {
            allDebugEntries.push({
                braille: handSign + separator,
                meaning: "right hand" + (needsSeparator ? " (+ separator)" : ""),
                measureNumber: 0,
            });
            allDebugEntries.push(...staffOutput.debugEntries);
        }

        return {
            text: handSign + separator + staffOutput.text,
            debugEntries: debugMode ? allDebugEntries : [],
        };
    }

    /**
     * Bar-over-bar conversion: vertically aligned parallels (M8b).
     *
     * Produces BANA-standard bar-over-bar format where RH and LH measures
     * appear on adjacent lines with aligned measure starts. Each "parallel"
     * is a group of measures that fit within the line width.
     *
     * Format:
     *   [heading: key+time centered]
     *   [measure#] [RH hand sign][RH measures...]
     *   [measure#] [LH hand sign][LH measures...]
     */
    private convertBarOverBar(
        musicSheet: MusicSheet, debugMode: boolean, facsimile: boolean, options?: BrailleOptions
    ): BrailleOutput {
        const staffCount: number = Math.min(musicSheet.Staves.length, 2);
        const lineWidth: number = options?.lineWidth ?? 40;
        const layout: BrailleBarOverBarLayout = new BrailleBarOverBarLayout(this.measureRenderer);
        return layout.format(musicSheet, {
            lineWidth: lineWidth,
            staffCount: staffCount,
            guideDotThreshold: 6,
            guideDotMinCount: 5,
        }, debugMode, facsimile, BrailleConverter.computeSlurLengths);
    }

    /**
     * Ensemble conversion: multi-instrument bar-over-bar (M8c).
     *
     * Produces BANA-standard ensemble format where each instrument gets its own
     * line in each parallel, prefixed by its abbreviation. Measure numbers appear
     * in a free line above each parallel. All chord intervals read upward.
     */
    private convertEnsemble(
        musicSheet: MusicSheet, debugMode: boolean, facsimile: boolean, options?: BrailleOptions
    ): BrailleOutput {
        const lineWidth: number = options?.lineWidth ?? 40;
        const instruments: Instrument[] = musicSheet.Instruments;
        const measures: SourceMeasure[] = musicSheet.SourceMeasures;

        // Detect per-part key signatures (Par. 33.4.1):
        // If all parts share the same key → heading has key + time
        // If parts have different keys → heading has time only; key appended to each abbreviation
        const firstMeasure: SourceMeasure | undefined = measures.length > 0 ? measures[0] : undefined;
        const perPartKeys: Map<number, KeyInstruction> = new Map(); // staffIndex → KeyInstruction
        let allKeysSame: boolean = true;
        let referenceKey: number | undefined;

        if (firstMeasure) {
            for (const instrument of instruments) {
                for (const staff of instrument.Staves) {
                    const keyInstr: KeyInstruction | undefined =
                        firstMeasure.getKeyInstruction(staff.idInMusicSheet);
                    if (keyInstr) {
                        perPartKeys.set(staff.idInMusicSheet, keyInstr);
                        if (referenceKey === undefined) {
                            referenceKey = keyInstr.Key;
                        } else if (keyInstr.Key !== referenceKey) {
                            allKeysSame = false;
                        }
                    }
                }
            }
        }

        // Build EnsemblePartInfo for each instrument
        const parts: EnsemblePartInfo[] = [];
        for (const instrument of instruments) {
            // Get abbreviation: prefer PartAbbreviation, fall back to Name
            const abbrevText: string = instrument.PartAbbreviation || instrument.Name || "?";
            // Convert to braille literary characters + dot 3 terminator
            let brailleAbbrev: string = textToBraille(abbrevText) + BRAILLE_ABBREV_PERIOD;

            // Per-part key signature: append key after abbreviation when parts differ
            if (!allKeysSame && instrument.Staves.length > 0) {
                const staffIdx: number = instrument.Staves[0].idInMusicSheet;
                const partKey: KeyInstruction | undefined = perPartKeys.get(staffIdx);
                if (partKey) {
                    const keyResult: BrailleKeySignatureResult = renderKeySignature(partKey);
                    if (keyResult.braille) {
                        brailleAbbrev += keyResult.braille;
                    }
                }
            }

            // Collect global staff indices for this instrument
            const staffIndices: number[] = [];
            let defaultClef: ClefEnum = ClefEnum.G;
            for (const staff of instrument.Staves) {
                staffIndices.push(staff.idInMusicSheet);
            }
            // Determine default clef from first staff's initial clef (if available)
            if (instrument.Staves.length > 0 && firstMeasure) {
                const firstStaffIdx: number = instrument.Staves[0].idInMusicSheet;
                const firstEntry: SourceStaffEntry | undefined =
                    firstMeasure.FirstInstructionsStaffEntries[firstStaffIdx];
                if (firstEntry) {
                    for (const instr of firstEntry.Instructions) {
                        if (instr instanceof ClefInstruction) {
                            defaultClef = (instr as ClefInstruction).ClefType;
                            break;
                        }
                    }
                }
            }

            parts.push({
                brailleAbbreviation: brailleAbbrev,
                staffIndices: staffIndices,
                defaultClef: defaultClef,
            });
        }

        const layout: BrailleBarOverBarLayout = new BrailleBarOverBarLayout(this.measureRenderer);
        const totalStaves: number = parts.reduce(
            (sum: number, p: EnsemblePartInfo): number => sum + p.staffIndices.length, 0
        );

        // Build instrument list table (Par. 33.2): full names + abbreviations
        const instrumentTableEntries: Array<{ name: string, abbreviation: string }> = [];
        for (const instrument of instruments) {
            const fullName: string = textToBraille(instrument.Name || "?");
            const abbrev: string = textToBraille(instrument.PartAbbreviation || instrument.Name || "?")
                + BRAILLE_ABBREV_PERIOD;
            instrumentTableEntries.push({ name: fullName, abbreviation: abbrev });
        }
        const instrumentTable: { lines: string[], debugEntries: BrailleDebugEntry[] } =
            layout.renderInstrumentTable(instrumentTableEntries);

        // Get the ensemble music output
        const musicOutput: BrailleOutput = layout.formatEnsemble(musicSheet, parts, {
            lineWidth: lineWidth,
            staffCount: totalStaves,
            guideDotThreshold: 6,
            guideDotMinCount: 5,
        }, debugMode, facsimile, BrailleConverter.computeSlurLengths,
        allKeysSame ? undefined : perPartKeys);

        // Combine: instrument table + blank line + music
        const allLines: string[] = [...instrumentTable.lines, "", musicOutput.text];
        const allDebug: BrailleDebugEntry[] = [];
        if (debugMode) {
            allDebug.push(...instrumentTable.debugEntries);
            allDebug.push({
                braille: BRAILLE_LINE_BREAK,
                meaning: "instrument table separator",
                measureNumber: 0,
            });
            allDebug.push(...musicOutput.debugEntries);
        }

        return {
            text: allLines.join(BRAILLE_LINE_BREAK),
            debugEntries: debugMode ? allDebug : [],
        };
    }

    /**
     * Lyrics conversion: word-line + music-line parallel format (M9).
     *
     * Produces parallels where each group consists of:
     *   [word line — literary braille at cell 1]
     *   [music line — indented 2 cells]
     *
     * Syllables are paired 1:1 with notes. Print hyphens are omitted;
     * syllables of the same word are concatenated. Melisma notes
     * get syllabic slur signs in the music line.
     */
    private convertWithLyrics(
        musicSheet: MusicSheet, debugMode: boolean, facsimile: boolean, options?: BrailleOptions
    ): BrailleOutput {
        const lineWidth: number = options?.lineWidth ?? 40;
        const staffIndex: number = options?.staffIndex ?? 0;
        const measures: SourceMeasure[] = musicSheet.SourceMeasures;
        const allDebugEntries: BrailleDebugEntry[] = [];

        // Collect all verse numbers present in the score
        const verseNumbers: string[] = collectVerseNumbers(measures, staffIndex);
        // First verse (or "1" if none found) is paired with music
        const primaryVerse: string = verseNumbers.length > 0 ? verseNumbers[0] : "1";

        if (measures.length === 0) {
            return { text: "", debugEntries: [] };
        }

        // Phase 1: Music heading (key + time centered)
        const initialKey: KeyInstruction | undefined = measures[0].getKeyInstruction(staffIndex);
        const initialTime: Fraction | undefined = measures[0].ActiveTimeSignature;
        const layout: BrailleBarOverBarLayout = new BrailleBarOverBarLayout(this.measureRenderer);
        const heading: { braille: string, debugEntries: BrailleDebugEntry[] } =
            layout.renderMusicHeading(initialKey, initialTime, lineWidth);

        // Phase 2: Build melisma slur set (pre-pass to identify melisma continuation notes)
        const melismaSlurNotes: Set<VoiceEntry> = buildMelismaSlurSet(measures, staffIndex, primaryVerse);

        // Phase 3: Pre-render music measures (with octave reset per measure, like bar-over-bar)
        const slurLengths: Map<Slur, number> = BrailleConverter.computeSlurLengths(measures, staffIndex);
        const musicState: BrailleState = {
            octaveTracker: new BrailleOctaveTracker(),
            facsimile: facsimile,
            currentClef: ClefEnum.G,
            hadInAccord: false,
            activeSlurs: new Set(),
            slurLengths: slurLengths,
            melismaSlurNotes: melismaSlurNotes,
        };
        // Pre-initialize key/time so they go in heading, not in measure rendering
        if (initialKey) {
            musicState.currentKey = initialKey;
        }
        if (initialTime) {
            musicState.currentRhythm = initialTime;
        }

        const musicResults: BrailleMeasureResult[] = [];
        for (const measure of measures) {
            musicState.octaveTracker.reset(); // octave mark at start of each measure
            const result: BrailleMeasureResult = this.measureRenderer.render(measure, staffIndex, musicState);
            musicResults.push(result);
        }

        // Phase 4: Extract lyrics per measure
        const lyricsState: LyricsState = { melismaActive: false };
        const lyricsResults: LyricsMeasureResult[] = [];
        for (const measure of measures) {
            const lyricResult: LyricsMeasureResult = extractLyricsMeasure(
                measure, staffIndex, primaryVerse, lyricsState
            );
            lyricsResults.push(lyricResult);
        }

        // Phase 5: Group into parallels (greedy packing based on both word + music width)
        const musicIndent: number = 2; // music line indented 2 cells
        const availableWidth: number = lineWidth - musicIndent;
        const groups: Array<{ startIndex: number, endIndex: number }> = [];
        let idx: number = 0;

        while (idx < measures.length) {
            let musicWidth: number = 0;
            let wordWidth: number = 0;
            let endIdx: number = idx;

            while (endIdx < measures.length) {
                const separatorWidth: number = endIdx > idx ? 1 : 0; // blank cell between measures
                const mw: number = musicResults[endIdx].braille.length;
                const ww: number = lyricsResults[endIdx].cellLength;

                const newMusicWidth: number = musicWidth + separatorWidth + mw;
                const newWordWidth: number = wordWidth + separatorWidth + ww;

                if ((newMusicWidth > availableWidth || newWordWidth > availableWidth) && endIdx > idx) {
                    break; // won't fit, but always include at least one measure
                }

                musicWidth = newMusicWidth;
                wordWidth = newWordWidth;
                endIdx++;
            }

            groups.push({ startIndex: idx, endIndex: endIdx });
            idx = endIdx;
        }

        // Phase 6: Format parallels
        const outputLines: string[] = [];

        // Add heading
        if (heading.braille.length > 0) {
            outputLines.push(heading.braille);
            if (debugMode) {
                allDebugEntries.push(...heading.debugEntries);
                allDebugEntries.push({
                    braille: BRAILLE_LINE_BREAK,
                    meaning: "heading separator (newline)",
                    measureNumber: 0,
                });
            }
        }

        for (let gi: number = 0; gi < groups.length; gi++) {
            const group: { startIndex: number, endIndex: number } = groups[gi];

            // Build word line
            const wordParts: string[] = [];
            for (let mi: number = group.startIndex; mi < group.endIndex; mi++) {
                wordParts.push(lyricsResults[mi].wordText);
                if (debugMode) {
                    for (const entry of lyricsResults[mi].debugEntries) {
                        allDebugEntries.push({
                            braille: entry.braille,
                            meaning: entry.meaning,
                            measureNumber: musicResults[mi].measureNumber,
                        });
                    }
                }
                // Blank cell separator between measures (except after last)
                if (mi < group.endIndex - 1) {
                    wordParts.push(BRAILLE_BLANK_CELL);
                }
            }
            const wordLine: string = wordParts.join("");

            // Build music line (indented 2 cells)
            const musicParts: string[] = [];
            for (let mi: number = group.startIndex; mi < group.endIndex; mi++) {
                musicParts.push(musicResults[mi].braille);
                if (debugMode) {
                    for (const entry of musicResults[mi].debugEntries) {
                        allDebugEntries.push({
                            braille: entry.braille,
                            meaning: entry.meaning,
                            measureNumber: musicResults[mi].measureNumber,
                        });
                    }
                    if (mi < group.endIndex - 1) {
                        allDebugEntries.push({
                            braille: BRAILLE_BLANK_CELL,
                            meaning: "barline",
                            measureNumber: musicResults[mi].measureNumber,
                        });
                    }
                }
            }
            const musicLine: string = BRAILLE_BLANK_CELL.repeat(musicIndent) +
                musicParts.join(BRAILLE_BLANK_CELL);

            outputLines.push(wordLine);
            outputLines.push(musicLine);

            if (debugMode) {
                allDebugEntries.push({
                    braille: BRAILLE_LINE_BREAK,
                    meaning: "word/music line break",
                    measureNumber: 0,
                });
            }
        }

        // Phase 7: Append remaining verses as continuous text (Par. 35.7)
        // Verses 2+ are listed after the last music line, each introduced by (N)
        const additionalVerses: string[] = verseNumbers.filter(
            (v: string): boolean => v !== primaryVerse
        );
        for (const verse of additionalVerses) {
            const verseResult: { braille: string, debugEntries: BrailleNoteDebugInfo[] } =
                extractFullVerse(measures, staffIndex, verse);
            if (verseResult.braille.length > 0) {
                outputLines.push(verseResult.braille);
                if (debugMode) {
                    for (const entry of verseResult.debugEntries) {
                        allDebugEntries.push({
                            braille: entry.braille,
                            meaning: entry.meaning,
                            measureNumber: 0,
                        });
                    }
                }
            }
        }

        return {
            text: outputLines.join(BRAILLE_LINE_BREAK),
            debugEntries: debugMode ? allDebugEntries : [],
        };
    }

    /**
     * Facsimile conversion: iterate by visual system layout.
     *
     * Traverses GraphicalMusicSheet pages → systems → staff lines to render
     * measures in the same grouping as the visual score. Each system becomes
     * one braille line, separated by BRAILLE_LINE_BREAK.
     *
     * Within each system, measures are joined with barline separators just
     * like nonfacsimile. The octave tracker resets at each system start
     * (the first note of a new line always needs an octave mark).
     */
    private convertFacsimile(
        graphicSheet: GraphicalMusicSheet, staffIndex: number, debugMode: boolean, state: BrailleState
    ): BrailleOutput {
        const systemLines: string[] = [];
        const allDebugEntries: BrailleDebugEntry[] = [];

        const pages: GraphicalMusicPage[] = graphicSheet.MusicPages;
        for (const page of pages) {
            const systems: MusicSystem[] = page.MusicSystems;
            for (const system of systems) {
                // Reset octave tracker at system start (new braille line)
                state.octaveTracker.reset();

                const staffLines: StaffLine[] = system.StaffLines;
                if (staffIndex >= staffLines.length) {
                    continue;
                }
                const measures: GraphicalMeasure[] = staffLines[staffIndex].Measures;
                const measureStrings: string[] = [];

                for (let i: number = 0; i < measures.length; i++) {
                    const graphicalMeasure: GraphicalMeasure = measures[i];
                    const sourceMeasure: SourceMeasure = graphicalMeasure.parentSourceMeasure;
                    if (!sourceMeasure) {
                        continue;
                    }

                    // Facsimile clef rendering via GraphicalMeasure.InitiallyActiveClef.
                    // This is authoritative — mid-score clef changes in OSMD are stored on
                    // the previous measure's LastInstructionsStaffEntries, not the current
                    // measure's FirstInstructionsStaffEntries, so the measure renderer can't
                    // reliably detect them. InitiallyActiveClef resolves this correctly.
                    const clefResult: { braille: string, debugEntries: BrailleNoteDebugInfo[] } =
                        this.renderFacsimileClef(graphicalMeasure, sourceMeasure, state);

                    const measureResult: BrailleMeasureResult =
                        this.measureRenderer.render(sourceMeasure, staffIndex, state);

                    // Combine clef + measure content
                    const combined: string = clefResult.braille + measureResult.braille;
                    if (combined.length > 0) {
                        measureStrings.push(combined);
                    }

                    if (debugMode) {
                        // Clef debug entries first (clef precedes key/time/notes)
                        for (const entry of clefResult.debugEntries) {
                            allDebugEntries.push({
                                braille: entry.braille,
                                meaning: entry.meaning,
                                measureNumber: measureResult.measureNumber,
                            });
                        }
                        for (const entry of measureResult.debugEntries) {
                            allDebugEntries.push({
                                braille: entry.braille,
                                meaning: entry.meaning,
                                measureNumber: measureResult.measureNumber,
                            });
                        }

                        // Barline separator (except after last measure in system)
                        if (i < measures.length - 1) {
                            allDebugEntries.push({
                                braille: BRAILLE_MEASURE_SEPARATOR,
                                meaning: "barline",
                                measureNumber: measureResult.measureNumber,
                            });
                        }
                    }
                }

                if (measureStrings.length > 0) {
                    systemLines.push(measureStrings.join(BRAILLE_MEASURE_SEPARATOR));

                    // Add line-break debug entry after each system (except the last)
                    if (debugMode) {
                        allDebugEntries.push({
                            braille: BRAILLE_LINE_BREAK,
                            meaning: "system/line break (\\n)",
                            measureNumber: 0,
                        });
                    }
                }
            }
        }

        // Remove trailing system-break debug entry (after the last system)
        if (debugMode && allDebugEntries.length > 0 &&
            allDebugEntries[allDebugEntries.length - 1].meaning.startsWith("system/line break")) {
            allDebugEntries.pop();
        }

        return {
            text: systemLines.join(BRAILLE_LINE_BREAK),
            debugEntries: debugMode ? allDebugEntries : [],
        };
    }

    /**
     * Pre-compute the number of notes in each slur across the entire score.
     * Used to decide between short slurs (≤4 notes → per-note signs) and
     * bracket slurs (>4 notes → open/close brackets). Par. 13.3.
     */
    /**
     * Render clef sign for facsimile mode using GraphicalMeasure.InitiallyActiveClef.
     * This is the authoritative clef for each measure in the graphical layout.
     * Renders on the first measure or when the clef changes from the previous measure.
     * Also updates state.currentClef for chord interval direction.
     */
    private renderFacsimileClef(
        graphicalMeasure: GraphicalMeasure, sourceMeasure: SourceMeasure, state: BrailleState
    ): { braille: string, debugEntries: BrailleNoteDebugInfo[] } {
        const clefInstr: ClefInstruction = graphicalMeasure.InitiallyActiveClef;
        if (!clefInstr) {
            return { braille: "", debugEntries: [] };
        }

        const clefType: ClefEnum = clefInstr.ClefType;
        const clefLine: number = clefInstr.Line;
        const isFirstMeasure: boolean = sourceMeasure.MeasureNumber === 1;
        const clefChanged: boolean = clefType !== state.currentClef;

        // Update state regardless of whether we render
        state.currentClef = clefType;

        if (isFirstMeasure || clefChanged) {
            const clefBraille: string = getClefBraille(clefType, clefLine);
            const clefNameStr: string = getClefName(clefType, clefLine);
            if (clefBraille) {
                // Clef sign forces octave mark on next note
                state.octaveTracker.reset();
                return {
                    braille: clefBraille,
                    debugEntries: [{ braille: clefBraille, meaning: clefNameStr }],
                };
            }
        }

        return { braille: "", debugEntries: [] };
    }

    /**
     * Pre-compute the number of notes in each slur across the entire score.
     * Used to decide between short slurs (≤4 notes → per-note signs) and
     * bracket slurs (>4 notes → open/close brackets). Par. 13.3.
     */
    public static computeSlurLengths(measures: SourceMeasure[], staffIndex: number): Map<Slur, number> {
        const activeSlurs: Map<Slur, number> = new Map();
        const result: Map<Slur, number> = new Map();

        for (const measure of measures) {
            forEachVoiceEntryInMeasure(measure, staffIndex, (voiceEntries: VoiceEntry[]): void => {
                for (const ve of voiceEntries) {
                    // Increment count for all active slurs (this voice entry is a note within the slur)
                    for (const [slur, count] of activeSlurs) {
                        activeSlurs.set(slur, count + 1);
                    }

                    // Check for new slurs starting on notes in this voice entry
                    for (const note of ve.Notes) {
                        if (note.NoteSlurs) {
                            for (const slur of note.NoteSlurs) {
                                if (slur.StartNote === note && !activeSlurs.has(slur)) {
                                    activeSlurs.set(slur, 1);
                                }
                            }
                        }
                    }

                    // Check for slurs ending on notes in this voice entry
                    for (const note of ve.Notes) {
                        if (note.NoteSlurs) {
                            for (const slur of note.NoteSlurs) {
                                if (slur.EndNote === note && activeSlurs.has(slur)) {
                                    result.set(slur, activeSlurs.get(slur)!);
                                    activeSlurs.delete(slur);
                                }
                            }
                        }
                    }
                }
            });
        }

        // Any slurs that never ended — store their count anyway
        for (const [slur, count] of activeSlurs) {
            result.set(slur, count);
        }

        return result;
    }
}
