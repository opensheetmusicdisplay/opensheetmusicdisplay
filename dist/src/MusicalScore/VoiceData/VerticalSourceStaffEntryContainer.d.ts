import { SourceMeasure } from "./SourceMeasure";
import { Fraction } from "../../Common/DataObjects/fraction";
import { SourceStaffEntry } from "./SourceStaffEntry";
export declare class VerticalSourceStaffEntryContainer {
    constructor(parentMeasure: SourceMeasure, timestamp: Fraction, size: number);
    private timestamp;
    private size;
    private staffEntries;
    private comments;
    private parentMeasure;
    $get$(index: number): SourceStaffEntry;
    $set$(index: number, value: SourceStaffEntry): void;
    Timestamp: Fraction;
    StaffEntries: SourceStaffEntry[];
    Comments: Comment[];
    ParentMeasure: SourceMeasure;
    getAbsoluteTimestamp(): Fraction;
}
