import {GraphicalMeasure} from "./GraphicalMeasure";
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
import {MusicSheetCalculator} from "./MusicSheetCalculator";
import {MidiInstrument} from "../VoiceData/Instructions/ClefInstruction";
import {CollectionUtil} from "../../Util/CollectionUtil";
import {SystemLinePosition} from "./SystemLinePosition";

export class MusicSystemBuilder {
    private measureList: GraphicalMeasure[][];
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

    public initialize(
        graphicalMusicSheet: GraphicalMusicSheet, measureList: GraphicalMeasure[][], numberOfStaffLines: number): void {
        this.leadSheet = graphicalMusicSheet.LeadSheet;
        this.graphicalMusicSheet = graphicalMusicSheet;
        this.rules = this.graphicalMusicSheet.ParentMusicSheet.rules;
        this.measureList = measureList;
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
        const systemMaxWidth: number = this.getFullPageSystemWidth();
        this.measureListIndex = 0;
        this.currentSystemParams = new SystemBuildParameters();

        // the first System - create also its Labels
        this.currentSystemParams.currentSystem = this.initMusicSystem();
        this.layoutSystemStaves();
        if (EngravingRules.Rules.RenderInstrumentNames) {
            this.currentSystemParams.currentSystem.createMusicSystemLabel(
                this.rules.InstrumentLabelTextHeight,
                this.rules.SystemLabelsRightMargin,
                this.rules.LabelMarginBorderFactor
            );
        }
        this.currentPageHeight += this.currentSystemParams.currentSystem.PositionAndShape.RelativePosition.y;

        let numberOfMeasures: number = 0;
        for (let idx: number = 0, len: number = this.measureList.length; idx < len; ++idx) {
            if (this.measureList[idx].length > 0) {
                numberOfMeasures++;
            }
        }

        // go through measures and add to system until system gets too long -> finish system and start next system.
        while (this.measureListIndex < numberOfMeasures) {
            const graphicalMeasures: GraphicalMeasure[] = this.measureList[this.measureListIndex];
            for (let idx: number = 0, len: number = graphicalMeasures.length; idx < len; ++idx) {
                graphicalMeasures[idx].resetLayout();
            }
            const sourceMeasure: SourceMeasure = graphicalMeasures[0].parentSourceMeasure;
            const sourceMeasureEndsSystem: boolean = sourceMeasure.BreakSystemAfter;
            const isSystemStartMeasure: boolean = this.currentSystemParams.IsSystemStartMeasure();
            const isFirstSourceMeasure: boolean = sourceMeasure === this.graphicalMusicSheet.ParentMusicSheet.getFirstSourceMeasure();
            let currentMeasureBeginInstructionsWidth: number = this.rules.MeasureLeftMargin;
            let currentMeasureEndInstructionsWidth: number = 0;

            // calculate the current Measure Width:
            // The width of a measure is build up from
            // 1. the begin instructions (clef, Key, Rhythm),
            // 2. the staff entries (= notes) and
            // 3. the end instructions (actually only clefs)
            const measureStartLine: SystemLinesEnum = this.getMeasureStartLine();
            currentMeasureBeginInstructionsWidth += this.getLineWidth(graphicalMeasures[0], measureStartLine, isSystemStartMeasure);
            if (!this.leadSheet) {
                currentMeasureBeginInstructionsWidth += this.addBeginInstructions(graphicalMeasures, isSystemStartMeasure, isFirstSourceMeasure);
                currentMeasureEndInstructionsWidth += this.addEndInstructions(graphicalMeasures);
            }
            let currentMeasureVarWidth: number = 0;
            for (let i: number = 0; i < this.numberOfVisibleStaffLines; i++) {
                currentMeasureVarWidth = Math.max(currentMeasureVarWidth, graphicalMeasures[i].minimumStaffEntriesWidth);
            }

            // take into account the LineWidth after each Measure
            const measureEndLine: SystemLinesEnum = this.getMeasureEndLine();
            currentMeasureEndInstructionsWidth += this.getLineWidth(graphicalMeasures[0], measureEndLine, isSystemStartMeasure);
            let nextMeasureBeginInstructionWidth: number = this.rules.MeasureLeftMargin;

            // Check if there are key or rhythm change instructions within the next measure:
            if (this.measureListIndex + 1 < this.measureList.length) {
                const nextGraphicalMeasures: GraphicalMeasure[] = this.measureList[this.measureListIndex + 1];
                const nextSourceMeasure: SourceMeasure = nextGraphicalMeasures[0].parentSourceMeasure;
                if (nextSourceMeasure.hasBeginInstructions()) {
                    nextMeasureBeginInstructionWidth += this.addBeginInstructions(nextGraphicalMeasures, false, false);
                }
            }
            const totalMeasureWidth: number = currentMeasureBeginInstructionsWidth + currentMeasureEndInstructionsWidth + currentMeasureVarWidth;
            const measureFitsInSystem: boolean = this.currentSystemParams.currentWidth + totalMeasureWidth + nextMeasureBeginInstructionWidth < systemMaxWidth;
            if (isSystemStartMeasure || measureFitsInSystem) {
                this.addMeasureToSystem(
                    graphicalMeasures, measureStartLine, measureEndLine, totalMeasureWidth,
                    currentMeasureBeginInstructionsWidth, currentMeasureVarWidth, currentMeasureEndInstructionsWidth
                );
                this.updateActiveClefs(sourceMeasure, graphicalMeasures);
                this.measureListIndex++;
            } else {
                // finalize current system and prepare a new one
                this.finalizeCurrentAndCreateNewSystem(graphicalMeasures, previousMeasureEndsSystem);
                // don't increase measure index to check this measure now again
            }
            previousMeasureEndsSystem = sourceMeasureEndsSystem;
        }
        this.finalizeCurrentAndCreateNewSystem(this.measureList[this.measureList.length - 1], true);
    }

    /**
     * Set the Width of the staff-Measures of one source measure.
     * @param graphicalMeasures
     * @param width
     * @param beginInstrWidth
     * @param endInstrWidth
     */
    private setMeasureWidth(graphicalMeasures: GraphicalMeasure[], width: number, beginInstrWidth: number, endInstrWidth: number): void {
        for (let idx: number = 0, len: number = graphicalMeasures.length; idx < len; ++idx) {
            const measure: GraphicalMeasure = graphicalMeasures[idx];
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
    private finalizeCurrentAndCreateNewSystem(measures: GraphicalMeasure[], isPartEndingSystem: boolean = false): void {
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
        const systemMeasures: MeasureBuildParameters[] = this.currentSystemParams.systemMeasures;
        if (systemMeasures.length >= 1) {
            const measures: GraphicalMeasure[] =
                this.currentSystemParams.currentSystem.GraphicalMeasures[this.currentSystemParams.currentSystem.GraphicalMeasures.length - 1];
            const measureParams: MeasureBuildParameters = systemMeasures[systemMeasures.length - 1];
            let diff: number = 0.0;
            if (measureParams.endLine === SystemLinesEnum.DotsBoldBoldDots) {
                measureParams.endLine = SystemLinesEnum.DotsThinBold;
                diff = measures[0].getLineWidth(SystemLinesEnum.DotsBoldBoldDots) / 2 - measures[0].getLineWidth(SystemLinesEnum.DotsThinBold);
            }
            this.currentSystemParams.currentSystemFixWidth -= diff;
            for (let idx: number = 0, len: number = measures.length; idx < len; ++idx) {
                const measure: GraphicalMeasure = measures[idx];
                measure.endInstructionsWidth -= diff;
            }
        }
    }

    private addMeasureToSystem(
        graphicalMeasures: GraphicalMeasure[], measureStartLine: SystemLinesEnum, measureEndLine: SystemLinesEnum,
        totalMeasureWidth: number, currentMeasureBeginInstructionsWidth: number, currentVarWidth: number, currentMeasureEndInstructionsWidth: number
    ): void {
        this.currentSystemParams.systemMeasures.push({beginLine: measureStartLine, endLine: measureEndLine});
        this.setMeasureWidth(
            graphicalMeasures, totalMeasureWidth, currentMeasureBeginInstructionsWidth, currentMeasureEndInstructionsWidth
        );
        this.addStaveMeasuresToSystem(graphicalMeasures);
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
        const page: GraphicalMusicPage = new GraphicalMusicPage(this.graphicalMusicSheet);
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
        const musicSystem: MusicSystem = MusicSheetCalculator.symbolFactory.createMusicSystem(this.currentMusicPage, this.globalSystemIndex++);
        this.currentMusicPage.MusicSystems.push(musicSystem);
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
        const systemWidth: number = this.getFullPageSystemWidth();
        const musicSystem: MusicSystem = this.currentSystemParams.currentSystem;
        const boundingBox: BoundingBox = musicSystem.PositionAndShape;
        boundingBox.BorderLeft = 0.0;
        boundingBox.BorderRight = systemWidth;
        boundingBox.BorderTop = 0.0;
        const staffList: Staff[] = [];
        const instruments: Instrument[] = this.graphicalMusicSheet.ParentMusicSheet.Instruments;
        for (let idx: number = 0, len: number = instruments.length; idx < len; ++idx) {
            const instrument: Instrument = instruments[idx];
            if (instrument.Voices.length === 0 || !instrument.Visible) {
                continue;
            }
            for (let idx2: number = 0, len2: number = instrument.Staves.length; idx2 < len2; ++idx2) {
                const staff: Staff = instrument.Staves[idx2];
                staffList.push(staff);
            }
        }
        let multiLyrics: boolean = false;
        if (this.leadSheet) {
            for (let idx: number = 0, len: number = staffList.length; idx < len; ++idx) {
                const staff: Staff = staffList[idx];
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
            const staffLine: StaffLine = MusicSheetCalculator.symbolFactory.createStaffLine(musicSystem, staff);
            musicSystem.StaffLines.push(staffLine);
            const boundingBox: BoundingBox = staffLine.PositionAndShape;
            const relativePosition: PointF2D = new PointF2D();
            if (musicSystem.Parent.MusicSystems[0] === musicSystem &&
                musicSystem.Parent === musicSystem.Parent.Parent.MusicPages[0] &&
                !EngravingRules.Rules.CompactMode) {
                relativePosition.x = this.rules.FirstSystemMargin;
                boundingBox.BorderRight = musicSystem.PositionAndShape.Size.width - this.rules.FirstSystemMargin;
            } else {
                relativePosition.x = 0.0;
                boundingBox.BorderRight = musicSystem.PositionAndShape.Size.width;
            }
            relativePosition.y = relativeYPosition;
            boundingBox.RelativePosition = relativePosition;
            boundingBox.BorderLeft = 0.0;
            boundingBox.BorderTop = 0.0;
            boundingBox.BorderBottom = this.rules.StaffHeight;
            for (let i: number = 0; i < 5; i++) {
                const start: PointF2D = new PointF2D();
                start.x = 0.0;
                start.y = i * this.rules.StaffHeight / 4;
                const end: PointF2D = new PointF2D();
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
    private initializeActiveInstructions(measureList: GraphicalMeasure[]): void {
        const firstSourceMeasure: SourceMeasure = this.graphicalMusicSheet.ParentMusicSheet.getFirstSourceMeasure();
        if (firstSourceMeasure !== undefined) {
            this.visibleStaffIndices = this.graphicalMusicSheet.getVisibleStavesIndecesFromSourceMeasure(measureList);
            for (let i: number = 0, len: number = this.visibleStaffIndices.length; i < len; i++) {
                const staffIndex: number = this.visibleStaffIndices[i];
                const graphicalMeasure: GraphicalMeasure = this.graphicalMusicSheet
                    .getGraphicalMeasureFromSourceMeasureAndIndex(firstSourceMeasure, staffIndex);
                this.activeClefs[i] = <ClefInstruction>firstSourceMeasure.FirstInstructionsStaffEntries[staffIndex].Instructions[0];
                let keyInstruction: KeyInstruction = KeyInstruction.copy(
                    <KeyInstruction>firstSourceMeasure.FirstInstructionsStaffEntries[staffIndex].Instructions[1]);
                keyInstruction = this.transposeKeyInstruction(keyInstruction, graphicalMeasure);
                this.activeKeys[i] = keyInstruction;
                this.activeRhythm[i] = <RhythmInstruction>firstSourceMeasure.FirstInstructionsStaffEntries[staffIndex].Instructions[2];
            }
        }
    }

    private transposeKeyInstruction(keyInstruction: KeyInstruction, graphicalMeasure: GraphicalMeasure): KeyInstruction {
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
    private addBeginInstructions(measures: GraphicalMeasure[], isSystemFirstMeasure: boolean, isFirstSourceMeasure: boolean): number {
        const measureCount: number = measures.length;
        if (measureCount === 0) {
            return 0;
        }
        let totalBeginInstructionLengthX: number = 0.0;
        const sourceMeasure: SourceMeasure = measures[0].parentSourceMeasure;
        for (let idx: number = 0; idx < measureCount; ++idx) {
            const measure: GraphicalMeasure = measures[idx];
            const staffIndex: number = this.visibleStaffIndices[idx];
            const beginInstructionsStaffEntry: SourceStaffEntry = sourceMeasure.FirstInstructionsStaffEntries[staffIndex];
            const beginInstructionLengthX: number = this.AddInstructionsAtMeasureBegin(
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
    private addEndInstructions(measures: GraphicalMeasure[]): number {
        const measureCount: number = measures.length;
        if (measureCount === 0) {
            return 0;
        }
        let totalEndInstructionLengthX: number = 0.5;
        const sourceMeasure: SourceMeasure = measures[0].parentSourceMeasure;
        for (let idx: number = 0; idx < measureCount; idx++) {
            const measure: GraphicalMeasure = measures[idx];
            const staffIndex: number = this.visibleStaffIndices[idx];
            const endInstructionsStaffEntry: SourceStaffEntry = sourceMeasure.LastInstructionsStaffEntries[staffIndex];
            const endInstructionLengthX: number = this.addInstructionsAtMeasureEnd(endInstructionsStaffEntry, measure);
            totalEndInstructionLengthX = Math.max(totalEndInstructionLengthX, endInstructionLengthX);
        }
        return totalEndInstructionLengthX;
    }

    private AddInstructionsAtMeasureBegin(firstEntry: SourceStaffEntry, measure: GraphicalMeasure,
                                          visibleStaffIdx: number, isFirstSourceMeasure: boolean, isSystemStartMeasure: boolean): number {
        let instructionsLengthX: number = 0;
        let currentClef: ClefInstruction = undefined;
        let currentKey: KeyInstruction = undefined;
        let currentRhythm: RhythmInstruction = undefined;
        if (firstEntry !== undefined) {
            for (let idx: number = 0, len: number = firstEntry.Instructions.length; idx < len; ++idx) {
                const abstractNotationInstruction: AbstractNotationInstruction = firstEntry.Instructions[idx];
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
            const previousKey: KeyInstruction = isSystemStartMeasure ? undefined : this.activeKeys[visibleStaffIdx];
            measure.addKeyAtBegin(currentKey, previousKey, currentClef);
            keyAdded = true;
        }
        if (currentRhythm !== undefined && currentRhythm.PrintObject) {
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

    private addInstructionsAtMeasureEnd(lastEntry: SourceStaffEntry, measure: GraphicalMeasure): number {
        if (lastEntry === undefined || lastEntry.Instructions === undefined || lastEntry.Instructions.length === 0) {
            return 0;
        }
        for (let idx: number = 0, len: number = lastEntry.Instructions.length; idx < len; ++idx) {
            const abstractNotationInstruction: AbstractNotationInstruction = lastEntry.Instructions[idx];
            if (abstractNotationInstruction instanceof ClefInstruction) {
                const activeClef: ClefInstruction = <ClefInstruction>abstractNotationInstruction;
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
     * @param graphicalMeasures
     */
    private updateActiveClefs(measure: SourceMeasure, graphicalMeasures: GraphicalMeasure[]): void {
        for (let visStaffIdx: number = 0, len: number = graphicalMeasures.length; visStaffIdx < len; visStaffIdx++) {
            const staffIndex: number = this.visibleStaffIndices[visStaffIdx];
            const firstEntry: SourceStaffEntry = measure.FirstInstructionsStaffEntries[staffIndex];
            if (firstEntry !== undefined) {
                for (let idx: number = 0, len2: number = firstEntry.Instructions.length; idx < len2; ++idx) {
                    const abstractNotationInstruction: AbstractNotationInstruction = firstEntry.Instructions[idx];
                    if (abstractNotationInstruction instanceof ClefInstruction) {
                        this.activeClefs[visStaffIdx] = <ClefInstruction>abstractNotationInstruction;
                    } else if (abstractNotationInstruction instanceof KeyInstruction) {
                        this.activeKeys[visStaffIdx] = <KeyInstruction>abstractNotationInstruction;
                    } else if (abstractNotationInstruction instanceof RhythmInstruction) {
                        this.activeRhythm[visStaffIdx] = <RhythmInstruction>abstractNotationInstruction;
                    }
                }
            }
            const entries: SourceStaffEntry[] = measure.getEntriesPerStaff(staffIndex);
            for (let idx: number = 0, len2: number = entries.length; idx < len2; ++idx) {
                const staffEntry: SourceStaffEntry = entries[idx];
                if (staffEntry.Instructions !== undefined) {
                    for (let idx2: number = 0, len3: number = staffEntry.Instructions.length; idx2 < len3; ++idx2) {
                        const abstractNotationInstruction: AbstractNotationInstruction = staffEntry.Instructions[idx2];
                        if (abstractNotationInstruction instanceof ClefInstruction) {
                            this.activeClefs[visStaffIdx] = <ClefInstruction>abstractNotationInstruction;
                        }
                    }
                }
            }
            const lastEntry: SourceStaffEntry = measure.LastInstructionsStaffEntries[staffIndex];
            if (lastEntry !== undefined) {
                const instructions: AbstractNotationInstruction[] = lastEntry.Instructions;
                for (let idx: number = 0, len3: number = instructions.length; idx < len3; ++idx) {
                    const abstractNotationInstruction: AbstractNotationInstruction = instructions[idx];
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
    private checkAndCreateExtraInstructionMeasure(measures: GraphicalMeasure[]): void {
        const firstStaffEntries: SourceStaffEntry[] = measures[0].parentSourceMeasure.FirstInstructionsStaffEntries;
        const visibleInstructionEntries: SourceStaffEntry[] = [];
        for (let idx: number = 0, len: number = measures.length; idx < len; ++idx) {
            const measure: GraphicalMeasure = measures[idx];
            visibleInstructionEntries.push(firstStaffEntries[measure.ParentStaff.idInMusicSheet]);
        }
        let maxMeasureWidth: number = 0;
        for (let visStaffIdx: number = 0, len: number = visibleInstructionEntries.length; visStaffIdx < len; ++visStaffIdx) {
            const sse: SourceStaffEntry = visibleInstructionEntries[visStaffIdx];
            if (sse === undefined) {
                continue;
            }
            const instructions: AbstractNotationInstruction[] = sse.Instructions;
            let keyInstruction: KeyInstruction = undefined;
            let rhythmInstruction: RhythmInstruction = undefined;
            for (let idx2: number = 0, len2: number = instructions.length; idx2 < len2; ++idx2) {
                const instruction: AbstractNotationInstruction = instructions[idx2];
                if (instruction instanceof KeyInstruction && (<KeyInstruction>instruction).Key !== this.activeKeys[visStaffIdx].Key) {
                    keyInstruction = <KeyInstruction>instruction;
                }
                if (instruction instanceof RhythmInstruction && (<RhythmInstruction>instruction) !== this.activeRhythm[visStaffIdx]) {
                    rhythmInstruction = <RhythmInstruction>instruction;
                }
            }
            if (keyInstruction !== undefined || rhythmInstruction !== undefined) {
                const measureWidth: number = this.addExtraInstructionMeasure(visStaffIdx, keyInstruction, rhythmInstruction);
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
        const currentSystem: MusicSystem = this.currentSystemParams.currentSystem;
        const measures: GraphicalMeasure[] = [];
        const measure: GraphicalMeasure = MusicSheetCalculator.symbolFactory.createExtraGraphicalMeasure(currentSystem.StaffLines[visStaffIdx]);
        measures.push(measure);
        if (keyInstruction !== undefined) {
            measure.addKeyAtBegin(keyInstruction, this.activeKeys[visStaffIdx], this.activeClefs[visStaffIdx]);
        }
        if (rhythmInstruction !== undefined && rhythmInstruction.PrintObject) {
            measure.addRhythmAtBegin(rhythmInstruction);
        }
        measure.PositionAndShape.BorderLeft = 0.0;
        measure.PositionAndShape.BorderTop = 0.0;
        measure.PositionAndShape.BorderBottom = this.rules.StaffHeight;
        const width: number = this.rules.MeasureLeftMargin + measure.beginInstructionsWidth + this.rules.MeasureRightMargin;
        measure.PositionAndShape.BorderRight = width;
        currentSystem.StaffLines[visStaffIdx].Measures.push(measure);
        return width;
    }

    /**
     * Add all current vertical Measures to currentSystem.
     * @param graphicalMeasures
     */
    private addStaveMeasuresToSystem(graphicalMeasures: GraphicalMeasure[]): void {
        if (graphicalMeasures[0] !== undefined) {
            const gmeasures: GraphicalMeasure[] = [];
            for (let i: number = 0; i < graphicalMeasures.length; i++) {
                gmeasures.push(graphicalMeasures[i]);
            }
            const currentSystem: MusicSystem = this.currentSystemParams.currentSystem;
            for (let visStaffIdx: number = 0; visStaffIdx < this.numberOfVisibleStaffLines; visStaffIdx++) {
                const measure: GraphicalMeasure = gmeasures[visStaffIdx];
                currentSystem.StaffLines[visStaffIdx].Measures.push(measure);
                measure.ParentStaffLine = currentSystem.StaffLines[visStaffIdx];
            }
            currentSystem.AddGraphicalMeasures(gmeasures);
        }
    }

    /**
     * Return the width of the corresponding [[SystemLine]] and set the corresponding [[SystemLineEnum]].
     * @returns {SystemLinesEnum}
     */
    private getMeasureStartLine(): SystemLinesEnum {
        const thisMeasureBeginsLineRep: boolean = this.thisMeasureBeginsLineRepetition();
        if (thisMeasureBeginsLineRep) {
            const isSystemStartMeasure: boolean = this.currentSystemParams.IsSystemStartMeasure();
            const isGlobalFirstMeasure: boolean = this.measureListIndex === 0;
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
    private getLineWidth(measure: GraphicalMeasure, systemLineEnum: SystemLinesEnum, isSystemStartMeasure: boolean): number {
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
            const measure: GraphicalMeasure = this.measureList[this.measureListIndex - 1][idx];
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
            const measure: GraphicalMeasure = this.measureList[this.measureListIndex][idx];
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
        const nextMeasureIndex: number = this.measureListIndex + 1;
        if (nextMeasureIndex >= this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures.length) {
            return false;
        }
        for (let idx: number = 0, len: number = this.measureList[nextMeasureIndex].length; idx < len; ++idx) {
            const measure: GraphicalMeasure = this.measureList[nextMeasureIndex][idx];
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
            const measure: GraphicalMeasure = this.measureList[this.measureListIndex][idx];
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
        const nextMeasureIndex: number = this.measureListIndex + 1;
        if (nextMeasureIndex >= this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures.length) {
            return false;
        }
        for (let idx: number = 0, len: number = this.measureList[nextMeasureIndex].length; idx < len; ++idx) {
            const measure: GraphicalMeasure = this.measureList[nextMeasureIndex][idx];
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
            const measure: GraphicalMeasure = this.measureList[this.measureListIndex][idx];
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
                const sourceMeasure: SourceMeasure = this.measureList[this.measureListIndex + 1][visIndex].parentSourceMeasure;
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
        const currentSystem: MusicSystem = this.currentSystemParams.currentSystem;
        systemEndX = currentSystem.StaffLines[0].PositionAndShape.Size.width;
        const scalingFactor: number = (systemEndX - systemFixWidth) / systemVarWidth;
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
        const currentSystem: MusicSystem = this.currentSystemParams.currentSystem;
        for (let visStaffIdx: number = 0, len: number = currentSystem.StaffLines.length; visStaffIdx < len; ++visStaffIdx) {
            const staffLine: StaffLine = currentSystem.StaffLines[visStaffIdx];
            let currentXPosition: number = 0.0;
            for (let measureIndex: number = 0; measureIndex < staffLine.Measures.length; measureIndex++) {
                const measure: GraphicalMeasure = staffLine.Measures[measureIndex];
                measure.setPositionInStaffline(currentXPosition);
                measure.setWidth(measure.beginInstructionsWidth + measure.minimumStaffEntriesWidth * scalingFactor + measure.endInstructionsWidth);
                if (measureIndex < this.currentSystemParams.systemMeasures.length) {
                    const startLine: SystemLinesEnum = this.currentSystemParams.systemMeasures[measureIndex].beginLine;
                    const lineWidth: number = measure.getLineWidth(SystemLinesEnum.BoldThinDots);
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
                const nextMeasureHasRepStartLine: boolean = measureIndex + 1 < this.currentSystemParams.systemMeasures.length
                    && this.currentSystemParams.systemMeasures[measureIndex + 1].beginLine === SystemLinesEnum.BoldThinDots;
                if (!nextMeasureHasRepStartLine) {
                    let endLine: SystemLinesEnum = SystemLinesEnum.SingleThin;
                    if (measureIndex < this.currentSystemParams.systemMeasures.length) {
                        endLine = this.currentSystemParams.systemMeasures[measureIndex].endLine;
                    }
                    const lineWidth: number = measure.getLineWidth(endLine);
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
        const currentSystem: MusicSystem = this.currentSystemParams.currentSystem;
        const bb: BoundingBox = CollectionUtil.last(currentSystem.StaffLines[0].Measures).PositionAndShape;
        const width: number = bb.RelativePosition.x + bb.Size.width;
        for (let idx: number = 0, len: number = currentSystem.StaffLines.length; idx < len; ++idx) {
            const staffLine: StaffLine = currentSystem.StaffLines[idx];
            staffLine.PositionAndShape.BorderRight = width;
            for (let idx2: number = 0, len2: number = staffLine.StaffLines.length; idx2 < len2; ++idx2) {
                const graphicalLine: GraphicalLine = staffLine.StaffLines[idx2];
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
