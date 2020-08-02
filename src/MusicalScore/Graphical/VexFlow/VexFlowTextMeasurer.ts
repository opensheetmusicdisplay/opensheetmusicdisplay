import {ITextMeasurer} from "../../Interfaces/ITextMeasurer";
import {Fonts} from "../../../Common/Enums/Fonts";
import {FontStyles} from "../../../Common/Enums/FontStyles";
import {VexFlowConverter} from "./VexFlowConverter";
import { EngravingRules } from "../EngravingRules";
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

    /**
     *
     * @param text
     * @param font
     * @param style
     * @returns {number}
     */
    public computeTextWidthToHeightRatio(text: string, font: Fonts, style: FontStyles,
                                         fontFamily: string = undefined,
                                         fontSize: number = this.fontSize): number {
        this.context.font = VexFlowConverter.font(fontSize, style, font, this.rules, fontFamily);
        return this.context.measureText(text).width / fontSize;
    }

    public setFontSize(fontSize: number = this.fontSizeStandard): number {
        this.fontSize = fontSize;
        return fontSize;
    }
}
