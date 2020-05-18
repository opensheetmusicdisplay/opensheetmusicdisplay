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
                font: Fonts = undefined) {
        this.text = text;
        this.textAlignment = alignment;
        this.font = font;
        this.fontFamily = undefined; // default value, will use EngravingRules.DefaultFontFamily at rendering
    }

    public text: string;
    public color: OSMDColor;
    public colorDefault: string; // TODO this is Vexflow format, convert to OSMDColor. for now convenient for default colors.
    public font: Fonts;
    public fontFamily: string; // default undefined: will use EngravingRules.DefaultFontFamily at rendering
    public fontStyle: FontStyles;
    public fontHeight: number;
    public textAlignment: TextAlignmentEnum;

    public ToString(): string {
        return this.text;
    }
}
