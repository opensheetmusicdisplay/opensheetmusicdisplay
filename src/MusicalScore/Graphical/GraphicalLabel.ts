import {Label} from "../Label";
import {TextAlignment} from "../../Common/Enums/TextAlignment";
import {Clickable} from "./Clickable";
import {BoundingBox} from "./BoundingBox";
import {EngravingRules} from "./EngravingRules";
import {MusicSheetCalculator} from "./MusicSheetCalculator";

/**
 * The graphical counterpart of a Label
 */
export class GraphicalLabel extends Clickable {
    private label: Label;
    constructor(label: Label, textHeight: number, alignment: TextAlignment, parent: BoundingBox = undefined) {
        super();
        this.label = label;
        this.boundingBox = new BoundingBox(this, parent);
        this.label.fontHeight = textHeight;
        this.label.textAlignment = alignment;
    }

    public get Label(): Label {
        return this.label;
    }

    public toString(): string {
        return this.label.text;
    }

    /**
     * Calculate GraphicalLabel's Borders according to its Alignment
     */
    public setLabelPositionAndShapeBorders(): void {
        if (this.Label.text.trim() === "") {
            return;
        }
        let labelMarginBorderFactor: number = EngravingRules.Rules.LabelMarginBorderFactor;

        let widthToHeightRatio: number =
            MusicSheetCalculator.TextMeasurer.computeTextWidthToHeightRatio(this.Label.text, this.Label.font, this.Label.fontStyle);
        let height: number = this.Label.fontHeight;
        let width: number = height * widthToHeightRatio;
        let psi: BoundingBox = this.PositionAndShape;

        switch (this.Label.textAlignment) {
            case TextAlignment.CenterBottom:
                psi.BorderTop = -height;
                psi.BorderLeft = -width / 2;
                psi.BorderBottom = 0;
                psi.BorderRight = width / 2;
                break;
            case TextAlignment.CenterCenter:
                psi.BorderTop = -height / 2;
                psi.BorderLeft = -width / 2;
                psi.BorderBottom = height / 2;
                psi.BorderRight = width / 2;
                break;
            case TextAlignment.CenterTop:
                psi.BorderTop = 0;
                psi.BorderLeft = -width / 2;
                psi.BorderBottom = height;
                psi.BorderRight = width / 2;
                break;
            case TextAlignment.LeftBottom:
                psi.BorderTop = -height;
                psi.BorderLeft = 0;
                psi.BorderBottom = 0;
                psi.BorderRight = width;
                break;
            case TextAlignment.LeftCenter:
                psi.BorderTop = -height / 2;
                psi.BorderLeft = 0;
                psi.BorderBottom = height / 2;
                psi.BorderRight = width;
                break;
            case TextAlignment.LeftTop:
                psi.BorderTop = 0;
                psi.BorderLeft = 0;
                psi.BorderBottom = height;
                psi.BorderRight = width;
                break;
            case TextAlignment.RightBottom:
                psi.BorderTop = -height;
                psi.BorderLeft = -width;
                psi.BorderBottom = 0;
                psi.BorderRight = 0;
                break;
            case TextAlignment.RightCenter:
                psi.BorderTop = -height / 2;
                psi.BorderLeft = -width;
                psi.BorderBottom = height / 2;
                psi.BorderRight = 0;
                break;
            case TextAlignment.RightTop:
                psi.BorderTop = 0;
                psi.BorderLeft = -width;
                psi.BorderBottom = height;
                psi.BorderRight = 0;
                break;
            default:
        }
        psi.BorderMarginTop = psi.BorderTop - height * labelMarginBorderFactor;
        psi.BorderMarginLeft = psi.BorderLeft - height * labelMarginBorderFactor;
        psi.BorderMarginBottom = psi.BorderBottom + height * labelMarginBorderFactor;
        psi.BorderMarginRight = psi.BorderRight + height * labelMarginBorderFactor;
    }
}
