import {ITextMeasurer} from "../../Interfaces/ITextMeasurer";
import {Fonts} from "../../../Common/Enums/Fonts";
import {FontStyles} from "../../../Common/Enums/FontStyles";
import {VexFlowConverter} from "./VexFlowConverter";
import { EngravingRules } from "../EngravingRules";
import { VexFlowInlineSymbol } from "./VexFlowInlineSymbol";
/**
 * Created by Matthias on 21.06.2016.
 */

export class VexFlowTextMeasurer implements ITextMeasurer {
    constructor(rules: EngravingRules) {
        const canvas: HTMLCanvasElement = document.createElement("canvas");
        this.context = canvas.getContext("2d");
        this.rules = rules;
    }
    // The context of a canvas used internally to compute font sizes
    private context: CanvasRenderingContext2D;
    public fontSize: number = 20;
    public fontSizeStandard: number = this.fontSize;
    private rules: EngravingRules;

    public computeTextWidthToHeightRatio(text: string, font: Fonts, style: FontStyles,
                                         fontFamily: string = undefined,
                                         fontSize: number = this.fontSize): number {
        this.context.font = VexFlowConverter.font(fontSize, style, font, this.rules, fontFamily);
        return this.context.measureText(text).width / fontSize;
    }

    public computeTextWidthInCssFont(text: string, cssFont: string): number {
        this.context.font = cssFont;
        return this.context.measureText(text).width;
    }

    public computeSymbolWidthToHeightRatio(name: string): number {
        return VexFlowInlineSymbol.create(name)?.Width ?? 0;
    }

    public computeTextRunMetrics(text: string, font: Fonts, style: FontStyles, fontFamily?: string): {width: number, leftInset: number} {
        this.context.font = VexFlowConverter.font(this.fontSize, style, font, this.rules, fontFamily);
        const metrics: TextMetrics = this.context.measureText(text);
        const leftInset: number = Math.max(0, metrics.actualBoundingBoxLeft ?? 0);
        return {width: (leftInset + Math.max(metrics.width, metrics.actualBoundingBoxRight ?? 0)) / this.fontSize,
                leftInset: leftInset / this.fontSize};
    }

    // public computeTextWidth(text: string, font: Fonts, style: FontStyles,
    //     fontFamily: string = undefined,
    //     fontSize: number = this.fontSize): number {
    //     this.context.font = VexFlowConverter.font(fontSize, style, font, this.rules, fontFamily);
    //     return this.context.measureText(text).width / 10.0;
    //     // TODO this shifts the title text of sheets to the right for some reason, maybe because of bigger fontSize?
    // }

    public setFontSize(fontSize: number = this.fontSizeStandard): number {
        this.fontSize = fontSize;
        return fontSize;
    }
}
