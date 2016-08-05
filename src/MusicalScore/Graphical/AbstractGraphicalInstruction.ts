import {GraphicalStaffEntry} from "./GraphicalStaffEntry";
import {GraphicalObject} from "./GraphicalObject";

export abstract class AbstractGraphicalInstruction extends GraphicalObject {
    protected parent: GraphicalStaffEntry;
    constructor(parent: GraphicalStaffEntry) {
        super();
        this.parent = parent;
    }
    public get Parent(): GraphicalStaffEntry {
        return this.parent;
    }
    public set Parent(value: GraphicalStaffEntry) {
        this.parent = value;
    }
}
