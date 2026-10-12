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
