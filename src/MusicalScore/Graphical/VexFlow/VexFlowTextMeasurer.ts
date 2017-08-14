import {ITextMeasurer} from "../../Interfaces/ITextMeasurer";
import {Fonts} from "../../../Common/Enums/Fonts";
import {FontStyles} from "../../../Common/Enums/FontStyles";
import {VexFlowConverter} from "./VexFlowConverter";
/**
 * Created by Matthias on 21.06.2016.
 */

export class VexFlowTextMeasurer implements ITextMeasurer {
    constructor() {
        let canvas: HTMLCanvasElement = document.createElement("canvas");
        this.context = canvas.getContext("2d");
    }
    // The context of a canvas used internally to compute font sizes
    private context: CanvasRenderingContext2D;

    /**
     *
     * @param text
     * @param font
     * @param style
     * @returns {number}
     */
    public computeTextWidthToHeightRatio(text: string, font: Fonts, style: FontStyles): number {
        this.context.font = VexFlowConverter.font(20, style, font);
        return this.context.measureText(text).width / 20;
    }
}
