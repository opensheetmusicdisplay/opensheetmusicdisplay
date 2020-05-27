import {AbstractNotationInstruction} from "./AbstractNotationInstruction";

/**
 * A [[StaffLinesInstruction]] is the number of note lines that are rendered for a staff.
 */
export class StaffLinesInstruction extends AbstractNotationInstruction {
    constructor(numberOfLines: number = 5) {
        super(undefined); // FIXME no parent SourceStaffEntry
        this.numberOfLines = numberOfLines;
    }

    private numberOfLines: number = 5;

    public get NumberOfLines(): number {
        return this.numberOfLines;
    }

    public set NumberOfLines(value: number) {
        this.numberOfLines = value;
    }

    public clone(): StaffLinesInstruction {
        return new StaffLinesInstruction(this.numberOfLines);
    }

    public OperatorEquals(staffline2: StaffLinesInstruction): boolean {
        const staffline1: StaffLinesInstruction = this;
        if (staffline1 === staffline2) {
            return true;
        }
        if ((<Object>staffline1 === undefined) || (<Object>staffline2 === undefined)) {
            return false;
        }
        return (staffline1.NumberOfLines === staffline2.NumberOfLines);
    }

    public OperatorNotEqual(staffline2: StaffLinesInstruction): boolean {
        const staffline1: StaffLinesInstruction = this;
        return !(staffline1 === staffline2);
    }

    public ToString(): string {
        return "Number of Stafflines: " + this.numberOfLines;
    }
}
