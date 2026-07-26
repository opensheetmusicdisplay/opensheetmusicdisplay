import { LabelTextLine, LabelTextRun } from "../Label";
import { AccidentalEnum } from "../../Common/DataObjects/Pitch";
import { EngravingRules } from "./EngravingRules";

type DoricoDeferredTextFontAudit = {
    tempo: string;
};

type DoricoTextFontAudit = {
    defaultScoreText: string;
    musicText: string;
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
export const DORICO_MUSIC_TEXT_FONT_FAMILY: string = "Bravura Text";

export const DORICO_TEXT_FONT_AUDIT: DoricoTextFontAudit = Object.freeze({
    defaultScoreText: DORICO_DEFAULT_TEXT_FONT_FAMILY,
    musicText: DORICO_MUSIC_TEXT_FONT_FAMILY,
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
    return [
        {
            runs: splitChordSymbolRuns(
                text,
                collectChordMusicTextTokens(rules),
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

    addRuleAccidentalToken(tokenMap, rules, AccidentalEnum.FLAT, "b", "♭");
    addRuleAccidentalToken(tokenMap, rules, AccidentalEnum.NATURAL, "n", "♮");
    addRuleAccidentalToken(tokenMap, rules, AccidentalEnum.SHARP, "#", "♯");
    addRuleAccidentalToken(tokenMap, rules, AccidentalEnum.DOUBLESHARP, "x", "𝄪");
    addRuleAccidentalToken(tokenMap, rules, AccidentalEnum.DOUBLEFLAT, "bb", "𝄫");

    return Array.from(tokenMap.entries())
        .map(([source, display]) => ({ source, display }))
        .sort((left, right) => right.source.length - left.source.length || right.source.localeCompare(left.source));
}

function splitChordSymbolRuns(
    text: string,
    musicTextTokens: ChordMusicTextToken[],
    textFontFamily: string,
    musicTextFontFamily: string,
): LabelTextRun[] {
    const runs: LabelTextRun[] = [];
    let index: number = 0;

    while (index < text.length) {
        const token: ChordMusicTextToken = musicTextTokens.find((candidate) =>
            text.startsWith(candidate.source, index) && isChordMusicTextContext(text, index, candidate.source.length),
        );
        if (token) {
            appendRun(runs, token.display, musicTextFontFamily);
            index += token.source.length;
            continue;
        }

        const nextSymbol: string = Array.from(text.slice(index))[0] || "";
        if (!nextSymbol) {
            break;
        }
        appendRun(runs, nextSymbol, textFontFamily);
        index += nextSymbol.length;
    }

    return runs;
}

function appendRun(runs: LabelTextRun[], text: string, fontFamily: string): void {
    if (!text) {
        return;
    }
    const previousRun: LabelTextRun = runs[runs.length - 1];
    if (previousRun?.fontFamily === fontFamily) {
        previousRun.text += text;
        return;
    }
    runs.push({ text, fontFamily });
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

function isChordNoteLetter(character: string): boolean {
    return /^[A-Ga-g]$/.test(character);
}

function isDigit(character: string): boolean {
    return /^[0-9]$/.test(character);
}
