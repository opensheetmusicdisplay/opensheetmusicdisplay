import { PointF2D } from "../../Common/DataObjects/PointF2D";
import { Dashes } from "../VoiceData/Expressions/ContinuousExpressions/Dashes";
import { EngravingRules } from "./EngravingRules";
import { GraphicalLabel } from "./GraphicalLabel";
import { GraphicalLine } from "./GraphicalLine";
import { StaffLine } from "./StaffLine";

/**
 * The part of a dashed line after a text (e.g. "cresc. - - - -", see Dashes) in one staffline: the line that starts after
 * the text, or a part that goes on from the staffline of the system before.
 */
export class GraphicalDashes {
    /**
     * @param dashes the line this is a part of
     * @param staffLine the staffline of the part, which adds it to its ExpressionDashes
     * @param start the start of the line, relative to the staffline
     * @param end the end of the line, relative to the staffline
     * @param textLabel the label of the text the line follows
     * @param isContinuation whether the part goes on from the system before, where the text is
     */
    constructor(dashes: Dashes, staffLine: StaffLine, start: PointF2D, end: PointF2D, textLabel: GraphicalLabel,
                isContinuation: boolean = false) {
        this.Dashes = dashes;
        this.ParentStaffLine = staffLine;
        this.TextLabel = textLabel;
        this.IsContinuation = isContinuation;
        const rules: EngravingRules = staffLine.ParentMusicSystem.rules;
        this.Line = new GraphicalLine(start, end, rules.ExpressionDashesLineWidth);
        this.DashLength = rules.ExpressionDashesDashLength;
        this.GapLength = GraphicalDashes.fitGapLength(end.x - start.x, rules.ExpressionDashesDashLength, rules.ExpressionDashesGapLength);
        staffLine.ExpressionDashes.push(this);
    }

    /** The line this is a part of. */
    public Dashes: Dashes;
    public ParentStaffLine: StaffLine;
    /** The line from its first to its last dash, relative to the staffline. Its SVGElement is the drawn group (SVG backend). */
    public Line: GraphicalLine;
    /** The length of a dash, in units. */
    public DashLength: number;
    /** The gap between two dashes, in units: EngravingRules.ExpressionDashesGapLength, fitted so that the line ends with a whole dash. */
    public GapLength: number;
    /** The label of the text the line follows: in this staffline, or for a part that goes on from a system before
     *  (IsContinuation) in the staffline where the line starts. */
    public TextLabel: GraphicalLabel;
    /** Whether this part goes on from the staffline of a system before, where the text and the start of the line are. */
    public IsContinuation: boolean;
    /** The text again in brackets before a part that goes on from a system before, e.g. "(cresc.)", as a reminder.
     *  Undefined unless EngravingRules.RenderExpressionDashesContinuationText is set. */
    public ContinuationLabel: GraphicalLabel;

    /**
     * Returns the gap length closest to the given one with which dashes of the given length exactly fill a line, so that
     * it starts and ends with a whole dash.
     * @param lineLength the length of the line
     * @param dashLength the length of a dash
     * @param gapLength the gap between two dashes to approximate
     */
    public static fitGapLength(lineLength: number, dashLength: number, gapLength: number): number {
        if (!(dashLength > 0) || !(gapLength > 0)) {
            return gapLength;
        }
        let dashCount: number = Math.round((lineLength + gapLength) / (dashLength + gapLength));
        while (dashCount >= 2 && lineLength <= dashCount * dashLength) {
            dashCount--; // (a gap much shorter than the dashes: rounding up left no space for gaps)
        }
        if (dashCount < 2) {
            return gapLength;
        }
        return (lineLength - dashCount * dashLength) / (dashCount - 1);
    }
}
