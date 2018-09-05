import {Fonts} from "../../Common/Enums/Fonts";
import {FontStyles} from "../../Common/Enums/FontStyles";

export interface ITextMeasurer {
    fontSize: number;
    fontSizeStandard: number;
    computeTextWidthToHeightRatio(text: string, font: Fonts, style: FontStyles): number;
    setFontSize(fontSize: number): number;
}
