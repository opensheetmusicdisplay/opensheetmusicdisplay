import {MusicSystem} from "../MusicSystem";
import {GraphicalMusicPage} from "../GraphicalMusicPage";
import {SystemLinesEnum} from "../SystemLinesEnum";
import {SystemLinePosition} from "../SystemLinePosition";
import {GraphicalMeasure} from "../GraphicalMeasure";
import {SystemLine} from "../SystemLine";
import {VexFlowStaffLine} from "./VexFlowStaffLine";
import {VexFlowMeasure} from "./VexFlowMeasure";
import {VexFlowConverter} from "./VexFlowConverter";
import {StaffLine} from "../StaffLine";
import {EngravingRules} from "../EngravingRules";
import { VexFlowInstrumentBracket } from "./VexFlowInstrumentBracket";
import { VexFlowInstrumentBrace } from "./VexFlowInstrumentBrace";
import { SkyBottomLineCalculator } from "../SkyBottomLineCalculator";

export class VexFlowMusicSystem extends MusicSystem {
    constructor(parent: GraphicalMusicPage, id: number) {
        super(parent, id);

    }

    public calculateBorders(rules: EngravingRules): void {
        if (this.staffLines.length === 0) {
            return;
        }
        const width: number = this.calcBracketsWidth();
        this.boundingBox.BorderLeft = -width;
        this.boundingBox.BorderMarginLeft = -width;
        this.boundingBox.XBordersHaveBeenSet = true;

        const topSkyBottomLineCalculator: SkyBottomLineCalculator = this.staffLines[0].SkyBottomLineCalculator;
        const top: number = topSkyBottomLineCalculator.getSkyLineMin();
        this.boundingBox.BorderTop = top;
        this.boundingBox.BorderMarginTop = top;

        const lastStaffLine: StaffLine = this.staffLines[this.staffLines.length - 1];
        const bottomSkyBottomLineCalculator: SkyBottomLineCalculator = lastStaffLine.SkyBottomLineCalculator;
        const bottom: number = bottomSkyBottomLineCalculator.getBottomLineMax()
                    + lastStaffLine.PositionAndShape.RelativePosition.y;
        this.boundingBox.BorderBottom = bottom;
        this.boundingBox.BorderMarginBottom = bottom;

        this.boundingBox.XBordersHaveBeenSet = true;
        this.boundingBox.YBordersHaveBeenSet = true;
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
                               musicSystem: MusicSystem, topMeasure: GraphicalMeasure, bottomMeasure: GraphicalMeasure = undefined): SystemLine {
        const vfMeasure: VexFlowMeasure = topMeasure as VexFlowMeasure;
        vfMeasure.addMeasureLine(lineType, linePosition);
        if (bottomMeasure) {
          // ToDo: feature/Repetitions
          // create here the correct lines according to the given lineType.
          (bottomMeasure as VexFlowMeasure).lineTo(topMeasure as VexFlowMeasure, VexFlowConverter.line(lineType, linePosition));
          (bottomMeasure as VexFlowMeasure).addMeasureLine(lineType, linePosition);
        }
        return new SystemLine(lineType, linePosition, this, topMeasure, bottomMeasure);
    }

    /**
     * creates an instrument brace for the given dimension.
     * The height and positioning can be inferred from the given staff lines.
     * @param firstStaffLine the upper StaffLine (use a cast to get the VexFlowStaffLine) of the brace to create
     * @param lastStaffLine the lower StaffLine (use a cast to get the VexFlowStaffLine) of the brace to create
     */
    protected createInstrumentBracket(firstStaffLine: StaffLine, lastStaffLine: StaffLine): void {
        // You could write this in one line but the linter doesn't let me.
        const firstVexStaff: VexFlowStaffLine = (firstStaffLine as VexFlowStaffLine);
        const lastVexStaff: VexFlowStaffLine = (lastStaffLine as VexFlowStaffLine);
        const vexFlowBracket: VexFlowInstrumentBrace = new VexFlowInstrumentBrace(firstVexStaff, lastVexStaff);
        this.InstrumentBrackets.push(vexFlowBracket);
        return;
    }

    /**
     * creates an instrument group bracket for the given dimension.
     * There can be cascaded bracket (e.g. a group of 2 in a group of 4) -
     * The recursion depth informs about the current depth level (needed for positioning)
     * @param firstStaffLine the upper staff line of the bracket to create
     * @param lastStaffLine the lower staff line of the bracket to create
     * @param recursionDepth
     */
    protected createGroupBracket(firstStaffLine: StaffLine, lastStaffLine: StaffLine, recursionDepth: number): void {
        const firstVexStaff: VexFlowStaffLine = (firstStaffLine as VexFlowStaffLine);
        const lastVexStaff: VexFlowStaffLine = (lastStaffLine as VexFlowStaffLine);
        if (recursionDepth === 0) {
            const vexFlowBracket: VexFlowInstrumentBracket = new VexFlowInstrumentBracket(firstVexStaff, lastVexStaff, recursionDepth);
            this.GroupBrackets.push(vexFlowBracket);
        } else {
            const vexFlowBrace: VexFlowInstrumentBrace = new VexFlowInstrumentBrace(firstVexStaff, lastVexStaff, recursionDepth);
            this.GroupBrackets.push(vexFlowBrace);
        }
        return;
    }
}
