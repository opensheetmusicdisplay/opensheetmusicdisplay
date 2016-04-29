import {SourceMeasure} from "./SourceMeasure";
import {Fraction} from "../../Common/DataObjects/fraction";
import {SourceStaffEntry} from "./SourceStaffEntry";

export class VerticalSourceStaffEntryContainer {
    constructor(parentMeasure: SourceMeasure, timestamp: Fraction, size: number) {
        this.timestamp = timestamp;
        this.size = size;
        this.staffEntries = new Array(size);
        this.parentMeasure = parentMeasure;
    }
    private timestamp: Fraction;
    private size: number;
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
    //private initialize(): void {
    //    for (let i: number = 0; i < this.size; i++) {
    //        this.staffEntries.push(undefined);
    //    }
    //}
}
