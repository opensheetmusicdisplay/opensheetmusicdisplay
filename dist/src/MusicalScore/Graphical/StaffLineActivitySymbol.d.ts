import { GraphicalObject } from "./GraphicalObject";
import { StaffLine } from "./StaffLine";
export declare class StaffLineActivitySymbol extends GraphicalObject {
    constructor(staffLine: StaffLine);
    parentStaffLine: StaffLine;
}
