import {SourceMeasure} from "./SourceMeasure";
import {Fraction} from "../../Common/DataObjects/Fraction";
import {SourceStaffEntry} from "./SourceStaffEntry";

/**
 * A [[VerticalSourceStaffEntryContainer]] contains the [[StaffEntry]]s at one timestamp through all the [[StaffLine]]s.
 */
export class VerticalSourceStaffEntryContainer {

    constructor(parentMeasure: SourceMeasure, timestamp: Fraction, size: number) {
        this.timestamp = timestamp;
        this.staffEntries = new Array(size);
        this.parentMeasure = parentMeasure;
    }

    private timestamp: Fraction;
    private staffEntries: SourceStaffEntry[] = [];
    private comments: Comment[] = [];
    private parentMeasure: SourceMeasure;

    public $get$(index: number): SourceStaffEntry {
        return this.staffEntries[index];
    }
    public $set$(index: number, value: SourceStaffEntry): void {
        this.staffEntries[index] = value;
    }
    public get Timestamp(): Fraction {
        return this.timestamp;
    }
    public set Timestamp(value: Fraction) {
        this.timestamp = value;
    }
    public get StaffEntries(): SourceStaffEntry[] {
        return this.staffEntries;
    }
    public set StaffEntries(value: SourceStaffEntry[]) {
        this.staffEntries = value;
    }
    public get Comments(): Comment[] {
        return this.comments;
    }
    public set Comments(value: Comment[]) {
        this.comments = value;
    }
    public get ParentMeasure(): SourceMeasure {
        return this.parentMeasure;
    }
    public set ParentMeasure(value: SourceMeasure) {
        this.parentMeasure = value;
    }
    public getAbsoluteTimestamp(): Fraction {
        return Fraction.plus(this.timestamp, this.parentMeasure.AbsoluteTimestamp);
    }

}
