import {TextAlignment} from "../../Common/Enums/TextAlignment";
import {Label} from "../Label";
import {GraphicalLabel} from "./GraphicalLabel";
import {ChordSymbolContainer} from "../VoiceData/ChordSymbolContainer";
import {BoundingBox} from "./BoundingBox";
import {GraphicalObject} from "./GraphicalObject";
import {PointF_2D} from "../../Common/DataObjects/PointF_2D";
export class GraphicalChordSymbolContainer extends GraphicalObject {
    private chordSymbolContainer: ChordSymbolContainer;
    private graphicalLabel: GraphicalLabel;
    constructor(chordSymbolContainer: ChordSymbolContainer, parent: BoundingBox, textHeight: number, transposeHalftones: number) {
        this.chordSymbolContainer = chordSymbolContainer;
        this.boundingBox = new BoundingBox(parent, this);
        this.calculateLabel(textHeight, transposeHalftones);
    }
    public get GetChordSymbolContainer(): ChordSymbolContainer {
        return this.chordSymbolContainer;
    }
    public get GetGraphicalLabel(): GraphicalLabel {
        return this.graphicalLabel;
    }
    private calculateLabel(textHeight: number, transposeHalftones: number): void {
        var text: string = ChordSymbolContainer.calculateChordText(this.chordSymbolContainer, transposeHalftones);
        this.graphicalLabel = new GraphicalLabel(new Label(text), textHeight, TextAlignment.CenterBottom, this.boundingBox);
        this.graphicalLabel.PositionAndShape.RelativePosition = new PointF_2D(0.0, 0.0);
        this.boundingBox.ChildElements.Add(this.graphicalLabel.PositionAndShape);
    }
}
