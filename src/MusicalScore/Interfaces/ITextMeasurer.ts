import {Fonts} from "../../Common/Enums/Fonts";
import {FontStyles} from "../../Common/Enums/FontStyles";

export interface ITextMeasurer {
    computeTextWidthToHeightRatio(text: string, font: Fonts, style: FontStyles): number;
}
