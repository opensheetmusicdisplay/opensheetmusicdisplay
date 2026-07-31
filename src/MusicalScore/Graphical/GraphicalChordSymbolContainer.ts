import {Label} from "../Label";
import {GraphicalLabel} from "./GraphicalLabel";
import {
    ChordSymbolContainer,
    HarmonyArrangement,
    HarmonyBassArrangement,
    HarmonyChordComponent,
} from "../VoiceData/ChordSymbolContainer";
import {BoundingBox} from "./BoundingBox";
import {GraphicalObject} from "./GraphicalObject";
import {PointF2D} from "../../Common/DataObjects/PointF2D";
import {EngravingRules} from "./EngravingRules";
import {KeyInstruction} from "../VoiceData/Instructions/KeyInstruction";
import {PlacementEnum} from "../VoiceData/Expressions";
import {TextAlignmentEnum} from "../../Common/Enums/TextAlignment";
import {buildDoricoChordSymbolTextLines, getDoricoDefaultTextFontFamily} from "./DoricoTextFontRouting";
import {GraphicalLine} from "./GraphicalLine";

export class GraphicalChordSymbolContainer extends GraphicalObject {
    private chordSymbolContainer: ChordSymbolContainer;
    private graphicalLabels: GraphicalLabel[] = [];
    private graphicalSeparators: GraphicalHarmonySeparator[] = [];
    private rules: EngravingRules;
    private textHeight: number;
    private keyInstruction: KeyInstruction;
    private transposeHalftones: number;
    private abbreviateUpperChord: boolean = false;
    private upperHarmonySignature: string;
    private bassSignature: string;

    constructor(chordSymbolContainer: ChordSymbolContainer, parent: BoundingBox, textHeight: number,
                keyInstruction: KeyInstruction, transposeHalftones: number, rules: EngravingRules) {
        super();
        this.chordSymbolContainer = chordSymbolContainer;
        this.boundingBox = new BoundingBox(this, parent);
        this.rules = rules;
        this.textHeight = textHeight;
        this.keyInstruction = keyInstruction;
        this.transposeHalftones = transposeHalftones;
        this.upperHarmonySignature = chordSymbolContainer.Components
            .map((component: HarmonyChordComponent): string =>
                chordSymbolContainer.calculateUpperHarmonyText(component, transposeHalftones, keyInstruction),
            )
            .join("|");
        this.bassSignature = chordSymbolContainer.Components
            .map((component: HarmonyChordComponent): string =>
                chordSymbolContainer.calculateBassText(component, transposeHalftones, keyInstruction),
            )
            .join("|");
        this.calculateLabels();
    }

    public get GetChordSymbolContainer(): ChordSymbolContainer {
        return this.chordSymbolContainer;
    }

    public get GraphicalLabel(): GraphicalLabel {
        return this.graphicalLabels[0];
    }

    public get GraphicalLabels(): GraphicalLabel[] {
        return this.graphicalLabels;
    }

    public get GraphicalSeparators(): GraphicalHarmonySeparator[] {
        return this.graphicalSeparators;
    }

    public get UpperHarmonySignature(): string {
        return this.upperHarmonySignature;
    }

    public get BassSignature(): string {
        return this.bassSignature;
    }

    public get HasAlteredBass(): boolean {
        return this.chordSymbolContainer.Components.some((component: HarmonyChordComponent): boolean =>
            Boolean(component.BassPitch),
        );
    }

    public get IsUpperChordAbbreviated(): boolean {
        return this.abbreviateUpperChord;
    }

    public abbreviateRepeatedUpperChord(): void {
        if (
            this.abbreviateUpperChord ||
            !this.HasAlteredBass ||
            this.chordSymbolContainer.Components[0]?.BassArrangement === HarmonyBassArrangement.Horizontal
        ) {
            return;
        }
        this.abbreviateUpperChord = true;
        this.calculateLabels();
    }

    private calculateLabels(): void {
        this.PositionAndShape.ChildElements = [];
        this.graphicalLabels = [];
        this.graphicalSeparators = [];
        const components: HarmonyChordComponent[] = this.chordSymbolContainer.Components;
        if (components.length > 1) {
            switch (this.chordSymbolContainer.Arrangement) {
                case HarmonyArrangement.Horizontal:
                    this.layoutHorizontalComponents(components);
                    break;
                case HarmonyArrangement.Diagonal:
                    this.layoutDiagonalComponents(components);
                    break;
                case HarmonyArrangement.Vertical:
                default:
                    this.layoutVerticalComponents(components);
                    break;
            }
        } else if (components[0]?.BassPitch) {
            this.layoutSlashChord(components[0]);
        } else {
            this.layoutSimpleChord(components[0]);
        }
        this.PositionAndShape.calculateBoundingBox();
    }

    private layoutSimpleChord(component: HarmonyChordComponent): void {
        const text: string = this.chordSymbolContainer.calculateComponentText(
            component, this.transposeHalftones, this.keyInstruction,
        );
        const placement: PlacementEnum = this.GetChordSymbolContainer.Placement;
        const alignment: TextAlignmentEnum = placement === PlacementEnum.Above
            ? this.rules.ChordSymbolTextAlignmentTop
            : this.rules.ChordSymbolTextAlignmentBottom;
        this.createLabel(text, alignment, this.rules.ChordSymbolRelativeXOffset, 0);
    }

    private layoutHorizontalComponents(components: HarmonyChordComponent[]): void {
        const text: string = components.map((component: HarmonyChordComponent): string =>
            this.chordSymbolContainer.calculateComponentText(
                component, this.transposeHalftones, this.keyInstruction,
            ),
        ).join(" / ");
        this.createLabel(text, TextAlignmentEnum.LeftBottom, this.rules.ChordSymbolRelativeXOffset, 0);
    }

    private layoutVerticalComponents(components: HarmonyChordComponent[]): void {
        const labels: GraphicalLabel[] = components.map((component: HarmonyChordComponent): GraphicalLabel =>
            this.createLabel(
                this.chordSymbolContainer.calculateComponentText(
                    component, this.transposeHalftones, this.keyInstruction,
                ),
                TextAlignmentEnum.LeftBottom,
                0,
                0,
            ),
        );
        const width: number = Math.max(...labels.map((label: GraphicalLabel): number =>
            label.PositionAndShape.Size.width,
        ));
        const lineGap: number = this.textHeight * 0.28;
        labels.forEach((label: GraphicalLabel, index: number): void => {
            label.PositionAndShape.RelativePosition.x =
                this.rules.ChordSymbolRelativeXOffset + (width - label.PositionAndShape.Size.width) / 2;
            label.PositionAndShape.RelativePosition.y =
                index * (this.textHeight + lineGap) - (components.length - 1) * (this.textHeight + lineGap) / 2;
        });
        for (let index: number = 0; index < labels.length - 1; index++) {
            const y: number = (labels[index].PositionAndShape.RelativePosition.y +
                labels[index + 1].PositionAndShape.RelativePosition.y) / 2 - this.textHeight * 0.18;
            this.createSeparator(
                new PointF2D(this.rules.ChordSymbolRelativeXOffset, y),
                new PointF2D(this.rules.ChordSymbolRelativeXOffset + width, y),
            );
        }
    }

    private layoutDiagonalComponents(components: HarmonyChordComponent[]): void {
        let previousLabel: GraphicalLabel;
        for (let index: number = 0; index < components.length; index++) {
            const label: GraphicalLabel = this.createLabel(
                this.chordSymbolContainer.calculateComponentText(
                    components[index], this.transposeHalftones, this.keyInstruction,
                ),
                TextAlignmentEnum.LeftBottom,
                index === 0 ? this.rules.ChordSymbolRelativeXOffset : 0,
                -this.textHeight * 0.15 + index * this.textHeight * 1.1,
            );
            if (previousLabel) {
                this.positionDiagonalLowerLabel(previousLabel, label);
            }
            previousLabel = label;
        }
    }

    private layoutSlashChord(component: HarmonyChordComponent): void {
        if (component.BassArrangement === HarmonyBassArrangement.Horizontal) {
            const text: string =
                this.chordSymbolContainer.calculateUpperHarmonyText(
                    component, this.transposeHalftones, this.keyInstruction,
                ) +
                (component.BassSeparator?.text ?? "/") +
                this.chordSymbolContainer.calculateBassText(
                    component, this.transposeHalftones, this.keyInstruction,
                );
            this.createLabel(
                text,
                TextAlignmentEnum.LeftBottom,
                this.rules.ChordSymbolRelativeXOffset,
                0,
            );
            return;
        }
        const upperText: string = this.chordSymbolContainer.calculateUpperHarmonyText(
            component, this.transposeHalftones, this.keyInstruction,
        );
        const upperLabel: GraphicalLabel = this.createLabel(
            upperText,
            TextAlignmentEnum.LeftBottom,
            this.rules.ChordSymbolRelativeXOffset,
            -this.textHeight * 0.15,
            !this.abbreviateUpperChord,
        );
        const bassLabel: GraphicalLabel = this.createLabel(
            this.chordSymbolContainer.calculateBassText(component, this.transposeHalftones, this.keyInstruction),
            TextAlignmentEnum.LeftBottom,
            0,
            this.textHeight * 0.95,
        );
        if (component.BassArrangement === HarmonyBassArrangement.Vertical) {
            this.positionVerticalBassLabel(upperLabel, bassLabel, component);
            return;
        }
        this.positionDiagonalLowerLabel(upperLabel, bassLabel, component.BassSeparator?.text);
    }

    private positionVerticalBassLabel(upperLabel: GraphicalLabel, bassLabel: GraphicalLabel,
                                      component: HarmonyChordComponent): void {
        const width: number = Math.max(
            upperLabel.PositionAndShape.Size.width,
            bassLabel.PositionAndShape.Size.width,
        );
        upperLabel.PositionAndShape.RelativePosition.x =
            this.rules.ChordSymbolRelativeXOffset + (width - upperLabel.PositionAndShape.Size.width) / 2;
        upperLabel.PositionAndShape.RelativePosition.y = -this.textHeight * 0.25;
        bassLabel.PositionAndShape.RelativePosition.x =
            this.rules.ChordSymbolRelativeXOffset + (width - bassLabel.PositionAndShape.Size.width) / 2;
        bassLabel.PositionAndShape.RelativePosition.y = this.textHeight * 1.05;
        if (component.BassSeparator?.text) {
            this.createLabel(
                component.BassSeparator.text,
                TextAlignmentEnum.CenterCenter,
                this.rules.ChordSymbolRelativeXOffset + width / 2,
                this.textHeight * 0.28,
            );
        } else {
            this.createSeparator(
                new PointF2D(this.rules.ChordSymbolRelativeXOffset, this.textHeight * 0.22),
                new PointF2D(this.rules.ChordSymbolRelativeXOffset + width, this.textHeight * 0.22),
            );
        }
    }

    private positionDiagonalLowerLabel(upperLabel: GraphicalLabel, lowerLabel: GraphicalLabel,
                                       explicitSeparator?: string): void {
        const lineLength: number = this.textHeight * 0.62;
        const start: PointF2D = new PointF2D(
            upperLabel.PositionAndShape.RelativePosition.x +
                upperLabel.PositionAndShape.Size.width + this.textHeight * 0.12,
            upperLabel.PositionAndShape.RelativePosition.y + this.textHeight * 0.07,
        );
        const end: PointF2D = new PointF2D(start.x + lineLength, start.y + lineLength);
        let lowerLabelX: number = end.x;
        if (explicitSeparator) {
            const separatorLabel: GraphicalLabel = this.createLabel(
                explicitSeparator,
                TextAlignmentEnum.LeftCenter,
                start.x,
                (start.y + end.y) / 2,
            );
            lowerLabelX = Math.max(
                lowerLabelX,
                separatorLabel.PositionAndShape.RelativePosition.x +
                    separatorLabel.PositionAndShape.Size.width,
            );
        } else {
            this.createSeparator(start, end);
        }
        lowerLabel.PositionAndShape.RelativePosition.x = lowerLabelX + this.textHeight * 0.12;
    }

    private createLabel(text: string, alignment: TextAlignmentEnum, x: number, y: number,
                        render: boolean = true): GraphicalLabel {
        const label: Label = new Label(text);
        label.fontFamily = getDoricoDefaultTextFontFamily(this.rules);
        label.textLines = buildDoricoChordSymbolTextLines(text, this.rules);
        label.print = render;
        const graphicalLabel: GraphicalLabel = new GraphicalLabel(
            label,
            this.textHeight,
            alignment,
            this.rules,
            this.boundingBox,
        );
        graphicalLabel.PositionAndShape.RelativePosition = new PointF2D(x, y);
        graphicalLabel.Label.colorDefault = this.rules.DefaultColorChordSymbol;
        graphicalLabel.setLabelPositionAndShapeBorders();
        if (!render) {
            // Retain the upper-left cell in aggregate geometry while omitting only its glyphs.
            label.print = false;
        }
        this.graphicalLabels.push(graphicalLabel);
        return graphicalLabel;
    }

    private createSeparator(start: PointF2D, end: PointF2D): void {
        this.graphicalSeparators.push(new GraphicalHarmonySeparator(
            new GraphicalLine(start, end, 0.12),
            this.PositionAndShape,
        ));
    }
}

export class GraphicalHarmonySeparator extends GraphicalObject {
    public Line: GraphicalLine;

    constructor(line: GraphicalLine, parent: BoundingBox) {
        super();
        this.Line = line;
        this.boundingBox = new BoundingBox(this, parent, true);
        const margin: number = line.Width / 2;
        this.boundingBox.BorderLeft = Math.min(line.Start.x, line.End.x);
        this.boundingBox.BorderRight = Math.max(line.Start.x, line.End.x);
        this.boundingBox.BorderTop = Math.min(line.Start.y, line.End.y);
        this.boundingBox.BorderBottom = Math.max(line.Start.y, line.End.y);
        this.boundingBox.BorderMarginLeft = this.boundingBox.BorderLeft - margin;
        this.boundingBox.BorderMarginRight = this.boundingBox.BorderRight + margin;
        this.boundingBox.BorderMarginTop = this.boundingBox.BorderTop - margin;
        this.boundingBox.BorderMarginBottom = this.boundingBox.BorderBottom + margin;
    }
}
