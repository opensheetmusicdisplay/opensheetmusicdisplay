import {StaffMeasure} from "./StaffMeasure";
import {GraphicalMusicPage} from "./GraphicalMusicPage";
import {EngravingRules} from "./EngravingRules";
import {RhythmInstruction} from "../VoiceData/Instructions/RhythmInstruction";
import {KeyInstruction} from "../VoiceData/Instructions/KeyInstruction";
import {ClefInstruction} from "../VoiceData/Instructions/ClefInstruction";
import {SourceMeasure} from "../VoiceData/SourceMeasure";
import {MusicSystem} from "./MusicSystem";
import {BoundingBox} from "./BoundingBox";
import {Staff} from "../VoiceData/Staff";
import {MusicSheet} from "../MusicSheet";
import {Instrument} from "../Instrument";
import {PointF_2D} from "../../Common/DataObjects/PointF_2D";
import {StaffLine} from "./StaffLine";
import {GraphicalLine} from "./GraphicalLine";
import {SourceStaffEntry} from "../VoiceData/SourceStaffEntry";
import {AbstractNotationInstruction} from "../VoiceData/Instructions/AbstractNotationInstruction";
import {SystemLinesEnum} from "./SystemLinesEnum";
export class MusicSystemBuilder {
    private measureList: List<List<StaffMeasure>>;
    private graphicalMusicSheet: GraphicalMusicSheet;
    private currentMusicPage: GraphicalMusicPage;
    private currentPageHeight: number;
    private currentSystemParams: SystemBuildParameters;
    private numberOfVisibleStaffLines: number;
    private rules: EngravingRules;
    private measureListIndex: number;
    private visibleStaffIndices: number[];
    private activeRhythm: RhythmInstruction[];
    private activeKeys: KeyInstruction[];
    private activeClefs: ClefInstruction[];
    private globalSystemIndex: number = 0;
    private leadSheet: boolean = false;
    private symbolFactory: IGraphicalSymbolFactory;
    public initialize(graphicalMusicSheet: GraphicalMusicSheet, measureList: List<List<StaffMeasure>>,
        numberOfStaffLines: number, symbolFactory: IGraphicalSymbolFactory): void {
        this.leadSheet = graphicalMusicSheet.LeadSheet;
        this.graphicalMusicSheet = graphicalMusicSheet;
        this.rules = this.graphicalMusicSheet.ParentMusicSheet.Rules;
        this.measureList = measureList;
        this.symbolFactory = symbolFactory;
        this.currentMusicPage = this.createMusicPage();
        this.currentPageHeight = 0.0f;
        this.numberOfVisibleStaffLines = numberOfStaffLines;
        this.activeRhythm = new Array(this.numberOfVisibleStaffLines);
        this.activeKeys = new Array(this.numberOfVisibleStaffLines);
        this.activeClefs = new Array(this.numberOfVisibleStaffLines);
        initializeActiveInstructions(this.measureList[0]);
    }
    public buildMusicSystems(): void {
        var previousMeasureEndsSystem: boolean = false;
        var systemMaxWidth: number = this.getFullPageSystemWidth();
        this.measureListIndex = 0;
        this.currentSystemParams = new SystemBuildParameters();
        this.currentSystemParams.currentSystem = this.initMusicSystem();
        this.layoutSystemStaves();
        this.currentSystemParams.currentSystem.createMusicSystemLabel(this.rules.InstrumentLabelTextHeight,
            this.rules.SystemLabelsRightMargin,
            this.rules.LabelMarginBorderFactor);
        this.currentPageHeight += this.currentSystemParams.currentSystem.PositionAndShape.RelativePosition.Y;
        var numberOfMeasures: number = this.measureList.Count(m => m.Any());
        while (this.measureListIndex < numberOfMeasures) {
            var staffMeasures: List<StaffMeasure> = this.measureList[this.measureListIndex];
            for (var idx: number = 0, len = staffMeasures.Count; idx < len; ++idx)
                staffMeasures[idx].ResetLayout();
            var sourceMeasure: SourceMeasure = staffMeasures[0].ParentSourceMeasure;
            var sourceMeasureEndsSystem: boolean = sourceMeasure.BreakSystemAfter;
            var isSystemStartMeasure: boolean = this.currentSystemParams.IsSystemStartMeasure();
            var isFirstSourceMeasure: boolean = sourceMeasure == this.graphicalMusicSheet.ParentMusicSheet.getFirstSourceMeasure();
            var currentMeasureBeginInstructionsWidth: number = this.rules.MeasureLeftMargin;
            var currentMeasureEndInstructionsWidth: number = 0;
            var measureStartLine: SystemLinesEnum = this.getMeasureStartLine();
            currentMeasureBeginInstructionsWidth += getLineWidth(staffMeasures[0], measureStartLine, isSystemStartMeasure);
            if (!this.leadSheet) {
                currentMeasureBeginInstructionsWidth += this.addBeginInstructions(staffMeasures, isSystemStartMeasure, isFirstSourceMeasure);
                currentMeasureEndInstructionsWidth += this.addEndInstructions(staffMeasures);
            }
            var currentMeasureVarWidth: number = 0;
            for (var i: number = 0; i < this.numberOfVisibleStaffLines; i++)
                currentMeasureVarWidth = Math.Max(currentMeasureVarWidth, staffMeasures[i].MinimumStaffEntriesWidth);
            var measureEndLine: SystemLinesEnum = this.getMeasureEndLine();
            currentMeasureEndInstructionsWidth += getLineWidth(staffMeasures[0], measureEndLine, isSystemStartMeasure);
            var nextMeasureBeginInstructionWidth: number = this.rules.MeasureLeftMargin;
            if (this.measureListIndex + 1 < this.measureList.Count) {
                var nextStaffMeasures: List<StaffMeasure> = this.measureList[this.measureListIndex + 1];
                var nextSourceMeasure: SourceMeasure = nextStaffMeasures[0].ParentSourceMeasure;
                if (nextSourceMeasure.hasBeginInstructions()) {
                    nextMeasureBeginInstructionWidth += this.addBeginInstructions(nextStaffMeasures, false, false);
                }
            }
            var totalMeasureWidth: number = currentMeasureBeginInstructionsWidth + currentMeasureEndInstructionsWidth + currentMeasureVarWidth;
            var measureFitsInSystem: boolean = this.currentSystemParams.currentWidth + totalMeasureWidth + nextMeasureBeginInstructionWidth < systemMaxWidth;
            if (isSystemStartMeasure || measureFitsInSystem) {
                this.addMeasureToSystem(staffMeasures, measureStartLine, measureEndLine, totalMeasureWidth, currentMeasureBeginInstructionsWidth, currentMeasureVarWidth, currentMeasureEndInstructionsWidth);
                this.updateActiveClefs(sourceMeasure, staffMeasures);
                this.measureListIndex++;
            }
            else {
                this.finalizeCurrentAndCreateNewSystem(staffMeasures, previousMeasureEndsSystem);
            }
            previousMeasureEndsSystem = sourceMeasureEndsSystem;
        }
        finalizeCurrentAndCreateNewSystem(this.measureList[this.measureList.Count - 1], true);
    }
    private setMeasureWidth(staffMeasures: List<StaffMeasure>, width: number, beginInstrWidth: number, endInstrWidth: number): void {
        for (var idx: number = 0, len = staffMeasures.Count; idx < len; ++idx) {
            var measure: StaffMeasure = staffMeasures[idx];
            measure.SetWidth(width);
            if (beginInstrWidth > 0)
                measure.BeginInstructionsWidth = beginInstrWidth;
            if (endInstrWidth > 0)
                measure.EndInstructionsWidth = endInstrWidth;
        }
    }
    private finalizeCurrentAndCreateNewSystem(measures: List<StaffMeasure>, isPartEndingSystem: boolean = false): void {
        this.adaptRepetitionLineWithIfNeeded();
        if (!isPartEndingSystem) {
            this.checkAndCreateExtraInstructionMeasure(measures);
        }
        this.stretchMusicSystem(isPartEndingSystem);
        if (this.currentPageHeight + this.currentSystemParams.currentSystem.PositionAndShape.Size.Height + this.rules.SystemDistance <= this.rules.PageHeight) {
            this.currentPageHeight += this.currentSystemParams.currentSystem.PositionAndShape.Size.Height + this.rules.SystemDistance;
            if (this.currentPageHeight + this.currentSystemParams.currentSystem.PositionAndShape.Size.Height + this.rules.SystemDistance >= this.rules.PageHeight) {
                this.currentMusicPage = this.createMusicPage();
                this.currentPageHeight = this.rules.PageTopMargin + this.rules.TitleTopDistance;
            }
        }
        else {
            this.currentMusicPage = this.createMusicPage();
            this.currentPageHeight = this.rules.PageTopMargin + this.rules.TitleTopDistance;
        }
        this.currentSystemParams = new SystemBuildParameters();
        if (this.measureListIndex < this.measureList.Count) {
            this.currentSystemParams.currentSystem = this.initMusicSystem();
            this.layoutSystemStaves();
        }
    }
    private adaptRepetitionLineWithIfNeeded(): void {
        var systemMeasures: List<MeasureBuildParameters> = this.currentSystemParams.systemMeasures;
        if (systemMeasures.Count >= 1) {
            var measures: List<StaffMeasure> = this.currentSystemParams.currentSystem.GraphicalMeasures[this.currentSystemParams.currentSystem.GraphicalMeasures.Count - 1];
            var measureParams: MeasureBuildParameters = systemMeasures[systemMeasures.Count - 1];
            var diff: number = 0.0f;
            if (measureParams.endLine == SystemLinesEnum.DotsBoldBoldDots) {
                measureParams.endLine = SystemLinesEnum.DotsThinBold;
                diff = measures[0].GetLineWidth(SystemLinesEnum.DotsBoldBoldDots) / 2 - measures[0].GetLineWidth(SystemLinesEnum.DotsThinBold);
            }
            this.currentSystemParams.currentSystemFixWidth -= diff;
            for (var idx: number = 0, len = measures.Count; idx < len; ++idx) {
                var measure: StaffMeasure = measures[idx];
                measure.EndInstructionsWidth -= diff;
            }
        }
    }
    private addMeasureToSystem(staffMeasures: List<StaffMeasure>, measureStartLine: SystemLinesEnum, measureEndLine: SystemLinesEnum, totalMeasureWidth: number, currentMeasureBeginInstructionsWidth: number, currentVarWidth: number, currentMeasureEndInstructionsWidth: number): void {
        this.currentSystemParams.systemMeasures.Add(__init(new MeasureBuildParameters(), { beginLine: measureStartLine, endLine: measureEndLine }));
        this.setMeasureWidth(staffMeasures, totalMeasureWidth, currentMeasureBeginInstructionsWidth,
            currentMeasureEndInstructionsWidth);
        this.addStaveMeasuresToSystem(staffMeasures);
        this.currentSystemParams.currentWidth += totalMeasureWidth;
        this.currentSystemParams.currentSystemFixWidth += currentMeasureBeginInstructionsWidth + currentMeasureEndInstructionsWidth;
        this.currentSystemParams.currentSystemVarWidth += currentVarWidth;
        this.currentSystemParams.systemMeasureIndex++;
    }
    private createMusicPage(): GraphicalMusicPage {
        var page: GraphicalMusicPage = new GraphicalMusicPage(this.graphicalMusicSheet);
        this.graphicalMusicSheet.MusicPages.Add(page);
        page.PositionAndShape.BorderLeft = 0.0f;
        page.PositionAndShape.BorderRight = this.graphicalMusicSheet.ParentMusicSheet.PageWidth;
        page.PositionAndShape.BorderTop = 0.0f;
        page.PositionAndShape.BorderBottom = this.rules.PageHeight;
        page.PositionAndShape.RelativePosition = new PointF_2D(0.0f, 0.0f);
        return page;
    }
    private initMusicSystem(): MusicSystem {
        var musicSystem: MusicSystem = this.symbolFactory.createMusicSystem(this.currentMusicPage, this.globalSystemIndex++);
        this.currentMusicPage.MusicSystems.Add(musicSystem);
        var boundingBox: BoundingBox = musicSystem.PositionAndShape;
        this.currentMusicPage.PositionAndShape.ChildElements.Add(boundingBox);
        return musicSystem;
    }
    private getFullPageSystemWidth(): number {
        return this.currentMusicPage.PositionAndShape.Size.Width - this.rules.PageLeftMargin - this.rules.PageRightMargin - this.rules.SystemLeftMargin - this.rules.SystemRightMargin;
    }
    private layoutSystemStaves(): void {
        var systemWidth: number = this.getFullPageSystemWidth();
        var musicSystem: MusicSystem = this.currentSystemParams.currentSystem;
        var boundingBox: BoundingBox = musicSystem.PositionAndShape;
        boundingBox.BorderLeft = 0.0f;
        boundingBox.BorderRight = systemWidth;
        boundingBox.BorderTop = 0.0f;
        var staffList: List<Staff> = new List<Staff>();
        var musicSheet: MusicSheet = this.graphicalMusicSheet.ParentMusicSheet;
        var instruments: Instrument[] = musicSheet.Instruments.Where(i => i.Voices.Count > 0 && i.Voices[0].Visible).ToArray();
        for (var idx: number = 0, len = instruments.length; idx < len; ++idx) {
            var instrument: Instrument = instruments[idx];
            for (var idx2: number = 0, len2 = instrument.Staves.Count; idx2 < len2; ++idx2) {
                var staff: Staff = instrument.Staves[idx2];
                staffList.Add(staff);
            }
        }
        var multiLyrics: boolean = false;
        if (this.leadSheet) {
            for (var idx: number = 0, len = staffList.Count; idx < len; ++idx) {
                var staff: Staff = staffList[idx];
                if (staff.ParentInstrument.LyricVersesNumbers.Count > 1) {
                    multiLyrics = true;
                    break;
                }
            }
        }
        var yOffsetSum: number = 0;
        for (var i: number = 0; i < staffList.Count; i++) {
            this.addStaffLineToMusicSystem(musicSystem, yOffsetSum, staffList[i]);
            yOffsetSum += this.rules.StaffHeight;
            if (i + 1 < staffList.Count) {
                var yOffset: number = 0;
                if (this.leadSheet && !multiLyrics) {
                    yOffset = 2.5f;
                }
                else {
                    if (staffList[i].ParentInstrument == staffList[i + 1].ParentInstrument)
                        yOffset = this.rules.BetweenStaffDistance;
                    else yOffset = this.rules.StaffDistance;
                }
                yOffsetSum += yOffset;
            }
        }
        boundingBox.BorderBottom = yOffsetSum;
    }
    private addStaffLineToMusicSystem(musicSystem: MusicSystem, relativeYPosition: number, staff: Staff): void {
        if (musicSystem != null) {
            var staffLine: StaffLine = this.symbolFactory.createStaffLine(musicSystem, staff);
            musicSystem.StaffLines.Add(staffLine);
            var boundingBox: BoundingBox = staffLine.PositionAndShape;
            musicSystem.PositionAndShape.ChildElements.Add(boundingBox);
            var relativePosition: PointF_2D = new PointF_2D();
            if (musicSystem.Parent.MusicSystems[0] == musicSystem && musicSystem.Parent == musicSystem.Parent.Parent.MusicPages[0])
                relativePosition.X = this.rules.FirstSystemMargin;
            else relativePosition.X = 0.0f;
            relativePosition.Y = relativeYPosition;
            boundingBox.RelativePosition = relativePosition;
            if (musicSystem.Parent.MusicSystems[0] == musicSystem && musicSystem.Parent == musicSystem.Parent.Parent.MusicPages[0])
                boundingBox.BorderRight = musicSystem.PositionAndShape.Size.Width - this.rules.FirstSystemMargin;
            else boundingBox.BorderRight = musicSystem.PositionAndShape.Size.Width;
            boundingBox.BorderLeft = 0.0f;
            boundingBox.BorderTop = 0.0f;
            boundingBox.BorderBottom = this.rules.StaffHeight;
            for (var i: number = 0; i < 5; i++) {
                var start: PointF_2D = new PointF_2D();
                start.X = 0.0f;
                start.Y = i * this.rules.StaffHeight / 4;
                var end: PointF_2D = new PointF_2D();
                end.X = staffLine.PositionAndShape.Size.Width;
                end.Y = i * this.rules.StaffHeight / 4;
                if (this.leadSheet)
                    start.Y = end.Y = 0;
                staffLine.StaffLines[i] = new GraphicalLine(start, end, this.rules.StaffLineWidth);
            }
        }
    }
    private initializeActiveInstructions(measureList: List<StaffMeasure>): void {
        var firstSourceMeasure: SourceMeasure = this.graphicalMusicSheet.ParentMusicSheet.getFirstSourceMeasure();
        if (firstSourceMeasure != null) {
            this.visibleStaffIndices = this.graphicalMusicSheet.getVisibleStavesIndecesFromSourceMeasure(measureList).ToArray();
            for (var i: number = 0, len = this.visibleStaffIndices.length; i < len; i++) {
                var staffIndex: number = this.visibleStaffIndices[i];
                var graphicalMeasure: StaffMeasure = this.graphicalMusicSheet.getGraphicalMeasureFromSourceMeasureAndIndex(firstSourceMeasure, staffIndex);
                this.activeClefs[i] = <ClefInstruction>firstSourceMeasure.FirstInstructionsStaffEntries[staffIndex].Instructions[0];
                var keyInstruction: KeyInstruction = new KeyInstruction(<KeyInstruction>firstSourceMeasure.FirstInstructionsStaffEntries[staffIndex].Instructions[1]);
                keyInstruction = this.transposeKeyInstruction(keyInstruction, graphicalMeasure);
                this.activeKeys[i] = keyInstruction;
                this.activeRhythm[i] = <RhythmInstruction>firstSourceMeasure.FirstInstructionsStaffEntries[staffIndex].Instructions[2];
            }
        }
    }
    private transposeKeyInstruction(keyInstruction: KeyInstruction, graphicalMeasure: StaffMeasure): KeyInstruction {
        if (this.graphicalMusicSheet.ParentMusicSheet.Transpose != 0 && graphicalMeasure.ParentStaff.ParentInstrument.MidiInstrumentId != Common.Enums.MidiInstrument.Percussion && MusicSheetCalculator.TransposeCalculator != null)
            MusicSheetCalculator.TransposeCalculator.TransposeKey(keyInstruction,
                this.graphicalMusicSheet.ParentMusicSheet.Transpose);
        return keyInstruction;
    }
    private addBeginInstructions(measures: List<StaffMeasure>, isSystemFirstMeasure: boolean, isFirstSourceMeasure: boolean): number {
        var measureCount: number = measures.Count;
        if (measureCount == 0)
            return 0;
        var totalBeginInstructionLengthX: number = 0.0f;
        var sourceMeasure: SourceMeasure = measures[0].ParentSourceMeasure;
        for (var idx: number = 0; idx < measureCount; ++idx) {
            var measure: StaffMeasure = measures[idx];
            var staffIndex: number = this.visibleStaffIndices[idx];
            var beginInstructionsStaffEntry: SourceStaffEntry = sourceMeasure.FirstInstructionsStaffEntries[staffIndex];
            var beginInstructionLengthX: number = this.AddInstructionsAtMeasureBegin(beginInstructionsStaffEntry, measure,
                idx, isFirstSourceMeasure,
                isSystemFirstMeasure);
            totalBeginInstructionLengthX = Math.Max(totalBeginInstructionLengthX, beginInstructionLengthX);
        }
        return totalBeginInstructionLengthX;
    }
    private addEndInstructions(measures: List<StaffMeasure>): number {
        var measureCount: number = measures.Count;
        if (measureCount == 0)
            return 0;
        var totalEndInstructionLengthX: number = 0.5f;
        var sourceMeasure: SourceMeasure = measures[0].ParentSourceMeasure;
        for (var idx: number = 0; idx < measureCount; idx++) {
            var measure: StaffMeasure = measures[idx];
            var staffIndex: number = this.visibleStaffIndices[idx];
            var endInstructionsStaffEntry: SourceStaffEntry = sourceMeasure.LastInstructionsStaffEntries[staffIndex];
            var endInstructionLengthX: number = this.addInstructionsAtMeasureEnd(endInstructionsStaffEntry, measure);
            totalEndInstructionLengthX = Math.Max(totalEndInstructionLengthX, endInstructionLengthX);
        }
        return totalEndInstructionLengthX;
    }
    private AddInstructionsAtMeasureBegin(firstEntry: SourceStaffEntry, measure: StaffMeasure,
        visibleStaffIdx: number, isFirstSourceMeasure: boolean, isSystemStartMeasure: boolean): number {
        var instructionsLengthX: number = 0;
        var currentClef: ClefInstruction = null;
        var currentKey: KeyInstruction = null;
        var currentRhythm: RhythmInstruction = null;
        if (firstEntry != null) {
            for (var idx: number = 0, len = firstEntry.Instructions.Count; idx < len; ++idx) {
                var abstractNotationInstruction: AbstractNotationInstruction = firstEntry.Instructions[idx];
                if (abstractNotationInstruction instanceof ClefInstruction) {
                    currentClef = <ClefInstruction>abstractNotationInstruction;
                }
                else if (abstractNotationInstruction instanceof KeyInstruction) {
                    currentKey = <KeyInstruction>abstractNotationInstruction;
                }
                else if (abstractNotationInstruction instanceof RhythmInstruction) {
                    currentRhythm = <RhythmInstruction>abstractNotationInstruction;
                }
            }
        }
        if (isSystemStartMeasure) {
            if (currentClef == null) {
                currentClef = this.activeClefs[visibleStaffIdx];
            }
            if (currentKey == null) {
                currentKey = this.activeKeys[visibleStaffIdx];
            }
            if (isFirstSourceMeasure && currentRhythm == null) {
                currentRhythm = this.activeRhythm[visibleStaffIdx];
            }
        }
        var clefAdded: boolean = false;
        var keyAdded: boolean = false;
        var rhythmAdded: boolean = false;
        if (currentClef != null) {
            measure.AddClefAtBegin(currentClef);
            clefAdded = true;
        }
        else {
            currentClef = this.activeClefs[visibleStaffIdx];
        }
        if (currentKey != null) {
            currentKey = this.transposeKeyInstruction(currentKey, measure);
            var previousKey: KeyInstruction = isSystemStartMeasure ? null : this.activeKeys[visibleStaffIdx];
            measure.AddKeyAtBegin(currentKey, previousKey, currentClef);
            keyAdded = true;
        }
        if (currentRhythm != null) {
            measure.AddRhythmAtBegin(currentRhythm);
            rhythmAdded = true;
        }
        if (clefAdded || keyAdded || rhythmAdded) {
            instructionsLengthX += measure.BeginInstructionsWidth;
            if (rhythmAdded)
                instructionsLengthX += this.rules.RhythmRightMargin;
        }
        return instructionsLengthX;
    }
    private addInstructionsAtMeasureEnd(lastEntry: SourceStaffEntry, measure: StaffMeasure): number {
        if (lastEntry == null || lastEntry.Instructions == null || lastEntry.Instructions.Count == 0)
            return 0;
        for (var idx: number = 0, len = lastEntry.Instructions.Count; idx < len; ++idx) {
            var abstractNotationInstruction: AbstractNotationInstruction = lastEntry.Instructions[idx];
            if (abstractNotationInstruction instanceof ClefInstruction) {
                var activeClef: ClefInstruction = <ClefInstruction>abstractNotationInstruction;
                measure.AddClefAtEnd(activeClef);
            }
        }
        return this.rules.MeasureRightMargin + measure.EndInstructionsWidth;
    }
    private updateActiveClefs(measure: SourceMeasure, staffMeasures: List<StaffMeasure>): void {
        for (var visStaffIdx: number = 0, len = staffMeasures.Count; visStaffIdx < len; visStaffIdx++) {
            var staffIndex: number = this.visibleStaffIndices[visStaffIdx];
            var firstEntry: SourceStaffEntry = measure.FirstInstructionsStaffEntries[staffIndex];
            if (firstEntry != null) {
                for (var idx: number = 0, len2 = firstEntry.Instructions.Count; idx < len2; ++idx) {
                    var abstractNotationInstruction: AbstractNotationInstruction = firstEntry.Instructions[idx];
                    if (abstractNotationInstruction instanceof ClefInstruction) {
                        this.activeClefs[visStaffIdx] = <ClefInstruction>abstractNotationInstruction;
                    }
                    else if (abstractNotationInstruction instanceof KeyInstruction) {
                        this.activeKeys[visStaffIdx] = <KeyInstruction>abstractNotationInstruction;
                    }
                    else if (abstractNotationInstruction instanceof RhythmInstruction) {
                        this.activeRhythm[visStaffIdx] = <RhythmInstruction>abstractNotationInstruction;
                    }
                }
            }
            var entries: List<SourceStaffEntry> = measure.getEntriesPerStaff(staffIndex);
            for (var idx: number = 0, len2 = entries.Count; idx < len2; ++idx) {
                var staffEntry: SourceStaffEntry = entries[idx];
                if (staffEntry.Instructions != null) {
                    for (var idx2: number = 0, len3 = staffEntry.Instructions.Count; idx2 < len3; ++idx2) {
                        var abstractNotationInstruction: AbstractNotationInstruction = staffEntry.Instructions[idx2];
                        if (abstractNotationInstruction instanceof ClefInstruction) {
                            this.activeClefs[visStaffIdx] = <ClefInstruction>abstractNotationInstruction;
                        }
                    }
                }
            }
            var lastEntry: SourceStaffEntry = measure.LastInstructionsStaffEntries[staffIndex];
            if (lastEntry != null) {
                var instructions: List<AbstractNotationInstruction> = lastEntry.Instructions;
                for (var idx: number = 0, len3 = instructions.Count; idx < len3; ++idx) {
                    var abstractNotationInstruction: AbstractNotationInstruction = instructions[idx];
                    if (abstractNotationInstruction instanceof ClefInstruction) {
                        this.activeClefs[visStaffIdx] = <ClefInstruction>abstractNotationInstruction;
                    }
                }
            }
        }
    }
    private checkAndCreateExtraInstructionMeasure(measures: List<StaffMeasure>): void {
        var firstStaffEntries: List<SourceStaffEntry> = measures[0].ParentSourceMeasure.FirstInstructionsStaffEntries;
        var visibleInstructionEntries: List<SourceStaffEntry> = new List<SourceStaffEntry>();
        for (var idx: number = 0, len = measures.Count; idx < len; ++idx) {
            var measure: StaffMeasure = measures[idx];
            visibleInstructionEntries.Add(firstStaffEntries[measure.ParentStaff.IdInMusicSheet]);
        }
        var maxMeasureWidth: number = 0;
        for (var visStaffIdx: number = 0, len = visibleInstructionEntries.Count; visStaffIdx < len; ++visStaffIdx) {
            var sse: SourceStaffEntry = visibleInstructionEntries[visStaffIdx];
            if (sse == null)
                continue;
            var instructions: List<AbstractNotationInstruction> = sse.Instructions;
            var keyInstruction: KeyInstruction = null;
            var rhythmInstruction: RhythmInstruction = null;
            for (var idx2: number = 0, len2 = instructions.Count; idx2 < len2; ++idx2) {
                var instruction: AbstractNotationInstruction = instructions[idx2];
                if (instruction instanceof KeyInstruction && (<KeyInstruction>instruction).Key != this.activeKeys[visStaffIdx].Key)
                    keyInstruction = <KeyInstruction>instruction;
                if (instruction instanceof RhythmInstruction && (<RhythmInstruction>instruction) != this.activeRhythm[visStaffIdx])
                    rhythmInstruction = <RhythmInstruction>instruction;
            }
            if (keyInstruction != null || rhythmInstruction != null) {
                var measureWidth: number = this.addExtraInstructionMeasure(visStaffIdx, keyInstruction, rhythmInstruction);
                maxMeasureWidth = Math.Max(maxMeasureWidth, measureWidth);
            }
        }
        if (maxMeasureWidth > 0) {
            this.currentSystemParams.systemMeasures.Add(__init(new MeasureBuildParameters(), { beginLine: SystemLinesEnum.None, endLine: SystemLinesEnum.None }));
            this.currentSystemParams.currentWidth += maxMeasureWidth;
            this.currentSystemParams.currentSystemFixWidth += maxMeasureWidth;
        }
    }
    private addExtraInstructionMeasure(visStaffIdx: number, keyInstruction: KeyInstruction, rhythmInstruction: RhythmInstruction): number {
        var currentSystem: MusicSystem = this.currentSystemParams.currentSystem;
        var measures: List<StaffMeasure> = new List<StaffMeasure>();
        var measure: StaffMeasure = this.symbolFactory.createExtraStaffMeasure(currentSystem.StaffLines[visStaffIdx]);
        measures.Add(measure);
        if (keyInstruction != null) {
            measure.AddKeyAtBegin(keyInstruction, this.activeKeys[visStaffIdx], this.activeClefs[visStaffIdx]);
        }
        if (rhythmInstruction != null) {
            measure.AddRhythmAtBegin(rhythmInstruction);
        }
        measure.PositionAndShape.BorderLeft = 0.0f;
        measure.PositionAndShape.BorderTop = 0.0f;
        measure.PositionAndShape.BorderBottom = this.rules.StaffHeight;
        var width: number = this.rules.MeasureLeftMargin + measure.BeginInstructionsWidth + this.rules.MeasureRightMargin;
        measure.PositionAndShape.BorderRight = width;
        currentSystem.StaffLines[visStaffIdx].Measures.Add(measure);
        measure.ParentStaffLine = currentSystem.StaffLines[visStaffIdx];
        currentSystem.StaffLines[visStaffIdx].PositionAndShape.ChildElements.Add(measure.PositionAndShape);
        return width;
    }
    private addStaveMeasuresToSystem(staffMeasures: List<StaffMeasure>): void {
        if (staffMeasures[0] != null) {
            var gmeasures: List<StaffMeasure> = new List<StaffMeasure>();
            for (var i: number = 0; i < staffMeasures.Count; i++)
                gmeasures.Add(staffMeasures[i]);
            var currentSystem: MusicSystem = this.currentSystemParams.currentSystem;
            for (var visStaffIdx: number = 0; visStaffIdx < this.numberOfVisibleStaffLines; visStaffIdx++) {
                var measure: StaffMeasure = gmeasures[visStaffIdx];
                currentSystem.StaffLines[visStaffIdx].Measures.Add(measure);
                measure.ParentStaffLine = currentSystem.StaffLines[visStaffIdx];
                currentSystem.StaffLines[visStaffIdx].PositionAndShape.ChildElements.Add(measure.PositionAndShape);
            }
            currentSystem.AddStaffMeasures(gmeasures);
        }
    }
    private getMeasureStartLine(): SystemLinesEnum {
        var thisMeasureBeginsLineRep: boolean = this.thisMeasureBeginsLineRepetition();
        if (thisMeasureBeginsLineRep) {
            var isSystemStartMeasure: boolean = this.currentSystemParams.IsSystemStartMeasure();
            var isGlobalFirstMeasure: boolean = this.measureListIndex == 0;
            if (this.previousMeasureEndsLineRepetition() && !isSystemStartMeasure) {
                return SystemLinesEnum.DotsBoldBoldDots;
            }
            if (!isGlobalFirstMeasure)
                return SystemLinesEnum.BoldThinDots;
        }
        return SystemLinesEnum.None;
    }
    private getMeasureEndLine(): SystemLinesEnum {
        if (this.nextMeasureBeginsLineRepetition() && this.thisMeasureEndsLineRepetition()) {
            return SystemLinesEnum.DotsBoldBoldDots;
        }
        if (this.thisMeasureEndsLineRepetition()) {
            return SystemLinesEnum.DotsThinBold;
        }
        if (this.measureListIndex == this.measureList.Count - 1 || this.measureList[this.measureListIndex][0].ParentSourceMeasure.EndsPiece) {
            return SystemLinesEnum.ThinBold;
        }
        if (this.nextMeasureHasKeyInstructionChange() || this.thisMeasureEndsWordRepetition() || this.nextMeasureBeginsWordRepetition()) {
            return SystemLinesEnum.DoubleThin;
        }
        return SystemLinesEnum.SingleThin;
    }
    private getLineWidth(measure: StaffMeasure, systemLineEnum: SystemLinesEnum, isSystemStartMeasure: boolean): number {
        var width: number = measure.GetLineWidth(systemLineEnum);
        if (systemLineEnum == SystemLinesEnum.DotsBoldBoldDots) {
            width /= 2;
        }
        if (isSystemStartMeasure && systemLineEnum == SystemLinesEnum.BoldThinDots) {
            width += this.rules.DistanceBetweenLastInstructionAndRepetitionBarline;
        }
        return width;
    }
    private previousMeasureEndsLineRepetition(): boolean {
        if (this.measureListIndex == 0)
            return false;
        for (var idx: number = 0, len = this.measureList[this.measureListIndex - 1].Count; idx < len; ++idx) {
            var measure: StaffMeasure = this.measureList[this.measureListIndex - 1][idx];
            if (measure.endsWithLineRepetition())
                return true;
        }
        return false;
    }
    private thisMeasureBeginsLineRepetition(): boolean {
        for (var idx: number = 0, len = this.measureList[this.measureListIndex].Count; idx < len; ++idx) {
            var measure: StaffMeasure = this.measureList[this.measureListIndex][idx];
            if (measure.beginsWithLineRepetition())
                return true;
        }
        return false;
    }
    private nextMeasureBeginsLineRepetition(): boolean {
        var nextMeasureIndex: number = this.measureListIndex + 1;
        if (nextMeasureIndex >= this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures.Count)
            return false;
        for (var idx: number = 0, len = this.measureList[nextMeasureIndex].Count; idx < len; ++idx) {
            var measure: StaffMeasure = this.measureList[nextMeasureIndex][idx];
            if (measure.beginsWithLineRepetition())
                return true;
        }
        return false;
    }
    private thisMeasureEndsLineRepetition(): boolean {
        for (var idx: number = 0, len = this.measureList[this.measureListIndex].Count; idx < len; ++idx) {
            var measure: StaffMeasure = this.measureList[this.measureListIndex][idx];
            if (measure.endsWithLineRepetition())
                return true;
        }
        return false;
    }
    private nextMeasureBeginsWordRepetition(): boolean {
        var nextMeasureIndex: number = this.measureListIndex + 1;
        if (nextMeasureIndex >= this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures.Count)
            return false;
        for (var idx: number = 0, len = this.measureList[nextMeasureIndex].Count; idx < len; ++idx) {
            var measure: StaffMeasure = this.measureList[nextMeasureIndex][idx];
            if (measure.beginsWithWordRepetition())
                return true;
        }
        return false;
    }
    private thisMeasureEndsWordRepetition(): boolean {
        for (var idx: number = 0, len = this.measureList[this.measureListIndex].Count; idx < len; ++idx) {
            var measure: StaffMeasure = this.measureList[this.measureListIndex][idx];
            if (measure.endsWithWordRepetition())
                return true;
        }
        return false;
    }
    private nextMeasureHasKeyInstructionChange(): boolean {
        return this.getNextMeasureKeyInstruction() != null;
    }
    private getNextMeasureKeyInstruction(): KeyInstruction {
        if (this.measureListIndex < this.measureList.Count - 1) {
            for (var visIndex: number = 0; visIndex < this.measureList[this.measureListIndex].Count; visIndex++) {
                var sourceMeasure: SourceMeasure = this.measureList[this.measureListIndex + 1][visIndex].ParentSourceMeasure;
                if (sourceMeasure == null)
                    return null;
                return sourceMeasure.getKeyInstruction(this.visibleStaffIndices[visIndex]);
            }
        }
        return null;
    }
    private calculateXScalingFactor(systemFixWidth: number, systemVarWidth: number): number {
        if (Math.Abs(systemVarWidth - 0) < 0.00001f || Math.Abs(systemFixWidth - 0) < 0.00001f)
        return 1.0f;
        var systemEndX: number;
        var currentSystem: MusicSystem = this.currentSystemParams.currentSystem;
        systemEndX = currentSystem.StaffLines[0].PositionAndShape.Size.Width;
        var scalingFactor: number = (systemEndX - systemFixWidth) / systemVarWidth;
        return scalingFactor;
    }
    private stretchMusicSystem(isPartEndingSystem: boolean): void {
        var scalingFactor: number = this.calculateXScalingFactor(this.currentSystemParams.currentSystemFixWidth, this.currentSystemParams.currentSystemVarWidth);
        if (isPartEndingSystem)
            scalingFactor = Math.Min(scalingFactor, this.rules.LastSystemMaxScalingFactor);
        var currentSystem: MusicSystem = this.currentSystemParams.currentSystem;
        for (var visStaffIdx: number = 0, len = currentSystem.StaffLines.Count; visStaffIdx < len; ++visStaffIdx) {
            var staffLine: StaffLine = currentSystem.StaffLines[visStaffIdx];
            var currentXPosition: number = 0.0f;
            for (var i: number = 0; i < staffLine.Measures.Count; i++) {
                var measure: StaffMeasure = staffLine.Measures[i];
                measure.SetPositionInStaffline(currentXPosition);
                measure.SetWidth(measure.BeginInstructionsWidth + measure.MinimumStaffEntriesWidth * scalingFactor + measure.EndInstructionsWidth);
                if (i < this.currentSystemParams.systemMeasures.Count) {
                    var startLine: SystemLinesEnum = this.currentSystemParams.systemMeasures[i].beginLine;
                    var lineWidth: number = measure.GetLineWidth(SystemLinesEnum.BoldThinDots);
                    switch (startLine) {
                        case SystemLinesEnum.BoldThinDots:
                            {
                                var xPosition: number = currentXPosition;
                                if (i == 0) {
                                    xPosition = currentXPosition + measure.BeginInstructionsWidth - lineWidth;
                                }
                                currentSystem.createVerticalLineForMeasure(xPosition, SystemLinesEnum.BoldThinDots, lineWidth, visStaffIdx);
                                break;
                            }
                    }
                }
                measure.StaffEntriesScaleFactor = scalingFactor;
                measure.LayoutSymbols();
                var nextMeasureHasRepStartLine: boolean = i + 1 < this.currentSystemParams.systemMeasures.Count && this.currentSystemParams.systemMeasures[i + 1].beginLine == SystemLinesEnum.BoldThinDots;
                if (!nextMeasureHasRepStartLine) {
                    var endLine: SystemLinesEnum = SystemLinesEnum.SingleThin;
                    if (i < this.currentSystemParams.systemMeasures.Count) {
                        endLine = this.currentSystemParams.systemMeasures[i].endLine;
                    }
                    var lineWidth: number = measure.GetLineWidth(endLine);
                    var xPos: number = measure.PositionAndShape.RelativePosition.X + measure.PositionAndShape.BorderRight - lineWidth;
                    if (endLine == SystemLinesEnum.DotsBoldBoldDots)
                        xPos -= lineWidth / 2;
                    currentSystem.createVerticalLineForMeasure(xPos, endLine, lineWidth, visStaffIdx);
                }
                currentXPosition = measure.PositionAndShape.RelativePosition.X + measure.PositionAndShape.BorderRight;
            }
        }
        if (isPartEndingSystem)
            this.decreaseMusicSystemBorders();
    }
    private decreaseMusicSystemBorders(): void {
        var currentSystem: MusicSystem = this.currentSystemParams.currentSystem;
        var width: number = currentSystem.StaffLines[0].Measures.Last().PositionAndShape.RelativePosition.X + currentSystem.StaffLines[0].Measures.Last().PositionAndShape.Size.Width;
        for (var idx: number = 0, len = currentSystem.StaffLines.Count; idx < len; ++idx) {
            var staffLine: StaffLine = currentSystem.StaffLines[idx];
            staffLine.PositionAndShape.BorderRight = width;
            for (var idx2: number = 0, len2 = staffLine.StaffLines.Length; idx2 < len2; ++idx2) {
                var graphicalLine: GraphicalLine = staffLine.StaffLines[idx2];
                graphicalLine.End = new PointF_2D(width, graphicalLine.End.Y);
            }
        }
        currentSystem.PositionAndShape.BorderRight = width + this.currentSystemParams.MaxLabelLength + this.rules.SystemLabelsRightMargin;
    }
}
export class SystemBuildParameters {
    public currentSystem: MusicSystem;
    public systemMeasures: List<MeasureBuildParameters> = new List<MeasureBuildParameters>();
    public systemMeasureIndex: number = 0;
    public currentWidth: number = 0;
    public currentSystemFixWidth: number = 0;
    public currentSystemVarWidth: number = 0;
    public MaxLabelLength: number = 0;
    public IsSystemStartMeasure(): boolean {
        return this.systemMeasureIndex == 0;
    }
}

export class MeasureBuildParameters {
    public beginLine: SystemLinesEnum;
    public endLine: SystemLinesEnum;
}
