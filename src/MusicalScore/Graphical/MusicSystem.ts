import {StaffLine} from "./StaffLine";
import {Instrument} from "../Instrument";
import {BoundingBox} from "./BoundingBox";
import {Fraction} from "../../Common/DataObjects/fraction";
import {SourceMeasure} from "../VoiceData/SourceMeasure";
import {InstrumentalGroup} from "../InstrumentalGroup";
import {TextAlignment} from "../../Common/Enums/TextAlignment";
import {GraphicalMusicPage} from "./GraphicalMusicPage";
import {GraphicalLabel} from "./GraphicalLabel";
import {StaffMeasure} from "./StaffMeasure";
import {GraphicalObject} from "./GraphicalObject";
import {EngravingRules} from "./EngravingRules";
import {PointF2D} from "../../Common/DataObjects/PointF2D";
import {GraphicalStaffEntry} from "./GraphicalStaffEntry";

export class MusicSystem extends GraphicalObject {
    public NeedsToBeRedrawn: boolean = true;
    protected parent: GraphicalMusicPage;
    protected id: number;
    protected staffLines: StaffLine[] = [];
    protected graphicalMeasures: StaffMeasure[][] = [];
    protected labels: Dictionary<GraphicalLabel, Instrument> = new Dictionary<GraphicalLabel, Instrument>();
    protected measureNumberLabels: GraphicalLabel[] = [];
    protected maxLabelLength: number;
    protected objectsToRedraw: List<Tuple<Object[], Object>> = new List<Tuple<Object[], Object>>();
    constructor(parent: GraphicalMusicPage, id: number) {
        this.parent = parent;
        this.id = id;
        this.boundingBox = new BoundingBox(parent.PositionAndShape, this);
        this.maxLabelLength = 0.0;
    }
    public get Parent(): GraphicalMusicPage {
        return this.parent;
    }
    public set Parent(value: GraphicalMusicPage) {
        this.parent = value;
    }
    public get StaffLines(): StaffLine[] {
        return this.staffLines;
    }
    public get GraphicalMeasures(): StaffMeasure[][] {
        return this.graphicalMeasures;
    }
    public get MeasureNumberLabels(): GraphicalLabel[] {
        return this.measureNumberLabels;
    }
    public get Labels(): GraphicalLabel[] {
        return this.labels.Keys.ToList();
    }
    public get ObjectsToRedraw(): List<Tuple<Object[], Object>> {
        return this.objectsToRedraw;
    }
    public get Id(): number {
        return this.id;
    }
    public createSystemLeftVerticalLineObject(lineWidth: number, systemLabelsRightMargin: number): void { throw new Error('not implemented'); }
    public createVerticalLineForMeasure(position: number, lineType: SystemLinesEnum, lineWidth: number,
        index: number): void { throw new Error('not implemented'); }
    public setYPositionsToVerticalLineObjectsAndCreateLines(rules: EngravingRules): void { throw new Error('not implemented'); }
    public calculateBorders(rules: EngravingRules): void {

    }
    public alignBeginInstructions(): void {

    }
    public GetLeftBorderAbsoluteXPosition(): number {
        return this.StaffLines[0].PositionAndShape.AbsolutePosition.x + this.StaffLines[0].Measures[0].BeginInstructionsWidth;
    }
    public GetRightBorderAbsoluteXPosition(): number {
        return this.StaffLines[0].PositionAndShape.AbsolutePosition.x + this.StaffLines[0].StaffLines[0].End.x;
    }
    public AddStaffMeasures(graphicalMeasures: StaffMeasure[]): void {
        for (let idx: number = 0, len: number = graphicalMeasures.length; idx < len; ++idx) {
            let graphicalMeasure: StaffMeasure = graphicalMeasures[idx];
            graphicalMeasure.ParentMusicSystem = this;
        }
        this.graphicalMeasures.push(graphicalMeasures);
    }
    public GetSystemsFirstTimeStamp(): Fraction {
        return this.graphicalMeasures[0][0].ParentSourceMeasure.AbsoluteTimestamp;
    }
    public GetSystemsLastTimeStamp(): Fraction {
        let m: SourceMeasure = this.graphicalMeasures[this.graphicalMeasures.length - 1][0].ParentSourceMeasure;
        return m.AbsoluteTimestamp + m.Duration;
    }
    public createInstrumentBrackets(instruments: Instrument[], staffHeight: number): void {
        for (let idx: number = 0, len: number = instruments.length; idx < len; ++idx) {
            let instrument: Instrument = instruments[idx];
            if (instrument.Staves.length > 1) {
                let firstStaffLine: StaffLine = undefined, lastStaffLine = undefined;
                for (let idx2: number = 0, len2: number = this.staffLines.length; idx2 < len2; ++idx2) {
                    let staffLine: StaffLine = this.staffLines[idx2];
                    if (staffLine.ParentStaff === instrument.Staves[0])
                        firstStaffLine = staffLine;
                    if (staffLine.ParentStaff === instrument.Staves[instrument.Staves.length - 1])
                        lastStaffLine = staffLine;
                }
                if (firstStaffLine !== undefined && lastStaffLine !== undefined) {
                    let rightUpper: PointF2D = new PointF2D(firstStaffLine.PositionAndShape.RelativePosition.x,
                        firstStaffLine.PositionAndShape.RelativePosition.y);
                    let rightLower: PointF2D = new PointF2D(lastStaffLine.PositionAndShape.RelativePosition.x,
                        lastStaffLine.PositionAndShape.RelativePosition.y + staffHeight);
                    this.createInstrumentBracket(rightUpper, rightLower);
                }
            }
        }
    }
    public createGroupBrackets(instrumentGroups: InstrumentalGroup[], staffHeight: number, recursionDepth: number): void {
        for (let idx: number = 0, len: number = instrumentGroups.length; idx < len; ++idx) {
            let instrumentGroup: InstrumentalGroup = instrumentGroups[idx];
            if (instrumentGroup.InstrumentalGroups.length < 1)
                continue;
            let instrument1: Instrument = this.findFirstVisibleInstrumentInInstrumentalGroup(instrumentGroup);
            let instrument2: Instrument = this.findLastVisibleInstrumentInInstrumentalGroup(instrumentGroup);
            if (instrument1 === undefined || instrument2 === undefined)
                continue;
            let firstStaffLine: StaffLine = undefined, lastStaffLine = undefined;
            for (let idx2: number = 0, len2: number = this.staffLines.length; idx2 < len2; ++idx2) {
                let staffLine: StaffLine = this.staffLines[idx2];
                if (staffLine.ParentStaff === instrument1.Staves[0])
                    firstStaffLine = staffLine;
                if (staffLine.ParentStaff === instrument2.Staves.Last())
                    lastStaffLine = staffLine;
            }
            if (firstStaffLine !== undefined && lastStaffLine !== undefined) {
                let rightUpper: PointF2D = new PointF2D(firstStaffLine.PositionAndShape.RelativePosition.x,
                    firstStaffLine.PositionAndShape.RelativePosition.y);
                let rightLower: PointF2D = new PointF2D(lastStaffLine.PositionAndShape.RelativePosition.x,
                    lastStaffLine.PositionAndShape.RelativePosition.y + staffHeight);
                this.createGroupBracket(rightUpper, rightLower, staffHeight, recursionDepth);
            }
            if (instrumentGroup.InstrumentalGroups.length < 1)
                continue;
            this.createGroupBrackets(instrumentGroup.InstrumentalGroups, staffHeight, recursionDepth + 1);
        }
    }
    public createMusicSystemLabel(instrumentLabelTextHeight: number, systemLabelsRightMargin: number, labelMarginBorderFactor: number): void {
        if (this.parent === this.parent.Parent.MusicPages[0] && this === this.parent.MusicSystems[0]) {
            let instruments: Instrument[] = this.parent.Parent.ParentMusicSheet.Instruments.Where(i => i.Voices.length > 0 && i.Voices[0].Visible);
            for (let idx: number = 0, len: number = instruments.length; idx < len; ++idx) {
                let instrument: Instrument = instruments[idx];
                let graphicalLabel: GraphicalLabel = new GraphicalLabel(instrument.NameLabel, instrumentLabelTextHeight, TextAlignment.LeftCenter, this.boundingBox);
                graphicalLabel.setLabelPositionAndShapeBorders();
                this.labels.push(graphicalLabel, instrument);
                this.boundingBox.ChildElements.push(graphicalLabel.PositionAndShape);
                graphicalLabel.PositionAndShape.RelativePosition = new PointF2D(0.0, 0.0);
            }
            this.maxLabelLength = 0.0;
            let labels: GraphicalLabel[] = this.labels.Keys;
            for (let idx: number = 0, len: number = labels.length; idx < len; ++idx) {
                let label: GraphicalLabel = labels[idx];
                if (label.PositionAndShape.Size.width > this.maxLabelLength)
                    this.maxLabelLength = label.PositionAndShape.Size.width;
            }
            this.updateMusicSystemStaffLineXPosition(systemLabelsRightMargin);
        }
    }
    public setMusicSystemLabelsYPosition(): void {
        if (this.parent === this.parent.Parent.MusicPages[0] && this === this.parent.MusicSystems[0]) {
            let labels: KeyValuePair<GraphicalLabel, Instrument>[] = this.labels;
            for (let idx: number = 0, len: number = labels.length; idx < len; ++idx) {
                let entry: KeyValuePair<GraphicalLabel, Instrument> = labels[idx];
                let ypositionSum: number = 0;
                let staffCounter: number = 0;
                for (let i: number = 0; i < this.staffLines.length; i++) {
                    if (this.staffLines[i].ParentStaff.ParentInstrument === entry.Value) {
                        for (let j: number = i; j < this.staffLines.length; j++) {
                            let staffLine: StaffLine = this.staffLines[j];
                            if (staffLine.ParentStaff.ParentInstrument !== entry.Value)
                                break;
                            ypositionSum += staffLine.PositionAndShape.RelativePosition.y;
                            staffCounter++;
                        }
                        break;
                    }
                }
                if (staffCounter > 0)
                    entry.Key.PositionAndShape.RelativePosition = new PointF2D(0.0, ypositionSum / staffCounter + 2.0);
            }
        }
    }
    public checkStaffEntriesForStaffEntryLink(): boolean {
        let first: boolean = false;
        let second: boolean = false;
        for (let i: number = 0; i < this.staffLines.length - 1; i++) {
            for (let idx: number = 0, len: number = this.staffLines[i].Measures.length; idx < len; ++idx) {
                let measure: StaffMeasure = this.staffLines[i].Measures[idx];
                for (let idx2: number = 0, len2: number = measure.StaffEntries.length; idx2 < len2; ++idx2) {
                    let staffEntry: GraphicalStaffEntry = measure.StaffEntries[idx2];
                    if (staffEntry.SourceStaffEntry.Link !== undefined)
                        first = true;
                }
            }
            for (let idx: number = 0, len: number = this.staffLines[i + 1].Measures.length; idx < len; ++idx) {
                let measure: StaffMeasure = this.staffLines[i + 1].Measures[idx];
                for (let idx2: number = 0, len2: number = measure.StaffEntries.length; idx2 < len2; ++idx2) {
                    let staffEntry: GraphicalStaffEntry = measure.StaffEntries[idx2];
                    if (staffEntry.SourceStaffEntry.Link !== undefined)
                        second = true;
                }
            }
        }
        if (first && second)
            return true;
        return false;
    }
    protected calcInstrumentsBracketsWidth(): number { throw new Error('not implemented'); }
    protected createInstrumentBracket(rightUpper: PointF2D, rightLower: PointF2D): void { throw new Error('not implemented'); }
    protected createGroupBracket(rightUpper: PointF2D, rightLower: PointF2D, staffHeight: number,
        recursionDepth: number): void { throw new Error('not implemented'); }
    private findFirstVisibleInstrumentInInstrumentalGroup(instrumentalGroup: InstrumentalGroup): Instrument {
        for (let idx: number = 0, len: number = instrumentalGroup.InstrumentalGroups.length; idx < len; ++idx) {
            let groupOrInstrument: InstrumentalGroup = instrumentalGroup.InstrumentalGroups[idx];
            if (groupOrInstrument instanceof Instrument) {
                if ((<Instrument>groupOrInstrument).Visible === true)
                    return <Instrument>groupOrInstrument;
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
                if ((<Instrument>groupOrInstrument).Visible === true)
                    return <Instrument>groupOrInstrument;
                continue;
            }
            return this.findLastVisibleInstrumentInInstrumentalGroup(groupOrInstrument);
        }
        return undefined;
    }
    private updateMusicSystemStaffLineXPosition(systemLabelsRightMargin: number): void {
        for (let idx: number = 0, len: number = this.StaffLines.length; idx < len; ++idx) {
            let staffLine: StaffLine = this.StaffLines[idx];
            let relative: PointF2D = staffLine.PositionAndShape.RelativePosition;
            relative.x = this.maxLabelLength + systemLabelsRightMargin;
            staffLine.PositionAndShape.RelativePosition = relative;
            staffLine.PositionAndShape.BorderRight = this.boundingBox.Size.width - this.maxLabelLength - systemLabelsRightMargin;
            for (let i: number = 0; i < staffLine.StaffLines.length; i++) {
                let lineEnd: PointF2D = new PointF2D(staffLine.PositionAndShape.Size.width, staffLine.StaffLines[i].End.y);
                staffLine.StaffLines[i].End = lineEnd;
            }
        }
    }
}
