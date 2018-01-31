import {GraphicalObject} from "./GraphicalObject";
import {StaffLine} from "./StaffLine";
import {BoundingBox} from "./BoundingBox";

export class StaffLineActivitySymbol extends GraphicalObject {

    constructor(staffLine: StaffLine) {
        super();
        this.parentStaffLine = staffLine;
        const staffLinePsi: BoundingBox = staffLine.PositionAndShape;
        this.boundingBox = new BoundingBox(this, staffLinePsi);
        this.boundingBox.BorderRight = 6;
        this.boundingBox.BorderBottom = 4.5;
        this.boundingBox.BorderLeft = -1.5;
        this.boundingBox.BorderTop = -1.5;
    }

    public parentStaffLine: StaffLine;

}
