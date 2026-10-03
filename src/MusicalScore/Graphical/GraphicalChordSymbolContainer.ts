import {Label} from "../Label";
import {GraphicalLabel} from "./GraphicalLabel";
import {ChordSymbolContainer} from "../VoiceData/ChordSymbolContainer";
import {BoundingBox} from "./BoundingBox";
import {GraphicalObject} from "./GraphicalObject";
import {PointF2D} from "../../Common/DataObjects/PointF2D";
import {EngravingRules} from "./EngravingRules";
import { KeyInstruction } from "../VoiceData/Instructions/KeyInstruction";
import { PlacementEnum } from "../VoiceData/Expressions";
import { TextAlignmentEnum } from "../../Common/Enums/TextAlignment";

export class GraphicalChordSymbolContainer extends GraphicalObject {
    private chordSymbolContainer: ChordSymbolContainer;
    private graphicalLabel: GraphicalLabel;
    private rules: EngravingRules;
    /** The parent bounding box before the first layout calculation, see resetPosition(). */
    private initialParent: BoundingBox;
    /** The relative position before the first layout calculation, see resetPosition(). */
    private initialRelativePosition: PointF2D;
    /** The relative position of the label before the first layout calculation, see resetPosition(). */
    private initialLabelRelativePosition: PointF2D;

    constructor(chordSymbolContainer: ChordSymbolContainer, parent: BoundingBox, textHeight: number,
                keyInstruction: KeyInstruction, transposeHalftones: number, rules: EngravingRules) {
        super();
        this.chordSymbolContainer = chordSymbolContainer;
        this.boundingBox = new BoundingBox(this, parent);
        this.rules = rules;
        this.calculateLabel(textHeight, transposeHalftones, keyInstruction);
    }
    public get GetChordSymbolContainer(): ChordSymbolContainer {
        return this.chordSymbolContainer;
    }
    public get GraphicalLabel(): GraphicalLabel {
        return this.graphicalLabel;
    }

    /**
     * Puts the chord symbol back where it was before the first layout calculation, called before each calculation.
     * MusicSheetCalculator.calculateChordSymbols() moves the chord symbol and its label, and moves a chord symbol that isn't
     * over a note from its staff entry to its measure (parent), but the layout reads them before that, e.g. for the
     * measure width needed for the chord symbols, for their x positions (MusicSheetCalculator.calculateChordSymbolsXPositions(),
     * e.g. after the begin instructions of the measure), and for the bounding boxes, whose top and bottom borders only grow
     * (BoundingBox.calculateTopBottomBorders()).
     * Without the reset, a re-render would read the previous render's positions, parent and borders there, where the first
     * render read the initial ones, and place the chord symbols (or e.g. the composer above them) differently.
     * The first call takes the snapshot of the initial positions and parent.
     */
    public resetPosition(): void {
        const boundingBox: BoundingBox = this.PositionAndShape;
        const labelPosition: PointF2D = this.graphicalLabel.PositionAndShape.RelativePosition;
        if (!this.initialParent) {
            this.initialParent = boundingBox.Parent;
            this.initialRelativePosition = new PointF2D(boundingBox.RelativePosition.x, boundingBox.RelativePosition.y);
            this.initialLabelRelativePosition = new PointF2D(labelPosition.x, labelPosition.y);
            return;
        }
        if (boundingBox.Parent !== this.initialParent) {
            boundingBox.Parent = this.initialParent;
        }
        boundingBox.RelativePosition.x = this.initialRelativePosition.x;
        boundingBox.RelativePosition.y = this.initialRelativePosition.y;
        labelPosition.x = this.initialLabelRelativePosition.x;
        labelPosition.y = this.initialLabelRelativePosition.y;
        // the borders as calculated at the creation: the page's calculateTopBottomBorders() extends them by the label's
        //   borders at its calculated position, not shrinking them back for a lower label in the next render
        boundingBox.calculateBoundingBox();
    }
    private calculateLabel(textHeight: number, transposeHalftones: number, keyInstruction: KeyInstruction): void {
        const text: string = ChordSymbolContainer.calculateChordText(this.chordSymbolContainer, transposeHalftones, keyInstruction);
        const placement: PlacementEnum = this.GetChordSymbolContainer.Placement;
        const textAlignment: TextAlignmentEnum = placement === PlacementEnum.Above ?
            this.rules.ChordSymbolTextAlignmentTop : this.rules.ChordSymbolTextAlignmentBottom;
        this.graphicalLabel = new GraphicalLabel(new Label(text), textHeight, textAlignment, this.rules, this.boundingBox);
        this.graphicalLabel.PositionAndShape.RelativePosition = new PointF2D(this.rules.ChordSymbolRelativeXOffset, 0.0);
        this.graphicalLabel.Label.colorDefault = this.rules.DefaultColorChordSymbol;
    }
}
