import { MusicSheet } from "../../MusicalScore/MusicSheet";
import { SourceMeasure } from "../../MusicalScore/VoiceData/SourceMeasure";
import { Slur } from "../../MusicalScore/VoiceData/Expressions/ContinuousExpressions/Slur";
import { KeyInstruction } from "../../MusicalScore/VoiceData/Instructions/KeyInstruction";
import { ClefEnum } from "../../MusicalScore/VoiceData/Instructions/ClefInstruction";
import { Fraction } from "../../Common/DataObjects/Fraction";
import { BrailleMeasureRenderer, BrailleState, BrailleMeasureResult, forEachVoiceEntryInMeasure } from "./BrailleMeasureRenderer";
import { VoiceEntry } from "../../MusicalScore/VoiceData/VoiceEntry";
import { BrailleOctaveTracker } from "./BrailleOctaveTracker";
import { BrailleNoteDebugInfo } from "./BrailleNoteRenderer";
import { renderKeySignature, BrailleKeySignatureResult } from "./BrailleKeySignature";
import { renderTimeSignature, BrailleTimeSignatureResult } from "./BrailleTimeSignature";
import { BrailleOutput, BrailleDebugEntry } from "./BrailleConverter";
import {
    numberToUpperDigits,
    BRAILLE_HAND_RIGHT, BRAILLE_HAND_LEFT,
    BRAILLE_AUGMENTATION_DOT,
    BRAILLE_BLANK_CELL,
    BRAILLE_LINE_BREAK,
    firstCharHasLowerDots,
} from "./BrailleSymbols";

/**
 * A single measure rendered for one staff, with its braille text and metadata.
 */
export interface RenderedMeasure {
    /** The braille string for this measure (notes, chords, rests, etc.) */
    braille: string;
    /** Cell length of the braille string (= braille.length since all chars are BMP) */
    cellLength: number;
    /** 1-based measure number from MusicXML */
    measureNumber: number;
    /** Debug entries for the elements in this measure */
    debugEntries: BrailleNoteDebugInfo[];
}

/**
 * Configuration for the bar-over-bar layout engine.
 */
export interface BarOverBarConfig {
    /** Maximum cells per braille line. Default: 40 (standard braille display width). */
    lineWidth: number;
    /** Number of staves to render (2 for piano RH+LH). */
    staffCount: number;
    /** Minimum gap (cells) before guide dots are used instead of spaces. Default: 6. */
    guideDotThreshold: number;
    /** Minimum number of guide dots to emit. If fewer would fit, use plain spaces. Default: 5. */
    guideDotMinCount: number;
}

/**
 * A parallel: one group of vertically-aligned lines (one per staff) showing the same measures.
 */
interface Parallel {
    /** Formatted text lines, one per staff */
    lines: string[];
    /** Debug entries for the entire parallel */
    debugEntries: BrailleDebugEntry[];
}

/**
 * Bar-over-bar layout engine for keyboard/piano braille music.
 *
 * Implements BANA Music Braille Code 2015, Chapter 28 + Par. 29.3.
 * Produces vertically aligned parallels where RH and LH measures
 * appear on adjacent lines with aligned measure starts.
 *
 * This class handles layout only — note rendering is delegated to BrailleMeasureRenderer.
 */
export class BrailleBarOverBarLayout {
    private measureRenderer: BrailleMeasureRenderer;

    constructor(measureRenderer: BrailleMeasureRenderer) {
        this.measureRenderer = measureRenderer;
    }

    /**
     * Format a multi-staff score in bar-over-bar layout.
     *
     * @param musicSheet The parsed MusicSheet
     * @param config Layout configuration
     * @param debugMode Whether to generate debug entries
     * @param facsimile Whether facsimile mode is active
     * @param computeSlurLengthsFn Function to compute slur lengths per staff
     * @returns BrailleOutput with formatted bar-over-bar text
     */
    public format(
        musicSheet: MusicSheet,
        config: BarOverBarConfig,
        debugMode: boolean,
        facsimile: boolean,
        computeSlurLengthsFn: (measures: SourceMeasure[], staffIndex: number) => Map<Slur, number>
    ): BrailleOutput {
        const measures: SourceMeasure[] = musicSheet.SourceMeasures;
        if (measures.length === 0) {
            return { text: "", debugEntries: [] };
        }

        const allDebugEntries: BrailleDebugEntry[] = [];

        // Phase 1: Extract initial key/time for the music heading
        const initialKey: KeyInstruction | undefined = measures[0].getKeyInstruction(0);
        const initialTime: Fraction | undefined = measures[0].ActiveTimeSignature;

        // Phase 2: Render music heading (key + time centered above first parallel)
        const heading: { braille: string, debugEntries: BrailleDebugEntry[] } =
            this.renderMusicHeading(initialKey, initialTime, config.lineWidth);

        // Phase 3: Pre-render all measures per staff
        const allRendered: RenderedMeasure[][] = [];
        for (let si: number = 0; si < config.staffCount; si++) {
            const defaultClef: ClefEnum = si === 0 ? ClefEnum.G : ClefEnum.F;
            const slurLengths: Map<Slur, number> = computeSlurLengthsFn(measures, si);

            const state: BrailleState = {
                octaveTracker: new BrailleOctaveTracker(),
                facsimile: facsimile,
                currentClef: defaultClef,
                hadInAccord: false,
                activeSlurs: new Set(),
                slurLengths: slurLengths,
            };

            // Pre-initialize key/time for ALL staves to suppress initial rendering
            // (key/time goes in the heading, not in individual staff lines)
            if (initialKey) {
                state.currentKey = initialKey;
            }
            if (initialTime) {
                state.currentRhythm = initialTime;
            }

            const rendered: RenderedMeasure[] = this.preRenderMeasures(measures, si, state);
            allRendered.push(rendered);
        }

        // Phase 4: Group measures into parallels
        const groups: Array<{ startIndex: number, endIndex: number }> =
            this.groupIntoParallels(allRendered, config);

        // Compute max measure number width across all parallels for alignment
        const maxMeasureNumWidth: number = this.getMaxMeasureNumberWidth(allRendered[0]);

        // Phase 5: Format each parallel and assemble output
        const outputLines: string[] = [];

        // Add heading if non-empty
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
            const parallel: Parallel = this.formatParallel(
                group.startIndex, group.endIndex, allRendered, config, maxMeasureNumWidth, debugMode
            );

            outputLines.push(...parallel.lines);
            if (debugMode) {
                allDebugEntries.push(...parallel.debugEntries);
            }

            // Add blank line between parallels (except after the last)
            if (gi < groups.length - 1 && debugMode) {
                allDebugEntries.push({
                    braille: BRAILLE_LINE_BREAK,
                    meaning: "parallel separator (newline)",
                    measureNumber: 0,
                });
            }
        }

        return {
            text: outputLines.join(BRAILLE_LINE_BREAK),
            debugEntries: debugMode ? allDebugEntries : [],
        };
    }

    /**
     * Pre-render all measures for a single staff.
     * Resets the octave tracker before each measure (Par. 29.3(a):
     * first note of every measure in bar-over-bar must have an octave mark).
     */
    private preRenderMeasures(
        measures: SourceMeasure[], staffIndex: number, state: BrailleState
    ): RenderedMeasure[] {
        const results: RenderedMeasure[] = [];
        for (const measure of measures) {
            // Bar-over-bar rule: octave mark mandatory at start of each measure
            state.octaveTracker.reset();

            const result: BrailleMeasureResult = this.measureRenderer.render(measure, staffIndex, state);
            results.push({
                braille: result.braille,
                cellLength: result.braille.length,
                measureNumber: result.measureNumber,
                debugEntries: result.debugEntries,
            });
        }
        return results;
    }

    /**
     * Render the music heading: key + time signature centered on the line.
     * Par. 1.7: heading appears above the first parallel.
     */
    public renderMusicHeading(
        initialKey: KeyInstruction | undefined,
        initialTime: Fraction | undefined,
        lineWidth: number
    ): { braille: string, debugEntries: BrailleDebugEntry[] } {
        const parts: string[] = [];
        const debugEntries: BrailleDebugEntry[] = [];

        if (initialKey) {
            const keyResult: BrailleKeySignatureResult = renderKeySignature(initialKey);
            if (keyResult.braille) {
                parts.push(keyResult.braille);
                for (const entry of keyResult.debugEntries) {
                    debugEntries.push({
                        braille: entry.braille,
                        meaning: entry.meaning,
                        measureNumber: 0,
                    });
                }
            }
        }

        if (initialTime) {
            const timeResult: BrailleTimeSignatureResult = renderTimeSignature(initialTime);
            if (timeResult.braille) {
                parts.push(timeResult.braille);
                for (const entry of timeResult.debugEntries) {
                    debugEntries.push({
                        braille: entry.braille,
                        meaning: entry.meaning,
                        measureNumber: 0,
                    });
                }
            }
        }

        const headingContent: string = parts.join("");
        if (headingContent.length === 0) {
            return { braille: "", debugEntries: [] };
        }

        // Center on line: pad with leading blank cells
        const padding: number = Math.max(0, Math.floor((lineWidth - headingContent.length) / 2));
        const centeredHeading: string = BRAILLE_BLANK_CELL.repeat(padding) + headingContent;

        return { braille: centeredHeading, debugEntries: debugEntries };
    }

    /**
     * Group measures into parallels based on line width.
     * Greedy packing: add measures until the next one won't fit in both lines.
     *
     * Each measure's column width = max(cellLength across staves).
     * Measures within a parallel are separated by one space.
     */
    private groupIntoParallels(
        allRendered: RenderedMeasure[][], config: BarOverBarConfig
    ): Array<{ startIndex: number, endIndex: number }> {
        const measureCount: number = allRendered[0].length;
        const groups: Array<{ startIndex: number, endIndex: number }> = [];
        let idx: number = 0;

        while (idx < measureCount) {
            // Compute prefix width for this parallel
            const measureNum: number = allRendered[0][idx].measureNumber;
            const measureNumWidth: number = this.measureNumberToBareDigits(measureNum).length;
            // prefix = measureNumber + space + handSign (2 cells)
            const handSignWidth: number = BRAILLE_HAND_RIGHT.length; // always 2
            const prefixWidth: number = measureNumWidth + 1 + handSignWidth;
            // Account for possible dot-3 separator after hand sign
            const maxPrefixWidth: number = prefixWidth + 1; // worst case: separator needed

            const availableWidth: number = config.lineWidth - maxPrefixWidth;
            let usedWidth: number = 0;
            let endIdx: number = idx;

            while (endIdx < measureCount) {
                // Column width for this measure = max across staves
                let maxCellLen: number = 0;
                for (let si: number = 0; si < config.staffCount; si++) {
                    const cellLen: number = allRendered[si][endIdx].cellLength;
                    if (cellLen > maxCellLen) {
                        maxCellLen = cellLen;
                    }
                }

                // Add separator space between measures (not before first)
                const separatorWidth: number = endIdx > idx ? 1 : 0;
                const neededWidth: number = usedWidth + separatorWidth + maxCellLen;

                if (neededWidth > availableWidth && endIdx > idx) {
                    // Won't fit — stop here (but always include at least one measure)
                    break;
                }

                usedWidth = neededWidth;
                endIdx++;
            }

            groups.push({ startIndex: idx, endIndex: endIdx });
            idx = endIdx;
        }

        return groups;
    }

    /**
     * Format a single parallel: measure number + hand sign + aligned measures for each staff.
     *
     * Par. 29.3(f)(g): One space after the longer part's last sign, then the next measure.
     * The shorter part's next measure starts directly above/below.
     */
    private formatParallel(
        startIdx: number, endIdx: number,
        allRendered: RenderedMeasure[][], config: BarOverBarConfig,
        maxMeasureNumWidth: number, debugMode: boolean
    ): Parallel {
        const lines: string[] = [];
        const debugEntries: BrailleDebugEntry[] = [];

        // Measure number from the first measure in this parallel
        const measureNum: number = allRendered[0][startIdx].measureNumber;
        const measureNumStr: string = this.measureNumberToBareDigits(measureNum);

        // Pad measure number for vertical alignment across parallels
        const numPadding: string = BRAILLE_BLANK_CELL.repeat(Math.max(0, maxMeasureNumWidth - measureNumStr.length));

        for (let si: number = 0; si < config.staffCount; si++) {
            const handSign: string = si === 0 ? BRAILLE_HAND_RIGHT : BRAILLE_HAND_LEFT;
            const handName: string = si === 0 ? "right hand" : "left hand";

            // Check if dot-3 separator is needed after hand sign
            const firstMeasureBraille: string = allRendered[si][startIdx].braille;
            const needsSeparator: boolean = firstCharHasLowerDots(firstMeasureBraille);
            const separator: string = needsSeparator ? BRAILLE_AUGMENTATION_DOT : "";

            // Build line prefix: [padding][measureNum][blank][handSign][separator]
            const prefix: string = numPadding + measureNumStr + BRAILLE_BLANK_CELL + handSign + separator;
            const measureParts: string[] = [];

            // Add debug entries for prefix
            if (debugMode) {
                debugEntries.push({
                    braille: numPadding + measureNumStr,
                    meaning: "measure " + measureNum,
                    measureNumber: measureNum,
                });
                debugEntries.push({
                    braille: handSign + separator,
                    meaning: handName + (needsSeparator ? " (+ separator)" : ""),
                    measureNumber: measureNum,
                });
            }

            // Add each measure, with padding for alignment
            for (let mi: number = startIdx; mi < endIdx; mi++) {
                const rendered: RenderedMeasure = allRendered[si][mi];
                measureParts.push(rendered.braille);

                if (debugMode) {
                    for (const entry of rendered.debugEntries) {
                        debugEntries.push({
                            braille: entry.braille,
                            meaning: entry.meaning,
                            measureNumber: rendered.measureNumber,
                        });
                    }
                }

                // Pad for alignment (except after last measure in parallel)
                if (mi < endIdx - 1) {
                    // Column width = max cell length across staves for this measure
                    let maxCellLen: number = 0;
                    for (let s: number = 0; s < config.staffCount; s++) {
                        const cellLen: number = allRendered[s][mi].cellLength;
                        if (cellLen > maxCellLen) {
                            maxCellLen = cellLen;
                        }
                    }

                    const gap: number = maxCellLen - rendered.cellLength;
                    if (gap > 0) {
                        const padding: string = this.padWithGuideDots(gap, config);
                        measureParts.push(padding);

                        if (debugMode && padding.length > 0) {
                            const isGuideDots: boolean = padding.includes(BRAILLE_AUGMENTATION_DOT);
                            debugEntries.push({
                                braille: padding,
                                meaning: isGuideDots ? "guide dots" : "alignment padding",
                                measureNumber: rendered.measureNumber,
                            });
                        }
                    }

                    // Add measure separator (blank cell between measures)
                    measureParts.push(BRAILLE_BLANK_CELL);

                    if (debugMode) {
                        debugEntries.push({
                            braille: BRAILLE_BLANK_CELL,
                            meaning: "barline",
                            measureNumber: rendered.measureNumber,
                        });
                    }
                }
            }

            // Build the full staff line, then split into run-over lines if it exceeds lineWidth.
            const fullLine: string = prefix + measureParts.join("");
            const staffLines: string[] = this.splitLineWithRunOver(fullLine, prefix.length, config.lineWidth);
            lines.push(...staffLines);

            if (debugMode && staffLines.length > 1) {
                debugEntries.push({
                    braille: "",
                    meaning: "run-over: line split into " + staffLines.length + " lines (Par. 28.1.2)",
                    measureNumber: measureNum,
                });
            }

            // Add line-break debug entry between staff lines (except after last staff)
            if (debugMode && si < config.staffCount - 1) {
                debugEntries.push({
                    braille: BRAILLE_LINE_BREAK,
                    meaning: "staff separator (newline)",
                    measureNumber: measureNum,
                });
            }
        }

        return { lines: lines, debugEntries: debugEntries };
    }

    /**
     * Convert a measure number to bare braille digits (NO number sign).
     * Par. 29.3(b): measure numbers at the margin use no numeric indicator,
     * in upper-cell digits (Example 29.3-1: measure 15 → ⠁⠑).
     *
     * @param n The measure number (0 for anacrusis, 1+ for regular measures)
     * @returns Braille digit string without number sign prefix
     */
    public measureNumberToBareDigits(n: number): string {
        return numberToUpperDigits(n);
    }

    /**
     * Split a formatted staff line into run-over lines when it exceeds lineWidth (Par. 28.1.2).
     *
     * Splits occur only at blank-cell separators (between measures) — never mid-measure,
     * since breaking within a measure would corrupt braille semantics (octave marks,
     * interval signs, etc. are tightly coupled to adjacent notes).
     *
     * Run-over (continuation) lines are indented 2 cells beyond the alignment point
     * (where music starts on the primary line, i.e., right after the prefix).
     *
     * @param line The full formatted line (prefix + music content)
     * @param prefixLen The cell length of the prefix (music alignment point)
     * @param lineWidth Maximum cells allowed per line
     * @returns Array of lines. If input fits, returns [line]. Otherwise, primary line
     *          plus one or more continuation lines with run-over indent.
     */
    public splitLineWithRunOver(line: string, prefixLen: number, lineWidth: number): string[] {
        if (line.length <= lineWidth) {
            return [line];
        }

        const result: string[] = [];
        const runOverIndent: string = BRAILLE_BLANK_CELL.repeat(prefixLen + 2);
        let remaining: string = line;
        let isFirstLine: boolean = true;

        while (remaining.length > lineWidth) {
            // Find the last blank cell at or before lineWidth that is AFTER the prefix
            // (don't break within the prefix itself)
            const searchStart: number = isFirstLine ? prefixLen : runOverIndent.length;
            let splitPos: number = -1;
            for (let i: number = lineWidth; i > searchStart; i--) {
                if (remaining.charAt(i) === BRAILLE_BLANK_CELL) {
                    splitPos = i;
                    break;
                }
            }

            if (splitPos === -1) {
                // No safe split point within lineWidth — let this chunk overflow
                // (better to overflow than to break mid-measure)
                result.push(remaining);
                return result;
            }

            // Primary/previous line ends just before the blank cell separator
            result.push(remaining.substring(0, splitPos));
            // Continuation starts after the blank cell, with run-over indent
            remaining = runOverIndent + remaining.substring(splitPos + 1);
            isFirstLine = false;
        }

        if (remaining.length > 0) {
            result.push(remaining);
        }
        return result;
    }

    /**
     * Generate padding to fill a gap for vertical alignment.
     *
     * If the gap is large enough (≥ guideDotThreshold), fills with guide dots
     * (dot 3, minimum guideDotMinCount). Guide dots are separated from music
     * by one blank cell on each side (Par. 28.1.3).
     *
     * If the gap is too small for guide dots, fills with plain spaces.
     *
     * @param gap Number of cells to fill
     * @param config Layout configuration with guide dot thresholds
     * @returns Padding string of exactly `gap` cells
     */
    public padWithGuideDots(gap: number, config: BarOverBarConfig): string {
        if (gap <= 0) {
            return "";
        }

        // Guide dots need: 1 blank + N dots + 1 blank = N+2 cells minimum
        // Where N >= guideDotMinCount
        const minGuideDotCells: number = config.guideDotMinCount + 2;

        if (gap >= config.guideDotThreshold && gap >= minGuideDotCells) {
            // Fill with guide dots: [blank][dots...][blank]
            const dotCount: number = gap - 2; // subtract 2 for flanking blank cells
            return BRAILLE_BLANK_CELL + BRAILLE_AUGMENTATION_DOT.repeat(dotCount) + BRAILLE_BLANK_CELL;
        }

        // Plain blank cells for small gaps
        return BRAILLE_BLANK_CELL.repeat(gap);
    }

    /**
     * Compute the maximum measure number digit width across all measures.
     * Used to vertically align measure numbers across parallels.
     */
    private getMaxMeasureNumberWidth(measures: RenderedMeasure[]): number {
        let maxWidth: number = 0;
        for (const measure of measures) {
            const width: number = this.measureNumberToBareDigits(measure.measureNumber).length;
            if (width > maxWidth) {
                maxWidth = width;
            }
        }
        return maxWidth;
    }

    // ── Ensemble bar-over-bar (M8c) ──────────────────────────────────────────

    /**
     * Format a multi-instrument score in ensemble bar-over-bar layout.
     *
     * Unlike keyboard bar-over-bar (M8b), ensemble format:
     * - Uses instrument abbreviations as line prefixes (not hand signs)
     * - Places measure numbers in a free line above each parallel
     * - Has a variable number of lines per parallel (one per instrument staff)
     * - Reads all chord intervals upward (Par. 33.4.2)
     *
     * Music Braille Code 2015, Chapter 33.
     *
     * @param musicSheet The parsed MusicSheet
     * @param parts Instrument/part info (abbreviation, staff indices, clef defaults)
     * @param config Layout configuration
     * @param debugMode Whether to generate debug entries
     * @param facsimile Whether facsimile mode is active
     * @param computeSlurLengthsFn Function to compute slur lengths per staff
     * @returns BrailleOutput with formatted ensemble bar-over-bar text
     */
    /**
     * @param perPartKeys When provided, parts have different key signatures.
     *   The heading will show only time (no key), and each staff's state is
     *   pre-initialized with its own key to suppress per-measure rendering.
     *   Map: global staff index → KeyInstruction. (Par. 33.4.1)
     */
    public formatEnsemble(
        musicSheet: MusicSheet,
        parts: EnsemblePartInfo[],
        config: BarOverBarConfig,
        debugMode: boolean,
        facsimile: boolean,
        computeSlurLengthsFn: (measures: SourceMeasure[], staffIndex: number) => Map<Slur, number>,
        perPartKeys?: Map<number, KeyInstruction>
    ): BrailleOutput {
        const measures: SourceMeasure[] = musicSheet.SourceMeasures;
        if (measures.length === 0) {
            return { text: "", debugEntries: [] };
        }

        const allDebugEntries: BrailleDebugEntry[] = [];

        // Phase 1: Extract initial key/time for the music heading
        // When perPartKeys is set, parts have different keys → heading shows time only
        const initialKey: KeyInstruction | undefined = perPartKeys
            ? undefined : measures[0].getKeyInstruction(0);
        const initialTime: Fraction | undefined = measures[0].ActiveTimeSignature;

        // Phase 2: Render music heading (key + time centered above first parallel)
        const heading: { braille: string, debugEntries: BrailleDebugEntry[] } =
            this.renderMusicHeading(initialKey, initialTime, config.lineWidth);

        // Phase 3: Pre-render all measures for each part/staff
        // Flatten parts into staff-level rendering, but keep part association
        const allRendered: RenderedMeasure[][] = [];
        const staffPartMap: number[] = []; // maps staff render index → part index

        for (let pi: number = 0; pi < parts.length; pi++) {
            const part: EnsemblePartInfo = parts[pi];
            for (const staffIdx of part.staffIndices) {
                const slurLengths: Map<Slur, number> = computeSlurLengthsFn(measures, staffIdx);
                const state: BrailleState = {
                    octaveTracker: new BrailleOctaveTracker(),
                    facsimile: facsimile,
                    currentClef: part.defaultClef,
                    hadInAccord: false,
                    activeSlurs: new Set(),
                    slurLengths: slurLengths,
                    ensembleMode: true, // all intervals read upward
                };

                // Pre-initialize key/time to suppress initial rendering in measure lines.
                // When per-part keys are used, each staff gets its own key (already in abbreviation).
                const staffKey: KeyInstruction | undefined = perPartKeys
                    ? perPartKeys.get(staffIdx) : measures[0].getKeyInstruction(0);
                if (staffKey) {
                    state.currentKey = staffKey;
                }
                if (initialTime) {
                    state.currentRhythm = initialTime;
                }

                const rendered: RenderedMeasure[] = this.preRenderMeasures(measures, staffIdx, state);
                allRendered.push(rendered);
                staffPartMap.push(pi);
            }
        }

        // Phase 4: Group measures into parallels
        // Override staffCount in config to reflect total rendered staves
        const ensembleConfig: BarOverBarConfig = {
            ...config,
            staffCount: allRendered.length,
        };
        const groups: Array<{ startIndex: number, endIndex: number }> =
            this.groupIntoParallels(allRendered, ensembleConfig);

        // Build abbreviation list (one per rendered staff, matching allRendered indices)
        const abbreviations: string[] = [];
        for (const part of parts) {
            for (let si: number = 0; si < part.staffIndices.length; si++) {
                abbreviations.push(part.brailleAbbreviation);
            }
        }

        // Phase 5: Format each parallel and assemble output
        const outputLines: string[] = [];

        // Add heading if non-empty
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

            // Condensed score (Par. 33.1): determine which staves have actual music
            // in this parallel's measure range. Omit staves that are rest-only.
            const activeStaves: number[] = [];
            for (let si: number = 0; si < allRendered.length; si++) {
                const staffIdx: number = this.getStaffIndexForRenderIndex(si, parts);
                if (!this.isStaffRestOnly(measures, staffIdx, group.startIndex, group.endIndex)) {
                    activeStaves.push(si);
                }
            }
            // If all staves are rest-only (unlikely), include all to avoid empty parallel
            const effectiveStaves: number[] = activeStaves.length > 0 ? activeStaves :
                Array.from({ length: allRendered.length }, (_: unknown, i: number): number => i);

            // Compute max abbreviation width for this parallel's active staves
            let parallelMaxAbbrevWidth: number = 0;
            for (const si of effectiveStaves) {
                const abbrLen: number = abbreviations[si].length;
                if (abbrLen > parallelMaxAbbrevWidth) {
                    parallelMaxAbbrevWidth = abbrLen;
                }
            }

            // Measure number line above the parallel (Par. 33.4.6)
            const measureNum: number = allRendered[0][group.startIndex].measureNumber;
            const measureNumStr: string = this.measureNumberToBareDigits(measureNum);
            // Indent one cell beyond the first music signs (= parallelMaxAbbrevWidth + 1 blank)
            const numIndent: string = BRAILLE_BLANK_CELL.repeat(parallelMaxAbbrevWidth + 1);
            outputLines.push(numIndent + measureNumStr);

            if (debugMode) {
                allDebugEntries.push({
                    braille: measureNumStr,
                    meaning: "measure " + measureNum,
                    measureNumber: measureNum,
                });
                allDebugEntries.push({
                    braille: BRAILLE_LINE_BREAK,
                    meaning: "measure number separator (newline)",
                    measureNumber: measureNum,
                });
            }

            // Format the parallel content (only active instrument lines)
            const parallel: Parallel = this.formatEnsembleParallel(
                group.startIndex, group.endIndex, allRendered, abbreviations,
                { ...ensembleConfig, staffCount: effectiveStaves.length },
                parallelMaxAbbrevWidth, debugMode, effectiveStaves
            );

            outputLines.push(...parallel.lines);
            if (debugMode) {
                allDebugEntries.push(...parallel.debugEntries);
            }

            // Blank line between parallels (except after the last)
            if (gi < groups.length - 1 && debugMode) {
                allDebugEntries.push({
                    braille: BRAILLE_LINE_BREAK,
                    meaning: "parallel separator (newline)",
                    measureNumber: 0,
                });
            }
        }

        return {
            text: outputLines.join(BRAILLE_LINE_BREAK),
            debugEntries: debugMode ? allDebugEntries : [],
        };
    }

    /**
     * Format a single ensemble parallel: abbreviation + aligned measures for each part.
     * Similar to formatParallel() but uses instrument abbreviations instead of hand signs.
     * When activeStaves is provided, only those staves are included (condensed score, Par. 33.1).
     */
    private formatEnsembleParallel(
        startIdx: number, endIdx: number,
        allRendered: RenderedMeasure[][], abbreviations: string[],
        config: BarOverBarConfig, maxAbbrevWidth: number, debugMode: boolean,
        activeStaves?: number[]
    ): Parallel {
        const lines: string[] = [];
        const debugEntries: BrailleDebugEntry[] = [];

        // Use activeStaves if provided (condensed), otherwise all staves
        const stavesList: number[] = activeStaves ??
            Array.from({ length: allRendered.length }, (_: unknown, i: number): number => i);

        for (let idx: number = 0; idx < stavesList.length; idx++) {
            const si: number = stavesList[idx];
            const abbrev: string = abbreviations[si];

            // Pad abbreviation to max width for alignment
            const abbrPadding: string = BRAILLE_BLANK_CELL.repeat(
                Math.max(0, maxAbbrevWidth - abbrev.length)
            );
            // Prefix: abbreviation + padding + blank cell (separator before music)
            const prefix: string = abbrev + abbrPadding + BRAILLE_BLANK_CELL;
            const measureParts: string[] = [];

            if (debugMode) {
                debugEntries.push({
                    braille: abbrev,
                    meaning: "instrument",
                    measureNumber: allRendered[0][startIdx].measureNumber,
                });
            }

            // Add each measure, with padding for alignment
            for (let mi: number = startIdx; mi < endIdx; mi++) {
                const rendered: RenderedMeasure = allRendered[si][mi];
                measureParts.push(rendered.braille);

                if (debugMode) {
                    for (const entry of rendered.debugEntries) {
                        debugEntries.push({
                            braille: entry.braille,
                            meaning: entry.meaning,
                            measureNumber: rendered.measureNumber,
                        });
                    }
                }

                // Pad for alignment (except after last measure in parallel)
                if (mi < endIdx - 1) {
                    // Column width = max cell length across active staves only
                    let maxCellLen: number = 0;
                    for (const activeIdx of stavesList) {
                        const cellLen: number = allRendered[activeIdx][mi].cellLength;
                        if (cellLen > maxCellLen) {
                            maxCellLen = cellLen;
                        }
                    }

                    const gap: number = maxCellLen - rendered.cellLength;
                    if (gap > 0) {
                        const padding: string = this.padWithGuideDots(gap, config);
                        measureParts.push(padding);

                        if (debugMode && padding.length > 0) {
                            const isGuideDots: boolean = padding.includes(BRAILLE_AUGMENTATION_DOT);
                            debugEntries.push({
                                braille: padding,
                                meaning: isGuideDots ? "guide dots" : "alignment padding",
                                measureNumber: rendered.measureNumber,
                            });
                        }
                    }

                    measureParts.push(BRAILLE_BLANK_CELL);

                    if (debugMode) {
                        debugEntries.push({
                            braille: BRAILLE_BLANK_CELL,
                            meaning: "barline",
                            measureNumber: rendered.measureNumber,
                        });
                    }
                }
            }

            // Build full part line, then split into run-over lines if needed (Par. 28.1.2).
            const fullLine: string = prefix + measureParts.join("");
            const partLines: string[] = this.splitLineWithRunOver(fullLine, prefix.length, config.lineWidth);
            lines.push(...partLines);

            if (debugMode && partLines.length > 1) {
                debugEntries.push({
                    braille: "",
                    meaning: "run-over: part line split into " + partLines.length + " lines (Par. 28.1.2)",
                    measureNumber: allRendered[0][startIdx].measureNumber,
                });
            }

            // Line break between instrument lines (except after last)
            if (debugMode && idx < stavesList.length - 1) {
                debugEntries.push({
                    braille: BRAILLE_LINE_BREAK,
                    meaning: "part separator (newline)",
                    measureNumber: allRendered[0][startIdx].measureNumber,
                });
            }
        }

        return { lines: lines, debugEntries: debugEntries };
    }

    /**
     * Check if a staff has only rests across a range of measures.
     * Used for condensed score (Par. 33.1): omit parts that are resting.
     */
    private isStaffRestOnly(
        measures: SourceMeasure[], staffIndex: number,
        startMeasureIdx: number, endMeasureIdx: number
    ): boolean {
        let hasNonRest: boolean = false;
        for (let mi: number = startMeasureIdx; mi < endMeasureIdx && !hasNonRest; mi++) {
            forEachVoiceEntryInMeasure(measures[mi], staffIndex, (voiceEntries: VoiceEntry[]): void => {
                for (const ve of voiceEntries) {
                    for (const note of ve.Notes) {
                        if (!note.isRest()) {
                            hasNonRest = true;
                            return;
                        }
                    }
                }
            });
        }
        return !hasNonRest;
    }

    /**
     * Get the global staff index for a given render index.
     * Maps from the flat allRendered[] index back to the original staff index.
     */
    /**
     * Render an instrument list table (Par. 33.2).
     * Two-column table: full instrument names + abbreviations.
     * Abbreviations start 2 cells beyond the longest name.
     * Guide dots (dot 5) fill gaps of 3+ cells between name and abbreviation column.
     *
     * @param instruments Array of { name, abbreviation } in braille literary characters
     * @returns Lines of the table, one per instrument
     */
    public renderInstrumentTable(
        instruments: Array<{ name: string, abbreviation: string }>
    ): { lines: string[], debugEntries: BrailleDebugEntry[] } {
        const debugEntries: BrailleDebugEntry[] = [];

        // Find longest name to determine abbreviation column start
        let maxNameLen: number = 0;
        for (const inst of instruments) {
            if (inst.name.length > maxNameLen) {
                maxNameLen = inst.name.length;
            }
        }
        // Abbreviation column starts 2 cells beyond longest name
        const abbrevCol: number = maxNameLen + 2;

        const lines: string[] = [];
        for (const inst of instruments) {
            const gap: number = abbrevCol - inst.name.length;
            let filler: string;
            if (gap >= 3) {
                // Guide dots (dot 5 = ⠐) fill the gap, with one blank before dots start
                const dotCount: number = gap - 1;
                filler = BRAILLE_BLANK_CELL + "\u2810".repeat(dotCount);
            } else {
                filler = BRAILLE_BLANK_CELL.repeat(gap);
            }
            const line: string = inst.name + filler + inst.abbreviation;
            lines.push(line);

            debugEntries.push({
                braille: line,
                meaning: "instrument list entry",
                measureNumber: 0,
            });
        }

        return { lines: lines, debugEntries: debugEntries };
    }

    private getStaffIndexForRenderIndex(renderIndex: number, parts: EnsemblePartInfo[]): number {
        let idx: number = 0;
        for (const part of parts) {
            for (const staffIdx of part.staffIndices) {
                if (idx === renderIndex) {
                    return staffIdx;
                }
                idx++;
            }
        }
        return 0; // fallback
    }
}

/**
 * Information about an ensemble part for bar-over-bar layout.
 */
export interface EnsemblePartInfo {
    /** Braille abbreviation for the instrument (already converted via textToBraille + dot 3 terminator) */
    brailleAbbreviation: string;
    /** Global staff indices for this part's staves (from Staff.idInMusicSheet) */
    staffIndices: number[];
    /** Default clef for this part (for chord interval direction — though ensemble always reads upward) */
    defaultClef: ClefEnum;
}
