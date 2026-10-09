import {TextAlignmentEnum} from "../Common/Enums/TextAlignment";
import {OSMDColor} from "../Common/DataObjects/OSMDColor";
import {Fonts} from "../Common/Enums/Fonts";
import {FontStyles} from "../Common/Enums/FontStyles";

/**
 * A text label on the graphical music sheet.
 * It is used e.g. for titles, composer names, instrument names and dynamic instructions.
 */
export class Label {

    constructor(text: string = "", alignment: TextAlignmentEnum = TextAlignmentEnum.CenterBottom,
                font: Fonts = undefined, print: boolean = true) {
        this.text = text;
        this.print = print;
        this.textAlignment = alignment;
        this.font = font;
        this.fontFamily = undefined; // default value, will use EngravingRules.DefaultFontFamily at rendering
    }

    public text: string;
    /** Ordered MusicXML words/symbol content, separate from the text used for recognition. */
    public TextRuns: LabelTextRun[];
    public print: boolean;
    public color: OSMDColor;
    public colorDefault: string; // TODO this is Vexflow format, convert to OSMDColor. for now convenient for default colors.
    public font: Fonts;
    public fontFamily: string; // default undefined: will use EngravingRules.DefaultFontFamily at rendering
    public fontStyle: FontStyles;
    public fontHeight: number;
    /** The language of the text as a BCP 47 tag, e.g. "ja" or "zh-CN", read from MusicXML's xml:lang (undefined if not given).
     * It is drawn as the text's language, so that e.g. a browser draws kanji with Japanese instead of Chinese glyphs. */
    public language: string;
    public textAlignment: TextAlignmentEnum;
    public IsCreditLabel: boolean = false;

    public ToString(): string {
        return this.text;
    }
}

export interface LabelTextRun {
    text?: string;
    symbol?: string;
}

/** The text-note family that can be printed with the bundled notation font. */
export function isSupportedTextSymbol(name: string): boolean {
    return /^(metNoteWhole|metNote(Half|Quarter|8th|16th|32nd|64th|128th)(Up|Down)|metAugmentationDot)$/.test(name);
}

/** Words alone keep their existing identity; mixed labels also compare their symbols and order. */
export function sameTextRuns(first: LabelTextRun[], second: LabelTextRun[]): boolean {
    if (first === second) { return true; }
    return !!first && !!second && JSON.stringify(splitTextRuns(first)) === JSON.stringify(splitTextRuns(second));
}

/** Split and trim lines as for plain labels, without inserting spaces at XML element boundaries. */
export function splitTextRuns(runs: LabelTextRun[]): LabelTextRun[][] {
    const lines: LabelTextRun[][] = [[]];
    for (const run of runs) {
        if (run.symbol !== undefined) {
            if (isSupportedTextSymbol(run.symbol)) { lines[lines.length - 1].push(run); }
            continue;
        }
        const parts: string[] = run.text.split(/[\n\r]+/g);
        for (let index: number = 0; index < parts.length; index++) {
            if (index > 0) { lines.push([]); }
            const line: LabelTextRun[] = lines[lines.length - 1];
            const previous: LabelTextRun = line[line.length - 1];
            if (previous?.text !== undefined) { previous.text += parts[index]; }
            else { line.push({text: parts[index]}); }
        }
    }
    for (const line of lines) {
        if (line[0]?.text !== undefined) { line[0].text = line[0].text.trimStart(); }
        const last: LabelTextRun = line[line.length - 1];
        if (last?.text !== undefined) { last.text = last.text.trimEnd(); }
    }
    return lines.map(line => line.filter(run => run.symbol !== undefined || run.text !== ""));
}
