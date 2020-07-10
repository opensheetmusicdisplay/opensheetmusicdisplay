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
    public TextLines: {text: string, xOffset: number, width: number}[];

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
     * Create also the text-lines and their offsets here
     */
    public setLabelPositionAndShapeBorders(): void {
        if (this.Label.text.trim() === "") {
            return;
        }
        this.TextLines = [];
        const labelMarginBorderFactor: number = this.rules?.LabelMarginBorderFactor ?? 0.1;
        const lines: string[] = this.Label.text.split(/[\n\r]+/g);
        const numOfLines: number = lines.length;
        let maxWidth: number = 0;
        for (let i: number = 0; i < numOfLines; i++) {
            const line: string = lines[i].trim();
            const widthToHeightRatio: number =
            MusicSheetCalculator.TextMeasurer.computeTextWidthToHeightRatio(
               line, this.Label.font, this.Label.fontStyle, this.label.fontFamily);
            const currWidth: number = this.Label.fontHeight * widthToHeightRatio;
            maxWidth = Math.max(maxWidth, currWidth);
            // here push only text and width of the text:
            this.TextLines.push({text: line, xOffset: 0, width: currWidth});
        }

        // maxWidth is calculated ->
        // now also set the x-offsets:
        for (const line of this.TextLines) {
            let xOffset: number = 0;
            switch (this.Label.textAlignment) {
                case TextAlignmentEnum.RightBottom:
                case TextAlignmentEnum.RightCenter:
                case TextAlignmentEnum.RightTop:
                    xOffset = maxWidth - line.width;
                    break;
                case TextAlignmentEnum.CenterBottom:
                case TextAlignmentEnum.CenterCenter:
                case TextAlignmentEnum.CenterTop:
                    xOffset = (maxWidth - line.width) / 2;
                    break;
                default:
                    break;
            }
            line.xOffset = xOffset;
        }

        const height: number = this.Label.fontHeight * numOfLines;
        const bbox: BoundingBox = this.PositionAndShape;

        switch (this.Label.textAlignment) {
            case TextAlignmentEnum.CenterBottom:
                bbox.BorderTop = -height;
                bbox.BorderLeft = -maxWidth / 2;
                bbox.BorderBottom = 0;
                bbox.BorderRight = maxWidth / 2;
                break;
            case TextAlignmentEnum.CenterCenter:
                bbox.BorderTop = -height / 2;
                bbox.BorderLeft = -maxWidth / 2;
                bbox.BorderBottom = height / 2;
                bbox.BorderRight = maxWidth / 2;
                break;
            case TextAlignmentEnum.CenterTop:
                bbox.BorderTop = 0;
                bbox.BorderLeft = -maxWidth / 2;
                bbox.BorderBottom = height;
                bbox.BorderRight = maxWidth / 2;
                break;
            case TextAlignmentEnum.LeftBottom:
                bbox.BorderTop = -height;
                bbox.BorderLeft = 0;
                bbox.BorderBottom = 0;
                bbox.BorderRight = maxWidth;
                break;
            case TextAlignmentEnum.LeftCenter:
                bbox.BorderTop = -height / 2;
                bbox.BorderLeft = 0;
                bbox.BorderBottom = height / 2;
                bbox.BorderRight = maxWidth;
                break;
            case TextAlignmentEnum.LeftTop:
                bbox.BorderTop = 0;
                bbox.BorderLeft = 0;
                bbox.BorderBottom = height;
                bbox.BorderRight = maxWidth;
                break;
            case TextAlignmentEnum.RightBottom:
                bbox.BorderTop = -height;
                bbox.BorderLeft = -maxWidth;
                bbox.BorderBottom = 0;
                bbox.BorderRight = 0;
                break;
            case TextAlignmentEnum.RightCenter:
                bbox.BorderTop = -height / 2;
                bbox.BorderLeft = -maxWidth;
                bbox.BorderBottom = height / 2;
                bbox.BorderRight = 0;
                break;
            case TextAlignmentEnum.RightTop:
                bbox.BorderTop = 0;
                bbox.BorderLeft = -maxWidth;
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
