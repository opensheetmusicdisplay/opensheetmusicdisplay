import { GraphicalLabel } from "./GraphicalLabel";
import { ChordSymbolContainer } from "../VoiceData/ChordSymbolContainer";
import { BoundingBox } from "./BoundingBox";
import { GraphicalObject } from "./GraphicalObject";
export declare class GraphicalChordSymbolContainer extends GraphicalObject {
    private chordSymbolContainer;
    private graphicalLabel;
    constructor(chordSymbolContainer: ChordSymbolContainer, parent: BoundingBox, textHeight: number, transposeHalftones: number);
    GetChordSymbolContainer: ChordSymbolContainer;
    GetGraphicalLabel: GraphicalLabel;
    private calculateLabel(textHeight, transposeHalftones);
}
