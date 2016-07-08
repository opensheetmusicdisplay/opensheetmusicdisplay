import { TextAlignment } from "../Common/Enums/TextAlignment";
import { OSMDColor } from "../Common/DataObjects/osmdColor";
import { Fonts } from "../Common/Enums/Fonts";
import { FontStyles } from "../Common/Enums/FontStyles";
export declare class Label {
    constructor(text?: string, alignment?: TextAlignment, font?: Fonts);
    text: string;
    color: OSMDColor;
    font: Fonts;
    fontStyle: FontStyles;
    fontHeight: number;
    textAlignment: TextAlignment;
    ToString(): string;
}
