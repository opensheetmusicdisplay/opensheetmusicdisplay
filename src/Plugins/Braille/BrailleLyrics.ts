import { SourceMeasure } from "../../MusicalScore/VoiceData/SourceMeasure";
import { VoiceEntry } from "../../MusicalScore/VoiceData/VoiceEntry";
import { LyricsEntry } from "../../MusicalScore/VoiceData/Lyrics/LyricsEntry";
import { LyricWord } from "../../MusicalScore/VoiceData/Lyrics/LyricsWord";
import { BrailleNoteDebugInfo } from "./BrailleNoteRenderer";
import { forEachVoiceEntryInMeasure } from "./BrailleMeasureRenderer";
import {
    BRAILLE_BLANK_CELL,
    BRAILLE_NUMBER_SIGN,
    numberToUpperDigits,
    BRAILLE_OPEN_PAREN,
    BRAILLE_CLOSE_PAREN,
    textToBraille,
} from "./BrailleSymbols";

/**
 * Result of lyrics extraction for a single measure.
 */
export interface LyricsMeasureResult {
    /** Word-line text for this measure (syllables joined per braille rules) */
    wordText: string;
    /** Cell length of wordText */
    cellLength: number;
    /** Debug entries for lyrics elements */
    debugEntries: BrailleNoteDebugInfo[];
    /** Whether a melisma (single syllable spanning multiple notes) is active at end of this measure */
    melismaActive: boolean;
}

/**
 * State tracked across measures during lyrics extraction.
 */
export interface LyricsState {
    /** Whether a melisma is active — a syllable extending across multiple notes (MusicXML `<extend/>`) */
    melismaActive: boolean;
}

/**
 * Check if a LyricsEntry is the last syllable in its word.
 * Returns true for single-syllable words (no Word reference) or
 * when the entry is the final syllable in Word.Syllables[].
 */
export function isLastSyllableInWord(entry: LyricsEntry): boolean {
    const word: LyricWord | undefined = entry.Word;
    if (!word) {
        return true; // single-syllable word
    }
    const syllables: LyricsEntry[] = word.Syllables;
    if (!syllables || syllables.length === 0) {
        return true;
    }
    return entry === syllables[syllables.length - 1];
}

/**
 * Extract lyrics for a single measure, building the word-line text.
 *
 * Iterates VoiceEntries in beat order (first voice only) and collects
 * syllables for the specified verse. Syllables of the same word are
 * concatenated without hyphens (Par. 35.1.1a). Spaces are added
 * between words.
 *
 * @param measure The SourceMeasure to extract lyrics from
 * @param staffIndex Which staff to extract from (0-based)
 * @param verseNumber The verse number to extract (e.g., "1")
 * @param state Persistent state for melisma tracking across measures
 * @returns LyricsMeasureResult with word-line text and debug info
 */
export function extractLyricsMeasure(
    measure: SourceMeasure, staffIndex: number, verseNumber: string, state: LyricsState
): LyricsMeasureResult {
    const parts: string[] = [];
    const debugEntries: BrailleNoteDebugInfo[] = [];

    forEachVoiceEntryInMeasure(measure, staffIndex, (voiceEntries: VoiceEntry[]): void => {
        // Use first voice only (lyrics typically on primary voice)
        const ve: VoiceEntry = voiceEntries[0];
        const lyricsEntry: LyricsEntry | undefined = ve.LyricsEntries.getValue(verseNumber);

        if (lyricsEntry) {
            const syllableBraille: string = textToBraille(lyricsEntry.Text);
            parts.push(syllableBraille);

            debugEntries.push({
                braille: syllableBraille,
                meaning: "lyric: " + lyricsEntry.Text,
            });

            // Word boundary: add space after last syllable of word or single syllable
            if (lyricsEntry.SyllableIndex === -1 || isLastSyllableInWord(lyricsEntry)) {
                parts.push(BRAILLE_BLANK_CELL);
            }

            state.melismaActive = lyricsEntry.extend;
        } else if (state.melismaActive) {
            // Melisma continuation — no word text for this note
        }
    });

    const wordText: string = parts.join("");
    return {
        wordText: wordText,
        cellLength: wordText.length,
        debugEntries: debugEntries,
        melismaActive: state.melismaActive,
    };
}

/**
 * Build a Set of VoiceEntries that are continuation notes in a melisma
 * (a single syllable sung across multiple notes, indicated by `<extend/>` in MusicXML).
 * Used to inject syllabic slur signs in the music line.
 *
 * @param measures All SourceMeasures in the score
 * @param staffIndex Which staff to analyze
 * @param verseNumber The verse number to check
 * @returns Set of VoiceEntries that need syllabic slur signs
 */
export function buildMelismaSlurSet(
    measures: SourceMeasure[], staffIndex: number, verseNumber: string
): Set<VoiceEntry> {
    const result: Set<VoiceEntry> = new Set();
    let melismaActive: boolean = false;

    for (const measure of measures) {
        forEachVoiceEntryInMeasure(measure, staffIndex, (voiceEntries: VoiceEntry[]): void => {
            const ve: VoiceEntry = voiceEntries[0];
            const lyricsEntry: LyricsEntry | undefined = ve.LyricsEntries.getValue(verseNumber);

            if (lyricsEntry) {
                melismaActive = lyricsEntry.extend;
            } else if (melismaActive) {
                result.add(ve);
            }
        });
    }

    return result;
}

/**
 * Collect all distinct verse numbers present in the score for a given staff.
 * Returns sorted array of verse number strings (e.g., ["1", "2", "3"]).
 *
 * @param measures All SourceMeasures in the score
 * @param staffIndex Which staff to scan
 * @returns Sorted array of verse number strings
 */
export function collectVerseNumbers(
    measures: SourceMeasure[], staffIndex: number
): string[] {
    const verseNumbers: Set<string> = new Set();

    for (const measure of measures) {
        forEachVoiceEntryInMeasure(measure, staffIndex, (voiceEntries: VoiceEntry[]): void => {
            const ve: VoiceEntry = voiceEntries[0];
            ve.LyricsEntries.forEach((key: string, _entry: LyricsEntry): void => {
                verseNumbers.add(key);
            });
        });
    }

    // Sort numerically when possible (e.g., "1" < "2" < "10"), then alphabetically
    const sorted: string[] = Array.from(verseNumbers).sort((a: string, b: string): number => {
        const numA: number = parseInt(a, 10);
        const numB: number = parseInt(b, 10);
        if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB;
        }
        return a.localeCompare(b);
    });

    return sorted;
}

/**
 * Extract a full verse as continuous literary braille text.
 * Used for verses 2+ which appear after the music (Par. 35.7).
 *
 * Iterates all measures and collects syllables for the given verse,
 * joining them per braille rules (no hyphens within words, spaces between words).
 *
 * @param measures All SourceMeasures in the score
 * @param staffIndex Which staff to extract from
 * @param verseNumber The verse number to extract (e.g., "2")
 * @returns The full verse text as a braille literary string, prefixed with (N)
 */
export function extractFullVerse(
    measures: SourceMeasure[], staffIndex: number, verseNumber: string
): { braille: string, debugEntries: BrailleNoteDebugInfo[] } {
    const state: LyricsState = { melismaActive: false };
    const textParts: string[] = [];
    const debugEntries: BrailleNoteDebugInfo[] = [];

    for (const measure of measures) {
        const result: LyricsMeasureResult = extractLyricsMeasure(measure, staffIndex, verseNumber, state);
        if (result.wordText.length > 0) {
            textParts.push(result.wordText);
        }
        debugEntries.push(...result.debugEntries);
    }

    const verseText: string = textParts.join("");

    // Prefix with verse number in literary parentheses: (N)
    // Braille literary parenthesis: opening = dots 1,2,3,5,6 (⠷), closing = dots 2,3,4,5,6 (⠾)
    // Literary numbers use upper-cell digits after the number sign, e.g. (2) → ⠷⠼⠃⠾
    const verseNum: number = parseInt(verseNumber, 10);
    let versePrefix: string = "";
    if (!isNaN(verseNum)) {
        versePrefix = BRAILLE_OPEN_PAREN + BRAILLE_NUMBER_SIGN + numberToUpperDigits(verseNum) +
            BRAILLE_CLOSE_PAREN + BRAILLE_BLANK_CELL;
    }

    const fullBraille: string = versePrefix + verseText;

    debugEntries.push({
        braille: versePrefix,
        meaning: "verse " + verseNumber,
    });

    return { braille: fullBraille, debugEntries: debugEntries };
}
