import {ITextMeasurer} from "../../Interfaces/ITextMeasurer";
import {Fonts} from "../../../Common/Enums/Fonts";
import {FontStyles} from "../../../Common/Enums/FontStyles";
import {VexFlowConverter} from "./VexFlowConverter";
/**
 * Created by Matthias on 21.06.2016.
 */

export class VexFlowTextMeasurer implements ITextMeasurer {
    constructor() {
        const canvas: HTMLCanvasElement = document.createElement("canvas");
        this.context = canvas.getContext("2d");
    }
    // The context of a canvas used internally to compute font sizes
    private context: CanvasRenderingContext2D;
    public fontSize: number = 20;
    public fontSizeStandard: number = this.fontSize;

    /**
     *
     * @param text
     * @param font
     * @param style
     * @returns {number}
     */
    public computeTextWidthToHeightRatio(text: string, font: Fonts, style: FontStyles, fontSize: number = this.fontSize): number {
        this.context.font = VexFlowConverter.font(fontSize, style, font);
        return this.context.measureText(text).width / fontSize;
    }

    public setFontSize(fontSize: number = this.fontSizeStandard): number {
        this.fontSize = fontSize;
        return fontSize;
    }
}
