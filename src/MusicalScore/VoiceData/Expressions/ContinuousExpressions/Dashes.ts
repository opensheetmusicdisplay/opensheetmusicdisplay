import { Fraction } from "../../../../Common/DataObjects/Fraction";
import { SourceMeasure } from "../../SourceMeasure";
import { AbstractExpression, PlacementEnum } from "../AbstractExpression";

/**
 * The dashed line that extends a text up to where it stops applying, e.g. "cresc. - - - -" or "rit. - - - -":
 * the MusicXML `<dashes>` element, with type start and stop.
 * It belongs to the expression of its text (see AbstractExpression.Dashes), which it follows on the same line.
 */
export class Dashes {
    constructor(textExpression: AbstractExpression, staffNumber: number, numberXml: number,
                startMeasure: SourceMeasure, startTimestamp: Fraction) {
        this.TextExpression = textExpression;
        this.StaffNumber = staffNumber;
        this.NumberXml = numberXml;
        this.StartMeasure = startMeasure;
        this.StartTimestamp = startTimestamp;
    }

    /** The expression of the text the line follows, e.g. a ContinuousDynamicExpression for "cresc.". */
    public TextExpression: AbstractExpression;
    /** The number of the staff in its instrument, starting at 1. */
    public StaffNumber: number;
    /** The MusicXML number that pairs the start and the stop of the line. */
    public NumberXml: number;
    public StartMeasure: SourceMeasure;
    /** The timestamp of the start within StartMeasure. */
    public StartTimestamp: Fraction;
    /** The measure of the stop. Undefined as long as no stop was read: such a line isn't drawn. */
    public EndMeasure: SourceMeasure;
    /** The timestamp of the stop within EndMeasure: the line ends before the notes at this timestamp. */
    public EndTimestamp: Fraction;

    /** The placement of the text and so of the line. */
    public get Placement(): PlacementEnum {
        return this.TextExpression.Placement;
    }

    public get AbsoluteStartTimestamp(): Fraction {
        return Fraction.plus(this.StartMeasure.AbsoluteTimestamp, this.StartTimestamp);
    }

    /** The absolute timestamp of the stop, undefined as long as no stop was read. */
    public get AbsoluteEndTimestamp(): Fraction {
        if (!this.EndMeasure) {
            return undefined;
        }
        return Fraction.plus(this.EndMeasure.AbsoluteTimestamp, this.EndTimestamp);
    }
}
