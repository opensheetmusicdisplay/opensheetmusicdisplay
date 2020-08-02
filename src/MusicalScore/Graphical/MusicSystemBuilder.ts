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
    protected measureList: GraphicalMeasure[][];
    protected graphicalMusicSheet: GraphicalMusicSheet;
    protected currentSystemParams: SystemBuildParameters;
    protected numberOfVisibleStaffLines: number;
    protected rules: EngravingRules;
    protected measureListIndex: number;
    protected musicSystems: MusicSystem[] = [];

    /**
     * Does the mapping from the currently visible staves to the global staff-list of the music sheet.
     */
    protected visibleStaffIndices: number[];
    protected activeRhythm: RhythmInstruction[];
    protected activeKeys: KeyInstruction[];
    protected activeClefs: ClefInstruction[];
    protected globalSystemIndex: number = 0;
    protected leadSheet: boolean = false;

    public initialize(
        graphicalMusicSheet: GraphicalMusicSheet, measureList: GraphicalMeasure[][], numberOfStaffLines: number): void {
        this.leadSheet = graphicalMusicSheet.LeadSheet;
        this.graphicalMusicSheet = graphicalMusicSheet;
        this.rules = this.graphicalMusicSheet.ParentMusicSheet.Rules;
        this.measureList = measureList;
        this.numberOfVisibleStaffLines = numberOfStaffLines;
        this.activeRhythm = new Array(this.numberOfVisibleStaffLines);
        this.activeKeys = new Array(this.numberOfVisibleStaffLines);
        this.activeClefs = new Array(this.numberOfVisibleStaffLines);
        this.initializeActiveInstructions(this.measureList[0]);
    }

    public buildMusicSystems(): MusicSystem[] {
        const systemMaxWidth: number = this.getFullPageSystemWidth();
        let prevMeasureEndsPart: boolean = false;
        this.measureListIndex = 0;
        this.currentSystemParams = new SystemBuildParameters();

        // the first System - create also its Labels
        this.currentSystemParams.currentSystem = this.initMusicSystem();

        // let numberOfMeasures: number = 0;
        // for (let idx: number = 0, len: number = this.measureList.length; idx < len; ++idx) {
        //     if (this.measureList[idx].length > 0) {
        //         numberOfMeasures++;
        //     }
        // }
        // console.log(`numberOfMeasures: ${numberOfMeasures}`);

        // go through measures and add to system until system gets too long -> finish system and start next system [line break, new system].
        while (this.measureListIndex < this.measureList.length) {
            const graphicalMeasures: GraphicalMeasure[] = this.measureList[this.measureListIndex];
            if (!graphicalMeasures || !graphicalMeasures[0]) {
                this.measureListIndex++;
                continue; // previous measure was probably multi-rest, skip this one
            }
            for (let idx: number = 0, len: number = graphicalMeasures.length; idx < len; ++idx) {
                graphicalMeasures[idx].resetLayout();
            }
            const sourceMeasure: SourceMeasure = graphicalMeasures[0].parentSourceMeasure;
            const sourceMeasureEndsPart: boolean = sourceMeasure.HasEndLine;
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
                let forceShowRhythm: boolean = false;
                if (prevMeasureEndsPart && this.rules.ShowRhythmAgainAfterPartEndOrFinalBarline) {
                    forceShowRhythm = true;
                }
                currentMeasureBeginInstructionsWidth += this.addBeginInstructions(  graphicalMeasures,
                                                                                    isSystemStartMeasure,
                                                                                    isFirstSourceMeasure || forceShowRhythm);
                // forceShowRhythm could be a fourth parameter instead in addBeginInstructions, but only affects RhythmInstruction for now.
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
            let nextSourceMeasure: SourceMeasure = undefined;
            if (this.measureListIndex + 1 < this.measureList.length) {
                const nextGraphicalMeasures: GraphicalMeasure[] = this.measureList[this.measureListIndex + 1];
                // TODO: consider multirest. then the next graphical measure may not exist. but there shouldn't be hidden changes here.
                nextSourceMeasure = nextGraphicalMeasures[0]?.parentSourceMeasure;
                if (nextSourceMeasure?.hasBeginInstructions()) {
                    nextMeasureBeginInstructionWidth += this.addBeginInstructions(nextGraphicalMeasures, false, false);
                }
            }
            let totalMeasureWidth: number = currentMeasureBeginInstructionsWidth + currentMeasureEndInstructionsWidth + currentMeasureVarWidth;
            if (graphicalMeasures[0]?.parentSourceMeasure?.multipleRestMeasures) {
                totalMeasureWidth = this.rules.MultipleRestMeasureDefaultWidth; // default 4 (12 seems too large)
            }
            const measureFitsInSystem: boolean = this.currentSystemParams.currentWidth + totalMeasureWidth + nextMeasureBeginInstructionWidth < systemMaxWidth;
            const doXmlPageBreak: boolean = this.rules.NewPageAtXMLNewPageAttribute && sourceMeasure.printNewPageXml;
            const doXmlLineBreak: boolean = doXmlPageBreak || // also create new system if doing page break
                (this.rules.NewSystemAtXMLNewSystemAttribute && sourceMeasure.printNewSystemXml);
            if (isSystemStartMeasure || (measureFitsInSystem && !doXmlLineBreak)) {
                this.addMeasureToSystem(
                    graphicalMeasures, measureStartLine, measureEndLine, totalMeasureWidth,
                    currentMeasureBeginInstructionsWidth, currentMeasureVarWidth, currentMeasureEndInstructionsWidth
                );
                this.updateActiveClefs(sourceMeasure, graphicalMeasures);
                this.measureListIndex++;
                if (sourceMeasureEndsPart) {
                    this.finalizeCurrentAndCreateNewSystem(graphicalMeasures, true, false);
                }
                prevMeasureEndsPart = sourceMeasureEndsPart;
            } else {
                // finalize current system and prepare a new one
                this.finalizeCurrentAndCreateNewSystem(graphicalMeasures, false, true, doXmlPageBreak);
                // don't increase measure index to check this measure now again
                // don't set prevMeasureEndsPart in this case! because we will loop with the same measure again.
            }
        }
        if (this.currentSystemParams.systemMeasures.length > 0) {
            this.finalizeCurrentAndCreateNewSystem(this.measureList[this.measureList.length - 1], true, false);
        }
        return this.musicSystems;
    }

    /**
     * calculates the y positions of the staff lines within a system and
     * furthermore the y positions of the systems themselves.
     */
    public calculateSystemYLayout(): void {
        for (const musicSystem of this.musicSystems) {
            this.optimizeDistanceBetweenStaffLines(musicSystem);
        }

        // set y positions of systems using the previous system and a fixed distance.
        this.calculateMusicSystemsRelativePositions();
    }

    /**
     * Set the Width of the staff-Measures of one source measure.
     * @param graphicalMeasures
     * @param width
     * @param beginInstrWidth
     * @param endInstrWidth
     */
    protected setMeasureWidth(graphicalMeasures: GraphicalMeasure[], width: number, beginInstrWidth: number, endInstrWidth: number): void {
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
    protected finalizeCurrentAndCreateNewSystem(measures: GraphicalMeasure[],
                                                systemEndsPart: boolean = false,
                                                checkExtraInstructionMeasure: boolean = true,
                                                startNewPage: boolean = false): void {
        this.currentSystemParams.currentSystem.breaksPage = startNewPage;
        this.adaptRepetitionLineWithIfNeeded();
        if (measures !== undefined &&
            checkExtraInstructionMeasure) {
            this.checkAndCreateExtraInstructionMeasure(measures);
        }
        this.stretchMusicSystem(systemEndsPart);
        this.currentSystemParams = new SystemBuildParameters();
        if (measures !== undefined &&
            this.measureListIndex < this.measureList.length) {
            this.currentSystemParams.currentSystem = this.initMusicSystem();
        }
    }

    /**
     * If a line repetition is ending and a new line repetition is starting at the end of the system,
     * the double repetition line has to be split into two: one at the currently ending system and
     * one at the next system.
     * (this should be refactored at some point to not use a combined end/start line but always separated lines)
     */
    protected adaptRepetitionLineWithIfNeeded(): void {
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

    protected addMeasureToSystem(
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
     * Initialize a new [[MusicSystem]].
     * @returns {MusicSystem}
     */
    protected initMusicSystem(): MusicSystem {
        const musicSystem: MusicSystem = MusicSheetCalculator.symbolFactory.createMusicSystem(this.globalSystemIndex++, this.rules);
        this.musicSystems.push(musicSystem);
        this.layoutSystemStaves(musicSystem);
        musicSystem.createMusicSystemLabel(
            this.rules.InstrumentLabelTextHeight,
            this.rules.SystemLabelsRightMargin,
            this.rules.LabelMarginBorderFactor,
            this.musicSystems.length === 1
        );
        return musicSystem;
    }

    /**
     * Get the width the system should have for a given page width.
     * @returns {number}
     */
    protected getFullPageSystemWidth(): number {
        return this.graphicalMusicSheet.ParentMusicSheet.pageWidth - this.rules.PageLeftMargin
            - this.rules.PageRightMargin - this.rules.SystemLeftMargin - this.rules.SystemRightMargin;
    }

    protected layoutSystemStaves(musicSystem: MusicSystem): void {
        const systemWidth: number = this.getFullPageSystemWidth();
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
    protected addStaffLineToMusicSystem(musicSystem: MusicSystem, relativeYPosition: number, staff: Staff): void {
        if (musicSystem) {
            const staffLine: StaffLine = MusicSheetCalculator.symbolFactory.createStaffLine(musicSystem, staff);
            musicSystem.StaffLines.push(staffLine);
            const boundingBox: BoundingBox = staffLine.PositionAndShape;
            const relativePosition: PointF2D = new PointF2D();
            relativePosition.x = 0.0;
            boundingBox.BorderRight = musicSystem.PositionAndShape.Size.width;
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
    protected initializeActiveInstructions(measureList: GraphicalMeasure[]): void {
        const firstSourceMeasure: SourceMeasure = this.graphicalMusicSheet.ParentMusicSheet.getFirstSourceMeasure();
        if (firstSourceMeasure) {
            this.visibleStaffIndices = this.graphicalMusicSheet.getVisibleStavesIndicesFromSourceMeasure(measureList);
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

    protected transposeKeyInstruction(keyInstruction: KeyInstruction, graphicalMeasure: GraphicalMeasure): KeyInstruction {
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
    protected addBeginInstructions(measures: GraphicalMeasure[], isSystemFirstMeasure: boolean, isFirstSourceMeasure: boolean): number {
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
    protected addEndInstructions(measures: GraphicalMeasure[]): number {
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

    protected AddInstructionsAtMeasureBegin(firstEntry: SourceStaffEntry, measure: GraphicalMeasure,
                                            visibleStaffIdx: number, isFirstSourceMeasure: boolean, isSystemStartMeasure: boolean): number {
        let instructionsLengthX: number = 0;
        let currentClef: ClefInstruction = undefined;
        let currentKey: KeyInstruction = undefined;
        let currentRhythm: RhythmInstruction = undefined;
        if (firstEntry) {
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
            if (!currentClef) {
                currentClef = this.activeClefs[visibleStaffIdx];
            }
            if (!currentKey) {
                currentKey = this.activeKeys[visibleStaffIdx];
            }
            if (isFirstSourceMeasure && !currentRhythm) {
                currentRhythm = this.activeRhythm[visibleStaffIdx];
            }
        }
        let clefAdded: boolean = false;
        let keyAdded: boolean = false;
        let rhythmAdded: boolean = false;
        if (currentClef) {
            measure.addClefAtBegin(currentClef);
            clefAdded = true;
        } else {
            currentClef = this.activeClefs[visibleStaffIdx];
        }
        if (currentKey) {
            currentKey = this.transposeKeyInstruction(currentKey, measure);
            const previousKey: KeyInstruction = isSystemStartMeasure ? undefined : this.activeKeys[visibleStaffIdx];
            measure.addKeyAtBegin(currentKey, previousKey, currentClef);
            keyAdded = true;
        }
        if (currentRhythm !== undefined && currentRhythm.PrintObject && this.rules.RenderTimeSignatures) {
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

    protected addInstructionsAtMeasureEnd(lastEntry: SourceStaffEntry, measure: GraphicalMeasure): number {
        if (!lastEntry || !lastEntry.Instructions || lastEntry.Instructions.length === 0) {
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
    protected updateActiveClefs(measure: SourceMeasure, graphicalMeasures: GraphicalMeasure[]): void {
        for (let visStaffIdx: number = 0, len: number = graphicalMeasures.length; visStaffIdx < len; visStaffIdx++) {
            const staffIndex: number = this.visibleStaffIndices[visStaffIdx];
            const firstEntry: SourceStaffEntry = measure.FirstInstructionsStaffEntries[staffIndex];
            if (firstEntry) {
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
                if (staffEntry.Instructions) {
                    for (let idx2: number = 0, len3: number = staffEntry.Instructions.length; idx2 < len3; ++idx2) {
                        const abstractNotationInstruction: AbstractNotationInstruction = staffEntry.Instructions[idx2];
                        if (abstractNotationInstruction instanceof ClefInstruction) {
                            this.activeClefs[visStaffIdx] = <ClefInstruction>abstractNotationInstruction;
                        }
                    }
                }
            }
            const lastEntry: SourceStaffEntry = measure.LastInstructionsStaffEntries[staffIndex];
            if (lastEntry) {
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
    protected checkAndCreateExtraInstructionMeasure(measures: GraphicalMeasure[]): void {
        const firstStaffEntries: SourceStaffEntry[] = measures[0].parentSourceMeasure.FirstInstructionsStaffEntries;
        const visibleInstructionEntries: SourceStaffEntry[] = [];
        for (let idx: number = 0, len: number = measures.length; idx < len; ++idx) {
            const measure: GraphicalMeasure = measures[idx];
            visibleInstructionEntries.push(firstStaffEntries[measure.ParentStaff.idInMusicSheet]);
        }
        let maxMeasureWidth: number = 0;
        for (let visStaffIdx: number = 0, len: number = visibleInstructionEntries.length; visStaffIdx < len; ++visStaffIdx) {
            const sse: SourceStaffEntry = visibleInstructionEntries[visStaffIdx];
            if (!sse) {
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
            if (keyInstruction !== undefined || rhythmInstruction) {
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

    protected addExtraInstructionMeasure(visStaffIdx: number, keyInstruction: KeyInstruction, rhythmInstruction: RhythmInstruction): number {
        const currentSystem: MusicSystem = this.currentSystemParams.currentSystem;
        const measures: GraphicalMeasure[] = [];
        const measure: GraphicalMeasure = MusicSheetCalculator.symbolFactory.createExtraGraphicalMeasure(currentSystem.StaffLines[visStaffIdx]);
        measures.push(measure);
        if (keyInstruction) {
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
    protected addStaveMeasuresToSystem(graphicalMeasures: GraphicalMeasure[]): void {
        if (graphicalMeasures[0]) {
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
    protected getMeasureStartLine(): SystemLinesEnum {
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

    protected getMeasureEndLine(): SystemLinesEnum {
        let sourceMeasure: SourceMeasure = undefined;
        try {
            sourceMeasure = this.measureList[this.measureListIndex][0].parentSourceMeasure;
            if (this.rules.RenderMultipleRestMeasures && sourceMeasure.multipleRestMeasures > 1) {
                const newIndex: number = Math.min(
                    this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures.length - 1, // safety check
                    sourceMeasure.measureListIndex + sourceMeasure.multipleRestMeasures - 1
                    // check the bar line of the last sourcemeasure in the multiple measure rest sequence
                );
                sourceMeasure = this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures[newIndex];
                // sourceMeasure = this.measureList[this.measureListIndex + sourceMeasure.multipleRestMeasures - 1][0].parentSourceMeasure;
                //    this will be possible when the other GraphicalMeasures in the measureList aren't undefined anymore
            }
        } finally {
            // do nothing
        }

        if (this.nextMeasureBeginsLineRepetition() && this.thisMeasureEndsLineRepetition()) {
            return SystemLinesEnum.DotsBoldBoldDots;
        }
        if (this.thisMeasureEndsLineRepetition()) {
            return SystemLinesEnum.DotsThinBold;
        }
        // always end piece with final barline: not a good idea. user should be able to override final barline.
        // also, selecting range of measures to draw would always end with final barline, even if extract is from the middle of the piece
        // this was probably done before we parsed the barline type from XML.
        /*if (this.measureListIndex === this.measureList.length - 1 || this.measureList[this.measureListIndex][0].parentSourceMeasure.endsPiece) {
            return SystemLinesEnum.ThinBold;
        }*/
        if (this.nextMeasureHasKeyInstructionChange() || this.thisMeasureEndsWordRepetition() || this.nextMeasureBeginsWordRepetition()) {
            return SystemLinesEnum.DoubleThin;
        }
        if (!sourceMeasure) {
            return SystemLinesEnum.SingleThin;
        }
        if (sourceMeasure.endingBarStyleEnum !== undefined) {
            return sourceMeasure.endingBarStyleEnum;
        }
        // TODO: print an error message if the default fallback is used.
        return SystemLinesEnum.SingleThin;
    }

    /**
     * Return the width of the corresponding [[SystemLine]] and sets the corresponding [[SystemLineEnum]].
     * @param measure
     * @param systemLineEnum
     * @param isSystemStartMeasure
     * @returns {number}
     */
    protected getLineWidth(measure: GraphicalMeasure, systemLineEnum: SystemLinesEnum, isSystemStartMeasure: boolean): number {
        let width: number = measure.getLineWidth(systemLineEnum);
        if (systemLineEnum === SystemLinesEnum.DotsBoldBoldDots) {
            width /= 2;
        }
        if (isSystemStartMeasure && systemLineEnum === SystemLinesEnum.BoldThinDots) {
            width += this.rules.DistanceBetweenLastInstructionAndRepetitionBarline;
        }
        return width;
    }

    protected previousMeasureEndsLineRepetition(): boolean {
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
    protected thisMeasureBeginsLineRepetition(): boolean {
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
    protected nextMeasureBeginsLineRepetition(): boolean {
        const nextMeasureIndex: number = this.measureListIndex + 1;
        if (nextMeasureIndex >= this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures.length
            || !this.measureList[nextMeasureIndex]) {
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
    protected thisMeasureEndsLineRepetition(): boolean {
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
    protected nextMeasureBeginsWordRepetition(): boolean {
        const nextMeasureIndex: number = this.measureListIndex + 1;
        if (nextMeasureIndex >= this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures.length ||
            nextMeasureIndex > this.measureList.length - 1) {
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
    protected thisMeasureEndsWordRepetition(): boolean {
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
    protected nextMeasureHasKeyInstructionChange(): boolean {
        return this.getNextMeasureKeyInstruction() !== undefined;
    }

    protected getNextMeasureKeyInstruction(): KeyInstruction {
        if (this.measureListIndex < this.measureList.length - 1) {
            for (let visIndex: number = 0; visIndex < this.measureList[this.measureListIndex].length; visIndex++) {
                const sourceMeasure: SourceMeasure = this.measureList[this.measureListIndex + 1][visIndex]?.parentSourceMeasure;
                if (!sourceMeasure) {
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
    protected calculateXScalingFactor(systemFixWidth: number, systemVarWidth: number): number {
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
     * @param systemEndsPart
     */
    protected stretchMusicSystem(systemEndsPart: boolean): void {
        let scalingFactor: number = this.calculateXScalingFactor(
            this.currentSystemParams.currentSystemFixWidth, this.currentSystemParams.currentSystemVarWidth
        );
        if (systemEndsPart) {
            scalingFactor = Math.min(scalingFactor, this.rules.LastSystemMaxScalingFactor);
        }
        const currentSystem: MusicSystem = this.currentSystemParams.currentSystem;
        for (let visStaffIdx: number = 0, len: number = currentSystem.StaffLines.length; visStaffIdx < len; ++visStaffIdx) {
            const staffLine: StaffLine = currentSystem.StaffLines[visStaffIdx];
            let currentXPosition: number = 0.0;
            for (let measureIndex: number = 0; measureIndex < staffLine.Measures.length; measureIndex++) {
                const measure: GraphicalMeasure = staffLine.Measures[measureIndex];
                measure.setPositionInStaffline(currentXPosition);
                const beginInstructionsWidth: number = measure.beginInstructionsWidth;
                // if (measureIndex === 0 && measure.staffEntries) {
                //     if (!measure.parentSourceMeasure.hasLyrics) {
                //         beginInstructionsWidth *= 1; // TODO the first measure in a system is always slightly too big. why? try e.g. 0.6
                //     }
                // }
                measure.setWidth(beginInstructionsWidth + measure.minimumStaffEntriesWidth * scalingFactor + measure.endInstructionsWidth);
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
        if (systemEndsPart) {
            this.decreaseMusicSystemBorders();
        }
    }

    /**
     * If the last [[MusicSystem]] doesn't need stretching, then this method decreases the System's Width,
     * the [[StaffLine]]'s Width and the 5 [[StaffLine]]s length.
     */
    protected decreaseMusicSystemBorders(): void {
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

    /**
     * This method updates the System's StaffLine's RelativePosition (starting from the given index).
     * @param musicSystem
     * @param index
     * @param value
     */
    protected updateStaffLinesRelativePosition(musicSystem: MusicSystem, index: number, value: number): void {
        for (let i: number = index; i < musicSystem.StaffLines.length; i++) {
            musicSystem.StaffLines[i].PositionAndShape.RelativePosition.y = value;
        }

        musicSystem.PositionAndShape.BorderBottom += value;
    }

    /**
     * Create a new [[GraphicalMusicPage]]
     * (for now only one long page is used per music sheet, as we scroll down and have no page flips)
     * @returns {GraphicalMusicPage}
     */
    protected createMusicPage(): GraphicalMusicPage {
        const page: GraphicalMusicPage = new GraphicalMusicPage(this.graphicalMusicSheet);
        this.graphicalMusicSheet.MusicPages.push(page);
        page.PageNumber = this.graphicalMusicSheet.MusicPages.length; // caution: page number = page index + 1
        page.PositionAndShape.BorderLeft = 0.0;
        page.PositionAndShape.BorderRight = this.graphicalMusicSheet.ParentMusicSheet.pageWidth;
        page.PositionAndShape.BorderTop = 0.0;
        page.PositionAndShape.BorderBottom = this.rules.PageHeight;
        page.PositionAndShape.RelativePosition = new PointF2D(0.0, 0.0);
        return page;
    }

    protected addSystemToPage(page: GraphicalMusicPage, system: MusicSystem): void {
        page.MusicSystems.push(system);
        system.Parent = page;
    }

    /**
     * This method checks the distances between any two consecutive StaffLines of a System and if needed, shifts the lower one down.
     * @param musicSystem
     */
    protected optimizeDistanceBetweenStaffLines(musicSystem: MusicSystem): void {
        // don't perform any y-spacing in case of a StaffEntryLink (in both StaffLines)
        if (!musicSystem.checkStaffEntriesForStaffEntryLink()) {
            for (let i: number = 0; i < musicSystem.StaffLines.length - 1; i++) {
                const upperBottomLine: number[] = musicSystem.StaffLines[i].BottomLine;
                const lowerSkyLine: number[] = musicSystem.StaffLines[i + 1].SkyLine;
                // 1. Find maximum required space for sky bottom line touching each other
                let maxDistance: number = 0;
                for (let j: number = 0; j < upperBottomLine.length; j++) {
                    const bottomLineValue: number = upperBottomLine[j];

                    // look at a range of +/- 2 Units to also ensure that objects are also not too close in x-direction:
                    const startIdx: number = Math.max(0, j - 6);
                    const endIdx: number = Math.min(lowerSkyLine.length - 1, j + 6);
                    let skylineValue: number = 0;
                    for (let lowerIdx: number = startIdx; lowerIdx <= endIdx; lowerIdx++) {
                        skylineValue = Math.min(skylineValue, lowerSkyLine[lowerIdx]);
                    }

                    const distance: number = bottomLineValue - skylineValue;
                    maxDistance = Math.max(distance, maxDistance);
                }
                // 2. Add user defined distance between sky bottom line
                maxDistance += this.rules.MinSkyBottomDistBetweenStaves;
                // 3. Take the maximum between previous value and user defined value for staff line minimum distance
                maxDistance = Math.max(maxDistance, this.rules.StaffHeight + this.rules.MinimumStaffLineDistance);
                const lowerStafflineYPos: number = maxDistance + musicSystem.StaffLines[i].PositionAndShape.RelativePosition.y;
                this.updateStaffLinesRelativePosition(musicSystem, i + 1, lowerStafflineYPos);
            }
        }
        const firstStaffLine: StaffLine = musicSystem.StaffLines[0];
        musicSystem.PositionAndShape.BorderTop = firstStaffLine.PositionAndShape.RelativePosition.y + firstStaffLine.PositionAndShape.BorderTop;
        const lastStaffLine: StaffLine = musicSystem.StaffLines[musicSystem.StaffLines.length - 1];
        musicSystem.PositionAndShape.BorderBottom = lastStaffLine.PositionAndShape.RelativePosition.y + lastStaffLine.PositionAndShape.BorderBottom;
    }

    /** Calculates the relative Positions of all MusicSystems.
     *
     */
    protected calculateMusicSystemsRelativePositions(): void {
        let currentPage: GraphicalMusicPage = this.createMusicPage();
        let currentYPosition: number = 0;
        // xPosition is always fixed
        let currentSystem: MusicSystem = this.musicSystems[0];
        let timesPageCouldntFitSingleSystem: number = 0;

        for (let i: number = 0; i < this.musicSystems.length; i++) {
            currentSystem = this.musicSystems[i];
            if (currentPage.MusicSystems.length === 0) {
                // if this is the first system on the current page:
                // take top margins into account
                this.addSystemToPage(currentPage, currentSystem);
                if (this.rules.CompactMode) {
                    currentYPosition = this.rules.PageTopMarginNarrow;
                } else {
                    currentYPosition = this.rules.PageTopMargin;
                }

                if (this.graphicalMusicSheet.MusicPages.length === 1) {
                    /*
                    Only need this in the event that lyricist or composer text intersects with title,
                    which seems exceedingly rare.
                    Leaving here just in case for future needs.
                    Prefer to use skyline calculator in MusicSheetCalculator.calculatePageLabels

                    let maxLineCount: number = this.graphicalMusicSheet.Composer?.TextLines?.length;
                    let maxFontHeight: number = this.graphicalMusicSheet.Composer?.Label?.fontHeight;
                    let lyricistLineCount: number = this.graphicalMusicSheet.Lyricist?.TextLines?.length;
                    let lyricistFontHeight: number = this.graphicalMusicSheet.Lyricist?.Label?.fontHeight;

                    maxLineCount = maxLineCount ? maxLineCount : 0;
                    maxFontHeight = maxFontHeight ? maxFontHeight : 0;
                    lyricistLineCount = lyricistLineCount ? lyricistLineCount : 0;
                    lyricistFontHeight = lyricistFontHeight ? lyricistFontHeight : 0;

                    let maxHeight: number = maxLineCount * maxFontHeight;
                    const totalLyricist: number = lyricistLineCount * lyricistFontHeight;

                    if (totalLyricist > maxHeight) {
                        maxLineCount = lyricistLineCount;
                        maxFontHeight = lyricistFontHeight;
                        maxHeight = totalLyricist;
                    } */

                    if (this.rules.RenderTitle) {
                    // if it is the first System on the FIRST page: Add Title height and gap-distance
                    currentYPosition += this.rules.TitleTopDistance + this.rules.SheetTitleHeight +
                                            this.rules.TitleBottomDistance;
                    }

                    /*
                    see comment above - only needed for rare case of composer/lyricist being
                    wide enough to be below the title (or title wide enough to be above)
                    if (maxLineCount > 2) {
                        currentYPosition += maxFontHeight * (maxLineCount - 2);
                    }*/
                }
                // now add the border-top: everything that stands out above the staffline:
                currentYPosition += -currentSystem.PositionAndShape.BorderTop;
                const relativePosition: PointF2D = new PointF2D(this.rules.PageLeftMargin + this.rules.SystemLeftMargin,
                                                                currentYPosition);
                currentSystem.PositionAndShape.RelativePosition = relativePosition;
                // check if the first system doesn't even fit on the page -> would lead to truncation at bottom end:
                if (currentYPosition + currentSystem.PositionAndShape.BorderBottom > this.rules.PageHeight - this.rules.PageBottomMargin) {
                    // can't fit single system on page, maybe PageFormat too small
                    timesPageCouldntFitSingleSystem++;
                    if (timesPageCouldntFitSingleSystem <= 4) { // only warn once with detailed info
                        console.log(`warning: could not fit a single system on page ${currentPage.PageNumber}` +
                            ` and measure number ${currentSystem.GraphicalMeasures[0][0].MeasureNumber}.
                            The PageFormat may be too small for this sheet."
                            Will not give further warnings for all pages, only total.`
                        );
                    }
                }
            } else {
                // if this is not the first system on the page:
                // find optimum distance between Systems
                const previousSystem: MusicSystem = this.musicSystems[i - 1];
                const prevSystemLastStaffline: StaffLine = previousSystem.StaffLines[previousSystem.StaffLines.length - 1];
                const prevSystemLastStaffLineBB: BoundingBox = prevSystemLastStaffline.PositionAndShape;
                let distance: number =  this.findRequiredDistanceWithSkyBottomLine(previousSystem, currentSystem);

                // make sure the optical distance is the user-defined min distance:
                distance += this.rules.MinSkyBottomDistBetweenSystems;

                distance = Math.max(distance, this.rules.MinimumDistanceBetweenSystems + prevSystemLastStaffline.StaffHeight);
                const newYPosition: number =    currentYPosition +
                                                prevSystemLastStaffLineBB.RelativePosition.y +
                                                distance;

                // calculate the needed height for placing the current system on the page,
                // to see if it still fits:
                const currSystemBottomYPos: number =    newYPosition +
                                                        currentSystem.PositionAndShape.BorderMarginBottom;
                const doXmlPageBreak: boolean = this.rules.NewPageAtXMLNewPageAttribute && previousSystem.breaksPage;
                if (!doXmlPageBreak &&
                    (currSystemBottomYPos < this.rules.PageHeight - this.rules.PageBottomMargin)) {
                    // enough space on this page:
                    this.addSystemToPage(currentPage, currentSystem);
                    currentYPosition = newYPosition;
                    const relativePosition: PointF2D = new PointF2D(this.rules.PageLeftMargin + this.rules.SystemLeftMargin,
                                                                    currentYPosition);
                    currentSystem.PositionAndShape.RelativePosition = relativePosition;
                } else {
                    // new page needed:
                    currentPage = this.createMusicPage();
                    // re-check this system again:
                    i -= 1;
                    continue;
                }
            }
        }
        if (timesPageCouldntFitSingleSystem > 0) {
            console.log(`total amount of pages that couldn't fit a single music system: ${timesPageCouldntFitSingleSystem} of ${currentPage.PageNumber}`);
        }
        if (this.rules.PageBottomExtraWhiteSpace > 0 && this.graphicalMusicSheet.MusicPages.length === 1) {
            // experimental, not used unless the EngravingRule is set to > 0 (default 0)

            // calculate last page's bounding box, otherwise it uses this.rules.PageHeight which is 10001
            currentPage.PositionAndShape.calculateBoundingBox();
            // TODO currently bugged with PageFormat A3. this squeezes lyrics and notes (with A3 Landscape). why?
            //   for this reason, the extra white space should currently only be used with the Endless PageFormat,
            //   and using EngravingRules.PageBottomExtraWhiteSpace should be considered experimental.

            // add this.rules.PageBottomMargin
            const pageBottomMarginBB: BoundingBox = new BoundingBox(currentPage, currentPage.PositionAndShape, false);
            // pageBottomMarginBB.RelativePosition.x = 0;
            pageBottomMarginBB.RelativePosition.y = currentPage.PositionAndShape.BorderMarginBottom;
            // pageBottomMarginBB.BorderBottom = this.rules.PageBottomMargin;
            pageBottomMarginBB.BorderBottom = this.rules.PageBottomExtraWhiteSpace;
            pageBottomMarginBB.calculateBoundingBox();
            currentPage.PositionAndShape.calculateBoundingBox();
        }

    }

    /**
     * Finds the minimum required distance between two systems
     * with the help of the sky- and bottom lines
     * @param upperSystem
     * @param lowerSystem
     */
    private findRequiredDistanceWithSkyBottomLine(upperSystem: MusicSystem, lowerSystem: MusicSystem): number {
        const upperSystemLastStaffLine: StaffLine = upperSystem.StaffLines[upperSystem.StaffLines.length - 1];
        const lowerSystemFirstStaffLine: StaffLine = lowerSystem.StaffLines[0];
        const upperBottomLineArray: number[] = upperSystemLastStaffLine.BottomLine;
        const lowerSkyLineArray: number[] = lowerSystemFirstStaffLine.SkyLine;
        const upperStaffLineBB: BoundingBox = upperSystemLastStaffLine.PositionAndShape;
        const lowerStaffLineBB: BoundingBox = lowerSystemFirstStaffLine.PositionAndShape;
        const skylinePixelWidth: number = 1 / this.rules.SamplingUnit;
        // Find maximum required space for sky and bottom line touching each other
        let maxDistance: number = 0;
        for (let upperIdx: number = 0; upperIdx < upperBottomLineArray.length; upperIdx++) {
            const bottomLineValue: number = upperBottomLineArray[upperIdx];
            // find index of the same x-position in lower skyline:
            const lowerCenterIdx: number =  upperIdx +
                                            Math.round((upperStaffLineBB.RelativePosition.x - lowerStaffLineBB.RelativePosition.x) * skylinePixelWidth);
            if (lowerCenterIdx < 0) {
                // should actually not happen..
                continue;
            }
            if (lowerCenterIdx >= lowerSkyLineArray.length) {
                // lower system ends earlier x-wise than upper system (e.g. at last system, if it is not stretched)
                break;
            }

            // look at a range of +/- 2 Units to also ensure that objects are also not too close in x-direction:
            const startIdx: number = Math.max(0, lowerCenterIdx - 6);
            const endIdx: number = Math.min(lowerSkyLineArray.length - 1, lowerCenterIdx + 6);
            let skylineValue: number = 0;
            for (let lowerIdx: number = startIdx; lowerIdx <= endIdx; lowerIdx++) {
                skylineValue = Math.min(skylineValue, lowerSkyLineArray[lowerIdx]);
            }

            const distance: number = bottomLineValue - skylineValue;
            maxDistance = Math.max(distance, maxDistance);
        }

        if (maxDistance === 0) {
            // can only happen when the bottom- and skyline have no x-overlap at all:
            // fall back to borders:
            maxDistance = upperStaffLineBB.BorderBottom - lowerStaffLineBB.BorderTop;
        }

        return maxDistance;
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
