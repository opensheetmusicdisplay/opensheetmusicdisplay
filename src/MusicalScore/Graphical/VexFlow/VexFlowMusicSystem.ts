import {MusicSystem} from "../MusicSystem";
import {GraphicalMusicPage} from "../GraphicalMusicPage";
import {SystemLinesEnum} from "../SystemLinesEnum";
import {EngravingRules} from "../EngravingRules";
import {PointF2D} from "../../../Common/DataObjects/PointF2D";
export class VexFlowMusicSystem extends MusicSystem {
    constructor(parent: GraphicalMusicPage, id: number) {
        super(parent, id);

    }

    /**
     * This method creates the left vertical Line of the MusicSystem.
     * @param lineWidth
     * @param systemLabelsRightMargin
     */
    public createSystemLeftVerticalLineObject(lineWidth: number, systemLabelsRightMargin: number): void {

    }

    /**
     * This method creates the vertical Line Objects after the End of all StaffLine's Measures
     * @param position
     * @param lineType
     * @param lineWidth
     * @param index
     */
    public createVerticalLineForMeasure(position: number, lineType: SystemLinesEnum, lineWidth: number, index: number): void {

    }

    /**
     * This method sets the y-Positions of vertical Line Objects and creates the Lines within.
     * @param rules
     */
    public setYPositionsToVerticalLineObjectsAndCreateLines(rules: EngravingRules): void {

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

    }
}