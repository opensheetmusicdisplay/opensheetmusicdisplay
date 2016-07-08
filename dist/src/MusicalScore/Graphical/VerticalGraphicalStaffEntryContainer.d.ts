import { Fraction } from "../../Common/DataObjects/fraction";
import { GraphicalStaffEntry } from "./GraphicalStaffEntry";
export declare class VerticalGraphicalStaffEntryContainer {
    constructor(numberOfEntries: number, absoluteTimestamp: Fraction);
    relativeInMeasureTimestamp: Fraction;
    private index;
    private absoluteTimestamp;
    private staffEntries;
    Index: number;
    AbsoluteTimestamp: Fraction;
    StaffEntries: GraphicalStaffEntry[];
    static compareByTimestamp(x: VerticalGraphicalStaffEntryContainer, y: VerticalGraphicalStaffEntryContainer): number;
    getFirstNonNullStaffEntry(): GraphicalStaffEntry;
}
