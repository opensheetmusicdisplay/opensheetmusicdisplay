import {Fraction} from "../../Common/DataObjects/Fraction";
import {GraphicalStaffEntry} from "./GraphicalStaffEntry";

export class VerticalGraphicalStaffEntryContainer {

    constructor(numberOfEntries: number, absoluteTimestamp: Fraction) {
        this.absoluteTimestamp = absoluteTimestamp;
        this.staffEntries = new Array(numberOfEntries);
    }

    //public relativeInMeasureTimestamp: Fraction;
    private index: number;
    private absoluteTimestamp: Fraction;
    private staffEntries: GraphicalStaffEntry[] = [];

    public get Index(): number {
        return this.index;
    }

    public set Index(value: number) {
        this.index = value;
    }

    public get AbsoluteTimestamp(): Fraction {
        return this.absoluteTimestamp;
    }

    //public set AbsoluteTimestamp(value: Fraction) {
    //    this.absoluteTimestamp = value;
    //}

    public get StaffEntries(): GraphicalStaffEntry[] {
        return this.staffEntries;
    }

    public set StaffEntries(value: GraphicalStaffEntry[]) {
        this.staffEntries = value;
    }

    public static compareByTimestamp(x: VerticalGraphicalStaffEntryContainer, y: VerticalGraphicalStaffEntryContainer): number {
        const xValue: number = x.absoluteTimestamp.RealValue;
        const yValue: number = y.absoluteTimestamp.RealValue;

        if (xValue < yValue) {
            return -1;
        } else if (xValue > yValue) {
            return 1;
        } else {
            return 0;
        }
    }

    /**
     * Return the first non-null [[GraphicalStaffEntry]].
     * @returns {any}
     */
    public getFirstNonNullStaffEntry(): GraphicalStaffEntry {
        for (let idx: number = 0, len: number = this.staffEntries.length; idx < len; ++idx) {
            const graphicalStaffEntry: GraphicalStaffEntry = this.staffEntries[idx];
            if (graphicalStaffEntry) {
                return graphicalStaffEntry;
            }
        }
        return undefined;
    }
}


