import {GraphicalObject} from "./GraphicalObject";
import {BoundingBox} from "./BoundingBox";
import {BracketHand} from "../VoiceData/Expressions/ContinuousExpressions/BracketHand";
import { GraphicalStaffEntry } from "./GraphicalStaffEntry";

export class GraphicalBracketHand extends GraphicalObject {
    constructor(bracketHand: BracketHand, parent: BoundingBox) {
        super();
        this.bracketHand = bracketHand;
        this.PositionAndShape = new BoundingBox(this, parent);
    }

    public bracketHand: BracketHand;
    public startStaffEntry: GraphicalStaffEntry;
}
