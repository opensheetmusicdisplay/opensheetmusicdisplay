import { TextAlignmentEnum } from "../../Common/Enums/TextAlignment";
import { Label, LabelTextLine, LabelTextRun } from "../Label";
import { BoundingBox } from "./BoundingBox";
import { Clickable } from "./Clickable";
import { EngravingRules } from "./EngravingRules";
import { MusicSheetCalculator } from "./MusicSheetCalculator";

type GraphicalLabelRun = LabelTextRun & { width: number };
type GraphicalLabelLine = {
    text: string;
    xOffset: number;
    width: number;
    runs?: GraphicalLabelRun[];
    top?: number;
    bottom?: number;
};

/**
 * The graphical counterpart of a Label
 */
export class GraphicalLabel extends Clickable {
    private label: Label;
    private rules: EngravingRules;
    public TextLines: GraphicalLabelLine[];
    /** Optional SVG text-anchor override for single-run labels whose visual centering
     *  should be delegated to the browser instead of OSMD's width estimate. */
    public SvgTextAnchor: "start" | "middle" | "end";
    /** A reference to the Node in the SVG, if SVGBackend, otherwise undefined.
     *  Allows manipulation without re-rendering, e.g. for dynamics, lyrics, etc.
     *  For the Canvas backend, this is unfortunately not possible.
     */
    public SVGNode: Node;
    /** Read-only informational variable only set once by lyrics centering algorithm. */
    public CenteringXShift: number = 0;
    public ColorXML: string;

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
     * Returns the right edge of the shaped runs intersecting a label-relative
     * vertical band. This lets composite notation tuck beneath a superscript
     * without ignoring baseline text that would actually collide with it.
     */
    public getRightProfileForVerticalBand(top: number, bottom: number): number {
        if (this.TextLines?.length !== 1 || !this.TextLines[0].runs?.length) {
            return this.PositionAndShape.BorderRight;
        }
        const line: GraphicalLabelLine = this.TextLines[0];
        const lineTop: number = line.top ?? -this.Label.fontHeight;
        const lineBottom: number = line.bottom ?? 0;
        let verticalAlignmentOffset: number = 0;
        switch (this.Label.textAlignment) {
            case TextAlignmentEnum.LeftCenter:
            case TextAlignmentEnum.CenterCenter:
            case TextAlignmentEnum.RightCenter:
                verticalAlignmentOffset = -(lineTop + lineBottom) / 2;
                break;
            case TextAlignmentEnum.LeftTop:
            case TextAlignmentEnum.CenterTop:
            case TextAlignmentEnum.RightTop:
                verticalAlignmentOffset = -lineTop;
                break;
            default:
                break;
        }

        let runLeft: number = this.PositionAndShape.BorderLeft + line.xOffset;
        let profileRight: number = Number.NEGATIVE_INFINITY;
        for (const run of line.runs) {
            const fontScale: number = run.fontScale ?? 1;
            const baselineShift: number = run.baselineShift ?? 0;
            const runBottom: number = verticalAlignmentOffset +
                (baselineShift + fontScale - 1) * this.Label.fontHeight;
            const runTop: number = runBottom - this.Label.fontHeight * fontScale;
            if (runTop < bottom && runBottom > top) {
                profileRight = Math.max(profileRight, runLeft + run.width);
            }
            runLeft += run.width;
        }
        return isFinite(profileRight) ? profileRight : this.PositionAndShape.BorderRight;
    }

    /**
     * Calculate GraphicalLabel's Borders according to its Alignment
     * Create also the text-lines and their offsets here
     */
    public setLabelPositionAndShapeBorders(): void {
        if (!this.hasRenderableText()) {
            return;
        }
        this.TextLines = [];
        const labelMarginBorderFactor: number = this.rules?.LabelMarginBorderFactor ?? 0.1;
        const sourceLines: LabelTextLine[] = this.Label.textLines?.length > 0
            ? this.Label.textLines
            : this.Label.text.split(/[\n\r]+/g).map((line: string) => ({
                runs: [{ text: line.trim(), fontFamily: this.label.fontFamily }],
            }));
        const numOfLines: number = sourceLines.length;
        let maxWidth: number = 0;
        for (const sourceLine of sourceLines) {
            const runs: GraphicalLabelRun[] = [];
            let lineText: string = "";
            let currWidth: number = 0;
            let lineTop: number = Number.POSITIVE_INFINITY;
            let lineBottom: number = Number.NEGATIVE_INFINITY;
            for (const sourceRun of sourceLine.runs || []) {
                if (!sourceRun?.text) {
                    continue;
                }
                const fontFamily: string = sourceRun.fontFamily || this.label.fontFamily;
                const fontScale: number = sourceRun.fontScale ?? 1;
                const baselineShift: number = sourceRun.baselineShift ?? 0;
                const widthToHeightRatio: number =
                MusicSheetCalculator.TextMeasurer.computeTextWidthToHeightRatio(
                   sourceRun.text, this.Label.font, this.Label.fontStyle, fontFamily);
                const runWidth: number = this.Label.fontHeight * widthToHeightRatio * fontScale;
                lineText += sourceRun.text;
                currWidth += runWidth;
                // renderText positions each scaled run from the label's common
                // top edge. Its baseline therefore moves by both the explicit
                // baseline shift and the reduction in font height. Keeping the
                // same calculation here makes mixed-run bounds (especially
                // chord superscripts) match the SVG that is actually drawn.
                const runBottom: number =
                    (baselineShift + fontScale - 1) * this.Label.fontHeight;
                const runTop: number = runBottom - this.Label.fontHeight * fontScale;
                lineTop = Math.min(lineTop, runTop);
                lineBottom = Math.max(lineBottom, runBottom);
                runs.push({ ...sourceRun, fontFamily, width: runWidth });
            }
            if (!isFinite(lineTop) || !isFinite(lineBottom)) {
                lineTop = -this.Label.fontHeight;
                lineBottom = 0;
            }
            maxWidth = Math.max(maxWidth, currWidth);
            this.TextLines.push({ text: lineText, xOffset: 0, width: currWidth, runs, top: lineTop, bottom: lineBottom });
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

        let height: number = this.Label.fontHeight * numOfLines;
        if (this.rules.SpacingBetweenTextLines > 0 && this.TextLines.length > 1) {
            height += (this.rules.SpacingBetweenTextLines * numOfLines) / 10;
        }
        const bbox: BoundingBox = this.PositionAndShape;
        const singleLineTop: number = this.TextLines.length === 1 ? (this.TextLines[0].top ?? -this.Label.fontHeight) : -height;
        const singleLineBottom: number = this.TextLines.length === 1 ? (this.TextLines[0].bottom ?? 0) : 0;
        const singleLineHeight: number = this.TextLines.length === 1 ? (singleLineBottom - singleLineTop) : height;

        switch (this.Label.textAlignment) {
            case TextAlignmentEnum.CenterBottom:
                bbox.BorderTop = singleLineTop;
                bbox.BorderLeft = -maxWidth / 2;
                bbox.BorderBottom = singleLineBottom;
                bbox.BorderRight = maxWidth / 2;
                break;
            case TextAlignmentEnum.CenterCenter:
                bbox.BorderTop = -singleLineHeight / 2;
                bbox.BorderLeft = -maxWidth / 2;
                bbox.BorderBottom = singleLineHeight / 2;
                bbox.BorderRight = maxWidth / 2;
                break;
            case TextAlignmentEnum.CenterTop:
                bbox.BorderTop = 0;
                bbox.BorderLeft = -maxWidth / 2;
                bbox.BorderBottom = singleLineHeight;
                bbox.BorderRight = maxWidth / 2;
                break;
            case TextAlignmentEnum.LeftBottom:
                bbox.BorderTop = singleLineTop;
                bbox.BorderLeft = 0;
                bbox.BorderBottom = singleLineBottom;
                bbox.BorderRight = maxWidth;
                break;
            case TextAlignmentEnum.LeftCenter:
                bbox.BorderTop = -singleLineHeight / 2;
                bbox.BorderLeft = 0;
                bbox.BorderBottom = singleLineHeight / 2;
                bbox.BorderRight = maxWidth;
                break;
            case TextAlignmentEnum.LeftTop:
                bbox.BorderTop = 0;
                bbox.BorderLeft = 0;
                bbox.BorderBottom = singleLineHeight;
                bbox.BorderRight = maxWidth;
                break;
            case TextAlignmentEnum.RightBottom:
                bbox.BorderTop = singleLineTop;
                bbox.BorderLeft = -maxWidth;
                bbox.BorderBottom = singleLineBottom;
                bbox.BorderRight = 0;
                break;
            case TextAlignmentEnum.RightCenter:
                bbox.BorderTop = -singleLineHeight / 2;
                bbox.BorderLeft = -maxWidth;
                bbox.BorderBottom = singleLineHeight / 2;
                bbox.BorderRight = 0;
                break;
            case TextAlignmentEnum.RightTop:
                bbox.BorderTop = 0;
                bbox.BorderLeft = -maxWidth;
                bbox.BorderBottom = singleLineHeight;
                bbox.BorderRight = 0;
                break;
            default:
        }
        bbox.BorderMarginTop = bbox.BorderTop - singleLineHeight * labelMarginBorderFactor;
        bbox.BorderMarginLeft = bbox.BorderLeft - singleLineHeight * labelMarginBorderFactor;
        bbox.BorderMarginBottom = bbox.BorderBottom + singleLineHeight * labelMarginBorderFactor;
        bbox.BorderMarginRight = bbox.BorderRight + singleLineHeight * labelMarginBorderFactor;
    }

    private hasRenderableText(): boolean {
        if (this.Label.text.trim() !== "") {
            return true;
        }
        return this.Label.textLines?.some((line: LabelTextLine) =>
            line.runs?.some((run: LabelTextRun) => run.text.trim() !== ""),
        ) ?? false;
    }
}
