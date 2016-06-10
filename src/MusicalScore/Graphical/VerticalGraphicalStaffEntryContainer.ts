import {Fraction} from "../../Common/DataObjects/fraction";
import {GraphicalStaffEntry} from "./GraphicalStaffEntry";
export class VerticalGraphicalStaffEntryContainer {
    private index: number;
    private absoluteTimestamp: Fraction;
    private staffEntries: GraphicalStaffEntry[] = [];
    constructor(numberOfEntries: number, absoluteTimestamp: Fraction) {
        this.absoluteTimestamp = absoluteTimestamp;
        for (let i: number = 0; i < numberOfEntries; i++)
            this.staffEntries.push(undefined);
    }
    public RelativeInMeasureTimestamp: Fraction;
    public get Index(): number {
        return this.index;
    }
    public set Index(value: number) {
        this.index = value;
    }
    public get AbsoluteTimestamp(): Fraction {
        return this.absoluteTimestamp;
    }
    public set AbsoluteTimestamp(value: Fraction) {
        this.absoluteTimestamp = value;
    }
    public get StaffEntries(): GraphicalStaffEntry[] {
        return this.staffEntries;
    }
    public set StaffEntries(value: GraphicalStaffEntry[]) {
        this.staffEntries = value;
    }
    public getFirstNonNullStaffEntry(): GraphicalStaffEntry {
        for (let idx: number = 0, len: number = this.staffEntries.length; idx < len; ++idx) {
            let graphicalStaffEntry: GraphicalStaffEntry = this.staffEntries[idx];
            if (graphicalStaffEntry !== undefined)
                return graphicalStaffEntry;
        }
        return undefined;
    }
}
export module VerticalGraphicalStaffEntryContainer {
    export class VgseContainerTimestampComparer implements IComparer<VerticalGraphicalStaffEntryContainer>
    {
        public Compare(x: VerticalGraphicalStaffEntryContainer, y: VerticalGraphicalStaffEntryContainer): number {
            return Comparer.Default.Compare(x.AbsoluteTimestamp.RealValue, y.AbsoluteTimestamp.RealValue);
        }
    }
}
