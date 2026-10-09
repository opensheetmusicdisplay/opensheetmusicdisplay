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
    /** Width of a MusicXML symbol in text-height units; zero for unsupported symbols. */
    computeSymbolWidthToHeightRatio?(name: string): number;
    /** A mixed-label text run's advance and left ink inset, in text-height units. */
    computeTextRunMetrics?(text: string, font: Fonts, style: FontStyles, fontFamily?: string): {width: number, leftInset: number};
    // computeTextWidth(text: string, font: Fonts, style: FontStyles,
    //                  fontFamily?: string, fontSize?: number): number;
    setFontSize(fontSize: number): number;
}
