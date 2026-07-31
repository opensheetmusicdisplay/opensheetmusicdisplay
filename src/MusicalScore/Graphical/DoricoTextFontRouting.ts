import { LabelTextLine, LabelTextRun } from "../Label";
import { AccidentalEnum } from "../../Common/DataObjects/Pitch";
import { EngravingRules } from "./EngravingRules";
import {
    SMUFL_CHORD_ACCIDENTAL_DOUBLE_FLAT_GLYPH,
    SMUFL_CHORD_ACCIDENTAL_DOUBLE_SHARP_GLYPH,
    SMUFL_CHORD_ACCIDENTAL_FLAT_GLYPH,
    SMUFL_CHORD_ACCIDENTAL_NATURAL_GLYPH,
    SMUFL_CHORD_ACCIDENTAL_SHARP_GLYPH,
    SMUFL_CHORD_ALTERED_BASS_SLASH_GLYPH,
    SMUFL_CHORD_DIAGONAL_ARRANGEMENT_SLASH_GLYPH,
} from "../../Common/DataObjects/ChordSymbolGlyphs";

type DoricoDeferredTextFontAudit = {
    tempo: string;
};

type DoricoTextFontAudit = {
    defaultScoreText: string;
    musicText: string;
    dynamics: string;
    literalDynamics: string;
    chordText: string;
    chordMusicText: string;
    measureNumbers: string;
    voltaText: string;
    repetitionText: string;
    rehearsalText: string;
    sectionText: string;
    octaveShiftText: string;
    pedalText: string;
    deferred: DoricoDeferredTextFontAudit;
};

type ChordMusicTextToken = {
    source: string;
    display: string;
};

export const DORICO_DEFAULT_TEXT_FONT_FAMILY: string = "Academico";
export const DORICO_NOTATION_FONT_FAMILY: string = "Bravura";
export const DORICO_MUSIC_TEXT_FONT_FAMILY: string = "Bravura Text";
export const DORICO_CHORD_DIMINISHED_SYMBOL: string = "o";
export const DORICO_CHORD_HALFDIMINISHED_SYMBOL: string = "ø";
export const DORICO_CHORD_AUGMENTED_SYMBOL: string = "+";
export const DORICO_CHORD_MAJOR_SEVENTH_SYMBOL: string = "△";

const CHORD_SUPERSCRIPT_FONT_SCALE: number = 0.72;
const CHORD_SUPERSCRIPT_BASELINE_SHIFT: number = -0.35;

export const DORICO_TEXT_FONT_AUDIT: DoricoTextFontAudit = Object.freeze({
    defaultScoreText: DORICO_DEFAULT_TEXT_FONT_FAMILY,
    musicText: DORICO_MUSIC_TEXT_FONT_FAMILY,
    dynamics: DORICO_NOTATION_FONT_FAMILY,
    literalDynamics: DORICO_DEFAULT_TEXT_FONT_FAMILY,
    chordText: DORICO_DEFAULT_TEXT_FONT_FAMILY,
    chordMusicText: DORICO_MUSIC_TEXT_FONT_FAMILY,
    measureNumbers: DORICO_DEFAULT_TEXT_FONT_FAMILY,
    voltaText: DORICO_DEFAULT_TEXT_FONT_FAMILY,
    repetitionText: DORICO_DEFAULT_TEXT_FONT_FAMILY,
    rehearsalText: DORICO_DEFAULT_TEXT_FONT_FAMILY,
    sectionText: DORICO_DEFAULT_TEXT_FONT_FAMILY,
    octaveShiftText: DORICO_DEFAULT_TEXT_FONT_FAMILY,
    pedalText: DORICO_DEFAULT_TEXT_FONT_FAMILY,
    deferred: Object.freeze({
        tempo: "times",
    }),
});

export function getDoricoDefaultTextFontFamily(rules?: EngravingRules): string {
    return rules?.DefaultFontFamily || DORICO_DEFAULT_TEXT_FONT_FAMILY;
}

export function getDoricoMusicTextFontFamily(): string {
    return DORICO_MUSIC_TEXT_FONT_FAMILY;
}

export function buildDoricoChordSymbolTextLines(text: string, rules?: EngravingRules): LabelTextLine[] {
    const musicTextTokens: ChordMusicTextToken[] = collectChordMusicTextTokens(rules);
    return [
        {
            runs: splitChordSymbolRuns(
                splitChordSymbolSegments(text),
                musicTextTokens,
                getDoricoDefaultTextFontFamily(rules),
                getDoricoMusicTextFontFamily(),
            ),
        },
    ];
}

function collectChordMusicTextTokens(rules?: EngravingRules): ChordMusicTextToken[] {
    const tokenMap: Map<string, string> = new Map<string, string>();
    addChordMusicTextToken(tokenMap, "♭", "♭");
    addChordMusicTextToken(tokenMap, "♮", "♮");
    addChordMusicTextToken(tokenMap, "♯", "♯");
    addChordMusicTextToken(tokenMap, "𝄪", "𝄪");
    addChordMusicTextToken(tokenMap, "𝄫", "𝄫");
    addChordMusicTextToken(tokenMap, "△", "△");
    addChordMusicTextToken(tokenMap, "ø", "ø");
    addChordMusicTextToken(tokenMap, DORICO_CHORD_MAJOR_SEVENTH_SYMBOL, DORICO_CHORD_MAJOR_SEVENTH_SYMBOL);
    addChordMusicTextToken(tokenMap, DORICO_CHORD_HALFDIMINISHED_SYMBOL, DORICO_CHORD_HALFDIMINISHED_SYMBOL);
    addChordMusicTextToken(tokenMap, "\uE870", "\uE870");
    addChordMusicTextToken(tokenMap, "\uE871", "\uE871");
    addChordMusicTextToken(tokenMap, "\uE872", "\uE872");
    addChordMusicTextToken(tokenMap, "\uE873", "\uE873");
    addChordMusicTextToken(tokenMap, "\uE874", "\uE874");
    addChordMusicTextToken(
        tokenMap,
        SMUFL_CHORD_ALTERED_BASS_SLASH_GLYPH,
        SMUFL_CHORD_ALTERED_BASS_SLASH_GLYPH,
    );
    addChordMusicTextToken(
        tokenMap,
        SMUFL_CHORD_DIAGONAL_ARRANGEMENT_SLASH_GLYPH,
        SMUFL_CHORD_DIAGONAL_ARRANGEMENT_SLASH_GLYPH,
    );

    addRuleAccidentalToken(
        tokenMap, rules, AccidentalEnum.FLAT, "b", SMUFL_CHORD_ACCIDENTAL_FLAT_GLYPH,
    );
    addRuleAccidentalToken(
        tokenMap, rules, AccidentalEnum.NATURAL, "n", SMUFL_CHORD_ACCIDENTAL_NATURAL_GLYPH,
    );
    addRuleAccidentalToken(
        tokenMap, rules, AccidentalEnum.SHARP, "#", SMUFL_CHORD_ACCIDENTAL_SHARP_GLYPH,
    );
    addRuleAccidentalToken(
        tokenMap, rules, AccidentalEnum.DOUBLESHARP, "x", SMUFL_CHORD_ACCIDENTAL_DOUBLE_SHARP_GLYPH,
    );
    addRuleAccidentalToken(
        tokenMap, rules, AccidentalEnum.DOUBLEFLAT, "bb", SMUFL_CHORD_ACCIDENTAL_DOUBLE_FLAT_GLYPH,
    );

    return Array.from(tokenMap.entries())
        .map(([source, display]) => ({ source, display }))
        .sort((left, right) => right.source.length - left.source.length || right.source.localeCompare(left.source));
}

type ChordLayoutSegment = {
    text: string;
    fontScale?: number;
    baselineShift?: number;
};

function splitChordSymbolRuns(
    segments: ChordLayoutSegment[],
    musicTextTokens: ChordMusicTextToken[],
    textFontFamily: string,
    musicTextFontFamily: string,
): LabelTextRun[] {
    const runs: LabelTextRun[] = [];

    for (const segment of segments) {
        let index: number = 0;
        while (index < segment.text.length) {
            const token: ChordMusicTextToken = musicTextTokens.find((candidate) =>
                segment.text.startsWith(candidate.source, index) &&
                isChordMusicTextContext(segment.text, index, candidate.source.length),
            );
            if (token) {
                appendRun(
                    runs,
                    token.display,
                    musicTextFontFamily,
                    segment.fontScale ?? 1,
                    segment.baselineShift ?? 0,
                );
                index += token.source.length;
                continue;
            }

            const nextSymbol: string = Array.from(segment.text.slice(index))[0] || "";
            if (!nextSymbol) {
                break;
            }
            appendRun(
                runs,
                nextSymbol,
                textFontFamily,
                segment.fontScale ?? 1,
                segment.baselineShift ?? 0,
            );
            index += nextSymbol.length;
        }
    }

    return runs;
}

function appendRun(
    runs: LabelTextRun[],
    text: string,
    fontFamily: string,
    fontScale: number,
    baselineShift: number,
): void {
    if (!text) {
        return;
    }
    const previousRun: LabelTextRun = runs[runs.length - 1];
    if (
        previousRun?.fontFamily === fontFamily &&
        (previousRun.fontScale ?? 1) === fontScale &&
        (previousRun.baselineShift ?? 0) === baselineShift
    ) {
        previousRun.text += text;
        return;
    }
    runs.push({ text, fontFamily, fontScale, baselineShift });
}

function containsNonAscii(text: string): boolean {
    for (const character of Array.from(text)) {
        if (character.charCodeAt(0) > 0x7F) {
            return true;
        }
    }
    return false;
}

function addRuleAccidentalToken(
    tokenMap: Map<string, string>,
    rules: EngravingRules | undefined,
    accidental: AccidentalEnum,
    fallbackSource: string,
    display: string,
): void {
    const configuredToken: string = rules?.ChordAccidentalTexts?.getValue(accidental);
    addChordMusicTextToken(tokenMap, configuredToken || fallbackSource, display);
}

function addChordMusicTextToken(tokenMap: Map<string, string>, source: string, display: string): void {
    if (!source || !display) {
        return;
    }
    tokenMap.set(source, display);
}

function isChordMusicTextContext(text: string, index: number, tokenLength: number): boolean {
    const previousCharacter: string = index > 0 ? text.charAt(index - 1) : "";
    const nextCharacter: string = text.charAt(index + tokenLength);

    if (containsNonAscii(text.slice(index, index + tokenLength))) {
        return true;
    }
    if (isChordNoteLetter(previousCharacter)) {
        return true;
    }
    if (isDigit(nextCharacter)) {
        return true;
    }
    if (previousCharacter === "(" || previousCharacter === "/" || previousCharacter === ",") {
        return isChordNoteLetter(nextCharacter) || isDigit(nextCharacter);
    }
    return false;
}

function splitChordSymbolSegments(text: string): ChordLayoutSegment[] {
    if (!text) {
        return [];
    }

    const bassIndex: number = findChordBassIndex(text);
    const mainText: string = bassIndex >= 0 ? text.slice(0, bassIndex) : text;
    const bassText: string = bassIndex >= 0 ? text.slice(bassIndex) : "";
    const rootText: string = matchChordRoot(mainText);
    if (!rootText) {
        return [{ text }];
    }

    const segments: ChordLayoutSegment[] = [{ text: rootText }];
    const suffixText: string = mainText.slice(rootText.length);
    if (suffixText) {
        const baselinePrefix: string = matchChordBaselineQualityPrefix(suffixText);
        if (baselinePrefix) {
            segments.push({ text: baselinePrefix });
        }
        const superscriptText: string = suffixText.slice(baselinePrefix.length);
        if (superscriptText) {
            const sixNineMatch: RegExpMatchArray = superscriptText.match(/^(.*?)6\/9(.*)$/);
            if (sixNineMatch) {
                if (sixNineMatch[1]) {
                    segments.push({
                        text: sixNineMatch[1],
                        fontScale: CHORD_SUPERSCRIPT_FONT_SCALE,
                        baselineShift: CHORD_SUPERSCRIPT_BASELINE_SHIFT,
                    });
                }
                // 6/9 is a compact diagonal extension, not a stacked fraction and
                // not an altered-bass separator. Academico has no dedicated SMuFL
                // glyph for the construction, so use its typographic fraction slash.
                segments.push({ text: "6", fontScale: 0.62, baselineShift: -0.52 });
                segments.push({ text: "\u2044", fontScale: 0.66, baselineShift: -0.25 });
                segments.push({ text: "9", fontScale: 0.62, baselineShift: 0.02 });
                if (sixNineMatch[2]) {
                    segments.push({
                        text: sixNineMatch[2],
                        fontScale: CHORD_SUPERSCRIPT_FONT_SCALE,
                        baselineShift: CHORD_SUPERSCRIPT_BASELINE_SHIFT,
                    });
                }
            } else {
                segments.push({
                    text: superscriptText,
                    fontScale: CHORD_SUPERSCRIPT_FONT_SCALE,
                    baselineShift: CHORD_SUPERSCRIPT_BASELINE_SHIFT,
                });
            }
        }
    }
    if (bassText) {
        segments.push({ text: bassText });
    }
    return segments;
}

function matchChordBaselineQualityPrefix(text: string): string {
    const lowered: string = text.toLowerCase();
    if (lowered.startsWith("minor")) {
        return text.slice(0, "minor".length);
    }
    if (lowered.startsWith("min")) {
        return text.slice(0, "min".length);
    }
    if (lowered.startsWith("mi")) {
        return text.slice(0, "mi".length);
    }
    if (lowered.startsWith("m") && !lowered.startsWith("maj")) {
        return text.slice(0, "m".length);
    }
    return "";
}

function findChordBassIndex(text: string): number {
    for (let index: number = 1; index < text.length - 1; index++) {
        if (text.charAt(index) === "/" && isChordNoteLetter(text.charAt(index + 1))) {
            return index;
        }
    }
    return -1;
}

function matchChordRoot(text: string): string {
    const match: RegExpMatchArray = text.match(
        /^[A-Ga-g](?:(?:bb|##|x|b|#|n|♭|♮|♯|𝄪|𝄫)+)?/u,
    );
    return match?.[0] ?? "";
}

function isChordNoteLetter(character: string): boolean {
    return /^[A-Ga-g]$/.test(character);
}

function isDigit(character: string): boolean {
    return /^[0-9]$/.test(character);
}
