import {StaffLine} from "./StaffLine";
import {Instrument} from "../Instrument";
import {BoundingBox} from "./BoundingBox";
import {Fraction} from "../../Common/DataObjects/fraction";
import {SourceMeasure} from "../VoiceData/SourceMeasure";
import {InstrumentalGroup} from "../InstrumentalGroup";
import {TextAlignment} from "../../Common/Enums/TextAlignment";
module PhonicScore.MusicalScore.Graphical.SheetData {
    export class MusicSystem extends GraphicalObject {
        public NeedsToBeRedrawn: boolean = true;
        protected parent: GraphicalMusicPage;
        protected id: number;
        protected staffLines: List<StaffLine> = new List<StaffLine>();
        protected graphicalMeasures: List<List<StaffMeasure>> = new List<List<StaffMeasure>>();
        protected labels: Dictionary<GraphicalLabel, Instrument> = new Dictionary<GraphicalLabel, Instrument>();
        protected measureNumberLabels: List<GraphicalLabel> = new List<GraphicalLabel>();
        protected maxLabelLength: number;
        protected objectsToRedraw: List<Tuple<List<Object>, Object>> = new List<Tuple<List<Object>, Object>>();
        constructor(parent: GraphicalMusicPage, id: number) {
            this.parent = parent;
            this.id = id;
            this.boundingBox = new BoundingBox(parent.PositionAndShape, this);
            this.maxLabelLength = 0.0f;
        }
        public get Parent(): GraphicalMusicPage {
            return this.parent;
        }
        public set Parent(value: GraphicalMusicPage) {
            this.parent = value;
        }
        public get StaffLines(): List<StaffLine> {
            return this.staffLines;
        }
        public get GraphicalMeasures(): List<List<StaffMeasure>> {
            return this.graphicalMeasures;
        }
        public get MeasureNumberLabels(): List<GraphicalLabel> {
            return this.measureNumberLabels;
        }
        public get Labels(): List<GraphicalLabel> {
            return this.labels.Keys.ToList();
        }
        public get ObjectsToRedraw(): List<Tuple<List<Object>, Object>> {
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
            return this.StaffLines[0].PositionAndShape.AbsolutePosition.X + this.StaffLines[0].Measures[0].BeginInstructionsWidth;
        }
        public GetRightBorderAbsoluteXPosition(): number {
            return this.StaffLines[0].PositionAndShape.AbsolutePosition.X + this.StaffLines[0].StaffLines[0].End.X;
        }
        public AddStaffMeasures(graphicalMeasures: List<StaffMeasure>): void {
            for (var idx: number = 0, len = graphicalMeasures.Count; idx < len; ++idx) {
                var graphicalMeasure: StaffMeasure = graphicalMeasures[idx];
                graphicalMeasure.ParentMusicSystem = this;
            }
            this.graphicalMeasures.Add(graphicalMeasures);
        }
        public GetSystemsFirstTimeStamp(): Fraction {
            return this.graphicalMeasures[0][0].ParentSourceMeasure.AbsoluteTimestamp;
        }
        public GetSystemsLastTimeStamp(): Fraction {
            var m: SourceMeasure = this.graphicalMeasures[this.graphicalMeasures.Count - 1][0].ParentSourceMeasure;
            return m.AbsoluteTimestamp + m.Duration;
        }
        public createInstrumentBrackets(instruments: List<Instrument>, staffHeight: number): void {
            for (var idx: number = 0, len = instruments.Count; idx < len; ++idx) {
                var instrument: Instrument = instruments[idx];
                if (instrument.Staves.Count > 1) {
                    var firstStaffLine: StaffLine = null, lastStaffLine = null;
                    for (var idx2: number = 0, len2 = this.staffLines.Count; idx2 < len2; ++idx2) {
                        var staffLine: StaffLine = this.staffLines[idx2];
                        if (staffLine.ParentStaff == instrument.Staves[0])
                            firstStaffLine = staffLine;
                        if (staffLine.ParentStaff == instrument.Staves[instrument.Staves.Count - 1])
                            lastStaffLine = staffLine;
                    }
                    if (firstStaffLine != null && lastStaffLine != null) {
                        var rightUpper: PointF_2D = new PointF_2D(firstStaffLine.PositionAndShape.RelativePosition.X,
                            firstStaffLine.PositionAndShape.RelativePosition.Y);
                        var rightLower: PointF_2D = new PointF_2D(lastStaffLine.PositionAndShape.RelativePosition.X,
                            lastStaffLine.PositionAndShape.RelativePosition.Y + staffHeight);
                        this.createInstrumentBracket(rightUpper, rightLower);
                    }
                }
            }
        }
        public createGroupBrackets(instrumentGroups: List<InstrumentalGroup>, staffHeight: number, recursionDepth: number): void {
            for (var idx: number = 0, len = instrumentGroups.Count; idx < len; ++idx) {
                var instrumentGroup: InstrumentalGroup = instrumentGroups[idx];
                if (instrumentGroup.InstrumentalGroups.Count < 1)
                    continue;
                var instrument1: Instrument = this.findFirstVisibleInstrumentInInstrumentalGroup(instrumentGroup);
                var instrument2: Instrument = this.findLastVisibleInstrumentInInstrumentalGroup(instrumentGroup);
                if (instrument1 == null || instrument2 == null)
                    continue;
                var firstStaffLine: StaffLine = null, lastStaffLine = null;
                for (var idx2: number = 0, len2 = this.staffLines.Count; idx2 < len2; ++idx2) {
                    var staffLine: StaffLine = this.staffLines[idx2];
                    if (staffLine.ParentStaff == instrument1.Staves[0])
                        firstStaffLine = staffLine;
                    if (staffLine.ParentStaff == instrument2.Staves.Last())
                        lastStaffLine = staffLine;
                }
                if (firstStaffLine != null && lastStaffLine != null) {
                    var rightUpper: PointF_2D = new PointF_2D(firstStaffLine.PositionAndShape.RelativePosition.X,
                        firstStaffLine.PositionAndShape.RelativePosition.Y);
                    var rightLower: PointF_2D = new PointF_2D(lastStaffLine.PositionAndShape.RelativePosition.X,
                        lastStaffLine.PositionAndShape.RelativePosition.Y + staffHeight);
                    this.createGroupBracket(rightUpper, rightLower, staffHeight, recursionDepth);
                }
                if (instrumentGroup.InstrumentalGroups.Count < 1)
                    continue;
                createGroupBrackets(instrumentGroup.InstrumentalGroups, staffHeight, recursionDepth + 1);
            }
        }
        public createMusicSystemLabel(instrumentLabelTextHeight: number, systemLabelsRightMargin: number, labelMarginBorderFactor: number): void {
            if (this.parent == this.parent.Parent.MusicPages[0] && this == this.parent.MusicSystems[0]) {
                var instruments: Instrument[] = this.parent.Parent.ParentMusicSheet.Instruments.Where(i => i.Voices.Count > 0 && i.Voices[0].Visible).ToArray();
                for (var idx: number = 0, len = instruments.length; idx < len; ++idx) {
                    var instrument: Instrument = instruments[idx];
                    var graphicalLabel: GraphicalLabel = new GraphicalLabel(instrument.NameLabel, instrumentLabelTextHeight, TextAlignment.LeftCenter, this.boundingBox);
                    graphicalLabel.setLabelPositionAndShapeBorders();
                    this.labels.Add(graphicalLabel, instrument);
                    this.boundingBox.ChildElements.Add(graphicalLabel.PositionAndShape);
                    graphicalLabel.PositionAndShape.RelativePosition = new PointF_2D(0.0, 0.0);
                }
                this.maxLabelLength = 0.0f;
                var labels: GraphicalLabel[] = this.labels.Keys.ToArray();
                for (var idx: number = 0, len = labels.length; idx < len; ++idx) {
                    var label: GraphicalLabel = labels[idx];
                    if (label.PositionAndShape.Size.Width > this.maxLabelLength)
                        this.maxLabelLength = label.PositionAndShape.Size.Width;
                }
                this.updateMusicSystemStaffLineXPosition(systemLabelsRightMargin);
            }
        }
        public setMusicSystemLabelsYPosition(): void {
            if (this.parent == this.parent.Parent.MusicPages[0] && this == this.parent.MusicSystems[0]) {
                var labels: KeyValuePair<GraphicalLabel, Instrument>[] = this.labels.ToArray();
                for (var idx: number = 0, len = labels.length; idx < len; ++idx) {
                    var entry: KeyValuePair<GraphicalLabel, Instrument> = labels[idx];
                    var ypositionSum: number = 0;
                    var staffCounter: number = 0;
                    for (var i: number = 0; i < this.staffLines.Count; i++) {
                        if (this.staffLines[i].ParentStaff.ParentInstrument == entry.Value) {
                            for (var j: number = i; j < this.staffLines.Count; j++) {
                                var staffLine: StaffLine = this.staffLines[j];
                                if (staffLine.ParentStaff.ParentInstrument != entry.Value)
                                    break;
                                ypositionSum += staffLine.PositionAndShape.RelativePosition.Y;
                                staffCounter++;
                            }
                            break;
                        }
                    }
                    if (staffCounter > 0)
                        entry.Key.PositionAndShape.RelativePosition = new PointF_2D(0.0, ypositionSum / staffCounter + 2.0);
                }
            }
        }
        public checkStaffEntriesForStaffEntryLink(): boolean {
            var first: boolean = false;
            var second: boolean = false;
            for (var i: number = 0; i < this.staffLines.Count - 1; i++) {
                for (var idx: number = 0, len = this.staffLines[i].Measures.Count; idx < len; ++idx) {
                    var measure: StaffMeasure = this.staffLines[i].Measures[idx];
                    for (var idx2: number = 0, len2 = measure.StaffEntries.Count; idx2 < len2; ++idx2) {
                        var staffEntry: GraphicalStaffEntry = measure.StaffEntries[idx2];
                        if (staffEntry.SourceStaffEntry.Link != null)
                            first = true;
                    }
                }
                for (var idx: number = 0, len = this.staffLines[i + 1].Measures.Count; idx < len; ++idx) {
                    var measure: StaffMeasure = this.staffLines[i + 1].Measures[idx];
                    for (var idx2: number = 0, len2 = measure.StaffEntries.Count; idx2 < len2; ++idx2) {
                        var staffEntry: GraphicalStaffEntry = measure.StaffEntries[idx2];
                        if (staffEntry.SourceStaffEntry.Link != null)
                            second = true;
                    }
                }
            }
            if (first && second)
                return true;
            return false;
        }
        protected calcInstrumentsBracketsWidth(): number { throw new Error('not implemented'); }
        protected createInstrumentBracket(rightUpper: PointF_2D, rightLower: PointF_2D): void { throw new Error('not implemented'); }
        protected createGroupBracket(rightUpper: PointF_2D, rightLower: PointF_2D, staffHeight: number,
            recursionDepth: number): void { throw new Error('not implemented'); }
        private findFirstVisibleInstrumentInInstrumentalGroup(instrumentalGroup: InstrumentalGroup): Instrument {
            for (var idx: number = 0, len = instrumentalGroup.InstrumentalGroups.Count; idx < len; ++idx) {
                var groupOrInstrument: InstrumentalGroup = instrumentalGroup.InstrumentalGroups[idx];
                if (groupOrInstrument instanceof Instrument) {
                    if ((<Instrument>groupOrInstrument).Visible == true)
                        return <Instrument>groupOrInstrument;
                    continue;
                }
                return this.findFirstVisibleInstrumentInInstrumentalGroup(groupOrInstrument);
            }
            return null;
        }
        private findLastVisibleInstrumentInInstrumentalGroup(instrumentalGroup: InstrumentalGroup): Instrument {
            var groupOrInstrument: InstrumentalGroup;
            for (var i: number = instrumentalGroup.InstrumentalGroups.Count - 1; i >= 0; i--) {
                groupOrInstrument = instrumentalGroup.InstrumentalGroups[i];
                if (groupOrInstrument instanceof Instrument) {
                    if ((<Instrument>groupOrInstrument).Visible == true)
                        return <Instrument>groupOrInstrument;
                    continue;
                }
                return this.findLastVisibleInstrumentInInstrumentalGroup(groupOrInstrument);
            }
            return null;
        }
        private updateMusicSystemStaffLineXPosition(systemLabelsRightMargin: number): void {
            for (var idx: number = 0, len = this.StaffLines.Count; idx < len; ++idx) {
                var staffLine: StaffLine = this.StaffLines[idx];
                var relative: PointF_2D = staffLine.PositionAndShape.RelativePosition;
                relative.X = this.maxLabelLength + systemLabelsRightMargin;
                staffLine.PositionAndShape.RelativePosition = relative;
                staffLine.PositionAndShape.BorderRight = this.boundingBox.Size.Width - this.maxLabelLength - systemLabelsRightMargin;
                for (var i: number = 0; i < staffLine.StaffLines.Length; i++) {
                    var lineEnd: PointF_2D = new PointF_2D(staffLine.PositionAndShape.Size.Width, staffLine.StaffLines[i].End.Y);
                    staffLine.StaffLines[i].End = lineEnd;
                }
            }
        }
    }
}