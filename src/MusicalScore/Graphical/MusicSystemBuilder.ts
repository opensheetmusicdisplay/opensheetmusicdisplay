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
import {Instrument} from "../Instrument";
import {PointF2D} from "../../Common/DataObjects/PointF2D";
import {StaffLine} from "./StaffLine";
import {GraphicalLine} from "./GraphicalLine";
import {SourceStaffEntry} from "../VoiceData/SourceStaffEntry";
import {AbstractNotationInstruction} from "../VoiceData/Instructions/AbstractNotationInstruction";
import {SystemLinesEnum} from "./SystemLinesEnum";
import {GraphicalMusicSheet} from "./GraphicalMusicSheet";
import {IGraphicalSymbolFactory} from "../Interfaces/IGraphicalSymbolFactory";
import {MusicSheetCalculator} from "./MusicSheetCalculator";
import {MidiInstrument} from "../VoiceData/Instructions/ClefInstruction";
import {CollectionUtil} from "../../Util/CollectionUtil";
import {SystemLinePosition} from "./SystemLinePosition";

export class MusicSystemBuilder {
    private measureList: StaffMeasure[][];
    private graphicalMusicSheet: GraphicalMusicSheet;
    private currentMusicPage: GraphicalMusicPage;
    private currentPageHeight: number;
    private currentSystemParams: SystemBuildParameters;
    private numberOfVisibleStaffLines: number;
    private rules: EngravingRules;
    private measureListIndex: number;

    /**
     * Does the mapping from the currently visible staves to the global staff-list of the music sheet.
     */
    private visibleStaffIndices: number[];
    private activeRhythm: RhythmInstruction[];
    private activeKeys: KeyInstruction[];
    private activeClefs: ClefInstruction[];
    private globalSystemIndex: number = 0;
    private leadSheet: boolean = false;
    private symbolFactory: IGraphicalSymbolFactory;

    public initialize(
        graphicalMusicSheet: GraphicalMusicSheet, measureList: StaffMeasure[][], numberOfStaffLines: number, symbolFactory: IGraphicalSymbolFactory
    ): void {
        this.leadSheet = graphicalMusicSheet.LeadSheet;
        this.graphicalMusicSheet = graphicalMusicSheet;
        this.rules = this.graphicalMusicSheet.ParentMusicSheet.rules;
        this.measureList = measureList;
        this.symbolFactory = symbolFactory;
        this.currentMusicPage = this.createMusicPage();
        this.currentPageHeight = 0.0;
        this.numberOfVisibleStaffLines = numberOfStaffLines;
        this.activeRhythm = new Array(this.numberOfVisibleStaffLines);
        this.activeKeys = new Array(this.numberOfVisibleStaffLines);
        this.activeClefs = new Array(this.numberOfVisibleStaffLines);
        this.initializeActiveInstructions(this.measureList[0]);
    }

    public buildMusicSystems(): void {
        let previousMeasureEndsSystem: boolean = false;
        let systemMaxWidth: number = this.getFullPageSystemWidth();
        this.measureListIndex = 0;
        this.currentSystemParams = new SystemBuildParameters();

        // the first System - create also its Labels
        this.currentSystemParams.currentSystem = this.initMusicSystem();
        this.layoutSystemStaves();
        this.currentSystemParams.currentSystem.createMusicSystemLabel(
            this.rules.InstrumentLabelTextHeight,
            this.rules.SystemLabelsRightMargin,
            this.rules.LabelMarginBorderFactor
        );
        this.currentPageHeight += this.currentSystemParams.currentSystem.PositionAndShape.RelativePosition.y;

        let numberOfMeasures: number = 0;
        for (let idx: number = 0, len: number = this.measureList.length; idx < len; ++idx) {
            if (this.measureList[idx].length > 0) {
                numberOfMeasures++;
            }
        }

        // go through measures and add to system until system gets too long -> finish system and start next system.
        while (this.measureListIndex < numberOfMeasures) {
            let staffMeasures: StaffMeasure[] = this.measureList[this.measureListIndex];
            for (let idx: number = 0, len: number = staffMeasures.length; idx < len; ++idx) {
                staffMeasures[idx].resetLayout();
            }
            let sourceMeasure: SourceMeasure = staffMeasures[0].parentSourceMeasure;
            let sourceMeasureEndsSystem: boolean = sourceMeasure.BreakSystemAfter;
            let isSystemStartMeasure: boolean = this.currentSystemParams.IsSystemStartMeasure();
            let isFirstSourceMeasure: boolean = sourceMeasure === this.graphicalMusicSheet.ParentMusicSheet.getFirstSourceMeasure();
            let currentMeasureBeginInstructionsWidth: number = this.rules.MeasureLeftMargin;
            let currentMeasureEndInstructionsWidth: number = 0;

            // calculate the current Measure Width:
            // The width of a measure is build up from
            // 1. the begin instructions (clef, Key, Rhythm),
            // 2. the staff entries (= notes) and
            // 3. the end instructions (actually only clefs)
            let measureStartLine: SystemLinesEnum = this.getMeasureStartLine();
            currentMeasureBeginInstructionsWidth += this.getLineWidth(staffMeasures[0], measureStartLine, isSystemStartMeasure);
            if (!this.leadSheet) {
                currentMeasureBeginInstructionsWidth += this.addBeginInstructions(staffMeasures, isSystemStartMeasure, isFirstSourceMeasure);
                currentMeasureEndInstructionsWidth += this.addEndInstructions(staffMeasures);
            }
            let currentMeasureVarWidth: number = 0;
            for (let i: number = 0; i < this.numberOfVisibleStaffLines; i++) {
                currentMeasureVarWidth = Math.max(currentMeasureVarWidth, staffMeasures[i].minimumStaffEntriesWidth);
            }

            // take into account the LineWidth after each Measure
            let measureEndLine: SystemLinesEnum = this.getMeasureEndLine();
            currentMeasureEndInstructionsWidth += this.getLineWidth(staffMeasures[0], measureEndLine, isSystemStartMeasure);
            let nextMeasureBeginInstructionWidth: number = this.rules.MeasureLeftMargin;

            // Check if there are key or rhythm change instructions within the next measure:
            if (this.measureListIndex + 1 < this.measureList.length) {
                let nextStaffMeasures: StaffMeasure[] = this.measureList[this.measureListIndex + 1];
                let nextSourceMeasure: SourceMeasure = nextStaffMeasures[0].parentSourceMeasure;
                if (nextSourceMeasure.hasBeginInstructions()) {
                    nextMeasureBeginInstructionWidth += this.addBeginInstructions(nextStaffMeasures, false, false);
                }
            }
            let totalMeasureWidth: number = currentMeasureBeginInstructionsWidth + currentMeasureEndInstructionsWidth + currentMeasureVarWidth;
            let measureFitsInSystem: boolean = this.currentSystemParams.currentWidth + totalMeasureWidth + nextMeasureBeginInstructionWidth < systemMaxWidth;
            if (isSystemStartMeasure || measureFitsInSystem) {
                this.addMeasureToSystem(
                    staffMeasures, measureStartLine, measureEndLine, totalMeasureWidth,
                    currentMeasureBeginInstructionsWidth, currentMeasureVarWidth, currentMeasureEndInstructionsWidth
                );
                this.updateActiveClefs(sourceMeasure, staffMeasures);
                this.measureListIndex++;
            } else {
                // finalize current system and prepare a new one
                this.finalizeCurrentAndCreateNewSystem(staffMeasures, previousMeasureEndsSystem);
                // don't increase measure index to check this measure now again
            }
            previousMeasureEndsSystem = sourceMeasureEndsSystem;
        }
        this.finalizeCurrentAndCreateNewSystem(this.measureList[this.measureList.length - 1], true);
    }

    /**
     * Set the Width of the staff-Measures of one source measure.
     * @param staffMeasures
     * @param width
     * @param beginInstrWidth
     * @param endInstrWidth
     */
    private setMeasureWidth(staffMeasures: StaffMeasure[], width: number, beginInstrWidth: number, endInstrWidth: number): void {
        for (let idx: number = 0, len: number = staffMeasures.length; idx < len; ++idx) {
            let measure: StaffMeasure = staffMeasures[idx];
            measure.setWidth(width);
            if (beginInstrWidth > 0) {
                measure.beginInstructionsWidth = beginInstrWidth;
            }
            if (endInstrWidth > 0) {
                measure.endInstructionsWidth = endInstrWidth;
            }
        }
    }

    /**
     * When the actual source measure doesn't fit any more, this method finalizes the current system and
     * opens up a new empty system, where the actual measure will be added in the next iteration.
     * @param measures
     * @param isPartEndingSystem
     */
    private finalizeCurrentAndCreateNewSystem(measures: StaffMeasure[], isPartEndingSystem: boolean = false): void {
        this.adaptRepetitionLineWithIfNeeded();
        if (!isPartEndingSystem) {
            this.checkAndCreateExtraInstructionMeasure(measures);
        }
        this.stretchMusicSystem(isPartEndingSystem);
        if (this.currentPageHeight + this.currentSystemParams.currentSystem.PositionAndShape.Size.height + this.rules.SystemDistance <= this.rules.PageHeight) {
            this.currentPageHeight += this.currentSystemParams.currentSystem.PositionAndShape.Size.height + this.rules.SystemDistance;
            if (
                this.currentPageHeight + this.currentSystemParams.currentSystem.PositionAndShape.Size.height
                + this.rules.SystemDistance >= this.rules.PageHeight
            ) {
                this.currentMusicPage = this.createMusicPage();
                this.currentPageHeight = this.rules.PageTopMargin + this.rules.TitleTopDistance;
            }
        } else {
            this.currentMusicPage = this.createMusicPage();
            this.currentPageHeight = this.rules.PageTopMargin + this.rules.TitleTopDistance;
        }
        this.currentSystemParams = new SystemBuildParameters();
        if (this.measureListIndex < this.measureList.length) {
            this.currentSystemParams.currentSystem = this.initMusicSystem();
            this.layoutSystemStaves();
        }
    }

    /**
     * If a line repetition is ending and a new line repetition is starting at the end of the system,
     * the double repetition line has to be split into two: one at the currently ending system and
     * one at the next system.
     * (this should be refactored at some point to not use a combined end/start line but always separated lines)
     */
    private adaptRepetitionLineWithIfNeeded(): void {
        let systemMeasures: MeasureBuildParameters[] = this.currentSystemParams.systemMeasures;
        if (systemMeasures.length >= 1) {
            let measures: StaffMeasure[] =
                this.currentSystemParams.currentSystem.GraphicalMeasures[this.currentSystemParams.currentSystem.GraphicalMeasures.length - 1];
            let measureParams: MeasureBuildParameters = systemMeasures[systemMeasures.length - 1];
            let diff: number = 0.0;
            if (measureParams.endLine === SystemLinesEnum.DotsBoldBoldDots) {
                measureParams.endLine = SystemLinesEnum.DotsThinBold;
                diff = measures[0].getLineWidth(SystemLinesEnum.DotsBoldBoldDots) / 2 - measures[0].getLineWidth(SystemLinesEnum.DotsThinBold);
            }
            this.currentSystemParams.currentSystemFixWidth -= diff;
            for (let idx: number = 0, len: number = measures.length; idx < len; ++idx) {
                let measure: StaffMeasure = measures[idx];
                measure.endInstructionsWidth -= diff;
            }
        }
    }

    private addMeasureToSystem(
        staffMeasures: StaffMeasure[], measureStartLine: SystemLinesEnum, measureEndLine: SystemLinesEnum,
        totalMeasureWidth: number, currentMeasureBeginInstructionsWidth: number, currentVarWidth: number, currentMeasureEndInstructionsWidth: number
    ): void {
        this.currentSystemParams.systemMeasures.push({beginLine: measureStartLine, endLine: measureEndLine});
        this.setMeasureWidth(
            staffMeasures, totalMeasureWidth, currentMeasureBeginInstructionsWidth, currentMeasureEndInstructionsWidth
        );
        this.addStaveMeasuresToSystem(staffMeasures);
        this.currentSystemParams.currentWidth += totalMeasureWidth;
        this.currentSystemParams.currentSystemFixWidth += currentMeasureBeginInstructionsWidth + currentMeasureEndInstructionsWidth;
        this.currentSystemParams.currentSystemVarWidth += currentVarWidth;
        this.currentSystemParams.systemMeasureIndex++;
    }

    /**
     * Create a new [[GraphicalMusicPage]]
     * (for now only one long page is used per music sheet, as we scroll down and have no page flips)
     * @returns {GraphicalMusicPage}
     */
    private createMusicPage(): GraphicalMusicPage {
        let page: GraphicalMusicPage = new GraphicalMusicPage(this.graphicalMusicSheet);
        this.graphicalMusicSheet.MusicPages.push(page);
        page.PositionAndShape.BorderLeft = 0.0;
        page.PositionAndShape.BorderRight = this.graphicalMusicSheet.ParentMusicSheet.pageWidth;
        page.PositionAndShape.BorderTop = 0.0;
        page.PositionAndShape.BorderBottom = this.rules.PageHeight;
        page.PositionAndShape.RelativePosition = new PointF2D(0.0, 0.0);
        return page;
    }

    /**
     * Initialize a new [[MusicSystem]].
     * @returns {MusicSystem}
     */
    private initMusicSystem(): MusicSystem {
        let musicSystem: MusicSystem = this.symbolFactory.createMusicSystem(this.currentMusicPage, this.globalSystemIndex++);
        this.currentMusicPage.MusicSystems.push(musicSystem);
        let boundingBox: BoundingBox = musicSystem.PositionAndShape;
        this.currentMusicPage.PositionAndShape.ChildElements.push(boundingBox);
        return musicSystem;
    }

    /**
     * Get the width the system should have for a given page width.
     * @returns {number}
     */
    private getFullPageSystemWidth(): number {
        return this.currentMusicPage.PositionAndShape.Size.width - this.rules.PageLeftMargin
            - this.rules.PageRightMargin - this.rules.SystemLeftMargin - this.rules.SystemRightMargin;
    }

    private layoutSystemStaves(): void {
        let systemWidth: number = this.getFullPageSystemWidth();
        let musicSystem: MusicSystem = this.currentSystemParams.currentSystem;
        let boundingBox: BoundingBox = musicSystem.PositionAndShape;
        boundingBox.BorderLeft = 0.0;
        boundingBox.BorderRight = systemWidth;
        boundingBox.BorderTop = 0.0;
        let staffList: Staff[] = [];
        let instruments: Instrument[] = this.graphicalMusicSheet.ParentMusicSheet.Instruments;
        for (let idx: number = 0, len: number = instruments.length; idx < len; ++idx) {
            let instrument: Instrument = instruments[idx];
            if (instrument.Voices.length === 0 || !instrument.Visible) {
                continue;
            }
            for (let idx2: number = 0, len2: number = instrument.Staves.length; idx2 < len2; ++idx2) {
                let staff: Staff = instrument.Staves[idx2];
                staffList.push(staff);
            }
        }
        let multiLyrics: boolean = false;
        if (this.leadSheet) {
            for (let idx: number = 0, len: number = staffList.length; idx < len; ++idx) {
                let staff: Staff = staffList[idx];
                if (staff.ParentInstrument.LyricVersesNumbers.length > 1) {
                    multiLyrics = true;
                    break;
                }
            }
        }
        let yOffsetSum: number = 0;
        for (let i: number = 0; i < staffList.length; i++) {
            this.addStaffLineToMusicSystem(musicSystem, yOffsetSum, staffList[i]);
            yOffsetSum += this.rules.StaffHeight;
            if (i + 1 < staffList.length) {
                let yOffset: number = 0;
                if (this.leadSheet && !multiLyrics) {
                    yOffset = 2.5;
                } else {
                    if (staffList[i].ParentInstrument === staffList[i + 1].ParentInstrument) {
                        yOffset = this.rules.BetweenStaffDistance;
                    } else {
                        yOffset = this.rules.StaffDistance;
                    }
                }
                yOffsetSum += yOffset;
            }
        }
        boundingBox.BorderBottom = yOffsetSum;
    }

    /**
     * Calculate the [[StaffLine]](s) needed for a [[MusicSystem]].
     * @param musicSystem
     * @param relativeYPosition
     * @param staff
     */
    private addStaffLineToMusicSystem(musicSystem: MusicSystem, relativeYPosition: number, staff: Staff): void {
        if (musicSystem !== undefined) {
            let staffLine: StaffLine = this.symbolFactory.createStaffLine(musicSystem, staff);
            musicSystem.StaffLines.push(staffLine);
            let boundingBox: BoundingBox = staffLine.PositionAndShape;
            musicSystem.PositionAndShape.ChildElements.push(boundingBox);
            let relativePosition: PointF2D = new PointF2D();
            if (musicSystem.Parent.MusicSystems[0] === musicSystem && musicSystem.Parent === musicSystem.Parent.Parent.MusicPages[0]) {
                relativePosition.x = this.rules.FirstSystemMargin;
            } else {
                relativePosition.x = 0.0;
            }
            relativePosition.y = relativeYPosition;
            boundingBox.RelativePosition = relativePosition;
            if (musicSystem.Parent.MusicSystems[0] === musicSystem && musicSystem.Parent === musicSystem.Parent.Parent.MusicPages[0]) {
                boundingBox.BorderRight = musicSystem.PositionAndShape.Size.width - this.rules.FirstSystemMargin;
            } else {
                boundingBox.BorderRight = musicSystem.PositionAndShape.Size.width;
            }
            boundingBox.BorderLeft = 0.0;
            boundingBox.BorderTop = 0.0;
            boundingBox.BorderBottom = this.rules.StaffHeight;
            for (let i: number = 0; i < 5; i++) {
                let start: PointF2D = new PointF2D();
                start.x = 0.0;
                start.y = i * this.rules.StaffHeight / 4;
                let end: PointF2D = new PointF2D();
                end.x = staffLine.PositionAndShape.Size.width;
                end.y = i * this.rules.StaffHeight / 4;
                if (this.leadSheet) {
                    start.y = end.y = 0;
                }
                staffLine.StaffLines[i] = new GraphicalLine(start, end, this.rules.StaffLineWidth);
            }
        }
    }

    /**
     * Initialize the active Instructions from the first [[SourceMeasure]] of first [[SourceMusicPart]].
     * @param measureList
     */
    private initializeActiveInstructions(measureList: StaffMeasure[]): void {
        let firstSourceMeasure: SourceMeasure = this.graphicalMusicSheet.ParentMusicSheet.getFirstSourceMeasure();
        if (firstSourceMeasure !== undefined) {
            this.visibleStaffIndices = this.graphicalMusicSheet.getVisibleStavesIndecesFromSourceMeasure(measureList);
            for (let i: number = 0, len: number = this.visibleStaffIndices.length; i < len; i++) {
                let staffIndex: number = this.visibleStaffIndices[i];
                let graphicalMeasure: StaffMeasure = this.graphicalMusicSheet.getGraphicalMeasureFromSourceMeasureAndIndex(firstSourceMeasure, staffIndex);
                this.activeClefs[i] = <ClefInstruction>firstSourceMeasure.FirstInstructionsStaffEntries[staffIndex].Instructions[0];
                let keyInstruction: KeyInstruction = KeyInstruction.copy(
                    <KeyInstruction>firstSourceMeasure.FirstInstructionsStaffEntries[staffIndex].Instructions[1]);
                keyInstruction = this.transposeKeyInstruction(keyInstruction, graphicalMeasure);
                this.activeKeys[i] = keyInstruction;
                this.activeRhythm[i] = <RhythmInstruction>firstSourceMeasure.FirstInstructionsStaffEntries[staffIndex].Instructions[2];
            }
        }
    }

    private transposeKeyInstruction(keyInstruction: KeyInstruction, graphicalMeasure: StaffMeasure): KeyInstruction {
        if (this.graphicalMusicSheet.ParentMusicSheet.Transpose !== 0
            && graphicalMeasure.ParentStaff.ParentInstrument.MidiInstrumentId !== MidiInstrument.Percussion
            && MusicSheetCalculator.transposeCalculator !== undefined
        ) {
            MusicSheetCalculator.transposeCalculator.transposeKey(
                keyInstruction,
                this.graphicalMusicSheet.ParentMusicSheet.Transpose
            );
        }
        return keyInstruction;
    }

    /**
     * Calculate the width needed for Instructions (Key, Clef, Rhythm, Repetition) for the measure.
     * @param measures
     * @param isSystemFirstMeasure
     * @param isFirstSourceMeasure
     * @returns {number}
     */
    private addBeginInstructions(measures: StaffMeasure[], isSystemFirstMeasure: boolean, isFirstSourceMeasure: boolean): number {
        let measureCount: number = measures.length;
        if (measureCount === 0) {
            return 0;
        }
        let totalBeginInstructionLengthX: number = 0.0;
        let sourceMeasure: SourceMeasure = measures[0].parentSourceMeasure;
        for (let idx: number = 0; idx < measureCount; ++idx) {
            let measure: StaffMeasure = measures[idx];
            let staffIndex: number = this.visibleStaffIndices[idx];
            let beginInstructionsStaffEntry: SourceStaffEntry = sourceMeasure.FirstInstructionsStaffEntries[staffIndex];
            let beginInstructionLengthX: number = this.AddInstructionsAtMeasureBegin(
                beginInstructionsStaffEntry, measure,
                idx, isFirstSourceMeasure,
                isSystemFirstMeasure
            );
            totalBeginInstructionLengthX = Math.max(totalBeginInstructionLengthX, beginInstructionLengthX);
        }
        return totalBeginInstructionLengthX;
    }

    /**
     * Calculates the width needed for Instructions (Clef, Repetition) for the measure.
     * @param measures
     * @returns {number}
     */
    private addEndInstructions(measures: StaffMeasure[]): number {
        let measureCount: number = measures.length;
        if (measureCount === 0) {
            return 0;
        }
        let totalEndInstructionLengthX: number = 0.5;
        let sourceMeasure: SourceMeasure = measures[0].parentSourceMeasure;
        for (let idx: number = 0; idx < measureCount; idx++) {
            let measure: StaffMeasure = measures[idx];
            let staffIndex: number = this.visibleStaffIndices[idx];
            let endInstructionsStaffEntry: SourceStaffEntry = sourceMeasure.LastInstructionsStaffEntries[staffIndex];
            let endInstructionLengthX: number = this.addInstructionsAtMeasureEnd(endInstructionsStaffEntry, measure);
            totalEndInstructionLengthX = Math.max(totalEndInstructionLengthX, endInstructionLengthX);
        }
        return totalEndInstructionLengthX;
    }

    private AddInstructionsAtMeasureBegin(firstEntry: SourceStaffEntry, measure: StaffMeasure,
                                          visibleStaffIdx: number, isFirstSourceMeasure: boolean, isSystemStartMeasure: boolean): number {
        let instructionsLengthX: number = 0;
        let currentClef: ClefInstruction = undefined;
        let currentKey: KeyInstruction = undefined;
        let currentRhythm: RhythmInstruction = undefined;
        if (firstEntry !== undefined) {
            for (let idx: number = 0, len: number = firstEntry.Instructions.length; idx < len; ++idx) {
                let abstractNotationInstruction: AbstractNotationInstruction = firstEntry.Instructions[idx];
                if (abstractNotationInstruction instanceof ClefInstruction) {
                    currentClef = <ClefInstruction>abstractNotationInstruction;
                } else if (abstractNotationInstruction instanceof KeyInstruction) {
                    currentKey = <KeyInstruction>abstractNotationInstruction;
                } else if (abstractNotationInstruction instanceof RhythmInstruction) {
                    currentRhythm = <RhythmInstruction>abstractNotationInstruction;
                }
            }
        }
        if (isSystemStartMeasure) {
            if (currentClef === undefined) {
                currentClef = this.activeClefs[visibleStaffIdx];
            }
            if (currentKey === undefined) {
                currentKey = this.activeKeys[visibleStaffIdx];
            }
            if (isFirstSourceMeasure && currentRhythm === undefined) {
                currentRhythm = this.activeRhythm[visibleStaffIdx];
            }
        }
        let clefAdded: boolean = false;
        let keyAdded: boolean = false;
        let rhythmAdded: boolean = false;
        if (currentClef !== undefined) {
            measure.addClefAtBegin(currentClef);
            clefAdded = true;
        } else {
            currentClef = this.activeClefs[visibleStaffIdx];
        }
        if (currentKey !== undefined) {
            currentKey = this.transposeKeyInstruction(currentKey, measure);
            let previousKey: KeyInstruction = isSystemStartMeasure ? undefined : this.activeKeys[visibleStaffIdx];
            measure.addKeyAtBegin(currentKey, previousKey, currentClef);
            keyAdded = true;
        }
        if (currentRhythm !== undefined) {
            measure.addRhythmAtBegin(currentRhythm);
            rhythmAdded = true;
        }
        if (clefAdded || keyAdded || rhythmAdded) {
            instructionsLengthX += measure.beginInstructionsWidth;
            if (rhythmAdded) {
                instructionsLengthX += this.rules.RhythmRightMargin;
            }
        }
        return instructionsLengthX;
    }

    private addInstructionsAtMeasureEnd(lastEntry: SourceStaffEntry, measure: StaffMeasure): number {
        if (lastEntry === undefined || lastEntry.Instructions === undefined || lastEntry.Instructions.length === 0) {
            return 0;
        }
        for (let idx: number = 0, len: number = lastEntry.Instructions.length; idx < len; ++idx) {
            let abstractNotationInstruction: AbstractNotationInstruction = lastEntry.Instructions[idx];
            if (abstractNotationInstruction instanceof ClefInstruction) {
                let activeClef: ClefInstruction = <ClefInstruction>abstractNotationInstruction;
                measure.addClefAtEnd(activeClef);
            }
        }
        return this.rules.MeasureRightMargin + measure.endInstructionsWidth;
    }

    /**
     * Track down and update the active ClefInstruction in Measure's StaffEntries.
     * This has to be done after the measure is added to a system
     * (otherwise already the check if the measure fits to the system would update the active clefs..)
     * @param measure
     * @param staffMeasures
     */
    private updateActiveClefs(measure: SourceMeasure, staffMeasures: StaffMeasure[]): void {
        for (let visStaffIdx: number = 0, len: number = staffMeasures.length; visStaffIdx < len; visStaffIdx++) {
            let staffIndex: number = this.visibleStaffIndices[visStaffIdx];
            let firstEntry: SourceStaffEntry = measure.FirstInstructionsStaffEntries[staffIndex];
            if (firstEntry !== undefined) {
                for (let idx: number = 0, len2: number = firstEntry.Instructions.length; idx < len2; ++idx) {
                    let abstractNotationInstruction: AbstractNotationInstruction = firstEntry.Instructions[idx];
                    if (abstractNotationInstruction instanceof ClefInstruction) {
                        this.activeClefs[visStaffIdx] = <ClefInstruction>abstractNotationInstruction;
                    } else if (abstractNotationInstruction instanceof KeyInstruction) {
                        this.activeKeys[visStaffIdx] = <KeyInstruction>abstractNotationInstruction;
                    } else if (abstractNotationInstruction instanceof RhythmInstruction) {
                        this.activeRhythm[visStaffIdx] = <RhythmInstruction>abstractNotationInstruction;
                    }
                }
            }
            let entries: SourceStaffEntry[] = measure.getEntriesPerStaff(staffIndex);
            for (let idx: number = 0, len2: number = entries.length; idx < len2; ++idx) {
                let staffEntry: SourceStaffEntry = entries[idx];
                if (staffEntry.Instructions !== undefined) {
                    for (let idx2: number = 0, len3: number = staffEntry.Instructions.length; idx2 < len3; ++idx2) {
                        let abstractNotationInstruction: AbstractNotationInstruction = staffEntry.Instructions[idx2];
                        if (abstractNotationInstruction instanceof ClefInstruction) {
                            this.activeClefs[visStaffIdx] = <ClefInstruction>abstractNotationInstruction;
                        }
                    }
                }
            }
            let lastEntry: SourceStaffEntry = measure.LastInstructionsStaffEntries[staffIndex];
            if (lastEntry !== undefined) {
                let instructions: AbstractNotationInstruction[] = lastEntry.Instructions;
                for (let idx: number = 0, len3: number = instructions.length; idx < len3; ++idx) {
                    let abstractNotationInstruction: AbstractNotationInstruction = instructions[idx];
                    if (abstractNotationInstruction instanceof ClefInstruction) {
                        this.activeClefs[visStaffIdx] = <ClefInstruction>abstractNotationInstruction;
                    }
                }
            }
        }
    }

    /**
     * Check if an extra Instruction [[Measure]] is needed.
     * @param measures
     */
    private checkAndCreateExtraInstructionMeasure(measures: StaffMeasure[]): void {
        let firstStaffEntries: SourceStaffEntry[] = measures[0].parentSourceMeasure.FirstInstructionsStaffEntries;
        let visibleInstructionEntries: SourceStaffEntry[] = [];
        for (let idx: number = 0, len: number = measures.length; idx < len; ++idx) {
            let measure: StaffMeasure = measures[idx];
            visibleInstructionEntries.push(firstStaffEntries[measure.ParentStaff.idInMusicSheet]);
        }
        let maxMeasureWidth: number = 0;
        for (let visStaffIdx: number = 0, len: number = visibleInstructionEntries.length; visStaffIdx < len; ++visStaffIdx) {
            let sse: SourceStaffEntry = visibleInstructionEntries[visStaffIdx];
            if (sse === undefined) {
                continue;
            }
            let instructions: AbstractNotationInstruction[] = sse.Instructions;
            let keyInstruction: KeyInstruction = undefined;
            let rhythmInstruction: RhythmInstruction = undefined;
            for (let idx2: number = 0, len2: number = instructions.length; idx2 < len2; ++idx2) {
                let instruction: AbstractNotationInstruction = instructions[idx2];
                if (instruction instanceof KeyInstruction && (<KeyInstruction>instruction).Key !== this.activeKeys[visStaffIdx].Key) {
                    keyInstruction = <KeyInstruction>instruction;
                }
                if (instruction instanceof RhythmInstruction && (<RhythmInstruction>instruction) !== this.activeRhythm[visStaffIdx]) {
                    rhythmInstruction = <RhythmInstruction>instruction;
                }
            }
            if (keyInstruction !== undefined || rhythmInstruction !== undefined) {
                let measureWidth: number = this.addExtraInstructionMeasure(visStaffIdx, keyInstruction, rhythmInstruction);
                maxMeasureWidth = Math.max(maxMeasureWidth, measureWidth);
            }
        }
        if (maxMeasureWidth > 0) {
            this.currentSystemParams.systemMeasures.push({
                beginLine: SystemLinesEnum.None,
                endLine: SystemLinesEnum.None,
            });
            this.currentSystemParams.currentWidth += maxMeasureWidth;
            this.currentSystemParams.currentSystemFixWidth += maxMeasureWidth;
        }
    }

    private addExtraInstructionMeasure(visStaffIdx: number, keyInstruction: KeyInstruction, rhythmInstruction: RhythmInstruction): number {
        let currentSystem: MusicSystem = this.currentSystemParams.currentSystem;
        let measures: StaffMeasure[] = [];
        let measure: StaffMeasure = this.symbolFactory.createExtraStaffMeasure(currentSystem.StaffLines[visStaffIdx]);
        measures.push(measure);
        if (keyInstruction !== undefined) {
            measure.addKeyAtBegin(keyInstruction, this.activeKeys[visStaffIdx], this.activeClefs[visStaffIdx]);
        }
        if (rhythmInstruction !== undefined) {
            measure.addRhythmAtBegin(rhythmInstruction);
        }
        measure.PositionAndShape.BorderLeft = 0.0;
        measure.PositionAndShape.BorderTop = 0.0;
        measure.PositionAndShape.BorderBottom = this.rules.StaffHeight;
        let width: number = this.rules.MeasureLeftMargin + measure.beginInstructionsWidth + this.rules.MeasureRightMargin;
        measure.PositionAndShape.BorderRight = width;
        currentSystem.StaffLines[visStaffIdx].Measures.push(measure);
        measure.ParentStaffLine = currentSystem.StaffLines[visStaffIdx];
        currentSystem.StaffLines[visStaffIdx].PositionAndShape.ChildElements.push(measure.PositionAndShape);
        return width;
    }

    /**
     * Add all current vertical Measures to currentSystem.
     * @param staffMeasures
     */
    private addStaveMeasuresToSystem(staffMeasures: StaffMeasure[]): void {
        if (staffMeasures[0] !== undefined) {
            let gmeasures: StaffMeasure[] = [];
            for (let i: number = 0; i < staffMeasures.length; i++) {
                gmeasures.push(staffMeasures[i]);
            }
            let currentSystem: MusicSystem = this.currentSystemParams.currentSystem;
            for (let visStaffIdx: number = 0; visStaffIdx < this.numberOfVisibleStaffLines; visStaffIdx++) {
                let measure: StaffMeasure = gmeasures[visStaffIdx];
                currentSystem.StaffLines[visStaffIdx].Measures.push(measure);
                measure.ParentStaffLine = currentSystem.StaffLines[visStaffIdx];
                currentSystem.StaffLines[visStaffIdx].PositionAndShape.ChildElements.push(measure.PositionAndShape);
            }
            currentSystem.AddStaffMeasures(gmeasures);
        }
    }

    /**
     * Return the width of the corresponding [[SystemLine]] and set the corresponding [[SystemLineEnum]].
     * @returns {SystemLinesEnum}
     */
    private getMeasureStartLine(): SystemLinesEnum {
        let thisMeasureBeginsLineRep: boolean = this.thisMeasureBeginsLineRepetition();
        if (thisMeasureBeginsLineRep) {
            let isSystemStartMeasure: boolean = this.currentSystemParams.IsSystemStartMeasure();
            let isGlobalFirstMeasure: boolean = this.measureListIndex === 0;
            if (this.previousMeasureEndsLineRepetition() && !isSystemStartMeasure) {
                return SystemLinesEnum.DotsBoldBoldDots;
            }
            if (!isGlobalFirstMeasure) {
                return SystemLinesEnum.BoldThinDots;
            }
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
        if (this.measureListIndex === this.measureList.length - 1 || this.measureList[this.measureListIndex][0].parentSourceMeasure.endsPiece) {
            return SystemLinesEnum.ThinBold;
        }
        if (this.nextMeasureHasKeyInstructionChange() || this.thisMeasureEndsWordRepetition() || this.nextMeasureBeginsWordRepetition()) {
            return SystemLinesEnum.DoubleThin;
        }
        return SystemLinesEnum.SingleThin;
    }

    /**
     * Return the width of the corresponding [[SystemLine]] and sets the corresponding [[SystemLineEnum]].
     * @param measure
     * @param systemLineEnum
     * @param isSystemStartMeasure
     * @returns {number}
     */
    private getLineWidth(measure: StaffMeasure, systemLineEnum: SystemLinesEnum, isSystemStartMeasure: boolean): number {
        let width: number = measure.getLineWidth(systemLineEnum);
        if (systemLineEnum === SystemLinesEnum.DotsBoldBoldDots) {
            width /= 2;
        }
        if (isSystemStartMeasure && systemLineEnum === SystemLinesEnum.BoldThinDots) {
            width += this.rules.DistanceBetweenLastInstructionAndRepetitionBarline;
        }
        return width;
    }

    private previousMeasureEndsLineRepetition(): boolean {
        if (this.measureListIndex === 0) {
            return false;
        }
        for (let idx: number = 0, len: number = this.measureList[this.measureListIndex - 1].length; idx < len; ++idx) {
            let measure: StaffMeasure = this.measureList[this.measureListIndex - 1][idx];
            if (measure.endsWithLineRepetition()) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if at this [[Measure]] starts a [[Repetition]].
     * @returns {boolean}
     */
    private thisMeasureBeginsLineRepetition(): boolean {
        for (let idx: number = 0, len: number = this.measureList[this.measureListIndex].length; idx < len; ++idx) {
            let measure: StaffMeasure = this.measureList[this.measureListIndex][idx];
            if (measure.beginsWithLineRepetition()) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if a [[Repetition]] starts at the next [[Measure]].
     * @returns {boolean}
     */
    private nextMeasureBeginsLineRepetition(): boolean {
        let nextMeasureIndex: number = this.measureListIndex + 1;
        if (nextMeasureIndex >= this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures.length) {
            return false;
        }
        for (let idx: number = 0, len: number = this.measureList[nextMeasureIndex].length; idx < len; ++idx) {
            let measure: StaffMeasure = this.measureList[nextMeasureIndex][idx];
            if (measure.beginsWithLineRepetition()) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if this [[Measure]] is a [[Repetition]] ending.
     * @returns {boolean}
     */
    private thisMeasureEndsLineRepetition(): boolean {
        for (let idx: number = 0, len: number = this.measureList[this.measureListIndex].length; idx < len; ++idx) {
            let measure: StaffMeasure = this.measureList[this.measureListIndex][idx];
            if (measure.endsWithLineRepetition()) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if a [[Repetition]] starts at the next [[Measure]].
     * @returns {boolean}
     */
    private nextMeasureBeginsWordRepetition(): boolean {
        let nextMeasureIndex: number = this.measureListIndex + 1;
        if (nextMeasureIndex >= this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures.length) {
            return false;
        }
        for (let idx: number = 0, len: number = this.measureList[nextMeasureIndex].length; idx < len; ++idx) {
            let measure: StaffMeasure = this.measureList[nextMeasureIndex][idx];
            if (measure.beginsWithWordRepetition()) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if this [[Measure]] is a [[Repetition]] ending.
     * @returns {boolean}
     */
    private thisMeasureEndsWordRepetition(): boolean {
        for (let idx: number = 0, len: number = this.measureList[this.measureListIndex].length; idx < len; ++idx) {
            let measure: StaffMeasure = this.measureList[this.measureListIndex][idx];
            if (measure.endsWithWordRepetition()) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if the next [[Measure]] has a [[KeyInstruction]] change.
     * @returns {boolean}
     */
    private nextMeasureHasKeyInstructionChange(): boolean {
        return this.getNextMeasureKeyInstruction() !== undefined;
    }

    private getNextMeasureKeyInstruction(): KeyInstruction {
        if (this.measureListIndex < this.measureList.length - 1) {
            for (let visIndex: number = 0; visIndex < this.measureList[this.measureListIndex].length; visIndex++) {
                let sourceMeasure: SourceMeasure = this.measureList[this.measureListIndex + 1][visIndex].parentSourceMeasure;
                if (sourceMeasure === undefined) {
                    return undefined;
                }
                return sourceMeasure.getKeyInstruction(this.visibleStaffIndices[visIndex]);
            }
        }
        return undefined;
    }

    /**
     * Calculate the X ScalingFactor in order to strech the whole System.
     * @param systemFixWidth
     * @param systemVarWidth
     * @returns {number}
     */
    private calculateXScalingFactor(systemFixWidth: number, systemVarWidth: number): number {
        if (Math.abs(systemVarWidth - 0) < 0.00001 || Math.abs(systemFixWidth - 0) < 0.00001) {
            return 1.0;
        }
        let systemEndX: number;
        let currentSystem: MusicSystem = this.currentSystemParams.currentSystem;
        systemEndX = currentSystem.StaffLines[0].PositionAndShape.Size.width;
        let scalingFactor: number = (systemEndX - systemFixWidth) / systemVarWidth;
        return scalingFactor;
    }

    /**
     * Stretch the whole System so that no white space is left at the end.
     * @param isPartEndingSystem
     */
    private stretchMusicSystem(isPartEndingSystem: boolean): void {
        let scalingFactor: number = this.calculateXScalingFactor(
            this.currentSystemParams.currentSystemFixWidth, this.currentSystemParams.currentSystemVarWidth
        );
        if (isPartEndingSystem) {
            scalingFactor = Math.min(scalingFactor, this.rules.LastSystemMaxScalingFactor);
        }
        let currentSystem: MusicSystem = this.currentSystemParams.currentSystem;
        for (let visStaffIdx: number = 0, len: number = currentSystem.StaffLines.length; visStaffIdx < len; ++visStaffIdx) {
            let staffLine: StaffLine = currentSystem.StaffLines[visStaffIdx];
            let currentXPosition: number = 0.0;
            for (let measureIndex: number = 0; measureIndex < staffLine.Measures.length; measureIndex++) {
                let measure: StaffMeasure = staffLine.Measures[measureIndex];
                measure.setPositionInStaffline(currentXPosition);
                measure.setWidth(measure.beginInstructionsWidth + measure.minimumStaffEntriesWidth * scalingFactor + measure.endInstructionsWidth);
                if (measureIndex < this.currentSystemParams.systemMeasures.length) {
                    let startLine: SystemLinesEnum = this.currentSystemParams.systemMeasures[measureIndex].beginLine;
                    let lineWidth: number = measure.getLineWidth(SystemLinesEnum.BoldThinDots);
                    switch (startLine) {
                        case SystemLinesEnum.BoldThinDots:
                            let xPosition: number = currentXPosition;
                            if (measureIndex === 0) {
                                xPosition = currentXPosition + measure.beginInstructionsWidth - lineWidth;
                            }

                            currentSystem.createVerticalLineForMeasure(xPosition, lineWidth, startLine, SystemLinePosition.MeasureBegin, measureIndex, measure);
                            break;
                        default:
                    }
                }
                measure.staffEntriesScaleFactor = scalingFactor;
                measure.layoutSymbols();
                let nextMeasureHasRepStartLine: boolean = measureIndex + 1 < this.currentSystemParams.systemMeasures.length
                    && this.currentSystemParams.systemMeasures[measureIndex + 1].beginLine === SystemLinesEnum.BoldThinDots;
                if (!nextMeasureHasRepStartLine) {
                    let endLine: SystemLinesEnum = SystemLinesEnum.SingleThin;
                    if (measureIndex < this.currentSystemParams.systemMeasures.length) {
                        endLine = this.currentSystemParams.systemMeasures[measureIndex].endLine;
                    }
                    let lineWidth: number = measure.getLineWidth(endLine);
                    let xPos: number = measure.PositionAndShape.RelativePosition.x + measure.PositionAndShape.BorderRight - lineWidth;
                    if (endLine === SystemLinesEnum.DotsBoldBoldDots) {
                        xPos -= lineWidth / 2;
                    }
                    currentSystem.createVerticalLineForMeasure(xPos, lineWidth, endLine, SystemLinePosition.MeasureEnd, measureIndex, measure);
                }
                currentXPosition = measure.PositionAndShape.RelativePosition.x + measure.PositionAndShape.BorderRight;
            }
        }
        if (isPartEndingSystem) {
            this.decreaseMusicSystemBorders();
        }
    }

    /**
     * If the last [[MusicSystem]] doesn't need stretching, then this method decreases the System's Width,
     * the [[StaffLine]]'s Width and the 5 [[StaffLine]]s length.
     */
    private decreaseMusicSystemBorders(): void {
        let currentSystem: MusicSystem = this.currentSystemParams.currentSystem;
        let bb: BoundingBox = CollectionUtil.last(currentSystem.StaffLines[0].Measures).PositionAndShape;
        let width: number = bb.RelativePosition.x + bb.Size.width;
        for (let idx: number = 0, len: number = currentSystem.StaffLines.length; idx < len; ++idx) {
            let staffLine: StaffLine = currentSystem.StaffLines[idx];
            staffLine.PositionAndShape.BorderRight = width;
            for (let idx2: number = 0, len2: number = staffLine.StaffLines.length; idx2 < len2; ++idx2) {
                let graphicalLine: GraphicalLine = staffLine.StaffLines[idx2];
                graphicalLine.End = new PointF2D(width, graphicalLine.End.y);
            }
        }
        currentSystem.PositionAndShape.BorderRight = width + this.currentSystemParams.maxLabelLength + this.rules.SystemLabelsRightMargin;
    }
}
export class SystemBuildParameters {
    public currentSystem: MusicSystem;
    public systemMeasures: MeasureBuildParameters[] = [];
    public systemMeasureIndex: number = 0;
    public currentWidth: number = 0;
    public currentSystemFixWidth: number = 0;
    public currentSystemVarWidth: number = 0;
    public maxLabelLength: number = 0;

    public IsSystemStartMeasure(): boolean {
        return this.systemMeasureIndex === 0;
    }
}

export class MeasureBuildParameters {
    public beginLine: SystemLinesEnum;
    public endLine: SystemLinesEnum;
}
