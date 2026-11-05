import {MusicSystem} from "../MusicSystem";
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
import { GroupSymbol } from "../../InstrumentalGroup";
import { unitInPixels } from "./VexFlowMusicSheetDrawer";

export class VexFlowMusicSystem extends MusicSystem {
    constructor(id: number, rules: EngravingRules) {
        super(id);
        this.rules = rules;
    }

    public calculateBorders(rules: EngravingRules): void {
        if (this.staffLines.length === 0) {
            return;
        }
        const width: number = this.calcBracketsWidth();
        this.boundingBox.BorderLeft = -width;
        this.boundingBox.BorderMarginLeft = -width;
        //this.boundingBox.BorderRight = this.rules.SystemRightMargin;
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
        const vfTopMeasure: VexFlowMeasure = topMeasure as VexFlowMeasure;
        let renderInitialLine: boolean = false;

        if (bottomMeasure) {
            renderInitialLine = true;
            // Set bar types on both staves before creating connectors,
            // so VexFlow's stave formatting is aware of the REPEAT_BEGIN barline.
            (bottomMeasure as VexFlowMeasure).addMeasureLine(lineType, linePosition);
            if (vfTopMeasure) {
                vfTopMeasure.addMeasureLine(lineType, linePosition, renderInitialLine);
            }

            // For begin repeat barlines on measures with begin instructions (clef, key, time signature),
            // shift the StaveConnector past the begin instructions so it aligns with the repeat barline
            // rather than drawing at the stave's leftmost x position.
            let connectorXShift: number = 0;
            if (lineType === SystemLinesEnum.BoldThinDots && linePosition === SystemLinePosition.MeasureBegin
                && topMeasure.beginInstructionsWidth > 0) {
                connectorXShift = vfTopMeasure.getVFStave().getModifierXShift(0);
            }

            // create here the correct lines according to the given lineType.
            (bottomMeasure as VexFlowMeasure).lineTo(
                topMeasure as VexFlowMeasure, VexFlowConverter.line(lineType, linePosition), connectorXShift);
            //Double repeat. VF doesn't have concept of double repeat. Need to add stave connector to begin of next measure
            if (lineType === SystemLinesEnum.DotsBoldBoldDots) {
                const nextIndex: number = bottomMeasure.ParentStaffLine.Measures.indexOf(bottomMeasure) + 1;
                const nextBottomMeasure: VexFlowMeasure = bottomMeasure.ParentStaffLine.Measures[nextIndex] as VexFlowMeasure;
                const nextTopMeasure: VexFlowMeasure = topMeasure.ParentStaffLine.Measures[nextIndex] as VexFlowMeasure;
                if (nextBottomMeasure && nextTopMeasure) {
                    nextBottomMeasure.lineTo(nextTopMeasure, VexFlowConverter.line(SystemLinesEnum.BoldThinDots, linePosition));
                    nextBottomMeasure.addMeasureLine(SystemLinesEnum.BoldThinDots, linePosition);
                }
            }
        } else if (vfTopMeasure) {
            vfTopMeasure.addMeasureLine(lineType, linePosition, renderInitialLine);
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

    /** A bracket, square bracket or line stands 5 px left of the staves, a brace 14 px (VexFlow's StaveConnector); each
     *  column a GroupBracketColumnDistance further left. */
    protected groupBracketReach(groupSymbol: GroupSymbol, column: number): number {
        return (groupSymbol === GroupSymbol.Brace ? 14 : 5) / unitInPixels + column * this.rules.GroupBracketColumnDistance;
    }

    protected partBraceReach(column: number): number {
        return this.groupBracketReach(GroupSymbol.Brace, column);
    }

    /**
     * creates an instrument group bracket for the given dimension.
     * There can be cascaded brackets (e.g. a group of 2 in a group of 4): a nested group's bracket stands in the next column
     * left of the outer group's (EngravingRules.GroupBracketColumnDistance), as does the brace of a multi-staff part inside
     * the group (a brace is the outermost symbol, Gould, Behind Bars, p. 516; MuseScore and Dorico draw it so).
     * @param firstStaffLine the upper staff line of the bracket to create
     * @param lastStaffLine the lower staff line of the bracket to create
     * @param column the column of the bracket left of the staves, 0 beside them
     * @param groupSymbol the symbol to draw: bracket, brace, square (a thin line with right-angled hooks) or line
     */
    protected createGroupBracket(firstStaffLine: StaffLine, lastStaffLine: StaffLine, column: number, groupSymbol: GroupSymbol): void {
        const firstVexStaff: VexFlowStaffLine = (firstStaffLine as VexFlowStaffLine);
        const lastVexStaff: VexFlowStaffLine = (lastStaffLine as VexFlowStaffLine);
        const top: number = this.staffLines.indexOf(firstStaffLine);
        const bottom: number = this.staffLines.indexOf(lastStaffLine);
        for (const partBrace of this.InstrumentBrackets as VexFlowInstrumentBracket[]) {
            const at: number = this.staffLines.indexOf(partBrace.FirstStaffLine);
            if (at >= top && at <= bottom) {
                partBrace.Column = Math.max(partBrace.Column, column + 1);
            }
        }
        const bracket: VexFlowInstrumentBracket = groupSymbol === GroupSymbol.Brace ?
            new VexFlowInstrumentBrace(firstVexStaff, lastVexStaff, column) :
            new VexFlowInstrumentBracket(firstVexStaff, lastVexStaff, column);
        bracket.Shape = groupSymbol;
        this.GroupBrackets.push(bracket);
    }
}
