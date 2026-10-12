import {Fonts} from "../../Common/Enums/Fonts";
import {FontStyles} from "../../Common/Enums/FontStyles";

export interface ITextMeasurer {
    fontSize: number;
    fontSizeStandard: number;
    computeTextWidthToHeightRatio(text: string, font: Fonts, style: FontStyles,
                                  fontFamily?: string, fontSize?: number): number;
    /** Computes the width of the text in pixels in a CSS font as VexFlow sets it, e.g. "10pt Arial",
     *  whose family can also be a generic family or a list, e.g. "10pt Courier New, monospace".
     *  Optional, so that measurers implementing the interface without it keep working.
     *  Without it, the texts in EngravingRules.VexFlowTextFontFamily get as much space as in VexFlow's fonts. */
    computeTextWidthInCssFont?(text: string, cssFont: string): number;
    // computeTextWidth(text: string, font: Fonts, style: FontStyles,
    //                  fontFamily?: string, fontSize?: number): number;
    setFontSize(fontSize: number): number;
}
