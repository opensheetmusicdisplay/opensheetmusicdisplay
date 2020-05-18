import { TextAlignmentEnum } from "../../Common/Enums/TextAlignment";
import { Label } from "../Label";
import { BoundingBox } from "./BoundingBox";
import { Clickable } from "./Clickable";
import { EngravingRules } from "./EngravingRules";
import { MusicSheetCalculator } from "./MusicSheetCalculator";

/**
 * The graphical counterpart of a Label
 */
export class GraphicalLabel extends Clickable {
    private label: Label;
    private rules: EngravingRules;

    /**
     * Creates a new GraphicalLabel from a Label
     * @param label  label object containing text
     * @param textHeight Height of text
     * @param alignment Alignement like left, right, top, ...
     * @param parent Parent Bounding Box where the label is attached to
     */
    constructor(label: Label, textHeight: number, alignment: TextAlignmentEnum, rules: EngravingRules,
                parent: BoundingBox = undefined, ) {
        super();
        this.label = label;
        this.boundingBox = new BoundingBox(this, parent);
        this.label.fontHeight = textHeight;
        this.label.textAlignment = alignment;
        this.rules = rules;
    }

    public get Label(): Label {
        return this.label;
    }

    public toString(): string {
        return `${this.label.text} (${this.boundingBox.RelativePosition.x},${this.boundingBox.RelativePosition.y})`;
    }

    /**
     * Calculate GraphicalLabel's Borders according to its Alignment
     */
    public setLabelPositionAndShapeBorders(): void {
        if (this.Label.text.trim() === "") {
            return;
        }
        const labelMarginBorderFactor: number = this.rules?.LabelMarginBorderFactor ?? 0.1;

        const widthToHeightRatio: number =
            MusicSheetCalculator.TextMeasurer.computeTextWidthToHeightRatio(
                this.Label.text, this.Label.font, this.Label.fontStyle, this.label.fontFamily);
        const height: number = this.Label.fontHeight;
        const width: number = height * widthToHeightRatio;
        const bbox: BoundingBox = this.PositionAndShape;

        switch (this.Label.textAlignment) {
            case TextAlignmentEnum.CenterBottom:
                bbox.BorderTop = -height;
                bbox.BorderLeft = -width / 2;
                bbox.BorderBottom = 0;
                bbox.BorderRight = width / 2;
                break;
            case TextAlignmentEnum.CenterCenter:
                bbox.BorderTop = -height / 2;
                bbox.BorderLeft = -width / 2;
                bbox.BorderBottom = height / 2;
                bbox.BorderRight = width / 2;
                break;
            case TextAlignmentEnum.CenterTop:
                bbox.BorderTop = 0;
                bbox.BorderLeft = -width / 2;
                bbox.BorderBottom = height;
                bbox.BorderRight = width / 2;
                break;
            case TextAlignmentEnum.LeftBottom:
                bbox.BorderTop = -height;
                bbox.BorderLeft = 0;
                bbox.BorderBottom = 0;
                bbox.BorderRight = width;
                break;
            case TextAlignmentEnum.LeftCenter:
                bbox.BorderTop = -height / 2;
                bbox.BorderLeft = 0;
                bbox.BorderBottom = height / 2;
                bbox.BorderRight = width;
                break;
            case TextAlignmentEnum.LeftTop:
                bbox.BorderTop = 0;
                bbox.BorderLeft = 0;
                bbox.BorderBottom = height;
                bbox.BorderRight = width;
                break;
            case TextAlignmentEnum.RightBottom:
                bbox.BorderTop = -height;
                bbox.BorderLeft = -width;
                bbox.BorderBottom = 0;
                bbox.BorderRight = 0;
                break;
            case TextAlignmentEnum.RightCenter:
                bbox.BorderTop = -height / 2;
                bbox.BorderLeft = -width;
                bbox.BorderBottom = height / 2;
                bbox.BorderRight = 0;
                break;
            case TextAlignmentEnum.RightTop:
                bbox.BorderTop = 0;
                bbox.BorderLeft = -width;
                bbox.BorderBottom = height;
                bbox.BorderRight = 0;
                break;
            default:
        }
        bbox.BorderMarginTop = bbox.BorderTop - height * labelMarginBorderFactor;
        bbox.BorderMarginLeft = bbox.BorderLeft - height * labelMarginBorderFactor;
        bbox.BorderMarginBottom = bbox.BorderBottom + height * labelMarginBorderFactor;
        bbox.BorderMarginRight = bbox.BorderRight + height * labelMarginBorderFactor;
    }
}
