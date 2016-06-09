import {Fraction} from "../../Common/DataObjects/fraction";
export class VerticalGraphicalStaffEntryContainer {
    private index: number;
    private absoluteTimestamp: Fraction;
    private staffEntries: List<GraphicalStaffEntry> = new List<GraphicalStaffEntry>();
    constructor(numberOfEntries: number, absoluteTimestamp: Fraction) {
        this.absoluteTimestamp = absoluteTimestamp;
        for (var i: number = 0; i < numberOfEntries; i++)
            this.staffEntries.Add(null);
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
    public get StaffEntries(): List<GraphicalStaffEntry> {
        return this.staffEntries;
    }
    public set StaffEntries(value: List<GraphicalStaffEntry>) {
        this.staffEntries = value;
    }
    public getFirstNonNullStaffEntry(): GraphicalStaffEntry {
        for (var idx: number = 0, len = this.staffEntries.Count; idx < len; ++idx) {
            var graphicalStaffEntry: GraphicalStaffEntry = this.staffEntries[idx];
            if (graphicalStaffEntry != null)
                return graphicalStaffEntry;
        }
        return null;
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
