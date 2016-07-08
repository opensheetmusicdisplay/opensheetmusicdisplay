import { GraphicalStaffEntry } from "./GraphicalStaffEntry";
import { GraphicalObject } from "./GraphicalObject";
export declare abstract class AbstractGraphicalInstruction extends GraphicalObject {
    protected parent: GraphicalStaffEntry;
    constructor(parent: GraphicalStaffEntry);
    Parent: GraphicalStaffEntry;
}
