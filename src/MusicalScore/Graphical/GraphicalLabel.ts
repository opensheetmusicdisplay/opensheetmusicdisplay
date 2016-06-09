import {Label} from "../Label";
import {TextAlignment} from "../../Common/Enums/TextAlignment";
module PhonicScore.MusicalScore.Graphical.Primitives {
    export class GraphicalLabel extends Clickable {
        private label: Label;
        constructor(label: Label, textHeight: number, alignment: TextAlignment) {
            this.label = label;
            this.boundingBox = new BoundingBox(this);
            this.label.FontHeight = textHeight;
            this.label.TextAlignment = alignment;
        }
        constructor(label: Label, textHeight: number, alignment: TextAlignment, parent: BoundingBox) {
            this.label = label;
            this.boundingBox = new BoundingBox(parent, this);
            this.label.FontHeight = textHeight;
            this.label.TextAlignment = alignment;
        }
        public get Label(): Label {
            return this.label;
        }
        public setLabelPositionAndShapeBorders(): void {
            if (this.Label.Text.Trim().Equals(String.Empty))
                return
            var labelMarginBorderFactor: number = EngravingRules.Rules.LabelMarginBorderFactor;
            
            var widthToHeightRatio: number = MusicSheetCalculator.TextMeasurer.computeTextWidthToHeightRatio(this.Label.Text, this.Label.Font, this.Label.FontStyle);
            var height: number = this.Label.FontHeight;
            var width: number = height * widthToHeightRatio;
            var psi: BoundingBox = PositionAndShape;
            switch (this.Label.TextAlignment) {
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
            }
            psi.BorderMarginTop = psi.BorderTop - height * labelMarginBorderFactor;
            psi.BorderMarginLeft = psi.BorderLeft - height * labelMarginBorderFactor;
            psi.BorderMarginBottom = psi.BorderBottom + height * labelMarginBorderFactor;
            psi.BorderMarginRight = psi.BorderRight + height * labelMarginBorderFactor;
        }
    }
}