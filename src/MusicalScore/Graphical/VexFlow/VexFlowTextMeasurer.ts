import {ITextMeasurer} from "../../Interfaces/ITextMeasurer";
import {Fonts} from "../../../Common/Enums/Fonts";
import {FontStyles} from "../../../Common/Enums/FontStyles";
/**
 * Created by Matthias on 21.06.2016.
 */

export class VexFlowTextMeasurer implements ITextMeasurer {
    public computeTextWidthToHeightRatio(text: string, font: Fonts, style: FontStyles): number {
        return text.length / 2;
    }
}
