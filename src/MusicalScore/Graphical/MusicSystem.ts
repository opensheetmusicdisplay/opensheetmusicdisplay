import {StaffLine} from "./StaffLine";
import {Instrument} from "../Instrument";
import {BoundingBox} from "./BoundingBox";
import {Fraction} from "../../Common/DataObjects/Fraction";
import {SourceMeasure} from "../VoiceData/SourceMeasure";
import {InstrumentalGroup} from "../InstrumentalGroup";
import {TextAlignmentEnum} from "../../Common/Enums/TextAlignment";
import {GraphicalMusicPage} from "./GraphicalMusicPage";
import {GraphicalLabel} from "./GraphicalLabel";
import {GraphicalMeasure} from "./GraphicalMeasure";
import {GraphicalObject} from "./GraphicalObject";
import {EngravingRules} from "./EngravingRules";
import {PointF2D} from "../../Common/DataObjects/PointF2D";
import {GraphicalStaffEntry} from "./GraphicalStaffEntry";
import {SystemLinesEnum} from "./SystemLinesEnum";
import Dictionary from "typescript-collections/dist/lib/Dictionary";
import {GraphicalComment} from "./GraphicalComment";
import {GraphicalMarkedArea} from "./GraphicalMarkedArea";
import {SystemLine} from "./SystemLine";
import {SystemLinePosition} from "./SystemLinePosition";
import {Staff} from "../VoiceData/Staff";

/**
 * A MusicSystem contains the [[StaffLine]]s for all instruments, until a line break
 */
export abstract class MusicSystem extends GraphicalObject {
    public needsToBeRedrawn: boolean = true;
    protected parent: GraphicalMusicPage;
    protected id: number;
    protected staffLines: StaffLine[] = [];
    protected graphicalMeasures: GraphicalMeasure[][] = [];
    protected labels: Dictionary<GraphicalLabel, Instrument> = new Dictionary<GraphicalLabel, Instrument>();
    protected measureNumberLabels: GraphicalLabel[] = [];
    protected maxLabelLength: number;
    protected objectsToRedraw: [Object[], Object][] = [];
    protected instrumentBrackets: GraphicalObject[] = [];
    protected groupBrackets: GraphicalObject[] = [];
    protected graphicalMarkedAreas: GraphicalMarkedArea[] = [];
    protected graphicalComments: GraphicalComment[] = [];
    protected systemLines: SystemLine[] = [];
    protected rules: EngravingRules;

    constructor(parent: GraphicalMusicPage, id: number) {
        super();
        this.parent = parent;
        this.id = id;
        this.boundingBox = new BoundingBox(this, parent.PositionAndShape);
        this.maxLabelLength = 0.0;
        this.rules = this.parent.Parent.ParentMusicSheet.Rules;
    }

    public get Parent(): GraphicalMusicPage {
        return this.parent;
    }

    public set Parent(value: GraphicalMusicPage) {
        this.parent = value;
    }

    public get NextSystem(): MusicSystem {
        const idxInParent: number = this.Parent.MusicSystems.indexOf(this);
        return idxInParent !== this.Parent.MusicSystems.length ? this.Parent.MusicSystems[idxInParent + 1] : undefined;
    }

    public get StaffLines(): StaffLine[] {
        return this.staffLines;
    }

    public get GraphicalMeasures(): GraphicalMeasure[][] {
        return this.graphicalMeasures;
    }

    public get MeasureNumberLabels(): GraphicalLabel[] {
        return this.measureNumberLabels;
    }

    public get Labels(): GraphicalLabel[] {
        return this.labels.keys();
    }

    public get ObjectsToRedraw(): [Object[], Object][] {
        return this.objectsToRedraw;
    }

    public get InstrumentBrackets(): GraphicalObject[] {
        return this.instrumentBrackets;
    }

    public get GroupBrackets(): GraphicalObject[] {
        return this.groupBrackets;
    }

    public get GraphicalMarkedAreas(): GraphicalMarkedArea[] {
        return this.graphicalMarkedAreas;
    }

    public get GraphicalComments(): GraphicalComment[] {
        return this.graphicalComments;
    }

    public get SystemLines(): SystemLine[] {
        return this.systemLines;
    }

    public get Id(): number {
        return this.id;
    }

    /**
     * Create the left vertical Line connecting all staves of the [[MusicSystem]].
     * @param lineWidth
     * @param systemLabelsRightMargin
     */
    public createSystemLeftLine(lineWidth: number, systemLabelsRightMargin: number): void {
        let xPosition: number = -lineWidth / 2;
        if (this === this.parent.MusicSystems[0] && this.parent === this.parent.Parent.MusicPages[0]) {
            xPosition = this.maxLabelLength + systemLabelsRightMargin - lineWidth / 2;
        }
        const top: GraphicalMeasure = this.staffLines[0].Measures[0];
        let bottom: GraphicalMeasure = undefined;
        if (this.staffLines.length > 1) {
            bottom = this.staffLines[this.staffLines.length - 1].Measures[0];
        }
        const leftSystemLine: SystemLine = this.createSystemLine(xPosition, lineWidth, SystemLinesEnum.SingleThin,
                                                                 SystemLinePosition.MeasureBegin, this, top, bottom);
        this.SystemLines.push(leftSystemLine);
        leftSystemLine.PositionAndShape.RelativePosition = new PointF2D(xPosition, 0);
        leftSystemLine.PositionAndShape.BorderLeft = 0;
        leftSystemLine.PositionAndShape.BorderRight = lineWidth;
        leftSystemLine.PositionAndShape.BorderTop = 0;
        leftSystemLine.PositionAndShape.BorderBottom = this.boundingBox.Size.height;
        this.createLinesForSystemLine(leftSystemLine);
    }

    /**
     * Create the vertical Lines after the End of all [[StaffLine]]'s Measures
     * @param xPosition
     * @param lineWidth
     * @param lineType
     * @param linePosition indicates if the line belongs to start or end of measure
     * @param measureIndex the measure index within the staffline
     * @param measure
     */
    public createVerticalLineForMeasure(xPosition: number, lineWidth: number, lineType: SystemLinesEnum, linePosition: SystemLinePosition,
                                        measureIndex: number, measure: GraphicalMeasure): void {
        const staffLine: StaffLine = measure.ParentStaffLine;
        const staffLineRelative: PointF2D = new PointF2D(staffLine.PositionAndShape.RelativePosition.x,
                                                         staffLine.PositionAndShape.RelativePosition.y);
        const staves: Staff[] = staffLine.ParentStaff.ParentInstrument.Staves;
        if (staffLine.ParentStaff === staves[0]) {
            let bottomMeasure: GraphicalMeasure = undefined;
            if (staves.length > 1) {
                bottomMeasure = this.getBottomStaffLine(staffLine).Measures[measureIndex];
            }
            const singleVerticalLineAfterMeasure: SystemLine = this.createSystemLine(xPosition, lineWidth, lineType,
                                                                                     linePosition, this, measure, bottomMeasure);
            const systemXPosition: number = staffLineRelative.x + xPosition;
            singleVerticalLineAfterMeasure.PositionAndShape.RelativePosition = new PointF2D(systemXPosition, 0);
            singleVerticalLineAfterMeasure.PositionAndShape.BorderLeft = 0;
            singleVerticalLineAfterMeasure.PositionAndShape.BorderRight = lineWidth;
            this.SystemLines.push(singleVerticalLineAfterMeasure);
        }
    }

    /**
     * Set the y-Positions of all the system lines in the system and creates the graphical Lines and dots within.
     * @param rules
     */
    public setYPositionsToVerticalLineObjectsAndCreateLines(rules: EngravingRules): void {
        // empty
    }

    public calculateBorders(rules: EngravingRules): void {
        // empty
    }

    public alignBeginInstructions(): void {
        // empty
    }

    public GetLeftBorderAbsoluteXPosition(): number {
        return this.StaffLines[0].PositionAndShape.AbsolutePosition.x + this.StaffLines[0].Measures[0].beginInstructionsWidth;
    }

    public GetRightBorderAbsoluteXPosition(): number {
        return this.StaffLines[0].PositionAndShape.AbsolutePosition.x + this.StaffLines[0].StaffLines[0].End.x;
    }

    public AddGraphicalMeasures(graphicalMeasures: GraphicalMeasure[]): void {
        for (let idx: number = 0, len: number = graphicalMeasures.length; idx < len; ++idx) {
            const graphicalMeasure: GraphicalMeasure = graphicalMeasures[idx];
            graphicalMeasure.parentMusicSystem = this;
        }
        this.graphicalMeasures.push(graphicalMeasures);
    }

    public GetSystemsFirstTimeStamp(): Fraction {
        return this.graphicalMeasures[0][0].parentSourceMeasure.AbsoluteTimestamp;
    }

    public GetSystemsLastTimeStamp(): Fraction {
        const m: SourceMeasure = this.graphicalMeasures[this.graphicalMeasures.length - 1][0].parentSourceMeasure;
        return Fraction.plus(m.AbsoluteTimestamp, m.Duration);
    }

    /**
     * Create an InstrumentBracket for each multiStave Instrument.
     * @param instruments
     * @param staffHeight
     */
    public createInstrumentBrackets(instruments: Instrument[], staffHeight: number): void {
        for (let idx: number = 0, len: number = instruments.length; idx < len; ++idx) {
            const instrument: Instrument = instruments[idx];
            if (instrument.Staves.length > 1) {
                let firstStaffLine: StaffLine = undefined, lastStaffLine: StaffLine = undefined;
                for (let idx2: number = 0, len2: number = this.staffLines.length; idx2 < len2; ++idx2) {
                    const staffLine: StaffLine = this.staffLines[idx2];
                    if (staffLine.ParentStaff === instrument.Staves[0]) {
                        firstStaffLine = staffLine;
                    }
                    if (staffLine.ParentStaff === instrument.Staves[instrument.Staves.length - 1]) {
                        lastStaffLine = staffLine;
                    }
                }
                if (firstStaffLine !== undefined && lastStaffLine !== undefined) {
                    this.createInstrumentBracket(firstStaffLine, lastStaffLine);
                }
            }
        }
    }

    /**
     * Create a GroupBracket for an [[InstrumentalGroup]].
     * @param instrumentGroups
     * @param staffHeight
     * @param recursionDepth
     */
    public createGroupBrackets(instrumentGroups: InstrumentalGroup[], staffHeight: number, recursionDepth: number): void {
        for (let idx: number = 0, len: number = instrumentGroups.length; idx < len; ++idx) {
            const instrumentGroup: InstrumentalGroup = instrumentGroups[idx];
            if (instrumentGroup.InstrumentalGroups.length < 1) {
                continue;
            }
            const instrument1: Instrument = this.findFirstVisibleInstrumentInInstrumentalGroup(instrumentGroup);
            const instrument2: Instrument = this.findLastVisibleInstrumentInInstrumentalGroup(instrumentGroup);
            if (instrument1 === undefined || instrument2 === undefined) {
                continue;
            }
            let firstStaffLine: StaffLine = undefined;
            let lastStaffLine: StaffLine = undefined;
            for (let idx2: number = 0, len2: number = this.staffLines.length; idx2 < len2; ++idx2) {
                const staffLine: StaffLine = this.staffLines[idx2];
                if (staffLine.ParentStaff === instrument1.Staves[0]) {
                    firstStaffLine = staffLine;
                }
                if (staffLine.ParentStaff === instrument2.Staves[0]) {
                    lastStaffLine = staffLine;
                }
            }
            if (firstStaffLine !== undefined && lastStaffLine !== undefined) {
                this.createGroupBracket(firstStaffLine, lastStaffLine, recursionDepth);
            }
            if (instrumentGroup.InstrumentalGroups.length < 1) {
                continue;
            }
            this.createGroupBrackets(instrumentGroup.InstrumentalGroups, staffHeight, recursionDepth + 1);
        }
    }

    /**
     * Create the Instrument's Labels (only for the first [[MusicSystem]] of the first MusicPage).
     * @param instrumentLabelTextHeight
     * @param systemLabelsRightMargin
     * @param labelMarginBorderFactor
     */
    public createMusicSystemLabel(instrumentLabelTextHeight: number, systemLabelsRightMargin: number, labelMarginBorderFactor: number): void {
        if (this.parent === this.parent.Parent.MusicPages[0] && this === this.parent.MusicSystems[0]) {
            const instruments: Instrument[] = this.parent.Parent.ParentMusicSheet.getVisibleInstruments();
            for (let idx: number = 0, len: number = instruments.length; idx < len; ++idx) {
                const instrument: Instrument = instruments[idx];
                const graphicalLabel: GraphicalLabel = new GraphicalLabel(
                    instrument.NameLabel, instrumentLabelTextHeight, TextAlignmentEnum.LeftCenter, this.boundingBox
                );
                graphicalLabel.setLabelPositionAndShapeBorders();
                this.labels.setValue(graphicalLabel, instrument);
                // X-Position will be 0 (Label starts at the same PointF_2D with MusicSystem)
                // Y-Position will be calculated after the y-Spacing
                // graphicalLabel.PositionAndShape.RelativePosition = new PointF2D(0.0, 0.0);
            }

            // calculate maxLabelLength (needed for X-Spacing)
            this.maxLabelLength = 0.0;
            const labels: GraphicalLabel[] = this.labels.keys();
            for (let idx: number = 0, len: number = labels.length; idx < len; ++idx) {
                const label: GraphicalLabel = labels[idx];
                if (label.PositionAndShape.Size.width > this.maxLabelLength) {
                    this.maxLabelLength = label.PositionAndShape.Size.width;
                }
            }
            this.updateMusicSystemStaffLineXPosition(systemLabelsRightMargin);
        }
    }

    /**
     * Set the Y-Positions for the MusicSystem's Labels.
     */
    public setMusicSystemLabelsYPosition(): void {
        if (this.parent === this.parent.Parent.MusicPages[0] && this === this.parent.MusicSystems[0]) {
            this.labels.forEach((key: GraphicalLabel, value: Instrument): void => {
                let ypositionSum: number = 0;
                let staffCounter: number = 0;
                for (let i: number = 0; i < this.staffLines.length; i++) {
                    if (this.staffLines[i].ParentStaff.ParentInstrument === value) {
                        for (let j: number = i; j < this.staffLines.length; j++) {
                            const staffLine: StaffLine = this.staffLines[j];
                            if (staffLine.ParentStaff.ParentInstrument !== value) {
                                break;
                            }
                            ypositionSum += staffLine.PositionAndShape.RelativePosition.y;
                            staffCounter++;
                        }
                        break;
                    }
                }
                if (staffCounter > 0) {
                    key.PositionAndShape.RelativePosition = new PointF2D(0.0, ypositionSum / staffCounter + 2.0);
                }
            });
        }
    }

    /**
     * Check if two "adjacent" StaffLines have BOTH a StaffEntry with a StaffEntryLink.
     * This is needed for the y-spacing algorithm.
     * @returns {boolean}
     */
    public checkStaffEntriesForStaffEntryLink(): boolean {
        let first: boolean = false;
        let second: boolean = false;
        for (let i: number = 0; i < this.staffLines.length - 1; i++) {
            for (let idx: number = 0, len: number = this.staffLines[i].Measures.length; idx < len; ++idx) {
                const measure: GraphicalMeasure = this.staffLines[i].Measures[idx];
                for (let idx2: number = 0, len2: number = measure.staffEntries.length; idx2 < len2; ++idx2) {
                    const staffEntry: GraphicalStaffEntry = measure.staffEntries[idx2];
                    if (staffEntry.sourceStaffEntry.Link !== undefined) {
                        first = true;
                    }
                }
            }
            for (let idx: number = 0, len: number = this.staffLines[i + 1].Measures.length; idx < len; ++idx) {
                const measure: GraphicalMeasure = this.staffLines[i + 1].Measures[idx];
                for (let idx2: number = 0, len2: number = measure.staffEntries.length; idx2 < len2; ++idx2) {
                    const staffEntry: GraphicalStaffEntry = measure.staffEntries[idx2];
                    if (staffEntry.sourceStaffEntry.Link !== undefined) {
                        second = true;
                    }
                }
            }
        }
        if (first && second) {
            return true;
        }
        return false;
    }

    public getBottomStaffLine(topStaffLine: StaffLine): StaffLine {
        const staves: Staff[] = topStaffLine.ParentStaff.ParentInstrument.Staves;
        const last: Staff = staves[staves.length - 1];
        for (const line of topStaffLine.ParentMusicSystem.staffLines) {
            if (line.ParentStaff === last) {
                return line;
            }
        }
        return undefined;
    }

    /**
     * Here the system line is generated, which acts as the container of graphical lines and dots that will be finally rendered.
     * It holds al the logical parameters of the system line.
     * @param xPosition The x position within the system
     * @param lineWidth The total x width
     * @param lineType The line type enum
     * @param linePosition indicates if the line belongs to start or end of measure
     * @param musicSystem
     * @param topMeasure
     * @param bottomMeasure
     */
    protected createSystemLine(xPosition: number, lineWidth: number, lineType: SystemLinesEnum, linePosition: SystemLinePosition,
                               musicSystem: MusicSystem, topMeasure: GraphicalMeasure, bottomMeasure: GraphicalMeasure = undefined): SystemLine {
        throw new Error("not implemented");
    }

    /**
     * Create all the graphical lines and dots needed to render a system line (e.g. bold-thin-dots..).
     * @param systemLine
     */
    protected createLinesForSystemLine(systemLine: SystemLine): void {
        //Empty
    }

    /**
     * Calculates the summed x-width of a possibly given Instrument Brace and/or Group Bracket(s).
     * @returns {number} the x-width
     */
    protected calcBracketsWidth(): number {
        let width: number = 0;
        for (let idx: number = 0, len: number = this.GroupBrackets.length; idx < len; ++idx) {
            const groupBracket: GraphicalObject = this.GroupBrackets[idx];
            width = Math.max(width, groupBracket.PositionAndShape.Size.width);
        }
        for (let idx2: number = 0, len2: number = this.InstrumentBrackets.length; idx2 < len2; ++idx2) {
            const instrumentBracket: GraphicalObject = this.InstrumentBrackets[idx2];
            width = Math.max(width, instrumentBracket.PositionAndShape.Size.width);
        }
        return width;
    }

    protected createInstrumentBracket(firstStaffLine: StaffLine, lastStaffLine: StaffLine): void {
        // no impl here
    }

    protected createGroupBracket(firstStaffLine: StaffLine, lastStaffLine: StaffLine, recursionDepth: number): void {
        // no impl here
    }

    private findFirstVisibleInstrumentInInstrumentalGroup(instrumentalGroup: InstrumentalGroup): Instrument {
        for (let idx: number = 0, len: number = instrumentalGroup.InstrumentalGroups.length; idx < len; ++idx) {
            const groupOrInstrument: InstrumentalGroup = instrumentalGroup.InstrumentalGroups[idx];
            if (groupOrInstrument instanceof Instrument) {
                if ((<Instrument>groupOrInstrument).Visible === true) {
                    return <Instrument>groupOrInstrument;
                }
                continue;
            }
            return this.findFirstVisibleInstrumentInInstrumentalGroup(groupOrInstrument);
        }
        return undefined;
    }

    private findLastVisibleInstrumentInInstrumentalGroup(instrumentalGroup: InstrumentalGroup): Instrument {
        let groupOrInstrument: InstrumentalGroup;
        for (let i: number = instrumentalGroup.InstrumentalGroups.length - 1; i >= 0; i--) {
            groupOrInstrument = instrumentalGroup.InstrumentalGroups[i];
            if (groupOrInstrument instanceof Instrument) {
                if ((<Instrument>groupOrInstrument).Visible === true) {
                    return <Instrument>groupOrInstrument;
                }
                continue;
            }
            return this.findLastVisibleInstrumentInInstrumentalGroup(groupOrInstrument);
        }
        return undefined;
    }

    /**
     * Update the xPosition of the [[MusicSystem]]'s [[StaffLine]]'s due to [[Label]] positioning.
     * @param systemLabelsRightMargin
     */
    private updateMusicSystemStaffLineXPosition(systemLabelsRightMargin: number): void {
        for (let idx: number = 0, len: number = this.StaffLines.length; idx < len; ++idx) {
            const staffLine: StaffLine = this.StaffLines[idx];
            const relative: PointF2D = staffLine.PositionAndShape.RelativePosition;
            relative.x = this.maxLabelLength + systemLabelsRightMargin;
            staffLine.PositionAndShape.RelativePosition = relative;
            staffLine.PositionAndShape.BorderRight = this.boundingBox.Size.width - this.maxLabelLength - systemLabelsRightMargin;
            for (let i: number = 0; i < staffLine.StaffLines.length; i++) {
                const lineEnd: PointF2D = new PointF2D(staffLine.PositionAndShape.Size.width, staffLine.StaffLines[i].End.y);
                staffLine.StaffLines[i].End = lineEnd;
            }
        }
    }
}
