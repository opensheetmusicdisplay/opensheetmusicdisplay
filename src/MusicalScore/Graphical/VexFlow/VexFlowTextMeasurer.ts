import {ITextMeasurer} from "../../Interfaces/ITextMeasurer";
import {Fonts} from "../../../Common/Enums/Fonts";
import {FontStyles} from "../../../Common/Enums/FontStyles";
/**
 * Created by Matthias on 21.06.2016.
 */

export class VexFlowTextMeasurer implements ITextMeasurer {
    constructor() {
        let canvas: HTMLCanvasElement = document.createElement("canvas");
        this.context = canvas.getContext("2d");
        this.context.font = "20px 'Times New Roman'";
    }
    private context: CanvasRenderingContext2D;

    public computeTextWidthToHeightRatio(text: string, font: Fonts, style: FontStyles): number {
        let size: any = this.context.measureText(text);
        return size.width / 20;
    }
}
