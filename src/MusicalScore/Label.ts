import {TextAlignmentEnum} from "../Common/Enums/TextAlignment";
import {OSMDColor} from "../Common/DataObjects/OSMDColor";
import {Fonts} from "../Common/Enums/Fonts";
import {FontStyles} from "../Common/Enums/FontStyles";

/**
 * A text label on the graphical music sheet.
 * It is used e.g. for titles, composer names, instrument names and dynamic instructions.
 */
export class Label {

    constructor(text: string = "", alignment: TextAlignmentEnum = TextAlignmentEnum.CenterBottom, font: Fonts = Fonts.TimesNewRoman) {
        this.text = text;
        this.textAlignment = alignment;
        this.font = font;
    }

    public text: string;
    public color: OSMDColor;
    public font: Fonts;
    public fontStyle: FontStyles;
    public fontHeight: number;
    public textAlignment: TextAlignmentEnum;

    public ToString(): string {
        return this.text;
    }

}
