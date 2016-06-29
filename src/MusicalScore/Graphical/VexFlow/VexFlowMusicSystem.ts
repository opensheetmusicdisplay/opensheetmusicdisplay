import {MusicSystem} from "../MusicSystem";
import {GraphicalMusicPage} from "../GraphicalMusicPage";
import {SystemLinesEnum} from "../SystemLinesEnum";
import {PointF2D} from "../../../Common/DataObjects/PointF2D";
import {SystemLinePosition} from "../SystemLinePosition";
import {StaffMeasure} from "../StaffMeasure";
import {SystemLine} from "../SystemLine";
import {VexFlowMeasure} from "./VexFlowMeasure";
import {VexFlowConverter} from "./VexFlowConverter";

//import Vex = require("vexflow");

export class VexFlowMusicSystem extends MusicSystem {
    constructor(parent: GraphicalMusicPage, id: number) {
        super(parent, id);

    }

    /**
     * This method creates all the graphical lines and dots needed to render a system line (e.g. bold-thin-dots..).
     * @param xPosition
     * @param lineWidth
     * @param lineType
     * @param linePosition indicates if the line belongs to start or end of measure
     * @param musicSystem
     * @param topMeasure
     * @param bottomMeasure
     */
    protected createSystemLine(xPosition: number, lineWidth: number, lineType: SystemLinesEnum, linePosition: SystemLinePosition,
                               musicSystem: MusicSystem, topMeasure: StaffMeasure, bottomMeasure: StaffMeasure = undefined): SystemLine {
        // ToDo: create line in Vexflow
        if (bottomMeasure) {
            (topMeasure as VexFlowMeasure).connectTo(bottomMeasure as VexFlowMeasure, VexFlowConverter.line(lineType));
        }
        return new SystemLine(lineType, linePosition, this, topMeasure, bottomMeasure);
    }

    /**
     * Calculates the summed x-width of a possibly given Instrument Brace and/or Group Bracket(s).
     * @returns {number} the x-width
     */
    protected calcInstrumentsBracketsWidth(): number {
        return 0;
    }

    /**
     * creates an instrument brace for the given dimension.
     * The height and positioning can be inferred from the given points.
     * @param rightUpper the upper right corner point of the bracket to create
     * @param rightLower the lower right corner point of the bracket to create
     */
    protected createInstrumentBracket(rightUpper: PointF2D, rightLower: PointF2D): void {
        return;
    }

    /**
     * creates an instrument group bracket for the given dimension.
     * There can be cascaded bracket (e.g. a group of 2 in a group of 4) -
     * The recursion depth informs about the current depth level (needed for positioning)
     * @param rightUpper rightUpper the upper right corner point of the bracket to create
     * @param rightLower rightLower the lower right corner point of the bracket to create
     * @param staffHeight
     * @param recursionDepth
     */
    protected createGroupBracket(rightUpper: PointF2D, rightLower: PointF2D, staffHeight: number, recursionDepth: number): void {
        return;
    }
}
