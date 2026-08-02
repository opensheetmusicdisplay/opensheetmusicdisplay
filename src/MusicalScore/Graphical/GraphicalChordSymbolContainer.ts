import {Label} from "../Label";
import {GraphicalLabel} from "./GraphicalLabel";
import {
    ChordSymbolContainer,
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
import {
    SMUFL_CHORD_DIAGONAL_ARRANGEMENT_SLASH_GLYPH,
} from "../../Common/DataObjects/ChordSymbolGlyphs";

export class GraphicalChordSymbolContainer extends GraphicalObject {
    /** Calibrated optical clearances around a polychord fraction rule. These
     * are measured from complete shaped run bounds, including raised suffixes. */
    private static readonly POLYCHORD_RULE_UPPER_CLEARANCE_FACTOR: number = 0.22;
    private static readonly POLYCHORD_RULE_LOWER_CLEARANCE_FACTOR: number = 0.4;
    /** Slash chords occupy the top-left, centre, and bottom-right cells of a
     * conceptual square 3x3 grid. A single separation controls both axes so
     * every chord/slash and slash/bass corner has identical geometry. */
    private static readonly SLASH_CHORD_GRID_CELL_SEPARATION_FACTOR: number = 0.025;
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
            !this.HasAlteredBass
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
            // Preserve the source arrangement on ChordSymbolContainer, but use one
            // unambiguous presentation for a genuine polychord: a centred fraction.
            // Diagonal construction is reserved for an altered bass below one chord.
            this.layoutVerticalComponents(components);
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
        // GraphicalLabel's font box has more unused space below an upper run
        // than above a lower superscript run. Different geometric clearances
        // compensate for that so the visible ink-to-rule gaps are balanced.
        const upperRuleClearance: number =
            this.textHeight * GraphicalChordSymbolContainer.POLYCHORD_RULE_UPPER_CLEARANCE_FACTOR;
        const lowerRuleClearance: number =
            this.textHeight * GraphicalChordSymbolContainer.POLYCHORD_RULE_LOWER_CLEARANCE_FACTOR;
        const ruleOverhang: number = this.textHeight * 0.08;
        const arrangementLeft: number = -width / 2;
        const separatorYs: number[] = [];
        labels.forEach((label: GraphicalLabel, index: number): void => {
            label.PositionAndShape.RelativePosition.x =
                arrangementLeft + (width - label.PositionAndShape.Size.width) / 2;
            if (index === 0) {
                // Keep the upper component on the normal chord-symbol baseline.
                label.PositionAndShape.RelativePosition.y = 0;
                return;
            }
            const previousLabel: GraphicalLabel = labels[index - 1];
            const previousBottom: number = previousLabel.PositionAndShape.RelativePosition.y +
                previousLabel.PositionAndShape.BorderBottom;
            // BorderTop includes the top of every raised run (7, 9, 13, etc.).
            // Place the rule between two explicit optical clearances so it can
            // never pass through a lower component's superscript alteration.
            const separatorY: number = previousBottom + upperRuleClearance;
            label.PositionAndShape.RelativePosition.y = separatorY + lowerRuleClearance -
                label.PositionAndShape.BorderTop;
            separatorYs.push(separatorY);
        });
        for (let index: number = 0; index < labels.length - 1; index++) {
            this.createSeparator(
                new PointF2D(arrangementLeft - ruleOverhang, separatorYs[index]),
                new PointF2D(
                    arrangementLeft + width + ruleOverhang,
                    separatorYs[index],
                ),
            );
        }
    }

    private layoutSlashChord(component: HarmonyChordComponent): void {
        if (this.abbreviateUpperChord) {
            this.layoutAbbreviatedSlashChord(component);
            return;
        }
        const upperText: string = this.chordSymbolContainer.calculateUpperHarmonyText(
            component, this.transposeHalftones, this.keyInstruction,
        );
        const upperLabel: GraphicalLabel = this.createLabel(
            upperText,
            TextAlignmentEnum.RightBottom,
            0,
            0,
        );
        const bassLabel: GraphicalLabel = this.createLabel(
            this.chordSymbolContainer.calculateBassText(component, this.transposeHalftones, this.keyInstruction),
            TextAlignmentEnum.LeftTop,
            0,
            0,
        );
        this.positionSlashChordGrid(
            upperLabel,
            bassLabel,
            component.BassSeparator?.text,
            SMUFL_CHORD_DIAGONAL_ARRANGEMENT_SLASH_GLYPH,
        );
    }

    private layoutAbbreviatedSlashChord(component: HarmonyChordComponent): void {
        const cellSeparation: number = this.slashChordCellSeparation();
        const separatorLabel: GraphicalLabel = this.createLabel(
            component.BassSeparator?.text ?? SMUFL_CHORD_DIAGONAL_ARRANGEMENT_SLASH_GLYPH,
            TextAlignmentEnum.CenterCenter,
            0,
            cellSeparation,
        );
        const bassLabel: GraphicalLabel = this.createLabel(
            this.chordSymbolContainer.calculateBassText(component, this.transposeHalftones, this.keyInstruction),
            TextAlignmentEnum.LeftTop,
            cellSeparation,
            cellSeparation * 2,
        );
        this.centerLabelsOnRhythmicAnchor([separatorLabel, bassLabel]);
    }

    private positionSlashChordGrid(
        upperLabel: GraphicalLabel,
        lowerLabel: GraphicalLabel,
        explicitSeparator?: string,
        slashGlyph: string = SMUFL_CHORD_DIAGONAL_ARRANGEMENT_SLASH_GLYPH,
    ): void {
        const separatorX: number = 0;
        const cellSeparation: number = this.slashChordCellSeparation();
        const separatorLabel: GraphicalLabel = this.createLabel(
            explicitSeparator ?? slashGlyph,
            TextAlignmentEnum.CenterCenter,
            separatorX,
            cellSeparation,
        );
        upperLabel.PositionAndShape.RelativePosition.y = 0;
        const separatorTopRelativeToUpper: number = separatorLabel.PositionAndShape.RelativePosition.y +
            separatorLabel.PositionAndShape.BorderTop - upperLabel.PositionAndShape.RelativePosition.y;
        const separatorBottomRelativeToUpper: number = separatorLabel.PositionAndShape.RelativePosition.y +
            separatorLabel.PositionAndShape.BorderBottom - upperLabel.PositionAndShape.RelativePosition.y;
        const upperProfileRight: number = upperLabel.getRightProfileForVerticalBand(
            separatorTopRelativeToUpper,
            separatorBottomRelativeToUpper,
        );
        upperLabel.PositionAndShape.RelativePosition.x = separatorX - cellSeparation - upperProfileRight;
        lowerLabel.PositionAndShape.RelativePosition.x = separatorX + cellSeparation;
        lowerLabel.PositionAndShape.RelativePosition.y = cellSeparation * 2;
        this.centerLabelsOnRhythmicAnchor([upperLabel, separatorLabel, lowerLabel]);
    }

    private slashChordCellSeparation(): number {
        return this.textHeight * GraphicalChordSymbolContainer.SLASH_CHORD_GRID_CELL_SEPARATION_FACTOR;
    }

    private centerLabelsOnRhythmicAnchor(labels: GraphicalLabel[]): void {
        const visibleLeft: number = Math.min(...labels.map((label: GraphicalLabel): number =>
            label.PositionAndShape.RelativePosition.x + label.PositionAndShape.BorderLeft,
        ));
        const visibleRight: number = Math.max(...labels.map((label: GraphicalLabel): number =>
            label.PositionAndShape.RelativePosition.x + label.PositionAndShape.BorderRight,
        ));
        const shift: number = -(visibleLeft + visibleRight) / 2;
        for (const label of labels) {
            label.PositionAndShape.RelativePosition.x += shift;
        }
    }

    private createLabel(text: string, alignment: TextAlignmentEnum, x: number, y: number): GraphicalLabel {
        const label: Label = new Label(text);
        label.fontFamily = getDoricoDefaultTextFontFamily(this.rules);
        label.textLines = buildDoricoChordSymbolTextLines(text, this.rules);
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
