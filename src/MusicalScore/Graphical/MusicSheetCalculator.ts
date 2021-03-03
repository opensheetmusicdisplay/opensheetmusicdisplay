import { GraphicalStaffEntry } from "./GraphicalStaffEntry";
import { StaffLine } from "./StaffLine";
import { GraphicalMusicSheet } from "./GraphicalMusicSheet";
import { EngravingRules } from "./EngravingRules";
import { Tie } from "../VoiceData/Tie";
import { Fraction } from "../../Common/DataObjects/Fraction";
import { Note } from "../VoiceData/Note";
import { MusicSheet } from "../MusicSheet";
import { GraphicalMeasure } from "./GraphicalMeasure";
import {ClefInstruction, ClefEnum} from "../VoiceData/Instructions/ClefInstruction";
import { LyricWord } from "../VoiceData/Lyrics/LyricsWord";
import { SourceMeasure } from "../VoiceData/SourceMeasure";
import { GraphicalMusicPage } from "./GraphicalMusicPage";
import { GraphicalNote } from "./GraphicalNote";
import { Beam } from "../VoiceData/Beam";
import { OctaveEnum } from "../VoiceData/Expressions/ContinuousExpressions/OctaveShift";
import { VoiceEntry, StemDirectionType } from "../VoiceData/VoiceEntry";
import { OrnamentContainer } from "../VoiceData/OrnamentContainer";
import { Articulation } from "../VoiceData/Articulation";
import { Tuplet } from "../VoiceData/Tuplet";
import { MusicSystem } from "./MusicSystem";
import { GraphicalTie } from "./GraphicalTie";
import { RepetitionInstruction } from "../VoiceData/Instructions/RepetitionInstruction";
import { MultiExpression, MultiExpressionEntry } from "../VoiceData/Expressions/MultiExpression";
import { StaffEntryLink } from "../VoiceData/StaffEntryLink";
import { MusicSystemBuilder } from "./MusicSystemBuilder";
import { MultiTempoExpression } from "../VoiceData/Expressions/MultiTempoExpression";
import { Repetition } from "../MusicSource/Repetition";
import { PointF2D } from "../../Common/DataObjects/PointF2D";
import { SourceStaffEntry } from "../VoiceData/SourceStaffEntry";
import { BoundingBox } from "./BoundingBox";
import { Instrument } from "../Instrument";
import { GraphicalLabel } from "./GraphicalLabel";
import { TextAlignmentEnum } from "../../Common/Enums/TextAlignment";
import { VerticalGraphicalStaffEntryContainer } from "./VerticalGraphicalStaffEntryContainer";
import { KeyInstruction } from "../VoiceData/Instructions/KeyInstruction";
import { AbstractNotationInstruction } from "../VoiceData/Instructions/AbstractNotationInstruction";
import { TechnicalInstruction } from "../VoiceData/Instructions/TechnicalInstruction";
import { Pitch } from "../../Common/DataObjects/Pitch";
import { LinkedVoice } from "../VoiceData/LinkedVoice";
import { ColDirEnum } from "./BoundingBox";
import { IGraphicalSymbolFactory } from "../Interfaces/IGraphicalSymbolFactory";
import { ITextMeasurer } from "../Interfaces/ITextMeasurer";
import { ITransposeCalculator } from "../Interfaces/ITransposeCalculator";
import { OctaveShiftParams } from "./OctaveShiftParams";
import { AccidentalCalculator } from "./AccidentalCalculator";
import { MidiInstrument } from "../VoiceData/Instructions/ClefInstruction";
import { Staff } from "../VoiceData/Staff";
import { OctaveShift } from "../VoiceData/Expressions/ContinuousExpressions/OctaveShift";
import log from "loglevel";
import { Dictionary } from "typescript-collections";
import { GraphicalLyricEntry } from "./GraphicalLyricEntry";
import { GraphicalLyricWord } from "./GraphicalLyricWord";
import { GraphicalLine } from "./GraphicalLine";
import { Label } from "../Label";
import { GraphicalVoiceEntry } from "./GraphicalVoiceEntry";
import { VerticalSourceStaffEntryContainer } from "../VoiceData/VerticalSourceStaffEntryContainer";
import { SkyBottomLineCalculator } from "./SkyBottomLineCalculator";
import { PlacementEnum } from "../VoiceData/Expressions/AbstractExpression";
import { AbstractGraphicalInstruction } from "./AbstractGraphicalInstruction";
import { GraphicalInstantaneousTempoExpression } from "./GraphicalInstantaneousTempoExpression";
import { InstantaneousTempoExpression, TempoEnum } from "../VoiceData/Expressions/InstantaneousTempoExpression";
import { ContinuousTempoExpression } from "../VoiceData/Expressions/ContinuousExpressions/ContinuousTempoExpression";
import { FontStyles } from "../../Common/Enums/FontStyles";
import { AbstractTempoExpression } from "../VoiceData/Expressions/AbstractTempoExpression";
import { GraphicalInstantaneousDynamicExpression } from "./GraphicalInstantaneousDynamicExpression";
import { ContDynamicEnum } from "../VoiceData/Expressions/ContinuousExpressions/ContinuousDynamicExpression";
import { GraphicalContinuousDynamicExpression } from "./GraphicalContinuousDynamicExpression";
import { FillEmptyMeasuresWithWholeRests } from "../../OpenSheetMusicDisplay/OSMDOptions";
import { IStafflineNoteCalculator } from "../Interfaces/IStafflineNoteCalculator";
import { GraphicalUnknownExpression } from "./GraphicalUnknownExpression";

/**
 * Class used to do all the calculations in a MusicSheet, which in the end populates a GraphicalMusicSheet.
 */
export abstract class MusicSheetCalculator {
    public static symbolFactory: IGraphicalSymbolFactory;
    public static transposeCalculator: ITransposeCalculator;
    public static stafflineNoteCalculator: IStafflineNoteCalculator;
    protected static textMeasurer: ITextMeasurer;

    protected staffEntriesWithGraphicalTies: GraphicalStaffEntry[] = [];
    protected staffEntriesWithOrnaments: GraphicalStaffEntry[] = [];
    protected staffEntriesWithChordSymbols: GraphicalStaffEntry[] = [];
    protected staffLinesWithLyricWords: StaffLine[] = [];

    protected graphicalLyricWords: GraphicalLyricWord[] = [];

    protected graphicalMusicSheet: GraphicalMusicSheet;
    protected rules: EngravingRules;
    protected musicSystems: MusicSystem[];

    private abstractNotImplementedErrorMessage: string = "abstract, not implemented";

    public static get TextMeasurer(): ITextMeasurer {
        return MusicSheetCalculator.textMeasurer;
    }

    public static set TextMeasurer(value: ITextMeasurer) {
        MusicSheetCalculator.textMeasurer = value;
    }

    protected get leadSheet(): boolean {
        return this.graphicalMusicSheet.LeadSheet;
    }

    protected static setMeasuresMinStaffEntriesWidth(measures: GraphicalMeasure[], minimumStaffEntriesWidth: number): void {
        for (let idx: number = 0, len: number = measures.length; idx < len; ++idx) {
            const measure: GraphicalMeasure = measures[idx];
            if (measure) {
                measure.minimumStaffEntriesWidth = minimumStaffEntriesWidth;
            }
        }
    }

    public initialize(graphicalMusicSheet: GraphicalMusicSheet): void {
        this.graphicalMusicSheet = graphicalMusicSheet;
        this.rules = graphicalMusicSheet.ParentMusicSheet.Rules;
        this.rules.clearMusicSheetObjects();
        this.prepareGraphicalMusicSheet();
        //this.calculate();
    }

    /**
     * Build the 2D [[GraphicalMeasure]] list needed for the [[MusicSheetCalculator]].
     * Internally it creates [[GraphicalMeasure]]s, [[GraphicalStaffEntry]]'s and [[GraphicalNote]]s.
     */
    public prepareGraphicalMusicSheet(): void {
        // Clear the stored system images dict - all systems have to be redrawn.
        // Not necessary now. TODO Check
        // this.graphicalMusicSheet.SystemImages.length = 0;
        const musicSheet: MusicSheet = this.graphicalMusicSheet.ParentMusicSheet;

        this.staffEntriesWithGraphicalTies = [];
        this.staffEntriesWithOrnaments = [];
        this.staffEntriesWithChordSymbols = [];
        this.staffLinesWithLyricWords = [];
        // this.staffLinesWithGraphicalExpressions = [];

        this.graphicalMusicSheet.Initialize();
        const measureList: GraphicalMeasure[][] = this.graphicalMusicSheet.MeasureList;

        // one AccidentalCalculator for each Staff (regardless of Instrument)
        const accidentalCalculators: AccidentalCalculator[] = this.createAccidentalCalculators();

        // List of Active ClefInstructions
        const activeClefs: ClefInstruction[] = this.graphicalMusicSheet.initializeActiveClefs();

        // LyricWord - GraphicalLyricWord Lists
        const lyricWords: LyricWord[] = [];

        const completeNumberOfStaves: number = musicSheet.getCompleteNumberOfStaves();

        // Octave Shifts List
        const openOctaveShifts: OctaveShiftParams[] = [];

        // TieList - timestampsArray
        for (let i: number = 0; i < completeNumberOfStaves; i++) {
            openOctaveShifts.push(undefined);
        }

        // go through all SourceMeasures (taking into account normal SourceMusicParts and Repetitions)
        for (let idx: number = 0, len: number = musicSheet.SourceMeasures.length; idx < len; ++idx) {
            const sourceMeasure: SourceMeasure = musicSheet.SourceMeasures[idx];
            const graphicalMeasures: GraphicalMeasure[] = this.createGraphicalMeasuresForSourceMeasure(
                sourceMeasure,
                accidentalCalculators,
                lyricWords,
                openOctaveShifts,
                activeClefs
            );
            measureList.push(graphicalMeasures);
            if (sourceMeasure.multipleRestMeasures > 0 && this.rules.RenderMultipleRestMeasures) {
                // multiRest given in XML, skip the next measures included
                sourceMeasure.isReducedToMultiRest = true;
                sourceMeasure.multipleRestMeasureNumber = 1;
                const measuresToSkip: number = sourceMeasure.multipleRestMeasures - 1;
                // console.log(`skipping ${measuresToSkip} measures for measure #${sourceMeasure.MeasureNumber}.`);
                idx += measuresToSkip;
                for (let idx2: number = 1; idx2 <= measuresToSkip; idx2++) {
                    const nextSourceMeasure: SourceMeasure = musicSheet.SourceMeasures[sourceMeasure.MeasureNumber - 1 + idx2];
                    // TODO handle the case that a measure after the first multiple rest measure can't be reduced
                    nextSourceMeasure.multipleRestMeasureNumber = idx2 + 1;
                    nextSourceMeasure.isReducedToMultiRest = true;
                    measureList.push([undefined]);
                    // TODO we could push an object here or push nothing entirely,
                    //   but then the index doesn't correspond to measure numbers anymore.
                }
            }
        }

        if (this.rules.AutoGenerateMutipleRestMeasuresFromRestMeasures && this.rules.RenderMultipleRestMeasures) {
            //track number of multirests
            let beginMultiRestMeasure: SourceMeasure = undefined;
            let multiRestCount: number = 0;
            //go through all source measures again. Need to calc auto-multi-rests
            for (let idx: number = 0, len: number = musicSheet.SourceMeasures.length; idx < len; ++idx) {
                const sourceMeasure: SourceMeasure = musicSheet.SourceMeasures[idx];
                // console.log(sourceMeasure.MeasureNumber + " can be reduced: " + sourceMeasure.canBeReducedToMultiRest());
                if (!sourceMeasure.isReducedToMultiRest && sourceMeasure.canBeReducedToMultiRest()) {
                    //we've already been initialized, we are in the midst of a multirest sequence
                    if (multiRestCount > 0) {
                        beginMultiRestMeasure.isReducedToMultiRest = true;
                        beginMultiRestMeasure.multipleRestMeasureNumber = 1;
                        multiRestCount++;
                        sourceMeasure.multipleRestMeasureNumber = multiRestCount;
                        sourceMeasure.isReducedToMultiRest = true;
                        //clear out these measures. We know now that we are in multirest mode
                        for (let idx2: number = 0; idx2 < measureList[idx].length; idx2++) {
                            measureList[idx][idx2] = undefined;
                        }
                    } else { //else this is the (potential) beginning
                        beginMultiRestMeasure = sourceMeasure;
                        multiRestCount = 1;
                    }
                } else { //not multirest measure
                    if (multiRestCount > 1) { //Actual multirest sequence just happened. Process
                        beginMultiRestMeasure.multipleRestMeasures = multiRestCount;
                        //regen graphical measures for this source measure
                        const graphicalMeasures: GraphicalMeasure[] = this.createGraphicalMeasuresForSourceMeasure(
                            beginMultiRestMeasure,
                            accidentalCalculators,
                            lyricWords,
                            openOctaveShifts,
                            activeClefs
                        );
                        measureList[beginMultiRestMeasure.measureListIndex] = graphicalMeasures;
                        multiRestCount = 0;
                        beginMultiRestMeasure = undefined;
                    } else { //had a potential multirest sequence, but didn't pan out. only one measure was rests
                        multiRestCount = 0;
                        beginMultiRestMeasure = undefined;
                    }
                }
            }
            //If we reached the end of the sheet and have pending multirest measure, process
            if (multiRestCount > 1) {
                beginMultiRestMeasure.multipleRestMeasures = multiRestCount;
                beginMultiRestMeasure.isReducedToMultiRest = true;
                //regen graphical measures for this source measure
                const graphicalMeasures: GraphicalMeasure[] = this.createGraphicalMeasuresForSourceMeasure(
                    beginMultiRestMeasure,
                    accidentalCalculators,
                    lyricWords,
                    openOctaveShifts,
                    activeClefs
                );
                measureList[beginMultiRestMeasure.measureListIndex] = graphicalMeasures;
                multiRestCount = 0;
                beginMultiRestMeasure = undefined;
            }
        }

        const staffIsPercussionArray: Array<boolean> =
                        activeClefs.map(clef => (clef.ClefType === ClefEnum.percussion));

        this.handleStaffEntries(staffIsPercussionArray);
        this.calculateVerticalContainersList();
        this.setIndicesToVerticalGraphicalContainers();
    }

    /**
     * The main method for the Calculator.
     */
    public calculate(): void {
        this.musicSystems = [];

        this.clearSystemsAndMeasures();

        // delete graphicalObjects (currently: ties) that will be recalculated, newly create GraphicalObjects streching over a single StaffEntry
        this.clearRecreatedObjects();

        // this.graphicalMusicSheet.initializeActiveClefs(); // could have been changed since last render?

        this.createGraphicalTies();

        // calculate SheetLabelBoundingBoxes
        this.calculateSheetLabelBoundingBoxes();
        this.calculateXLayout(this.graphicalMusicSheet, this.maxInstrNameLabelLength());

        // create List<MusicPage>
        this.graphicalMusicSheet.MusicPages.length = 0;

        // create new MusicSystems and StaffLines (as many as necessary) and populate them with Measures from measureList
        this.calculateMusicSystems();

        // Add some white space at the end of the piece:
        //this.graphicalMusicSheet.MusicPages[0].PositionAndShape.BorderMarginBottom += 9;

        // transform Relative to Absolute Positions
        GraphicalMusicSheet.transformRelativeToAbsolutePosition(this.graphicalMusicSheet);
    }

    public calculateXLayout(graphicalMusicSheet: GraphicalMusicSheet, maxInstrNameLabelLength: number): void {
        // for each inner List in big Measure List calculate new Positions for the StaffEntries
        // and adjust Measures sizes
        // calculate max measure length for maximum zoom in.

        // let minLength: number = 0; // currently unused
        // const maxInstructionsLength: number = this.rules.MaxInstructionsConstValue;
        if (this.graphicalMusicSheet.MeasureList.length > 0) {
            /** list of vertically ordered measures belonging to one bar */
            let measures: GraphicalMeasure[] = this.graphicalMusicSheet.MeasureList[0];
            let minimumStaffEntriesWidth: number = this.calculateMeasureXLayout(measures);
            minimumStaffEntriesWidth = this.calculateMeasureWidthFromStaffEntries(measures, minimumStaffEntriesWidth);
            MusicSheetCalculator.setMeasuresMinStaffEntriesWidth(measures, minimumStaffEntriesWidth);
            // minLength = minimumStaffEntriesWidth * 1.2 + maxInstrNameLabelLength + maxInstructionsLength;
            for (let i: number = 1; i < this.graphicalMusicSheet.MeasureList.length; i++) {
                measures = this.graphicalMusicSheet.MeasureList[i];
                minimumStaffEntriesWidth = this.calculateMeasureXLayout(measures);
                minimumStaffEntriesWidth = this.calculateMeasureWidthFromStaffEntries(measures, minimumStaffEntriesWidth);
                MusicSheetCalculator.setMeasuresMinStaffEntriesWidth(measures, minimumStaffEntriesWidth);
                // minLength = Math.max(minLength, minimumStaffEntriesWidth * 1.2 + maxInstructionsLength);
            }
        }
        // this.graphicalMusicSheet.MinAllowedSystemWidth = minLength; // currently unused
    }

    public calculateMeasureWidthFromStaffEntries(measuresVertical: GraphicalMeasure[], oldMinimumStaffEntriesWidth: number): number {
        throw new Error(this.abstractNotImplementedErrorMessage);
    }

    protected formatMeasures(): void {
        throw new Error(this.abstractNotImplementedErrorMessage);
    }

    /**
     * Calculates the x layout of the staff entries within the staff measures belonging to one source measure.
     * All staff entries are x-aligned throughout all the measures.
     * @param measures - The minimum required x width of the source measure
     */
    protected calculateMeasureXLayout(measures: GraphicalMeasure[]): number {
        throw new Error(this.abstractNotImplementedErrorMessage);
    }

    /**
     * Called for every source measure when generating the list of staff measures for it.
     */
    protected initGraphicalMeasuresCreation(): void {
        throw new Error(this.abstractNotImplementedErrorMessage);
    }

    protected handleBeam(graphicalNote: GraphicalNote, beam: Beam, openBeams: Beam[]): void {
        throw new Error(this.abstractNotImplementedErrorMessage);
    }

    /**
     * Check if the tied graphical note belongs to any beams or tuplets and react accordingly.
     * @param tiedGraphicalNote
     * @param beams
     * @param activeClef
     * @param octaveShiftValue
     * @param graphicalStaffEntry
     * @param duration
     * @param openTie
     * @param isLastTieNote
     */
    protected handleTiedGraphicalNote(tiedGraphicalNote: GraphicalNote, beams: Beam[], activeClef: ClefInstruction,
                                      octaveShiftValue: OctaveEnum, graphicalStaffEntry: GraphicalStaffEntry, duration: Fraction,
                                      openTie: Tie, isLastTieNote: boolean): void {
        throw new Error(this.abstractNotImplementedErrorMessage);
    }

    protected handleVoiceEntryLyrics(voiceEntry: VoiceEntry, graphicalStaffEntry: GraphicalStaffEntry,
                                     openLyricWords: LyricWord[]): void {
        throw new Error(this.abstractNotImplementedErrorMessage);
    }

    protected handleVoiceEntryOrnaments(ornamentContainer: OrnamentContainer, voiceEntry: VoiceEntry,
                                        graphicalStaffEntry: GraphicalStaffEntry): void {
        throw new Error(this.abstractNotImplementedErrorMessage);
    }

    protected handleVoiceEntryArticulations(articulations: Articulation[],
                                            voiceEntry: VoiceEntry,
                                            staffEntry: GraphicalStaffEntry): void {
        throw new Error(this.abstractNotImplementedErrorMessage);
    }

    /**
     * Adds a technical instruction at the given staff entry.
     * @param technicalInstructions
     * @param voiceEntry
     * @param staffEntry
     */
    protected handleVoiceEntryTechnicalInstructions(technicalInstructions: TechnicalInstruction[],
                                                    voiceEntry: VoiceEntry, staffEntry: GraphicalStaffEntry): void {
        throw new Error(this.abstractNotImplementedErrorMessage);
    }


    protected handleTuplet(graphicalNote: GraphicalNote, tuplet: Tuplet, openTuplets: Tuplet[]): void {
        throw new Error(this.abstractNotImplementedErrorMessage);
    }

    protected layoutVoiceEntry(voiceEntry: VoiceEntry, graphicalNotes: GraphicalNote[],
                               graphicalStaffEntry: GraphicalStaffEntry, hasPitchedNote: boolean): void {
        throw new Error(this.abstractNotImplementedErrorMessage);
    }

    protected layoutStaffEntry(graphicalStaffEntry: GraphicalStaffEntry): void {
        throw new Error(this.abstractNotImplementedErrorMessage);
    }

    protected createGraphicalTie(tie: Tie, startGse: GraphicalStaffEntry, endGse: GraphicalStaffEntry, startNote: GraphicalNote,
                                 endNote: GraphicalNote): GraphicalTie {
        throw new Error(this.abstractNotImplementedErrorMessage);
    }

    protected updateStaffLineBorders(staffLine: StaffLine): void {
        throw new Error(this.abstractNotImplementedErrorMessage);
    }

    /**
     * Iterate through all Measures and calculates the MeasureNumberLabels.
     * @param musicSystem
     */
    protected calculateMeasureNumberPlacement(musicSystem: MusicSystem): void {
        const staffLine: StaffLine = musicSystem.StaffLines[0];
        if (!staffLine || !staffLine.Measures[0]) {
            log.warn("calculateMeasureNumberPlacement: measure undefined for system.Id " + musicSystem.Id);
            return; // TODO apparently happens in script sometimes (mp #70)
        }
        let previousMeasureNumber: number = staffLine.Measures[0].MeasureNumber;
        let labelOffsetX: number = 0;
        for (let i: number = 0; i < staffLine.Measures.length; i++) {
            if (this.rules.RenderMeasureNumbersOnlyAtSystemStart && i > 0) {
                return; // no more measures number labels need to be rendered for this system, so we can just return instead of continue.
            }
            const measure: GraphicalMeasure = staffLine.Measures[i];
            if (measure.MeasureNumber === 0 || measure.MeasureNumber === 1) {
                previousMeasureNumber = measure.MeasureNumber;
                // for the first measure, this label still needs to be created. Afterwards, this variable will hold the previous label's measure number.
            }
            if (measure !== staffLine.Measures[0] && this.rules.MeasureNumberLabelXOffset) {
                labelOffsetX = this.rules.MeasureNumberLabelXOffset;
            } else {
                labelOffsetX = 0; // don't offset label for first measure in staffline
            }

            const isFirstMeasureAndNotPrintedOne: boolean = this.rules.UseXMLMeasureNumbers &&
                measure.MeasureNumber === 1 && measure.parentSourceMeasure.getPrintedMeasureNumber() !== 1;
            if ((measure.MeasureNumber === previousMeasureNumber ||
                measure.MeasureNumber >= previousMeasureNumber + this.rules.MeasureNumberLabelOffset) &&
                !measure.parentSourceMeasure.ImplicitMeasure ||
                isFirstMeasureAndNotPrintedOne) {
                if (measure.MeasureNumber !== 1 ||
                    (measure.MeasureNumber === 1 && measure !== staffLine.Measures[0]) ||
                    isFirstMeasureAndNotPrintedOne
                    ) {
                    this.calculateSingleMeasureNumberPlacement(measure, staffLine, musicSystem, labelOffsetX);
                }
                previousMeasureNumber = measure.MeasureNumber;
            }
        }
    }

    /// <summary>
    /// This method calculates a single MeasureNumberLabel and adds it to the graphical label list of the music system
    /// </summary>
    /// <param name="measure"></param>
    /// <param name="staffLine"></param>
    /// <param name="musicSystem"></param>
    private calculateSingleMeasureNumberPlacement(measure: GraphicalMeasure, staffLine: StaffLine, musicSystem: MusicSystem,
                                                  labelOffsetX: number = 0): void {
        const labelNumber: string = measure.parentSourceMeasure.getPrintedMeasureNumber().toString();
        const label: Label = new Label(labelNumber);
        // maybe give rules as argument instead of just setting fontStyle and maybe other settings manually afterwards
        const graphicalLabel: GraphicalLabel = new GraphicalLabel(label, this.rules.MeasureNumberLabelHeight,
                                                                  TextAlignmentEnum.LeftBottom, this.rules);

        const skyBottomLineCalculator: SkyBottomLineCalculator = staffLine.SkyBottomLineCalculator;

        // calculate LabelBoundingBox and set PSI parent
        graphicalLabel.setLabelPositionAndShapeBorders();
        graphicalLabel.PositionAndShape.Parent = musicSystem.PositionAndShape;

        // calculate relative Position
        const relativeX: number = staffLine.PositionAndShape.RelativePosition.x +
            measure.PositionAndShape.RelativePosition.x - graphicalLabel.PositionAndShape.BorderMarginLeft +
            labelOffsetX;
        let relativeY: number;

        // and the corresponding SkyLine indices
        let start: number = relativeX;
        let end: number = relativeX - graphicalLabel.PositionAndShape.BorderLeft + graphicalLabel.PositionAndShape.BorderRight;

        start -= staffLine.PositionAndShape.RelativePosition.x;
        end -= staffLine.PositionAndShape.RelativePosition.x;

        // correct for hypersensitive collision checks, notes having skyline extend too far to left and right
        const startCollisionCheck: number = start + 0.5;
        const endCollisionCheck: number = end - 0.5;

        // get the minimum corresponding SkyLine value
        const skyLineMinValue: number = skyBottomLineCalculator.getSkyLineMinInRange(startCollisionCheck, endCollisionCheck);

        if (measure === staffLine.Measures[0]) {
            // must take into account possible MusicSystem Brackets
            let minBracketTopBorder: number = 0;
            if (musicSystem.GroupBrackets.length > 0) {
                for (const groupBracket of musicSystem.GroupBrackets) {
                    minBracketTopBorder = Math.min(minBracketTopBorder, groupBracket.PositionAndShape.BorderTop);
                }
            }
            relativeY = Math.min(skyLineMinValue, minBracketTopBorder);
        } else {
            relativeY = skyLineMinValue;
        }

        relativeY = Math.min(0, relativeY);

        graphicalLabel.PositionAndShape.RelativePosition = new PointF2D(relativeX, relativeY);

        skyBottomLineCalculator.updateSkyLineInRange(start, end, relativeY + graphicalLabel.PositionAndShape.BorderMarginTop);
        musicSystem.MeasureNumberLabels.push(graphicalLabel);
    }

    /**
     * Calculate the shape (Bézier curve) for this tie.
     * @param tie
     * @param tieIsAtSystemBreak
     */
    protected layoutGraphicalTie(tie: GraphicalTie, tieIsAtSystemBreak: boolean, isTab: boolean): void {
        throw new Error(this.abstractNotImplementedErrorMessage);
    }

    /**
     * Calculate the Lyrics YPositions for a single [[StaffLine]].
     * @param staffLine
     * @param lyricVersesNumber
     */
    protected calculateSingleStaffLineLyricsPosition(staffLine: StaffLine, lyricVersesNumber: number[]): GraphicalStaffEntry[] {
        let numberOfVerses: number = 0;
        let lyricsStartYPosition: number = this.rules.StaffHeight; // Add offset to prevent collision
        const lyricsStaffEntriesList: GraphicalStaffEntry[] = [];
        const skyBottomLineCalculator: SkyBottomLineCalculator = staffLine.SkyBottomLineCalculator;

        // first find maximum Ycoordinate for the whole StaffLine
        let len: number = staffLine.Measures.length;
        for (let idx: number = 0; idx < len; ++idx) {
            const measure: GraphicalMeasure = staffLine.Measures[idx];
            const measureRelativePosition: PointF2D = measure.PositionAndShape.RelativePosition;
            const len2: number = measure.staffEntries.length;
            for (let idx2: number = 0; idx2 < len2; ++idx2) {
                const staffEntry: GraphicalStaffEntry = measure.staffEntries[idx2];
                if (staffEntry.LyricsEntries.length > 0) {
                    lyricsStaffEntriesList.push(staffEntry);
                    numberOfVerses = Math.max(numberOfVerses, staffEntry.LyricsEntries.length);

                    // Position of Staffentry relative to StaffLine
                    const staffEntryPositionX: number = staffEntry.PositionAndShape.RelativePosition.x +
                        measureRelativePosition.x;

                    let minMarginLeft: number = Number.MAX_VALUE;
                    let maxMarginRight: number = Number.MIN_VALUE;

                    // if more than one LyricEntry in StaffEntry, find minMarginLeft, maxMarginRight of all corresponding Labels
                    for (let i: number = 0; i < staffEntry.LyricsEntries.length; i++) {
                        const lyricsEntryLabel: GraphicalLabel = staffEntry.LyricsEntries[i].GraphicalLabel;
                        minMarginLeft = Math.min(minMarginLeft, staffEntryPositionX + lyricsEntryLabel.PositionAndShape.BorderMarginLeft);
                        maxMarginRight = Math.max(maxMarginRight, staffEntryPositionX + lyricsEntryLabel.PositionAndShape.BorderMarginRight);
                    }

                    // check BottomLine in this range and take the maximum between the two values
                    const bottomLineMax: number = skyBottomLineCalculator.getBottomLineMaxInRange(minMarginLeft, maxMarginRight);
                    lyricsStartYPosition = Math.max(lyricsStartYPosition, bottomLineMax);
                }
            }
        }

        let maxPosition: number = 0;
        // iterate again through the Staffentries with LyricEntries
        len = lyricsStaffEntriesList.length;
        for (const staffEntry of lyricsStaffEntriesList) {
            // set LyricEntryLabel RelativePosition
            for (let i: number = 0; i < staffEntry.LyricsEntries.length; i++) {
                const lyricEntry: GraphicalLyricEntry = staffEntry.LyricsEntries[i];
                const lyricsEntryLabel: GraphicalLabel = lyricEntry.GraphicalLabel;

                // read the verseNumber and get index of this number in the sorted LyricVerseNumbersList of Instrument
                // eg verseNumbers: 2,3,4,6 => 1,2,3,4
                const verseNumber: number = lyricEntry.LyricsEntry.VerseNumber;
                const sortedLyricVerseNumberIndex: number = lyricVersesNumber.indexOf(verseNumber);
                const firstPosition: number = lyricsStartYPosition + this.rules.LyricsHeight + this.rules.VerticalBetweenLyricsDistance +
                    this.rules.LyricsYOffsetToStaffHeight;

                // Y-position calculated according to aforementioned mapping
                let position: number = firstPosition + (this.rules.VerticalBetweenLyricsDistance + this.rules.LyricsHeight) * sortedLyricVerseNumberIndex;
                if (this.leadSheet) {
                    position = 3.4 + (this.rules.VerticalBetweenLyricsDistance + this.rules.LyricsHeight) * (sortedLyricVerseNumberIndex);
                }
                const previousRelativeX: number = lyricsEntryLabel.PositionAndShape.RelativePosition.x;
                lyricsEntryLabel.PositionAndShape.RelativePosition = new PointF2D(previousRelativeX, position);
                maxPosition = Math.max(maxPosition, position);
            }
        }

        // update BottomLine (on the whole StaffLine's length)
        if (lyricsStaffEntriesList.length > 0) {
            const endX: number = staffLine.PositionAndShape.Size.width;
            let startX: number = lyricsStaffEntriesList[0].PositionAndShape.RelativePosition.x +
                lyricsStaffEntriesList[0].PositionAndShape.BorderMarginLeft +
                lyricsStaffEntriesList[0].parentMeasure.PositionAndShape.RelativePosition.x;
            startX = startX > endX ? endX : startX;
            skyBottomLineCalculator.updateBottomLineInRange(startX, endX, maxPosition);
        }
        return lyricsStaffEntriesList;
    }

    /**
     * calculates the dashes of lyric words and the extending underscore lines of syllables sung on more than one note.
     * @param lyricsStaffEntries
     */
    protected calculateLyricsExtendsAndDashes(lyricsStaffEntries: GraphicalStaffEntry[]): void {
        // iterate again to create now the extend lines and dashes for words
        for (let idx: number = 0, len: number = lyricsStaffEntries.length; idx < len; ++idx) {
            const staffEntry: GraphicalStaffEntry = lyricsStaffEntries[idx];
            // set LyricEntryLabel RelativePosition
            for (let i: number = 0; i < staffEntry.LyricsEntries.length; i++) {
                const lyricEntry: GraphicalLyricEntry = staffEntry.LyricsEntries[i];
                // calculate LyricWord's Dashes and underscoreLine
                if (lyricEntry.ParentLyricWord &&
                    lyricEntry.ParentLyricWord.GraphicalLyricsEntries[lyricEntry.ParentLyricWord.GraphicalLyricsEntries.length - 1] !== lyricEntry) {
                    this.calculateSingleLyricWord(lyricEntry);
                }
                // calculate the underscore line extend if needed
                if (lyricEntry.LyricsEntry.extend) {
                    this.calculateLyricExtend(lyricEntry);
                }
            }
        }
    }

    /**
     * Calculate a single OctaveShift for a [[MultiExpression]].
     * @param sourceMeasure
     * @param multiExpression
     * @param measureIndex
     * @param staffIndex
     */
    protected calculateSingleOctaveShift(sourceMeasure: SourceMeasure, multiExpression: MultiExpression,
                                         measureIndex: number, staffIndex: number): void {
        throw new Error(this.abstractNotImplementedErrorMessage);
    }

    /**
     * Calculate all the textual [[RepetitionInstruction]]s (e.g. dal segno) for a single [[SourceMeasure]].
     * @param repetitionInstruction
     * @param measureIndex
     */
    protected calculateWordRepetitionInstruction(repetitionInstruction: RepetitionInstruction,
                                                 measureIndex: number): void {
        throw new Error(this.abstractNotImplementedErrorMessage);
    }

    /**
     * Calculate all the Mood and Unknown Expressions for a single [[MultiExpression]].
     * @param multiExpression
     * @param measureIndex
     * @param staffIndex
     */
    protected calculateMoodAndUnknownExpression(multiExpression: MultiExpression, measureIndex: number, staffIndex: number): void {
        // calculate absolute Timestamp
        const absoluteTimestamp: Fraction = multiExpression.AbsoluteTimestamp;
        const measures: GraphicalMeasure[] = this.graphicalMusicSheet.MeasureList[measureIndex];
        let relative: PointF2D = new PointF2D();

        if ((multiExpression.MoodList.length > 0) || (multiExpression.UnknownList.length > 0)) {
        let combinedExprString: string  = "";
        for (let idx: number = 0, len: number = multiExpression.EntriesList.length; idx < len; ++idx) {
            const entry: MultiExpressionEntry = multiExpression.EntriesList[idx];
            if (entry.prefix !== "") {
                if (combinedExprString === "") {
                    combinedExprString += entry.prefix;
                } else {
                    combinedExprString += " " + entry.prefix;
                }
            }
            if (combinedExprString === "") {
                combinedExprString += entry.label;
            } else {
                combinedExprString += " " + entry.label;
            }
        }
        const staffLine: StaffLine = measures[staffIndex].ParentStaffLine;
        if (!staffLine) {
            log.debug("MusicSheetCalculator.calculateMoodAndUnknownExpression: staffLine undefined. Returning.");
            return;
        }
        relative = this.getRelativePositionInStaffLineFromTimestamp(absoluteTimestamp, staffIndex, staffLine, staffLine?.isPartOfMultiStaffInstrument());

        if (Math.abs(relative.x - 0) < 0.0001) {
            relative.x = measures[staffIndex].beginInstructionsWidth + this.rules.RhythmRightMargin;
        }

        const fontHeight: number = this.rules.UnknownTextHeight;
        const placement: PlacementEnum = multiExpression.getPlacementOfFirstEntry();
        const graphLabel: GraphicalLabel  = this.calculateLabel(staffLine,
                                                                relative, combinedExprString,
                                                                multiExpression.getFontstyleOfFirstEntry(),
                                                                placement,
                                                                fontHeight);

        const gue: GraphicalUnknownExpression = new GraphicalUnknownExpression(
            staffLine, graphLabel, placement, measures[staffIndex]?.parentSourceMeasure, multiExpression);
        //    multiExpression); // TODO would be nice to hand over and save reference to original expression,
        //                         but MultiExpression is not an AbstractExpression.
        staffLine.AbstractExpressions.push(gue);
        }
    }

    /**
     * Delete all Objects that must be recalculated.
     * If graphicalMusicSheet.reCalculate has been called, then this method will be called to reset or remove all flexible
     * graphical music symbols (e.g. Ornaments, Lyrics, Slurs) graphicalMusicSheet will have MusicPages, they will have MusicSystems etc...
     */
    protected clearRecreatedObjects(): void {
        // Clear StaffEntries with GraphicalTies
        for (let idx: number = 0, len: number = this.staffEntriesWithGraphicalTies.length; idx < len; ++idx) {
            const staffEntriesWithGraphicalTie: GraphicalStaffEntry = this.staffEntriesWithGraphicalTies[idx];
            staffEntriesWithGraphicalTie.GraphicalTies.length = 0;
        }
        this.staffEntriesWithGraphicalTies.length = 0;
        return;
    }

    /**
     * This method handles a [[StaffEntryLink]].
     * @param graphicalStaffEntry
     * @param staffEntryLinks
     */
    protected handleStaffEntryLink(graphicalStaffEntry: GraphicalStaffEntry,
                                   staffEntryLinks: StaffEntryLink[]): void {
        log.debug("handleStaffEntryLink not implemented");
    }

    /**
     * Store the newly computed [[Measure]]s in newly created [[MusicSystem]]s.
     */
    protected calculateMusicSystems(): void {
        if (!this.graphicalMusicSheet.MeasureList) {
            return;
        }

        const allMeasures: GraphicalMeasure[][] = this.graphicalMusicSheet.MeasureList;
        if (!allMeasures) {
            return;
        }
        if (this.rules.MinMeasureToDrawIndex > allMeasures.length - 1) {
            log.debug("minimum measure to draw index out of range. resetting min measure index to limit.");
            this.rules.MinMeasureToDrawIndex = allMeasures.length - 1;
        }

        // visible 2D-MeasureList
        const visibleMeasureList: GraphicalMeasure[][] = [];
        for (let idx: number = this.rules.MinMeasureToDrawIndex, len: number = allMeasures.length;
            idx < len && idx <= this.rules.MaxMeasureToDrawIndex; ++idx) {
            const graphicalMeasures: GraphicalMeasure[] = allMeasures[idx];
            const visiblegraphicalMeasures: GraphicalMeasure[] = [];
            for (let idx2: number = 0, len2: number = graphicalMeasures.length; idx2 < len2; ++idx2) {
                const graphicalMeasure: GraphicalMeasure = allMeasures[idx][idx2];

                if (graphicalMeasure?.isVisible()) {
                    visiblegraphicalMeasures.push(graphicalMeasure);

                    if (this.rules.ColoringEnabled) {
                        // (re-)color notes
                        for (const staffEntry of graphicalMeasure.staffEntries) {
                            for (const gve of staffEntry.graphicalVoiceEntries) {
                                gve.color();
                            }
                        }
                    }
                }
            }
            visibleMeasureList.push(visiblegraphicalMeasures);
        }

        // find out how many StaffLine Instances we need
        let numberOfStaffLines: number = 0;

        for (let idx: number = 0, len: number = visibleMeasureList.length; idx < len; ++idx) {
            const gmlist: GraphicalMeasure[] = visibleMeasureList[idx];
            numberOfStaffLines = Math.max(gmlist.length, numberOfStaffLines);

            break;
        }
        if (numberOfStaffLines === 0) {
            return;
        }


        // build the MusicSystems
        const musicSystemBuilder: MusicSystemBuilder = new MusicSystemBuilder();
        musicSystemBuilder.initialize(this.graphicalMusicSheet, visibleMeasureList, numberOfStaffLines);
        this.musicSystems = musicSystemBuilder.buildMusicSystems();

        this.formatMeasures();

        // check for Measures with only WholeRestNotes and correct their X-Position (middle of Measure)
        // this.checkMeasuresForWholeRestNotes(); // this currently does nothing
        if (!this.leadSheet) {
            // calculate Beam Placement
            // this.calculateBeams(); // does nothing for now, because layoutBeams() is an empty method
            // possible Displacement of RestNotes
            this.optimizeRestPlacement();
            // possible Displacement of RestNotes
            this.calculateStaffEntryArticulationMarks();
            if (this.rules.RenderSlurs) { // technically we should separate slurs and ties, but shouldn't be relevant for now
                // calculate Ties
                this.calculateTieCurves();
            }
        }
        // calculate Sky- and BottomLine
        // will have reasonable values only between ObjectsBorders (eg StaffEntries)
        this.calculateSkyBottomLines();
        // calculate TupletsNumbers
        this.calculateTupletNumbers();

        // calculate MeasureNumbers
        if (this.rules.RenderMeasureNumbers) {
            for (let idx: number = 0, len: number = this.musicSystems.length; idx < len; ++idx) {
                const musicSystem: MusicSystem = this.musicSystems[idx];
                this.calculateMeasureNumberPlacement(musicSystem);
            }
        }
        // calculate Slurs
        if (!this.leadSheet && this.rules.RenderSlurs) {
            this.calculateSlurs();
        }
        // calculate StaffEntry Ornaments
        // (must come after Slurs)
        if (!this.leadSheet) {
            this.calculateOrnaments();
        }
        // calculate StaffEntry ChordSymbols
        this.calculateChordSymbols();
        if (!this.leadSheet) {
            // calculate all Instantaneous/Continuous Dynamics Expressions
            this.calculateDynamicExpressions();
            // calculate all Mood and Unknown Expression
            this.calculateMoodAndUnknownExpressions();
            // Calculate the alignment of close expressions
            this.calculateExpressionAlignements();
            // calculate all OctaveShifts
            this.calculateOctaveShifts();
            // calcualte RepetitionInstructions (Dal Segno, Coda, etc)
            this.calculateWordRepetitionInstructions();
        }
        // calculate endings last, so they appear above measure numbers
        this.calculateRepetitionEndings();
        // calcualte all Tempo Expressions
        if (!this.leadSheet) {
            this.calculateTempoExpressions();
        }
        this.calculateRehearsalMarks();

        // calculate all LyricWords Positions
        this.calculateLyricsPosition();

        // update all StaffLine's Borders
        // create temporary Object, just to call the methods (in order to avoid declaring them static)
        for (let idx2: number = 0, len2: number = this.musicSystems.length; idx2 < len2; ++idx2) {
            const musicSystem: MusicSystem = this.musicSystems[idx2];
            for (let idx3: number = 0, len3: number = musicSystem.StaffLines.length; idx3 < len3; ++idx3) {
                const staffLine: StaffLine = musicSystem.StaffLines[idx3];
                this.updateStaffLineBorders(staffLine);
            }
        }

        // calculate Y-spacing -> MusicPages are created here
        musicSystemBuilder.calculateSystemYLayout();
        // calculate Comments for each Staffline
        this.calculateComments();
        // calculate marked Areas for Systems
        this.calculateMarkedAreas();

        // the following must be done after Y-spacing, when the MusicSystems's final Dimensions are set
        // set the final yPositions of Objects such as SystemLabels and SystemLinesContainers,
        // create all System Lines, Brackets and MeasureNumbers (for all systems and for all pages)
        for (let idx: number = 0, len: number = this.graphicalMusicSheet.MusicPages.length; idx < len; ++idx) {
            const graphicalMusicPage: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (let idx2: number = 0, len2: number = graphicalMusicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                const isFirstSystem: boolean = idx === 0 && idx2 === 0;
                const musicSystem: MusicSystem = graphicalMusicPage.MusicSystems[idx2];
                musicSystem.setMusicSystemLabelsYPosition();
                if (!this.leadSheet) {
                    musicSystem.setYPositionsToVerticalLineObjectsAndCreateLines(this.rules);
                    musicSystem.createSystemLeftLine(this.rules.SystemThinLineWidth, this.rules.SystemLabelsRightMargin, isFirstSystem);
                    musicSystem.createInstrumentBrackets(this.graphicalMusicSheet.ParentMusicSheet.Instruments, this.rules.StaffHeight);
                    musicSystem.createGroupBrackets(this.graphicalMusicSheet.ParentMusicSheet.InstrumentalGroups, this.rules.StaffHeight, 0);
                    musicSystem.alignBeginInstructions();
                } else if (musicSystem === musicSystem.Parent.MusicSystems[0]) {
                    musicSystem.createSystemLeftLine(this.rules.SystemThinLineWidth, this.rules.SystemLabelsRightMargin, isFirstSystem);
                }
                musicSystem.calculateBorders(this.rules);
            }
            const distance: number = graphicalMusicPage.MusicSystems[0].PositionAndShape.BorderTop;
            for (let idx2: number = 0, len2: number = graphicalMusicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                const musicSystem: MusicSystem = graphicalMusicPage.MusicSystems[idx2];
                // let newPosition: PointF2D = new PointF2D(musicSystem.PositionAndShape.RelativePosition.x,
                // musicSystem.PositionAndShape.RelativePosition.y - distance);
                musicSystem.PositionAndShape.RelativePosition =
                    new PointF2D(musicSystem.PositionAndShape.RelativePosition.x, musicSystem.PositionAndShape.RelativePosition.y - distance);
            }
            for (let idx2: number = 0, len2: number = graphicalMusicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                const musicSystem: MusicSystem = graphicalMusicPage.MusicSystems[idx2];
                for (let idx3: number = 0, len3: number = musicSystem.StaffLines.length; idx3 < len3; ++idx3) {
                    const staffLine: StaffLine = musicSystem.StaffLines[idx3];
                    staffLine.addActivitySymbolClickArea();
                }
            }

            // calculate TopBottom Borders for all elements recursively
            //   necessary for composer label (page labels) for high notes in first system
            graphicalMusicPage.PositionAndShape.calculateTopBottomBorders();
            // TODO how much performance does this cost? can we reduce the amount of calculations, e.g. only checking top?

            // calculate all Labels's Positions for the first Page
            if (graphicalMusicPage === this.graphicalMusicSheet.MusicPages[0]) {
                this.calculatePageLabels(graphicalMusicPage);
            }

            // calculate TopBottom Borders for all elements recursively
            graphicalMusicPage.PositionAndShape.calculateTopBottomBorders(); // this is where top bottom borders were originally calculated (only once)
        }
    }

    protected calculateMarkedAreas(): void {
        //log.debug("calculateMarkedAreas not implemented");
        return;
    }

    protected calculateComments(): void {
        //log.debug("calculateComments not implemented");
        return;
    }

    protected calculateChordSymbols(): void {
        for (const musicSystem of this.musicSystems) {
            for (const staffLine of musicSystem.StaffLines) {
                const sbc: SkyBottomLineCalculator = staffLine.SkyBottomLineCalculator;
                for (const measure of staffLine.Measures) {
                    for (const staffEntry of measure.staffEntries) {
                        if (!staffEntry.graphicalChordContainers || staffEntry.graphicalChordContainers.length === 0) {
                            continue;
                        }
                        for (const graphicalChordContainer of staffEntry.graphicalChordContainers) {
                            const sps: BoundingBox = staffEntry.PositionAndShape;
                            const gps: BoundingBox = graphicalChordContainer.PositionAndShape;
                            const start: number = gps.BorderMarginLeft + sps.AbsolutePosition.x;
                            const end: number = gps.BorderMarginRight + sps.AbsolutePosition.x;
                            sbc.updateSkyLineInRange(start, end, sps.BorderMarginTop);
                        }
                    }
                }
            }
        }
    }

    /**
     * Do layout on staff measures which only consist of a full rest.
     * @param rest
     * @param gse
     * @param measure
     */
    protected layoutMeasureWithWholeRest(rest: GraphicalNote, gse: GraphicalStaffEntry,
                                         measure: GraphicalMeasure): void {
        return;
    }

    protected layoutBeams(staffEntry: GraphicalStaffEntry): void {
        return;
    }

    protected layoutArticulationMarks(articulations: Articulation[], voiceEntry: VoiceEntry, graphicalStaffEntry: GraphicalStaffEntry): void {
        return;
    }

    protected layoutOrnament(ornaments: OrnamentContainer, voiceEntry: VoiceEntry,
                             graphicalStaffEntry: GraphicalStaffEntry): void {
        return;
    }

    protected calculateRestNotePlacementWithinGraphicalBeam(graphicalStaffEntry: GraphicalStaffEntry,
                                                            restNote: GraphicalNote,
                                                            previousNote: GraphicalNote,
                                                            nextStaffEntry: GraphicalStaffEntry,
                                                            nextNote: GraphicalNote): void {
        return;
    }

    protected calculateTupletNumbers(): void {
        return;
    }

    protected calculateSlurs(): void {
        return;
    }

    protected calculateDynamicExpressionsForMultiExpression(multiExpression: MultiExpression, measureIndex: number, staffIndex: number): void {
        return;
    }


    /**
     * This method calculates the RelativePosition of a single verbal GraphicalContinuousDynamic.
     * @param graphicalContinuousDynamic Graphical continous dynamic to be calculated
     * @param startPosInStaffline Starting point in staff line
     */
    protected calculateGraphicalVerbalContinuousDynamic(graphicalContinuousDynamic: GraphicalContinuousDynamicExpression,
                                                        startPosInStaffline: PointF2D): void {
        // if ContinuousDynamicExpression is given from words
        const graphLabel: GraphicalLabel = graphicalContinuousDynamic.Label;
        const left: number = startPosInStaffline.x + graphLabel.PositionAndShape.BorderMarginLeft;
        const right: number = startPosInStaffline.x + graphLabel.PositionAndShape.BorderMarginRight;
        // placement always below the currentStaffLine, with the exception of Voice Instrument (-> above)
        const placement: PlacementEnum = graphicalContinuousDynamic.ContinuousDynamic.Placement;
        const staffLine: StaffLine = graphicalContinuousDynamic.ParentStaffLine;
        const skyBottomLineCalculator: SkyBottomLineCalculator = staffLine.SkyBottomLineCalculator;

        let drawingHeight: number;
        if (placement === PlacementEnum.Below) {
            drawingHeight = skyBottomLineCalculator.getBottomLineMaxInRange(left, right);    // Bottom line
            graphLabel.PositionAndShape.RelativePosition = new PointF2D(startPosInStaffline.x, drawingHeight - graphLabel.PositionAndShape.BorderMarginTop);
        } else {
            drawingHeight = skyBottomLineCalculator.getSkyLineMinInRange(left, right);
            graphLabel.PositionAndShape.RelativePosition = new PointF2D(startPosInStaffline.x, drawingHeight - graphLabel.PositionAndShape.BorderMarginBottom);
        }
    }

   /**
    * This method calculates the RelativePosition of a single GraphicalContinuousDynamic.
    * @param graphicalContinuousDynamic Graphical continous dynamic to be calculated
    * @param startPosInStaffline Starting point in staff line
    */
    public calculateGraphicalContinuousDynamic(graphicalContinuousDynamic: GraphicalContinuousDynamicExpression, startPosInStaffline: PointF2D): void {
        const staffIndex: number = graphicalContinuousDynamic.ParentStaffLine.ParentStaff.idInMusicSheet;
        // TODO: Previously the staffIndex was passed down. BUT you can (and this function actually does this) get it from
        // the musicSystem OR from the ParentStaffLine. Is this the same index?
        // const staffIndex: number = musicSystem.StaffLines.indexOf(staffLine);

        // We know we have an end measure because otherwise we won't be called
        const endMeasure: GraphicalMeasure = this.graphicalMusicSheet.getGraphicalMeasureFromSourceMeasureAndIndex(
            graphicalContinuousDynamic.ContinuousDynamic.EndMultiExpression.SourceMeasureParent, staffIndex);
        if (!endMeasure) {
            log.warn("MusicSheetCalculator.calculateGraphicalContinuousDynamic: No endMeasure found");
            return;
        }

        graphicalContinuousDynamic.EndMeasure = endMeasure;
        const staffLine: StaffLine = graphicalContinuousDynamic.ParentStaffLine;
        const endStaffLine: StaffLine = endMeasure.ParentStaffLine;

        // check if Expression spreads over the same StaffLine or not
        const sameStaffLine: boolean = endStaffLine && staffLine === endStaffLine;

        let isPartOfMultiStaffInstrument: boolean = false;
        if (endStaffLine) { // unfortunately we can't do something like (endStaffLine?.check() || staffLine?.check()) in this typescript version
            isPartOfMultiStaffInstrument = endStaffLine?.isPartOfMultiStaffInstrument();
        } else if (staffLine) {
            isPartOfMultiStaffInstrument = staffLine?.isPartOfMultiStaffInstrument();
        }

        const endAbsoluteTimestamp: Fraction = Fraction.createFromFraction(graphicalContinuousDynamic.ContinuousDynamic.EndMultiExpression.AbsoluteTimestamp);

        const endPosInStaffLine: PointF2D = this.getRelativePositionInStaffLineFromTimestamp(
            endAbsoluteTimestamp, staffIndex, endStaffLine, isPartOfMultiStaffInstrument, 0);

        //currentMusicSystem and currentStaffLine
        const musicSystem: MusicSystem = staffLine.ParentMusicSystem;
        const currentStaffLineIndex: number = musicSystem.StaffLines.indexOf(staffLine);
        const skyBottomLineCalculator: SkyBottomLineCalculator = staffLine.SkyBottomLineCalculator;
        // let expressionIndex: number;

        // placement always below the currentStaffLine, with the exception of Voice Instrument (-> above)
        const placement: PlacementEnum = graphicalContinuousDynamic.ContinuousDynamic.Placement;

        // if ContinuousDynamicExpression is given from wedge
        let secondGraphicalContinuousDynamic: GraphicalContinuousDynamicExpression = undefined;

        // last length check
        if (sameStaffLine && endPosInStaffLine.x - startPosInStaffline.x < this.rules.WedgeMinLength) {
            endPosInStaffLine.x = startPosInStaffline.x + this.rules.WedgeMinLength;
        }

        // Upper staff wedge always starts at the given position and the lower staff wedge always starts at the begin of measure
        const upperStartX: number = startPosInStaffline.x;
        const lowerStartX: number = endStaffLine.Measures[0].beginInstructionsWidth - this.rules.WedgeHorizontalMargin - 2;
        //TODO fix this when a range of measures to draw is given that doesn't include all the dynamic's measures (e.g. for crescendo)
        let upperEndX: number = 0;
        let lowerEndX: number = 0;

        if (!sameStaffLine) {
            upperEndX = staffLine.PositionAndShape.Size.width;
            lowerEndX = endPosInStaffLine.x;

            // must create a new Wedge
            secondGraphicalContinuousDynamic = new GraphicalContinuousDynamicExpression(
                graphicalContinuousDynamic.ContinuousDynamic, endStaffLine, endMeasure.parentSourceMeasure);
            secondGraphicalContinuousDynamic.IsSplittedPart = true;
            graphicalContinuousDynamic.IsSplittedPart = true;
        } else {
            upperEndX = endPosInStaffLine.x;
        }

        // the Height of the Expression's placement
        let idealY: number = 0;
        let secondIdealY: number = 0;

        if (placement === PlacementEnum.Below) {
            // can be a single Staff Instrument or an Instrument with 2 Staves
            let nextStaffLineIndex: number = 0;
            if (currentStaffLineIndex < musicSystem.StaffLines.length - 1) {
                nextStaffLineIndex = currentStaffLineIndex + 1;
            }

            // check, maybe currentStaffLine is the last of the MusicSystem (and it has a ContinuousDynamicExpression with placement below)
            if (nextStaffLineIndex > currentStaffLineIndex) {
                // currentStaffLine isn't the last of the MusicSystem
                const nextStaffLine: StaffLine = musicSystem.StaffLines[nextStaffLineIndex];

                const distanceBetweenStaffLines: number = nextStaffLine.PositionAndShape.RelativePosition.y -
                    staffLine.PositionAndShape.RelativePosition.y -
                    this.rules.StaffHeight;

                // ideal Height is exactly between the two StaffLines
                idealY = this.rules.StaffHeight + distanceBetweenStaffLines / 2;
            } else {
                // currentStaffLine is the MusicSystem's last
                idealY = this.rules.WedgePlacementBelowY;
            }

            // must consider the upperWedge starting/ending tip for the comparison with the BottomLine
            idealY -= this.rules.WedgeOpeningLength / 2;
            if (!sameStaffLine) {
                // Set the value for the splitted y position to the ideal position before we check and modify it with
                // the skybottom calculator detection
                secondIdealY = idealY;
            }
            // must check BottomLine for possible collisions within the Length of the Expression
            // find the corresponding max value for the given Length
            let maxBottomLineValueForExpressionLength: number = skyBottomLineCalculator.getBottomLineMaxInRange(upperStartX, upperEndX);

            // if collisions, then set the Height accordingly
            if (maxBottomLineValueForExpressionLength > idealY) {
                idealY = maxBottomLineValueForExpressionLength;
            }

            // special case - wedge must be drawn within the boundaries of a crossedBeam
            const withinCrossedBeam: boolean = false;

            if (currentStaffLineIndex < musicSystem.StaffLines.length - 1) {
                // find GraphicalStaffEntries closest to wedge's xPositions
                const closestToEndStaffEntry: GraphicalStaffEntry = staffLine.findClosestStaffEntry(upperEndX);
                const closestToStartStaffEntry: GraphicalStaffEntry = staffLine.findClosestStaffEntry(upperStartX);

                if (closestToStartStaffEntry && closestToEndStaffEntry) {
                    // must check both StaffLines
                    const startVerticalContainer: VerticalGraphicalStaffEntryContainer = closestToStartStaffEntry.parentVerticalContainer;
                    // const endVerticalContainer: VerticalGraphicalStaffEntryContainer = closestToEndStaffEntry.parentVerticalContainer;
                    if (startVerticalContainer) {
                        // TODO: Needs to be implemented?
                        // withinCrossedBeam = areStaffEntriesWithinCrossedBeam(startVerticalContainer,
                        // endVerticalContainer, currentStaffLineIndex, nextStaffLineIndex);
                    }

                    if (withinCrossedBeam) {
                        const nextStaffLine: StaffLine = musicSystem.StaffLines[nextStaffLineIndex];
                        const nextStaffLineMinSkyLineValue: number = nextStaffLine.SkyBottomLineCalculator.getSkyLineMinInRange(upperStartX, upperEndX);
                        const distanceBetweenStaffLines: number = nextStaffLine.PositionAndShape.RelativePosition.y -
                            staffLine.PositionAndShape.RelativePosition.y;
                        const relativeSkyLineHeight: number = distanceBetweenStaffLines + nextStaffLineMinSkyLineValue;

                        if (relativeSkyLineHeight - this.rules.WedgeOpeningLength > this.rules.StaffHeight) {
                            idealY = relativeSkyLineHeight - this.rules.WedgeVerticalMargin;
                        } else {
                            idealY = this.rules.StaffHeight + this.rules.WedgeOpeningLength;
                        }

                        graphicalContinuousDynamic.NotToBeRemoved = true;
                    }
                }
            }

            // do the same in case of a Wedge ending at another StaffLine
            if (!sameStaffLine) {
                maxBottomLineValueForExpressionLength = endStaffLine.SkyBottomLineCalculator.getBottomLineMaxInRange(lowerStartX, lowerEndX);

                if (maxBottomLineValueForExpressionLength > secondIdealY) {
                    secondIdealY = maxBottomLineValueForExpressionLength;
                }

                secondIdealY += this.rules.WedgeOpeningLength / 2;
                secondIdealY += this.rules.WedgeVerticalMargin;
            }

            if (!withinCrossedBeam) {
                idealY += this.rules.WedgeOpeningLength / 2;
                idealY += this.rules.WedgeVerticalMargin;
            }

        } else if (placement === PlacementEnum.Above) {
            // single Staff Instrument (eg Voice)
            if (staffLine.ParentStaff.ParentInstrument.Staves.length === 1) {
                // single Staff Voice Instrument
                idealY = this.rules.WedgePlacementAboveY;
            } else {
                // Staff = not the first Staff of a 2-staved Instrument
                let previousStaffLineIndex: number = 0;
                if (currentStaffLineIndex > 0) {
                    previousStaffLineIndex = currentStaffLineIndex - 1;
                }

                const previousStaffLine: StaffLine = musicSystem.StaffLines[previousStaffLineIndex];
                const distanceBetweenStaffLines: number = staffLine.PositionAndShape.RelativePosition.y -
                    previousStaffLine.PositionAndShape.RelativePosition.y -
                    this.rules.StaffHeight;

                // ideal Height is exactly between the two StaffLines
                idealY = -distanceBetweenStaffLines / 2;
            }

            // must consider the upperWedge starting/ending tip for the comparison with the SkyLine
            idealY += this.rules.WedgeOpeningLength / 2;
            if (!sameStaffLine) {
                secondIdealY = idealY;
            }

            // must check SkyLine for possible collisions within the Length of the Expression
            // find the corresponding min value for the given Length
            let minSkyLineValueForExpressionLength: number = skyBottomLineCalculator.getSkyLineMinInRange(upperStartX, upperEndX);

            // if collisions, then set the Height accordingly
            if (minSkyLineValueForExpressionLength < idealY) {
                idealY = minSkyLineValueForExpressionLength;
            }
            const withinCrossedBeam: boolean = false;

            // special case - wedge must be drawn within the boundaries of a crossedBeam
            if (staffLine.ParentStaff.ParentInstrument.Staves.length > 1 && currentStaffLineIndex > 0) {
                // find GraphicalStaffEntries closest to wedge's xPositions
                const closestToStartStaffEntry: GraphicalStaffEntry = staffLine.findClosestStaffEntry(upperStartX);
                const closestToEndStaffEntry: GraphicalStaffEntry = staffLine.findClosestStaffEntry(upperEndX);

                if (closestToStartStaffEntry && closestToEndStaffEntry) {
                    // must check both StaffLines
                    const startVerticalContainer: VerticalGraphicalStaffEntryContainer = closestToStartStaffEntry.parentVerticalContainer;
                    // const endVerticalContainer: VerticalGraphicalStaffEntryContainer = closestToEndStaffEntry.parentVerticalContainer;
                    const formerStaffLineIndex: number = currentStaffLineIndex - 1;
                    if (startVerticalContainer) {
                        // withinCrossedBeam = this.areStaffEntriesWithinCrossedBeam(startVerticalContainer,
                        // endVerticalContainer, currentStaffLineIndex, formerStaffLineIndex);
                    }

                    if (withinCrossedBeam) {
                        const formerStaffLine: StaffLine = musicSystem.StaffLines[formerStaffLineIndex];
                        const formerStaffLineMaxBottomLineValue: number = formerStaffLine.SkyBottomLineCalculator.
                                                                          getBottomLineMaxInRange(upperStartX, upperEndX);
                        const distanceBetweenStaffLines: number = staffLine.PositionAndShape.RelativePosition.y -
                            formerStaffLine.PositionAndShape.RelativePosition.y;
                        const relativeSkyLineHeight: number = distanceBetweenStaffLines - formerStaffLineMaxBottomLineValue;
                        idealY = (relativeSkyLineHeight - this.rules.StaffHeight) / 2 + this.rules.StaffHeight;
                    }
                }
            }

            // do the same in case of a Wedge ending at another StaffLine
            if (!sameStaffLine) {
                minSkyLineValueForExpressionLength = endStaffLine.SkyBottomLineCalculator.getSkyLineMinInRange(lowerStartX, lowerEndX);

                if (minSkyLineValueForExpressionLength < secondIdealY) {
                    secondIdealY = minSkyLineValueForExpressionLength;
                }

                secondIdealY -= this.rules.WedgeOpeningLength / 2;
            }

            if (!withinCrossedBeam) {
                idealY -= this.rules.WedgeOpeningLength / 2;
                idealY -= this.rules.WedgeVerticalMargin;
            }
            if (!sameStaffLine) {
                secondIdealY -= this.rules.WedgeVerticalMargin;
            }
        }

        // now we have the correct placement Height for the Expression
        // the idealY is calculated relative to the currentStaffLine

        // Crescendo (point to the left, opening to the right)
        graphicalContinuousDynamic.Lines.clear();
        if (graphicalContinuousDynamic.ContinuousDynamic.DynamicType === ContDynamicEnum.crescendo) {
            if (sameStaffLine) {
                graphicalContinuousDynamic.createCrescendoLines(upperStartX, upperEndX, idealY);
                graphicalContinuousDynamic.calcPsi();
            } else {
                // two different Wedges
                graphicalContinuousDynamic.createFirstHalfCrescendoLines(upperStartX, upperEndX, idealY);
                graphicalContinuousDynamic.calcPsi();

                secondGraphicalContinuousDynamic.createSecondHalfCrescendoLines(lowerStartX, lowerEndX, secondIdealY);
                secondGraphicalContinuousDynamic.calcPsi();
            }
        } else if (graphicalContinuousDynamic.ContinuousDynamic.DynamicType === ContDynamicEnum.diminuendo) {
            if (sameStaffLine) {
                graphicalContinuousDynamic.createDiminuendoLines(upperStartX, upperEndX, idealY);
                graphicalContinuousDynamic.calcPsi();
            } else {
                graphicalContinuousDynamic.createFirstHalfDiminuendoLines(upperStartX, upperEndX, idealY);
                graphicalContinuousDynamic.calcPsi();

                secondGraphicalContinuousDynamic.createSecondHalfDiminuendoLines(lowerStartX, lowerEndX, secondIdealY);
                secondGraphicalContinuousDynamic.calcPsi();
            }
        } //End Diminuendo
    }

    /**
     * This method calculates the RelativePosition of a single GraphicalInstantaneousDynamicExpression.
     * @param graphicalInstantaneousDynamic Dynamic expression to be calculated
     * @param startPosInStaffline Starting point in staff line
     */
    protected calculateGraphicalInstantaneousDynamicExpression(graphicalInstantaneousDynamic: GraphicalInstantaneousDynamicExpression,
                                                               startPosInStaffline: PointF2D): void {
        // get Margin Dimensions
        const staffLine: StaffLine = graphicalInstantaneousDynamic.ParentStaffLine;
        if (!staffLine) {
            return; // TODO can happen when drawing range modified (osmd.setOptions({drawFromMeasureNumber...}))
        }
        const left: number = startPosInStaffline.x + graphicalInstantaneousDynamic.PositionAndShape.BorderMarginLeft;
        const right: number = startPosInStaffline.x + graphicalInstantaneousDynamic.PositionAndShape.BorderMarginRight;
        const skyBottomLineCalculator: SkyBottomLineCalculator = staffLine.SkyBottomLineCalculator;
        let yPosition: number = 0;

        // calculate yPosition according to Placement
        if (graphicalInstantaneousDynamic.Placement === PlacementEnum.Above) {
            const skyLineValue: number = skyBottomLineCalculator.getSkyLineMinInRange(left, right);

            // if StaffLine part of multiStaff Instrument and not the first one, ideal yPosition middle of distance between Staves
            if (staffLine.isPartOfMultiStaffInstrument() && staffLine.ParentStaff !== staffLine.ParentStaff.ParentInstrument.Staves[0]) {
                const formerStaffLine: StaffLine = staffLine.ParentMusicSystem.StaffLines[staffLine.ParentMusicSystem.StaffLines.indexOf(staffLine) - 1];
                const difference: number = staffLine.PositionAndShape.RelativePosition.y -
                    formerStaffLine.PositionAndShape.RelativePosition.y - this.rules.StaffHeight;

                // take always into account the size of the Dynamic
                if (skyLineValue > -difference / 2) {
                    yPosition = -difference / 2;
                } else {
                    yPosition = skyLineValue - graphicalInstantaneousDynamic.PositionAndShape.BorderMarginBottom;
                }
            } else {
                yPosition = skyLineValue - graphicalInstantaneousDynamic.PositionAndShape.BorderMarginBottom;
            }

            graphicalInstantaneousDynamic.PositionAndShape.RelativePosition = new PointF2D(startPosInStaffline.x, yPosition);
        } else if (graphicalInstantaneousDynamic.Placement === PlacementEnum.Below) {
            const bottomLineValue: number = skyBottomLineCalculator.getBottomLineMaxInRange(left, right);
            // if StaffLine part of multiStaff Instrument and not the last one, ideal yPosition middle of distance between Staves
            const lastStaff: Staff = staffLine.ParentStaff.ParentInstrument.Staves[staffLine.ParentStaff.ParentInstrument.Staves.length - 1];
            if (staffLine.isPartOfMultiStaffInstrument() && staffLine.ParentStaff !== lastStaff) {
                const nextStaffLine: StaffLine = staffLine.ParentMusicSystem.StaffLines[staffLine.ParentMusicSystem.StaffLines.indexOf(staffLine) + 1];
                const difference: number = nextStaffLine.PositionAndShape.RelativePosition.y -
                    staffLine.PositionAndShape.RelativePosition.y - this.rules.StaffHeight;
                const border: number = graphicalInstantaneousDynamic.PositionAndShape.BorderMarginBottom;

                // take always into account the size of the Dynamic
                if (bottomLineValue + border < this.rules.StaffHeight + difference / 2) {
                    yPosition = this.rules.StaffHeight + difference / 2;
                } else {
                    yPosition = bottomLineValue - graphicalInstantaneousDynamic.PositionAndShape.BorderMarginTop;
                }
            } else {
                yPosition = bottomLineValue - graphicalInstantaneousDynamic.PositionAndShape.BorderMarginTop;
            }

            graphicalInstantaneousDynamic.PositionAndShape.RelativePosition = new PointF2D(startPosInStaffline.x, yPosition);
        }
        graphicalInstantaneousDynamic.updateSkyBottomLine();
    }

    protected calcGraphicalRepetitionEndingsRecursively(repetition: Repetition): void {
        return;
    }

    /**
     * Calculate a single GraphicalRepetition.
     * @param start
     * @param end
     * @param numberText
     * @param offset
     * @param leftOpen
     * @param rightOpen
     */
    protected layoutSingleRepetitionEnding(start: GraphicalMeasure, end: GraphicalMeasure, numberText: string,
                                           offset: number, leftOpen: boolean, rightOpen: boolean): void {
        return;
    }

    protected calculateLabel(staffLine: StaffLine,
                             relative: PointF2D,
                             combinedString: string,
                             style: FontStyles,
                             placement: PlacementEnum,
                             fontHeight: number,
                             textAlignment: TextAlignmentEnum = TextAlignmentEnum.CenterBottom): GraphicalLabel {
        const label: Label = new Label(combinedString, textAlignment);
        label.fontStyle = style;
        label.fontHeight = fontHeight;

        // TODO_RR: TextHeight from first Entry
        const graphLabel: GraphicalLabel = new GraphicalLabel(label, fontHeight, label.textAlignment, this.rules, staffLine.PositionAndShape);
        const marginFactor: number = 1.1;

        if (placement === PlacementEnum.Below) {
            graphLabel.Label.textAlignment = TextAlignmentEnum.LeftTop;
        }

        graphLabel.setLabelPositionAndShapeBorders();
        graphLabel.PositionAndShape.BorderMarginBottom *= marginFactor;
        graphLabel.PositionAndShape.BorderMarginTop *= marginFactor;
        graphLabel.PositionAndShape.BorderMarginLeft *= marginFactor;
        graphLabel.PositionAndShape.BorderMarginRight *= marginFactor;

        let left: number = relative.x + graphLabel.PositionAndShape.BorderMarginLeft;
        let right: number = relative.x + graphLabel.PositionAndShape.BorderMarginRight;

        // check if GraphicalLabel exceeds the StaffLine's borders.
        if (right > staffLine.PositionAndShape.Size.width) {
            right = staffLine.PositionAndShape.Size.width - this.rules.MeasureRightMargin;
            left = right - graphLabel.PositionAndShape.MarginSize.width;
            relative.x = left - graphLabel.PositionAndShape.BorderMarginLeft;
        }

        // find allowed position (where the Label can be positioned) from Sky- BottomLine
        let drawingHeight: number;
        const skyBottomLineCalculator: SkyBottomLineCalculator = staffLine.SkyBottomLineCalculator;
        if (placement === PlacementEnum.Below) {
            drawingHeight = skyBottomLineCalculator.getBottomLineMaxInRange(left, right);
        } else {
            drawingHeight = skyBottomLineCalculator.getSkyLineMinInRange(left, right);
        }

        // set RelativePosition
        graphLabel.PositionAndShape.RelativePosition = new PointF2D(relative.x, drawingHeight);

        // update Sky- BottomLine
        if (placement === PlacementEnum.Below) {
            skyBottomLineCalculator.updateBottomLineInRange(left, right, graphLabel.PositionAndShape.BorderMarginBottom + drawingHeight);
        } else {
            skyBottomLineCalculator.updateSkyLineInRange(left, right, graphLabel.PositionAndShape.BorderMarginTop + drawingHeight);
        }
        return graphLabel;
    }

    protected calculateTempoExpressionsForMultiTempoExpression(sourceMeasure: SourceMeasure, multiTempoExpression: MultiTempoExpression,
                                                               measureIndex: number): void {
        // calculate absolute Timestamp
        const absoluteTimestamp: Fraction = Fraction.plus(sourceMeasure.AbsoluteTimestamp, multiTempoExpression.Timestamp);
        const measures: GraphicalMeasure[] = this.graphicalMusicSheet.MeasureList[measureIndex];
        let relative: PointF2D = new PointF2D();

        if (multiTempoExpression.ContinuousTempo || multiTempoExpression.InstantaneousTempo) {
            // TempoExpressions always on the first visible System's StaffLine // TODO is it though?
            if (this.rules.MinMeasureToDrawIndex > 0) {
                return; // assuming that the tempo is always in measure 1 (idx 0), adding the expression causes issues when we don't draw measure 1
            }
            if (!measures[0]) {
                return;
            }
            let staffLine: StaffLine = measures[0].ParentStaffLine;
            let firstVisibleMeasureX: number = measures[0].PositionAndShape.RelativePosition.x;
            let verticalIndex: number = 0;
            for (let j: number = 0; j < measures.length; j++) {
                if (!measures[j].ParentStaffLine || measures[j].ParentStaffLine.Measures.length === 0) {
                    continue;
                }

                if (measures[j].ParentStaffLine.Measures.length > 0) {
                    staffLine = measures[j].ParentStaffLine;
                    firstVisibleMeasureX = measures[j].PositionAndShape.RelativePosition.x;
                    verticalIndex = j;
                    break;
                }
            }
            relative = this.getRelativePositionInStaffLineFromTimestamp(absoluteTimestamp,
                                                                        verticalIndex,
                                                                        staffLine,
                                                                        staffLine.isPartOfMultiStaffInstrument(),
                                                                        firstVisibleMeasureX);

            // also placement Above
            if (multiTempoExpression.EntriesList.length > 0 &&
                multiTempoExpression.EntriesList[0].Expression instanceof InstantaneousTempoExpression) {
                const instantaniousTempo: InstantaneousTempoExpression = (multiTempoExpression.EntriesList[0].Expression as InstantaneousTempoExpression);
                instantaniousTempo.Placement = PlacementEnum.Above;

                // if an InstantaniousTempoExpression exists at the very beginning then
                // check if expression is positioned at first ever StaffEntry and
                // check if MusicSystem is first MusicSystem
                if (staffLine.Measures[0].staffEntries.length > 0 &&
                    Math.abs(relative.x - staffLine.Measures[0].staffEntries[0].PositionAndShape.RelativePosition.x) === 0 &&
                    staffLine.ParentMusicSystem === this.musicSystems[0]) {
                    const firstInstructionEntry: GraphicalStaffEntry = staffLine.Measures[0].FirstInstructionStaffEntry;
                    if (firstInstructionEntry) {
                        const lastInstruction: AbstractGraphicalInstruction = firstInstructionEntry.GraphicalInstructions.last();
                        relative.x = lastInstruction.PositionAndShape.RelativePosition.x;
                    }
                    if (this.rules.CompactMode) {
                        relative.x = staffLine.PositionAndShape.RelativePosition.x +
                            staffLine.Measures[0].PositionAndShape.RelativePosition.x;
                    }
                }
            }

            // const addAtLastList: GraphicalObject[] = [];
            for (const entry of multiTempoExpression.EntriesList) {
                let textAlignment: TextAlignmentEnum = TextAlignmentEnum.CenterBottom;
                if (this.rules.CompactMode) {
                    textAlignment = TextAlignmentEnum.LeftBottom;
                }
                const graphLabel: GraphicalLabel = this.calculateLabel(staffLine,
                                                                       relative,
                                                                       entry.label,
                                                                       multiTempoExpression.getFontstyleOfFirstEntry(),
                                                                       entry.Expression.Placement,
                                                                       this.rules.UnknownTextHeight,
                                                                       textAlignment);

                if (entry.Expression instanceof InstantaneousTempoExpression) {
                    //already added?
                    for (const expr of staffLine.AbstractExpressions) {
                        if (expr instanceof GraphicalInstantaneousTempoExpression &&
                            (expr.SourceExpression as AbstractTempoExpression).Label === entry.Expression.Label) {
                            //already added
                            continue;
                        }
                    }

                    const graphicalTempoExpr: GraphicalInstantaneousTempoExpression = new GraphicalInstantaneousTempoExpression(entry.Expression, graphLabel);
                    if (!graphicalTempoExpr.ParentStaffLine) {
                        log.warn("Adding staffline didn't work");
                        // I am actually fooling the linter here and use the created object. This method needs refactoring,
                        // all graphical expression creations should be in one place and have basic stuff like labels, lines, ...
                        // in their constructor
                    }
                    // in case of metronome mark:
                    if (this.rules.MetronomeMarksDrawn) {
                        if ((entry.Expression as InstantaneousTempoExpression).Enum === TempoEnum.metronomeMark) {
                            this.createMetronomeMark((entry.Expression as InstantaneousTempoExpression));
                            continue;
                        }
                    }
                } else if (entry.Expression instanceof ContinuousTempoExpression) {
                    // FIXME: Not yet implemented
                    // let alreadyAdded: boolean = false;
                    // for (const expr of staffLine.AbstractExpressions) {
                    //     if (expr instanceof GraphicalContinuousTempoExpression &&
                    //         expr.GetContinuousTempoExpression.Label === entry.Expression.Label) {
                    //         alreadyAdded = true;
                    //     }
                    // }

                    // if (alreadyAdded) {
                    //     continue;
                    // }

                    // staffLine.AbstractExpressions.push(new GraphicalContinuousTempoExpression((ContinuousTempoExpression)(entry.Expression), graphLabel));
                }
            }
        }
    }

    protected createMetronomeMark(metronomeExpression: InstantaneousTempoExpression): void {
        throw new Error(this.abstractNotImplementedErrorMessage);
    }

    protected graphicalMeasureCreatedCalculations(measure: GraphicalMeasure): void {
        return;
    }

    protected clearSystemsAndMeasures(): void {
        for (let idx: number = 0, len: number = this.graphicalMusicSheet.MusicPages.length; idx < len; ++idx) {
            const graphicalMusicPage: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (let idx2: number = 0, len2: number = graphicalMusicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                const musicSystem: MusicSystem = graphicalMusicPage.MusicSystems[idx2];
                for (let idx3: number = 0, len3: number = musicSystem.StaffLines.length; idx3 < len3; ++idx3) {
                    const staffLine: StaffLine = musicSystem.StaffLines[idx3];
                    for (let idx4: number = 0, len4: number = staffLine.Measures.length; idx4 < len4; ++idx4) {
                        const graphicalMeasure: GraphicalMeasure = staffLine.Measures[idx4];
                        if (graphicalMeasure.FirstInstructionStaffEntry) {
                            const index: number = graphicalMeasure.PositionAndShape.ChildElements.indexOf(
                                graphicalMeasure.FirstInstructionStaffEntry.PositionAndShape
                            );
                            if (index > -1) {
                                graphicalMeasure.PositionAndShape.ChildElements.splice(index, 1);
                            }
                            graphicalMeasure.FirstInstructionStaffEntry = undefined;
                            graphicalMeasure.beginInstructionsWidth = 0.0;
                        }
                        if (graphicalMeasure.LastInstructionStaffEntry) {
                            const index: number = graphicalMeasure.PositionAndShape.ChildElements.indexOf(
                                graphicalMeasure.LastInstructionStaffEntry.PositionAndShape
                            );
                            if (index > -1) {
                                graphicalMeasure.PositionAndShape.ChildElements.splice(index, 1);
                            }
                            graphicalMeasure.LastInstructionStaffEntry = undefined;
                            graphicalMeasure.endInstructionsWidth = 0.0;
                        }
                    }
                    staffLine.Measures = [];
                    staffLine.PositionAndShape.ChildElements = [];
                }
                musicSystem.StaffLines.length = 0;
                musicSystem.PositionAndShape.ChildElements = [];
            }
            graphicalMusicPage.MusicSystems = [];
            graphicalMusicPage.PositionAndShape.ChildElements = [];
        }
        this.graphicalMusicSheet.MusicPages = [];
    }

    protected handleVoiceEntry(voiceEntry: VoiceEntry, graphicalStaffEntry: GraphicalStaffEntry,
                               accidentalCalculator: AccidentalCalculator, openLyricWords: LyricWord[],
                               activeClef: ClefInstruction,
                               openTuplets: Tuplet[], openBeams: Beam[],
                               octaveShiftValue: OctaveEnum, staffIndex: number,
                               linkedNotes: Note[] = undefined,
                               sourceStaffEntry: SourceStaffEntry = undefined): OctaveEnum {
        if (voiceEntry.StemDirectionXml !== StemDirectionType.Undefined &&
            this.rules.SetWantedStemDirectionByXml &&
            voiceEntry.StemDirectionXml !== undefined) {
                voiceEntry.WantedStemDirection = voiceEntry.StemDirectionXml;
        } else {
            this.calculateStemDirectionFromVoices(voiceEntry);
        }
        // if GraphicalStaffEntry has been created earlier (because of Tie), then the GraphicalNotesLists have also been created
        const gve: GraphicalVoiceEntry = graphicalStaffEntry.findOrCreateGraphicalVoiceEntry(voiceEntry);
        gve.octaveShiftValue = octaveShiftValue;
        // check for Tabs:
        const tabStaffEntry: GraphicalStaffEntry = graphicalStaffEntry.tabStaffEntry;
        let graphicalTabVoiceEntry: GraphicalVoiceEntry;
        if (tabStaffEntry) {
            graphicalTabVoiceEntry = tabStaffEntry.findOrCreateGraphicalVoiceEntry(voiceEntry);
        }

        for (let idx: number = 0, len: number = voiceEntry.Notes.length; idx < len; ++idx) {
            const note: Note = voiceEntry.Notes[idx];
            if (!note) {
                continue;
            }
            if (sourceStaffEntry !== undefined && sourceStaffEntry.Link !== undefined && linkedNotes !== undefined && linkedNotes.indexOf(note) > -1) {
                continue;
            }
            let graphicalNote: GraphicalNote;
            if (voiceEntry.IsGrace) {
                graphicalNote = MusicSheetCalculator.symbolFactory.createGraceNote(note, gve, activeClef, this.rules, octaveShiftValue);
            } else {
                graphicalNote = MusicSheetCalculator.symbolFactory.createNote(note, gve, activeClef, octaveShiftValue, this.rules, undefined);
                MusicSheetCalculator.stafflineNoteCalculator.trackNote(graphicalNote);
            }
            if (note.Pitch) {
                this.checkNoteForAccidental(graphicalNote, accidentalCalculator, activeClef, octaveShiftValue);
            }
            this.resetYPositionForLeadSheet(graphicalNote.PositionAndShape);
            graphicalStaffEntry.addGraphicalNoteToListAtCorrectYPosition(gve, graphicalNote);
            graphicalNote.PositionAndShape.calculateBoundingBox();
            if (!this.leadSheet) {
                if (note.NoteBeam !== undefined && note.PrintObject) {
                    this.handleBeam(graphicalNote, note.NoteBeam, openBeams);
                }
                if (note.NoteTuplet !== undefined && note.PrintObject) {
                    this.handleTuplet(graphicalNote, note.NoteTuplet, openTuplets);
                }
            }

            // handle TabNotes:
            if (graphicalTabVoiceEntry) {
                // notes should be either TabNotes or RestNotes -> add all:
                const graphicalTabNote: GraphicalNote = MusicSheetCalculator.symbolFactory.createNote(
                    note,
                    graphicalTabVoiceEntry,
                    activeClef,
                    octaveShiftValue,
                    this.rules,
                    undefined);
                tabStaffEntry.addGraphicalNoteToListAtCorrectYPosition(graphicalTabVoiceEntry, graphicalTabNote);
                graphicalTabNote.PositionAndShape.calculateBoundingBox();

                if (!this.leadSheet) {
                    if (note.NoteTuplet) {
                        this.handleTuplet(graphicalTabNote, note.NoteTuplet, openTuplets);
                    }
                }
            }
        }
        if (voiceEntry.Articulations.length > 0) {
            this.handleVoiceEntryArticulations(voiceEntry.Articulations, voiceEntry, graphicalStaffEntry);
        }
        if (voiceEntry.TechnicalInstructions.length > 0) {
            this.handleVoiceEntryTechnicalInstructions(voiceEntry.TechnicalInstructions, voiceEntry, graphicalStaffEntry);
        }
        if (voiceEntry.LyricsEntries.size() > 0) {
            this.handleVoiceEntryLyrics(voiceEntry, graphicalStaffEntry, openLyricWords);
        }
        if (voiceEntry.OrnamentContainer) {
            this.handleVoiceEntryOrnaments(voiceEntry.OrnamentContainer, voiceEntry, graphicalStaffEntry);
        }
        return octaveShiftValue;
    }

    protected resetYPositionForLeadSheet(psi: BoundingBox): void {
        if (this.leadSheet) {
            psi.RelativePosition = new PointF2D(psi.RelativePosition.x, 0.0);
        }
    }

    protected layoutVoiceEntries(graphicalStaffEntry: GraphicalStaffEntry, staffIndex: number): void {
        graphicalStaffEntry.PositionAndShape.RelativePosition = new PointF2D(0.0, 0.0);
        if (!this.leadSheet) {
            for (const gve of graphicalStaffEntry.graphicalVoiceEntries) {
                const graphicalNotes: GraphicalNote[] = gve.notes;
                if (graphicalNotes.length === 0) {
                    continue;
                }
                const voiceEntry: VoiceEntry = graphicalNotes[0].sourceNote.ParentVoiceEntry;
                const hasPitchedNote: boolean = graphicalNotes[0].sourceNote.Pitch !== undefined;
                this.layoutVoiceEntry(voiceEntry, graphicalNotes, graphicalStaffEntry, hasPitchedNote);
            }
        }
    }

    protected maxInstrNameLabelLength(): number {
        let maxLabelLength: number = 0.0;
        for (const instrument of this.graphicalMusicSheet.ParentMusicSheet.Instruments) {
            if (instrument.NameLabel?.print && instrument.Voices.length > 0 && instrument.Voices[0].Visible) {
                let renderedLabel: Label = instrument.NameLabel;
                if (!this.rules.RenderPartNames) {
                    renderedLabel = new Label("", renderedLabel.textAlignment, renderedLabel.font);
                }
                const graphicalLabel: GraphicalLabel = new GraphicalLabel(
                    renderedLabel, this.rules.InstrumentLabelTextHeight, TextAlignmentEnum.LeftCenter, this.rules);
                graphicalLabel.setLabelPositionAndShapeBorders();
                maxLabelLength = Math.max(maxLabelLength, graphicalLabel.PositionAndShape.MarginSize.width);
            }
        }
        if (!this.rules.RenderPartNames) {
            return 0;
        }
        return maxLabelLength;
    }

    protected calculateSheetLabelBoundingBoxes(): void {
        const musicSheet: MusicSheet = this.graphicalMusicSheet.ParentMusicSheet;
        const defaultColorTitle: string = this.rules.DefaultColorTitle; // can be undefined => black
        if (musicSheet.Title !== undefined && this.rules.RenderTitle) {
            const title: GraphicalLabel = new GraphicalLabel(musicSheet.Title, this.rules.SheetTitleHeight, TextAlignmentEnum.CenterBottom, this.rules);
            title.Label.IsCreditLabel = true;
            title.Label.colorDefault = defaultColorTitle;
            this.graphicalMusicSheet.Title = title;
            title.setLabelPositionAndShapeBorders();
        } else if (!this.rules.RenderTitle) {
            this.graphicalMusicSheet.Title = undefined; // clear label if rendering it was disabled after last render
        }
        if (musicSheet.Subtitle !== undefined && this.rules.RenderSubtitle) {
            const subtitle: GraphicalLabel = new GraphicalLabel(
                musicSheet.Subtitle, this.rules.SheetSubtitleHeight, TextAlignmentEnum.CenterCenter, this.rules);
            subtitle.Label.IsCreditLabel = true;
            subtitle.Label.colorDefault = defaultColorTitle;
            this.graphicalMusicSheet.Subtitle = subtitle;
            subtitle.setLabelPositionAndShapeBorders();
        } else if (!this.rules.RenderSubtitle) {
            this.graphicalMusicSheet.Subtitle = undefined;
        }
        if (musicSheet.Composer !== undefined && this.rules.RenderComposer) {
            const composer: GraphicalLabel = new GraphicalLabel(
                musicSheet.Composer, this.rules.SheetComposerHeight, TextAlignmentEnum.RightCenter, this.rules);
            composer.Label.IsCreditLabel = true;
            composer.Label.colorDefault = defaultColorTitle;
            this.graphicalMusicSheet.Composer = composer;
            composer.setLabelPositionAndShapeBorders();
        } else if (!this.rules.RenderComposer) {
            this.graphicalMusicSheet.Composer = undefined;
        }
        if (musicSheet.Lyricist !== undefined && this.rules.RenderLyricist) {
            const lyricist: GraphicalLabel = new GraphicalLabel(
                musicSheet.Lyricist, this.rules.SheetAuthorHeight, TextAlignmentEnum.LeftCenter, this.rules);
            lyricist.Label.IsCreditLabel = true;
            lyricist.Label.colorDefault = defaultColorTitle;
            this.graphicalMusicSheet.Lyricist = lyricist;
            lyricist.setLabelPositionAndShapeBorders();
        } else if (!this.rules.RenderLyricist) {
            this.graphicalMusicSheet.Lyricist = undefined;
        }
    }

    protected checkMeasuresForWholeRestNotes(): void {
        for (let idx2: number = 0, len2: number = this.musicSystems.length; idx2 < len2; ++idx2) {
            const musicSystem: MusicSystem = this.musicSystems[idx2];
            for (let idx3: number = 0, len3: number = musicSystem.StaffLines.length; idx3 < len3; ++idx3) {
                const staffLine: StaffLine = musicSystem.StaffLines[idx3];
                for (let idx4: number = 0, len4: number = staffLine.Measures.length; idx4 < len4; ++idx4) {
                    const measure: GraphicalMeasure = staffLine.Measures[idx4];
                    if (measure.staffEntries.length === 1) {
                        const gse: GraphicalStaffEntry = measure.staffEntries[0];
                        if (gse.graphicalVoiceEntries.length > 0 && gse.graphicalVoiceEntries[0].notes.length === 1) {
                            const graphicalNote: GraphicalNote = gse.graphicalVoiceEntries[0].notes[0];
                            if (!graphicalNote.sourceNote.Pitch && (new Fraction(1, 2)).lt(graphicalNote.sourceNote.Length)) {
                                this.layoutMeasureWithWholeRest(graphicalNote, gse, measure);
                            }
                        }
                    }
                }
            }
        }
    }

    protected optimizeRestNotePlacement(graphicalStaffEntry: GraphicalStaffEntry, measure: GraphicalMeasure): void {
        if (graphicalStaffEntry.graphicalVoiceEntries.length === 0) {
            return;
        }
        const voice1Notes: GraphicalNote[] = graphicalStaffEntry.graphicalVoiceEntries[0].notes;
        if (voice1Notes.length === 0) {
            return;
        }
        const voice1Note1: GraphicalNote = voice1Notes[0];
        const voice1Note1IsRest: boolean = voice1Note1.sourceNote.isRest();
        if (graphicalStaffEntry.graphicalVoiceEntries.length === 2) {
            let voice2Note1IsRest: boolean = false;
            const voice2Notes: GraphicalNote[] = graphicalStaffEntry.graphicalVoiceEntries[1].notes;
            if (voice2Notes.length > 0) {
                const voice2Note1: GraphicalNote = voice2Notes[0];
                voice2Note1IsRest = voice2Note1.sourceNote.isRest();
            }
            if (voice1Note1IsRest && voice2Note1IsRest) {
                this.calculateTwoRestNotesPlacementWithCollisionDetection(graphicalStaffEntry);
            } else if (voice1Note1IsRest || voice2Note1IsRest) {
                this.calculateRestNotePlacementWithCollisionDetectionFromGraphicalNote(graphicalStaffEntry);
            }
        } else if (voice1Note1IsRest && graphicalStaffEntry !== measure.staffEntries[0] &&
            graphicalStaffEntry !== measure.staffEntries[measure.staffEntries.length - 1]) {
            const staffEntryIndex: number = measure.staffEntries.indexOf(graphicalStaffEntry);
            const previousStaffEntry: GraphicalStaffEntry = measure.staffEntries[staffEntryIndex - 1];
            const nextStaffEntry: GraphicalStaffEntry = measure.staffEntries[staffEntryIndex + 1];
            if (previousStaffEntry.graphicalVoiceEntries.length === 1) {
                const previousNote: GraphicalNote = previousStaffEntry.graphicalVoiceEntries[0].notes[0];
                if (previousNote.sourceNote.NoteBeam !== undefined && nextStaffEntry.graphicalVoiceEntries.length === 1) {
                    const nextNote: GraphicalNote = nextStaffEntry.graphicalVoiceEntries[0].notes[0];
                    if (nextNote.sourceNote.NoteBeam !== undefined && previousNote.sourceNote.NoteBeam === nextNote.sourceNote.NoteBeam) {
                        this.calculateRestNotePlacementWithinGraphicalBeam(
                            graphicalStaffEntry, voice1Note1, previousNote,
                            nextStaffEntry, nextNote
                        );
                        graphicalStaffEntry.PositionAndShape.calculateBoundingBox();
                    }
                }
            }
        }
    }

    protected getRelativePositionInStaffLineFromTimestamp(timestamp: Fraction, verticalIndex: number, staffLine: StaffLine,
                                                          multiStaffInstrument: boolean, firstVisibleMeasureRelativeX: number = 0.0): PointF2D {
        let relative: PointF2D = new PointF2D();
        let leftStaffEntry: GraphicalStaffEntry = undefined;
        let rightStaffEntry: GraphicalStaffEntry = undefined;
        const numEntries: number = this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers.length;
        const index: number = this.graphicalMusicSheet.GetInterpolatedIndexInVerticalContainers(timestamp);
        const leftIndex: number = Math.min(Math.floor(index), numEntries - 1);
        const rightIndex: number = Math.min(Math.ceil(index), numEntries - 1);
        if (leftIndex < 0 || verticalIndex < 0) {
            return relative;
        }
        leftStaffEntry = this.getFirstLeftNotNullStaffEntryFromContainer(leftIndex, verticalIndex, multiStaffInstrument);
        rightStaffEntry = this.getFirstRightNotNullStaffEntryFromContainer(rightIndex, verticalIndex, multiStaffInstrument);
        if (leftStaffEntry && rightStaffEntry) {
            let measureRelativeX: number = leftStaffEntry.parentMeasure.PositionAndShape.RelativePosition.x;
            if (firstVisibleMeasureRelativeX > 0) {
                measureRelativeX = firstVisibleMeasureRelativeX;
            }
            let leftX: number = leftStaffEntry.PositionAndShape.RelativePosition.x + measureRelativeX;
            let rightX: number = rightStaffEntry.PositionAndShape.RelativePosition.x + rightStaffEntry.parentMeasure.PositionAndShape.RelativePosition.x;
            if (firstVisibleMeasureRelativeX > 0) {
                rightX = rightStaffEntry.PositionAndShape.RelativePosition.x + measureRelativeX;
            }
            let timestampQuotient: number = 0.0;
            if (leftStaffEntry !== rightStaffEntry) {
                const leftTimestamp: Fraction = leftStaffEntry.getAbsoluteTimestamp();
                const rightTimestamp: Fraction = rightStaffEntry.getAbsoluteTimestamp();
                const leftDifference: Fraction = Fraction.minus(timestamp, leftTimestamp);
                timestampQuotient = leftDifference.RealValue / Fraction.minus(rightTimestamp, leftTimestamp).RealValue;
            }
            if (leftStaffEntry.parentMeasure.ParentStaffLine !== rightStaffEntry.parentMeasure.ParentStaffLine) {
                if (leftStaffEntry.parentMeasure.ParentStaffLine === staffLine) {
                    rightX = staffLine.PositionAndShape.Size.width;
                } else {
                    leftX = staffLine.PositionAndShape.RelativePosition.x;
                }
            }
            relative = new PointF2D(leftX + (rightX - leftX) * timestampQuotient, 0.0);
        }
        return relative;
    }

    protected getRelativeXPositionFromTimestamp(timestamp: Fraction): number {
        const numEntries: number = this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers.length;
        const index: number = this.graphicalMusicSheet.GetInterpolatedIndexInVerticalContainers(timestamp);
        const discreteIndex: number = Math.max(0, Math.min(Math.round(index), numEntries - 1));
        const gse: GraphicalStaffEntry = this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers[discreteIndex].getFirstNonNullStaffEntry();
        const posX: number = gse.PositionAndShape.RelativePosition.x + gse.parentMeasure.PositionAndShape.RelativePosition.x;
        return posX;
    }

    protected calculatePageLabels(page: GraphicalMusicPage): void {
        if (this.rules.RenderSingleHorizontalStaffline) {
            page.PositionAndShape.BorderRight = page.PositionAndShape.Size.width;
            page.PositionAndShape.calculateBoundingBox();
            this.graphicalMusicSheet.ParentMusicSheet.pageWidth = page.PositionAndShape.Size.width;
        }
        // The PositionAndShape child elements of page need to be manually connected to the lyricist, composer, subtitle, etc.
        // because the page is only available now
        let firstSystemAbsoluteTopMargin: number = 10;
        if (page.MusicSystems.length > 0) {
            const firstMusicSystem: MusicSystem = page.MusicSystems[0];
            firstSystemAbsoluteTopMargin = firstMusicSystem.PositionAndShape.RelativePosition.y + firstMusicSystem.PositionAndShape.BorderTop;
        }
        //const firstStaffLine: StaffLine = this.graphicalMusicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
        if (this.graphicalMusicSheet.Title) {
            const title: GraphicalLabel = this.graphicalMusicSheet.Title;
            title.PositionAndShape.Parent = page.PositionAndShape;
            //title.PositionAndShape.Parent = firstStaffLine.PositionAndShape;
            const relative: PointF2D = new PointF2D();
            relative.x = this.graphicalMusicSheet.ParentMusicSheet.pageWidth / 2;
            //relative.x = firstStaffLine.PositionAndShape.RelativePosition.x + firstStaffLine.PositionAndShape.Size.width / 2; // half of first staffline width
            relative.y = this.rules.TitleTopDistance + this.rules.SheetTitleHeight;
            title.PositionAndShape.RelativePosition = relative;
            page.Labels.push(title);
        }
        if (this.graphicalMusicSheet.Subtitle) {
            const subtitle: GraphicalLabel = this.graphicalMusicSheet.Subtitle;
            //subtitle.PositionAndShape.Parent = firstStaffLine.PositionAndShape;
            subtitle.PositionAndShape.Parent = page.PositionAndShape;
            const relative: PointF2D = new PointF2D();
            relative.x = this.graphicalMusicSheet.ParentMusicSheet.pageWidth / 2;
            //relative.x = firstStaffLine.PositionAndShape.RelativePosition.x + firstStaffLine.PositionAndShape.Size.width / 2; // half of first staffline width
            relative.y = this.rules.TitleTopDistance + this.rules.SheetTitleHeight + this.rules.SheetMinimumDistanceBetweenTitleAndSubtitle;
            subtitle.PositionAndShape.RelativePosition = relative;
            page.Labels.push(subtitle);
        }
        // Get the first system, first staffline skybottomcalculator
        // const topStaffline: StaffLine = page.MusicSystems[0].StaffLines[0];
        // const skyBottomLineCalculator: SkyBottomLineCalculator = topStaffline.SkyBottomLineCalculator;
        //   we don't need a skybottomcalculator currently, labels are put above system skyline anyways.
        const composer: GraphicalLabel = this.graphicalMusicSheet.Composer;
        let composerRelativeY: number;
        if (composer) {
            composer.PositionAndShape.Parent = page.PositionAndShape; // if using pageWidth. (which can currently be too wide) TODO fix pageWidth (#578)
            //composer.PositionAndShape.Parent = topStaffline.PositionAndShape; // if using firstStaffLine...width.
            //      y-collision problems, harder to y-align with lyrics
            composer.setLabelPositionAndShapeBorders();
            const relative: PointF2D = new PointF2D();
            //const firstStaffLineEndX: number = this.rules.PageLeftMargin + this.rules.SystemLeftMargin + this.rules.left
            //    firstStaffLine.PositionAndShape.RelativePosition.x + firstStaffLine.PositionAndShape.Size.width;
            //relative.x = Math.min(this.graphicalMusicSheet.ParentMusicSheet.pageWidth - this.rules.PageRightMargin,
            //  firstStaffLineEndX); // awkward with 2-bar score
            relative.x = this.graphicalMusicSheet.ParentMusicSheet.pageWidth - this.rules.PageRightMargin;
            //relative.x = firstStaffLine.PositionAndShape.Size.width;
            //when this is less, goes higher.
            //So 0 is top of the sheet, 22 or so is touching the music system margin

            relative.y = firstSystemAbsoluteTopMargin;
            //relative.y = - this.rules.SystemComposerDistance;
            //relative.y = -firstStaffLine.PositionAndShape.Size.height;
            // TODO only add measure label height if rendering labels and composer measure has label
            // TODO y-align with lyricist? which is harder if they have different bbox parents (page and firstStaffLine).
            // when the pageWidth gets fixed, we could use page as parent again.

            //Sufficient for now to just use the longest composer entry instead of bottom.
            //Otherwise we need to construct a 'bottom line' for the text block
            // const endX: number = topStaffline.PositionAndShape.BorderMarginRight;
            // const startX: number = endX - composer.PositionAndShape.Size.width;
            // const currentMin: number = skyBottomLineCalculator.getSkyLineMinInRange(startX, endX);

            relative.y -= this.rules.SystemComposerDistance;
            const lines: number = composer.TextLines?.length;
            if (lines > 1) { //Don't want to affect existing behavior. but this doesn't check bboxes for clip
                relative.y -= composer.PositionAndShape.BorderBottom * (lines - 1) / (lines);
            }
            //const newSkylineY: number = currentMin; // don't add composer label height to skyline
            //- firstSystemAbsoluteTopMargin - this.rules.SystemComposerDistance - composer.PositionAndShape.MarginSize.height;
            //skyBottomLineCalculator.updateSkyLineInRange(startX, endX, newSkylineY); // this can fix skyline for generateImages for some reason
            composerRelativeY = relative.y; // for lyricist label

            composer.PositionAndShape.RelativePosition = relative;
            page.Labels.push(composer);
        }
        const lyricist: GraphicalLabel = this.graphicalMusicSheet.Lyricist;
        if (lyricist) {
            lyricist.PositionAndShape.Parent = page.PositionAndShape;
            lyricist.setLabelPositionAndShapeBorders();
            const relative: PointF2D = new PointF2D();
            relative.x = this.rules.PageLeftMargin;
            relative.y = firstSystemAbsoluteTopMargin;
            // const startX: number = topStaffline.PositionAndShape.BorderMarginLeft - relative.x;
            // const endX: number = startX + lyricist.PositionAndShape.Size.width;
            // const currentMin: number = skyBottomLineCalculator.getSkyLineMinInRange(startX, endX);

            relative.y += lyricist.PositionAndShape.BorderBottom;
            relative.y = Math.min(relative.y, composerRelativeY); // same height as composer label (at least not lower)
            //skyBottomLineCalculator.updateSkyLineInRange(startX, endX, currentMin - lyricist.PositionAndShape.MarginSize.height);
            //relative.y = Math.max(relative.y, composer.PositionAndShape.RelativePosition.y);
            lyricist.PositionAndShape.RelativePosition = relative;
            page.Labels.push(lyricist);
        }
    }

    protected createGraphicalTies(): void {
        for (let measureIndex: number = 0; measureIndex < this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures.length; measureIndex++) {
            const sourceMeasure: SourceMeasure = this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures[measureIndex];
            for (let staffIndex: number = 0; staffIndex < sourceMeasure.CompleteNumberOfStaves; staffIndex++) {
                for (let j: number = 0; j < sourceMeasure.VerticalSourceStaffEntryContainers.length; j++) {
                    const sourceStaffEntry: SourceStaffEntry = sourceMeasure.VerticalSourceStaffEntryContainers[j].StaffEntries[staffIndex];
                    if (sourceStaffEntry) {
                        const startStaffEntry: GraphicalStaffEntry = this.graphicalMusicSheet.findGraphicalStaffEntryFromMeasureList(
                            staffIndex, measureIndex, sourceStaffEntry
                        );
                        for (let idx: number = 0, len: number = sourceStaffEntry.VoiceEntries.length; idx < len; ++idx) {
                            const voiceEntry: VoiceEntry = sourceStaffEntry.VoiceEntries[idx];
                            for (let idx2: number = 0, len2: number = voiceEntry.Notes.length; idx2 < len2; ++idx2) {
                                const note: Note = voiceEntry.Notes[idx2];
                                if (note.NoteTie) {
                                    const tie: Tie = note.NoteTie;
                                    this.handleTie(tie, startStaffEntry, staffIndex, measureIndex);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    private handleTie(tie: Tie, startGraphicalStaffEntry: GraphicalStaffEntry, staffIndex: number, measureIndex: number): void {
        if (!startGraphicalStaffEntry) {
            // console.log('tie not found in measure number ' + measureIndex - 1);
            return;
        }
        let startGse: GraphicalStaffEntry = startGraphicalStaffEntry;
        let startNote: GraphicalNote = undefined;
        let endGse: GraphicalStaffEntry = undefined;
        let endNote: GraphicalNote = undefined;
        for (let i: number = 1; i < tie.Notes.length; i++) {
            startNote = startGse.findTieGraphicalNoteFromNote(tie.Notes[i - 1]);
            endGse = this.graphicalMusicSheet.GetGraphicalFromSourceStaffEntry(tie.Notes[i].ParentStaffEntry);
            if (!endGse) {
                continue;
            }
            endNote = endGse.findTieGraphicalNoteFromNote(tie.Notes[i]);
            if (startNote !== undefined && endNote !== undefined && endGse) {
                if (!startNote.sourceNote.PrintObject || !endNote.sourceNote.PrintObject) {
                    continue;
                }
                const graphicalTie: GraphicalTie = this.createGraphicalTie(tie, startGse, endGse, startNote, endNote);
                startGse.GraphicalTies.push(graphicalTie);
                if (this.staffEntriesWithGraphicalTies.indexOf(startGse) >= 0) {
                    this.staffEntriesWithGraphicalTies.push(startGse);
                }
            }
            startGse = endGse;
        }
    }

    private createAccidentalCalculators(): AccidentalCalculator[] {
        const accidentalCalculators: AccidentalCalculator[] = [];
        const firstSourceMeasure: SourceMeasure = this.graphicalMusicSheet.ParentMusicSheet.getFirstSourceMeasure();
        if (firstSourceMeasure) {
            for (let i: number = 0; i < firstSourceMeasure.CompleteNumberOfStaves; i++) {
                const accidentalCalculator: AccidentalCalculator = new AccidentalCalculator();
                accidentalCalculators.push(accidentalCalculator);
                if (firstSourceMeasure.FirstInstructionsStaffEntries[i]) {
                    for (let idx: number = 0, len: number = firstSourceMeasure.FirstInstructionsStaffEntries[i].Instructions.length; idx < len; ++idx) {
                        const abstractNotationInstruction: AbstractNotationInstruction = firstSourceMeasure.FirstInstructionsStaffEntries[i].Instructions[idx];
                        if (abstractNotationInstruction instanceof KeyInstruction) {
                            const keyInstruction: KeyInstruction = <KeyInstruction>abstractNotationInstruction;
                            accidentalCalculator.ActiveKeyInstruction = keyInstruction;
                        }
                    }
                }
            }
        }
        return accidentalCalculators;
    }

    private calculateVerticalContainersList(): void {
        const numberOfEntries: number = this.graphicalMusicSheet.MeasureList[0].length;
        for (let i: number = 0; i < this.graphicalMusicSheet.MeasureList.length; i++) {
            for (let j: number = 0; j < numberOfEntries; j++) {
                const measure: GraphicalMeasure = this.graphicalMusicSheet.MeasureList[i][j];
                if (!measure) {
                    continue;
                }
                for (let idx: number = 0, len: number = measure.staffEntries.length; idx < len; ++idx) {
                    const graphicalStaffEntry: GraphicalStaffEntry = measure.staffEntries[idx];
                    const verticalContainer: VerticalGraphicalStaffEntryContainer =
                        this.graphicalMusicSheet.getOrCreateVerticalContainer(graphicalStaffEntry.getAbsoluteTimestamp());
                    if (verticalContainer) {
                        verticalContainer.StaffEntries[j] = graphicalStaffEntry;
                        graphicalStaffEntry.parentVerticalContainer = verticalContainer;
                    }
                }
            }
        }
    }

    private setIndicesToVerticalGraphicalContainers(): void {
        for (let i: number = 0; i < this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers.length; i++) {
            this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers[i].Index = i;
        }
    }

    private createGraphicalMeasuresForSourceMeasure(sourceMeasure: SourceMeasure, accidentalCalculators: AccidentalCalculator[],
                                                    openLyricWords: LyricWord[],
                                                    openOctaveShifts: OctaveShiftParams[], activeClefs: ClefInstruction[]): GraphicalMeasure[] {
        this.initGraphicalMeasuresCreation();
        const verticalMeasureList: GraphicalMeasure[] = []; // (VexFlowMeasure, extends GraphicalMeasure)
        const openBeams: Beam[] = [];
        const openTuplets: Tuplet[] = [];
        const staffEntryLinks: StaffEntryLink[] = [];
        let restInAllGraphicalMeasures: boolean = true;
        for (let staffIndex: number = 0; staffIndex < sourceMeasure.CompleteNumberOfStaves; staffIndex++) {
            const measure: GraphicalMeasure = this.createGraphicalMeasure( // (VexFlowMeasure)
                sourceMeasure, openTuplets, openBeams,
                accidentalCalculators[staffIndex], activeClefs, openOctaveShifts, openLyricWords, staffIndex, staffEntryLinks
            );
            restInAllGraphicalMeasures = restInAllGraphicalMeasures && measure.hasOnlyRests;
            verticalMeasureList.push(measure);
        }
        sourceMeasure.allRests = restInAllGraphicalMeasures;
        sourceMeasure.VerticalMeasureList = verticalMeasureList; // much easier way to link sourceMeasure to graphicalMeasures than Dictionary
        //this.graphicalMusicSheet.sourceToGraphicalMeasureLinks.setValue(sourceMeasure, verticalMeasureList); // overwrites entries because:
        //this.graphicalMusicSheet.sourceToGraphicalMeasureLinks[sourceMeasure] = verticalMeasureList; // can't use SourceMeasure as key.
        // to save the reference by dictionary we would need two Dictionaries, id -> sourceMeasure and id -> GraphicalMeasure.
        return verticalMeasureList;
    }

    private createGraphicalMeasure(sourceMeasure: SourceMeasure, openTuplets: Tuplet[], openBeams: Beam[],
                                   accidentalCalculator: AccidentalCalculator, activeClefs: ClefInstruction[],
                                   openOctaveShifts: OctaveShiftParams[], openLyricWords: LyricWord[], staffIndex: number,
                                   staffEntryLinks: StaffEntryLink[]): GraphicalMeasure {
        const staff: Staff = this.graphicalMusicSheet.ParentMusicSheet.getStaffFromIndex(staffIndex);
        let measure: GraphicalMeasure = undefined;
        if (activeClefs[staffIndex].ClefType === ClefEnum.TAB) {
            staff.isTab = true;
            measure = MusicSheetCalculator.symbolFactory.createTabStaffMeasure(sourceMeasure, staff);
        } else if (sourceMeasure.multipleRestMeasures && this.rules.RenderMultipleRestMeasures) {
            measure = MusicSheetCalculator.symbolFactory.createMultiRestMeasure(sourceMeasure, staff);
        } else if (sourceMeasure.multipleRestMeasureNumber > 1) {
            return undefined; // don't need to create a graphical measure that is within a multiple rest measure
        } else {
            measure = MusicSheetCalculator.symbolFactory.createGraphicalMeasure(sourceMeasure, staff);
        }
        measure.hasError = sourceMeasure.getErrorInMeasure(staffIndex);
        // check for key instruction changes
        if (sourceMeasure.FirstInstructionsStaffEntries[staffIndex]) {
            for (let idx: number = 0, len: number = sourceMeasure.FirstInstructionsStaffEntries[staffIndex].Instructions.length; idx < len; ++idx) {
                const instruction: AbstractNotationInstruction = sourceMeasure.FirstInstructionsStaffEntries[staffIndex].Instructions[idx];
                if (instruction instanceof KeyInstruction) {
                    const key: KeyInstruction = KeyInstruction.copy(instruction);
                    if (this.graphicalMusicSheet.ParentMusicSheet.Transpose !== 0 &&
                        measure.ParentStaff.ParentInstrument.MidiInstrumentId !== MidiInstrument.Percussion &&
                        MusicSheetCalculator.transposeCalculator) {
                        MusicSheetCalculator.transposeCalculator.transposeKey(
                            key, this.graphicalMusicSheet.ParentMusicSheet.Transpose
                        );
                    }
                    accidentalCalculator.ActiveKeyInstruction = key;
                }
            }
        }
        // check for octave shifts
        for (let idx: number = 0, len: number = sourceMeasure.StaffLinkedExpressions[staffIndex].length; idx < len; ++idx) {
            const multiExpression: MultiExpression = sourceMeasure.StaffLinkedExpressions[staffIndex][idx];
            if (multiExpression.OctaveShiftStart) {
                const openOctaveShift: OctaveShift = multiExpression.OctaveShiftStart;
                let absoluteEnd: Fraction = openOctaveShift?.ParentEndMultiExpression?.AbsoluteTimestamp;
                if (!openOctaveShift?.ParentEndMultiExpression) {
                    const measureEndTimestamp: Fraction = Fraction.plus(sourceMeasure.AbsoluteTimestamp, sourceMeasure.Duration);
                    absoluteEnd = measureEndTimestamp;
                    // TODO better handling if end expression missing
                    // old comment:
                    // TODO check if octaveshift end exists, otherwise set to last measure end. only necessary if xml was cut manually and is incomplete
                }
                openOctaveShifts[staffIndex] = new OctaveShiftParams(
                    openOctaveShift, multiExpression?.AbsoluteTimestamp,
                    absoluteEnd
                );
            }
        }
        // create GraphicalStaffEntries - always check for possible null Entry
        for (let entryIndex: number = 0; entryIndex < sourceMeasure.VerticalSourceStaffEntryContainers.length; entryIndex++) {
            const sourceStaffEntry: SourceStaffEntry = sourceMeasure.VerticalSourceStaffEntryContainers[entryIndex].StaffEntries[staffIndex];
            // is there a SourceStaffEntry at this Index
            if (sourceStaffEntry) {
                // a SourceStaffEntry exists
                // is there an inStaff ClefInstruction? -> update activeClef
                for (let idx: number = 0, len: number = sourceStaffEntry.Instructions.length; idx < len; ++idx) {
                    const abstractNotationInstruction: AbstractNotationInstruction = sourceStaffEntry.Instructions[idx];
                    if (abstractNotationInstruction instanceof ClefInstruction) {
                        activeClefs[staffIndex] = <ClefInstruction>abstractNotationInstruction;
                    }
                }
                // create new GraphicalStaffEntry
                const graphicalStaffEntry: GraphicalStaffEntry = MusicSheetCalculator.symbolFactory.createStaffEntry(sourceStaffEntry, measure);
                if (entryIndex < measure.staffEntries.length) {
                    // a GraphicalStaffEntry has been inserted already at this Index (from Tie)
                    measure.addGraphicalStaffEntryAtTimestamp(graphicalStaffEntry);
                } else {
                    measure.addGraphicalStaffEntry(graphicalStaffEntry);
                }

                const linkedNotes: Note[] = [];
                if (sourceStaffEntry.Link) {
                    sourceStaffEntry.findLinkedNotes(linkedNotes);
                    this.handleStaffEntryLink(graphicalStaffEntry, staffEntryLinks);
                }
                // check for possible OctaveShift
                let octaveShiftValue: OctaveEnum = OctaveEnum.NONE;
                if (openOctaveShifts[staffIndex]) {
                    if (openOctaveShifts[staffIndex].getAbsoluteStartTimestamp.lte(sourceStaffEntry.AbsoluteTimestamp) &&
                        sourceStaffEntry.AbsoluteTimestamp.lte(openOctaveShifts[staffIndex].getAbsoluteEndTimestamp)) {
                        octaveShiftValue = openOctaveShifts[staffIndex].getOpenOctaveShift.Type;
                    }
                }
                // for each visible Voice create the corresponding GraphicalNotes
                for (let idx: number = 0, len: number = sourceStaffEntry.VoiceEntries.length; idx < len; ++idx) {
                    const voiceEntry: VoiceEntry = sourceStaffEntry.VoiceEntries[idx];
                    // Normal Notes...
                    octaveShiftValue = this.handleVoiceEntry(
                        voiceEntry, graphicalStaffEntry,
                        accidentalCalculator, openLyricWords,
                        activeClefs[staffIndex], openTuplets,
                        openBeams, octaveShiftValue, staffIndex,
                        linkedNotes, sourceStaffEntry
                    );
                }
                // SourceStaffEntry has inStaff ClefInstruction -> create graphical clef
                if (sourceStaffEntry.Instructions.length > 0) {
                    const clefInstruction: ClefInstruction = <ClefInstruction>sourceStaffEntry.Instructions[0];
                    MusicSheetCalculator.symbolFactory.createInStaffClef(graphicalStaffEntry, clefInstruction);
                }
                if (this.rules.RenderChordSymbols && sourceStaffEntry.ChordContainers?.length > 0) {
                    sourceStaffEntry.ParentStaff.ParentInstrument.HasChordSymbols = true;
                    MusicSheetCalculator.symbolFactory.createChordSymbols(
                        sourceStaffEntry,
                        graphicalStaffEntry,
                        accidentalCalculator.ActiveKeyInstruction,
                        this.graphicalMusicSheet.ParentMusicSheet.Transpose);
                }
            }
        }

        accidentalCalculator.doCalculationsAtEndOfMeasure();
        // update activeClef given at end of measure if needed
        if (sourceMeasure.LastInstructionsStaffEntries[staffIndex]) {
            const lastStaffEntry: SourceStaffEntry = sourceMeasure.LastInstructionsStaffEntries[staffIndex];
            for (let idx: number = 0, len: number = lastStaffEntry.Instructions.length; idx < len; ++idx) {
                const abstractNotationInstruction: AbstractNotationInstruction = lastStaffEntry.Instructions[idx];
                if (abstractNotationInstruction instanceof ClefInstruction) {
                    activeClefs[staffIndex] = <ClefInstruction>abstractNotationInstruction;
                }
            }
        }
        for (let idx: number = 0, len: number = sourceMeasure.StaffLinkedExpressions[staffIndex].length; idx < len; ++idx) {
            const multiExpression: MultiExpression = sourceMeasure.StaffLinkedExpressions[staffIndex][idx];
            if (multiExpression.OctaveShiftEnd !== undefined && openOctaveShifts[staffIndex] !== undefined &&
                multiExpression.OctaveShiftEnd === openOctaveShifts[staffIndex].getOpenOctaveShift) {
                    openOctaveShifts[staffIndex] = undefined;
            }
        }
        // check wantedStemDirections of beam notes at end of measure (e.g. for beam with grace notes)
        for (const staffEntry of measure.staffEntries) {
            for (const voiceEntry of staffEntry.graphicalVoiceEntries) {
                this.setBeamNotesWantedStemDirections(voiceEntry.parentVoiceEntry);
            }
        }
        // if there are no staffEntries in this measure, create a rest for the whole measure:
        // check OSMDOptions.fillEmptyMeasuresWithWholeRest
        if (this.rules.FillEmptyMeasuresWithWholeRest >= 1) { // fill measures with no notes given with whole rests, visible (1) or invisible (2)
            if (measure.staffEntries.length === 0) {
                const sourceStaffEntry: SourceStaffEntry = new SourceStaffEntry(
                    new VerticalSourceStaffEntryContainer(measure.parentSourceMeasure,
                                                          measure.parentSourceMeasure.AbsoluteTimestamp,
                                                          measure.parentSourceMeasure.CompleteNumberOfStaves),
                    staff);
                const voiceEntry: VoiceEntry = new VoiceEntry(new Fraction(0, 1), staff.Voices[0], sourceStaffEntry);
                const note: Note = new Note(voiceEntry, sourceStaffEntry, Fraction.createFromFraction(sourceMeasure.Duration), undefined, sourceMeasure);
                note.PrintObject = this.rules.FillEmptyMeasuresWithWholeRest === FillEmptyMeasuresWithWholeRests.YesVisible;
                  // don't display whole rest that wasn't given in XML, only for layout/voice completion
                voiceEntry.Notes.push(note);
                const graphicalStaffEntry: GraphicalStaffEntry = MusicSheetCalculator.symbolFactory.createStaffEntry(sourceStaffEntry, measure);
                measure.addGraphicalStaffEntry(graphicalStaffEntry);
                graphicalStaffEntry.relInMeasureTimestamp = voiceEntry.Timestamp;
                const gve: GraphicalVoiceEntry = MusicSheetCalculator.symbolFactory.createVoiceEntry(voiceEntry, graphicalStaffEntry);
                graphicalStaffEntry.graphicalVoiceEntries.push(gve);
                const graphicalNote: GraphicalNote = MusicSheetCalculator.symbolFactory.createNote(
                    note,
                    gve,
                    new ClefInstruction(),
                    OctaveEnum.NONE, undefined);
                MusicSheetCalculator.stafflineNoteCalculator.trackNote(graphicalNote);
                gve.notes.push(graphicalNote);
            }
        }

        measure.hasOnlyRests = true;
        //if staff entries empty, loop will not start. so true is valid
        for (const graphicalStaffEntry of measure.staffEntries) {
            //Loop until we get just one false
            measure.hasOnlyRests = graphicalStaffEntry.hasOnlyRests();
            if (!measure.hasOnlyRests) {
                break;
            }
        }

        return measure;
    }

    private checkNoteForAccidental(graphicalNote: GraphicalNote, accidentalCalculator: AccidentalCalculator, activeClef: ClefInstruction,
                                   octaveEnum: OctaveEnum): void {
        let pitch: Pitch = graphicalNote.sourceNote.Pitch;
        const transpose: number = this.graphicalMusicSheet.ParentMusicSheet.Transpose;
        if (transpose !== 0 && graphicalNote.sourceNote.ParentStaffEntry.ParentStaff.ParentInstrument.MidiInstrumentId !== MidiInstrument.Percussion) {
            pitch = graphicalNote.Transpose(
                accidentalCalculator.ActiveKeyInstruction, activeClef, transpose, octaveEnum
            );
        }
        graphicalNote.sourceNote.halfTone = pitch.getHalfTone();
        accidentalCalculator.checkAccidental(graphicalNote, pitch);
    }

    // private createStaffEntryForTieNote(measure: StaffMeasure, absoluteTimestamp: Fraction, openTie: Tie): GraphicalStaffEntry {
    //     let graphicalStaffEntry: GraphicalStaffEntry;
    //     graphicalStaffEntry = MusicSheetCalculator.symbolFactory.createStaffEntry(openTie.Start.ParentStaffEntry, measure);
    //     graphicalStaffEntry.relInMeasureTimestamp = Fraction.minus(absoluteTimestamp, measure.parentSourceMeasure.AbsoluteTimestamp);
    //     this.resetYPositionForLeadSheet(graphicalStaffEntry.PositionAndShape);
    //     measure.addGraphicalStaffEntryAtTimestamp(graphicalStaffEntry);
    //     return graphicalStaffEntry;
    // }

    private handleStaffEntries(staffIsPercussionArray: Array<boolean>): void {
        for (let idx: number = 0, len: number = this.graphicalMusicSheet.MeasureList.length; idx < len; ++idx) {
            const measures: GraphicalMeasure[] = this.graphicalMusicSheet.MeasureList[idx];
            for (let idx2: number = 0, len2: number = measures.length; idx2 < len2; ++idx2) {
                const measure: GraphicalMeasure = measures[idx2];
                if (!measure) {
                    continue;
                }
                //This property is active...
                if (this.rules.PercussionOneLineCutoff !== undefined && this.rules.PercussionOneLineCutoff !== 0) {
                    //We have a percussion clef, check to see if this property applies...
                    if (staffIsPercussionArray[idx2]) {
                        //-1 means always trigger, or we are under the cutoff number specified
                        if (this.rules.PercussionOneLineCutoff === -1 ||
                            MusicSheetCalculator.stafflineNoteCalculator.getStafflineUniquePositionCount(idx2) < this.rules.PercussionOneLineCutoff) {
                            measure.ParentStaff.StafflineCount = 1;
                        }
                    }
                }
                for (const graphicalStaffEntry of measure.staffEntries) {
                    if (graphicalStaffEntry.parentMeasure !== undefined
                        && graphicalStaffEntry.graphicalVoiceEntries.length > 0
                        && graphicalStaffEntry.graphicalVoiceEntries[0].notes.length > 0) {
                        this.layoutVoiceEntries(graphicalStaffEntry, idx2);
                        this.layoutStaffEntry(graphicalStaffEntry);
                    }
                }
                this.graphicalMeasureCreatedCalculations(measure);
            }
        }
    }

    private calculateSkyBottomLines(): void {
        for (const musicSystem of this.musicSystems) {
            for (const staffLine of musicSystem.StaffLines) {
                staffLine.SkyBottomLineCalculator.calculateLines();
            }
        }
    }

    /**
     * Re-adjust the x positioning of expressions.
     */
    protected calculateExpressionAlignements(): void {
        // override
    }

    // does nothing for now, because layoutBeams() is an empty method
    // private calculateBeams(): void {
    //     for (let idx2: number = 0, len2: number = this.musicSystems.length; idx2 < len2; ++idx2) {
    //         const musicSystem: MusicSystem = this.musicSystems[idx2];
    //         for (let idx3: number = 0, len3: number = musicSystem.StaffLines.length; idx3 < len3; ++idx3) {
    //             const staffLine: StaffLine = musicSystem.StaffLines[idx3];
    //             for (let idx4: number = 0, len4: number = staffLine.Measures.length; idx4 < len4; ++idx4) {
    //                 const measure: GraphicalMeasure = staffLine.Measures[idx4];
    //                 for (let idx5: number = 0, len5: number = measure.staffEntries.length; idx5 < len5; ++idx5) {
    //                     const staffEntry: GraphicalStaffEntry = measure.staffEntries[idx5];
    //                     this.layoutBeams(staffEntry);
    //                 }
    //             }
    //         }
    //     }
    // }

    private calculateStaffEntryArticulationMarks(): void {
        for (let idx2: number = 0, len2: number = this.musicSystems.length; idx2 < len2; ++idx2) {
            const system: MusicSystem = this.musicSystems[idx2];
            for (let idx3: number = 0, len3: number = system.StaffLines.length; idx3 < len3; ++idx3) {
                const line: StaffLine = system.StaffLines[idx3];
                for (let idx4: number = 0, len4: number = line.Measures.length; idx4 < len4; ++idx4) {
                    const measure: GraphicalMeasure = line.Measures[idx4];
                    for (let idx5: number = 0, len5: number = measure.staffEntries.length; idx5 < len5; ++idx5) {
                        const graphicalStaffEntry: GraphicalStaffEntry = measure.staffEntries[idx5];
                        for (let idx6: number = 0, len6: number = graphicalStaffEntry.sourceStaffEntry.VoiceEntries.length; idx6 < len6; ++idx6) {
                            const voiceEntry: VoiceEntry = graphicalStaffEntry.sourceStaffEntry.VoiceEntries[idx6];
                            if (voiceEntry.Articulations.length > 0) {
                                this.layoutArticulationMarks(voiceEntry.Articulations, voiceEntry, graphicalStaffEntry);
                            }
                        }
                    }
                }
            }
        }
    }

    private calculateOrnaments(): void {
        for (let idx2: number = 0, len2: number = this.musicSystems.length; idx2 < len2; ++idx2) {
            const system: MusicSystem = this.musicSystems[idx2];
            for (let idx3: number = 0, len3: number = system.StaffLines.length; idx3 < len3; ++idx3) {
                const line: StaffLine = system.StaffLines[idx3];
                for (let idx4: number = 0, len4: number = line.Measures.length; idx4 < len4; ++idx4) {
                    const measure: GraphicalMeasure = line.Measures[idx4];
                    for (let idx5: number = 0, len5: number = measure.staffEntries.length; idx5 < len5; ++idx5) {
                        const graphicalStaffEntry: GraphicalStaffEntry = measure.staffEntries[idx5];
                        for (let idx6: number = 0, len6: number = graphicalStaffEntry.sourceStaffEntry.VoiceEntries.length; idx6 < len6; ++idx6) {
                            const voiceEntry: VoiceEntry = graphicalStaffEntry.sourceStaffEntry.VoiceEntries[idx6];
                            if (voiceEntry.OrnamentContainer) {
                                if (voiceEntry.hasTie() && !graphicalStaffEntry.relInMeasureTimestamp.Equals(voiceEntry.Timestamp)) {
                                    continue;
                                }
                                this.layoutOrnament(voiceEntry.OrnamentContainer, voiceEntry, graphicalStaffEntry);
                                if (!(this.staffEntriesWithOrnaments.indexOf(graphicalStaffEntry) !== -1)) {
                                    this.staffEntriesWithOrnaments.push(graphicalStaffEntry);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    private optimizeRestPlacement(): void {
        for (let idx2: number = 0, len2: number = this.musicSystems.length; idx2 < len2; ++idx2) {
            const system: MusicSystem = this.musicSystems[idx2];
            for (let idx3: number = 0, len3: number = system.StaffLines.length; idx3 < len3; ++idx3) {
                const line: StaffLine = system.StaffLines[idx3];
                for (let idx4: number = 0, len4: number = line.Measures.length; idx4 < len4; ++idx4) {
                    const measure: GraphicalMeasure = line.Measures[idx4];
                    for (let idx5: number = 0, len5: number = measure.staffEntries.length; idx5 < len5; ++idx5) {
                        const graphicalStaffEntry: GraphicalStaffEntry = measure.staffEntries[idx5];
                        this.optimizeRestNotePlacement(graphicalStaffEntry, measure);
                    }
                }
            }
        }
    }

    private calculateTwoRestNotesPlacementWithCollisionDetection(graphicalStaffEntry: GraphicalStaffEntry): void {
        const firstRestNote: GraphicalNote = graphicalStaffEntry.graphicalVoiceEntries[0].notes[0];
        const secondRestNote: GraphicalNote = graphicalStaffEntry.graphicalVoiceEntries[1].notes[0];
        secondRestNote.PositionAndShape.RelativePosition = new PointF2D(0.0, 2.5);
        graphicalStaffEntry.PositionAndShape.calculateAbsolutePositionsRecursiveWithoutTopelement();
        firstRestNote.PositionAndShape.computeNonOverlappingPositionWithMargin(
            graphicalStaffEntry.PositionAndShape, ColDirEnum.Up,
            new PointF2D(0.0, secondRestNote.PositionAndShape.RelativePosition.y)
        );
        const relative: PointF2D = firstRestNote.PositionAndShape.RelativePosition;
        relative.y -= 1.0;
        firstRestNote.PositionAndShape.RelativePosition = relative;
        graphicalStaffEntry.PositionAndShape.calculateBoundingBox();
    }

    private calculateRestNotePlacementWithCollisionDetectionFromGraphicalNote(graphicalStaffEntry: GraphicalStaffEntry): void {
        let restNote: GraphicalNote;
        let graphicalNotes: GraphicalNote[];
        if (graphicalStaffEntry.graphicalVoiceEntries[0].notes[0].sourceNote.isRest()) {
            restNote = graphicalStaffEntry.graphicalVoiceEntries[0].notes[0];
            graphicalNotes = graphicalStaffEntry.graphicalVoiceEntries[1].notes;
        } else {
            graphicalNotes = graphicalStaffEntry.graphicalVoiceEntries[0].notes;
            restNote = graphicalStaffEntry.graphicalVoiceEntries[1].notes[0];
        }
        //restNote.parallelVoiceEntryNotes = graphicalNotes; // TODO maybe save potentially colliding notes, check them in VexFlowConverter.StaveNote
        let collision: boolean = false;
        graphicalStaffEntry.PositionAndShape.calculateAbsolutePositionsRecursiveWithoutTopelement();
        for (let idx: number = 0, len: number = graphicalNotes.length; idx < len; ++idx) {
            const graphicalNote: GraphicalNote = graphicalNotes[idx];
            if (restNote.PositionAndShape.marginCollisionDetection(graphicalNote.PositionAndShape)) {
                // TODO bounding box of graphical note isn't set correctly yet.
                // we could do manual collision checking here
                collision = true;
                break;
            }
        }
        if (collision) {
            if (restNote.sourceNote.ParentVoiceEntry.ParentVoice instanceof LinkedVoice) {
                const bottomBorder: number = graphicalNotes[0].PositionAndShape.BorderMarginBottom + graphicalNotes[0].PositionAndShape.RelativePosition.y;
                restNote.PositionAndShape.RelativePosition = new PointF2D(0.0, bottomBorder - restNote.PositionAndShape.BorderMarginTop + 0.5);
            } else {
                const last: GraphicalNote = graphicalNotes[graphicalNotes.length - 1];
                const topBorder: number = last.PositionAndShape.BorderMarginTop + last.PositionAndShape.RelativePosition.y;
                if (graphicalNotes[0].sourceNote.ParentVoiceEntry.ParentVoice instanceof LinkedVoice) {
                    restNote.PositionAndShape.RelativePosition = new PointF2D(0.0, topBorder - restNote.PositionAndShape.BorderMarginBottom - 0.5);
                } else {
                    const bottomBorder: number = graphicalNotes[0].PositionAndShape.BorderMarginBottom + graphicalNotes[0].PositionAndShape.RelativePosition.y;
                    if (bottomBorder < 2.0) {
                        restNote.PositionAndShape.RelativePosition = new PointF2D(0.0, bottomBorder - restNote.PositionAndShape.BorderMarginTop + 0.5);
                    } else {
                        restNote.PositionAndShape.RelativePosition = new PointF2D(0.0, topBorder - restNote.PositionAndShape.BorderMarginBottom - 0.0);
                    }
                }
            }
        }
        graphicalStaffEntry.PositionAndShape.calculateBoundingBox();
    }

    private calculateTieCurves(): void {
        for (const musicSystem of this.musicSystems) {
            for (const staffLine of musicSystem.StaffLines) {
                for (const measure of staffLine.Measures) {
                    for (const staffEntry of measure.staffEntries) {
                        for (const graphicalTie of staffEntry.GraphicalTies) {
                            if (graphicalTie.StartNote !== undefined && graphicalTie.StartNote.parentVoiceEntry.parentStaffEntry === staffEntry) {
                                const tieIsAtSystemBreak: boolean = (
                                    graphicalTie.StartNote.parentVoiceEntry.parentStaffEntry.parentMeasure.ParentStaffLine !==
                                    graphicalTie.EndNote.parentVoiceEntry.parentStaffEntry.parentMeasure.ParentStaffLine
                                );
                                this.layoutGraphicalTie(graphicalTie, tieIsAtSystemBreak, measure.ParentStaff.isTab);
                            }
                        }
                    }
                }
            }
        }
    }

    private calculateLyricsPosition(): void {
        const lyricStaffEntriesDict: Dictionary<StaffLine, GraphicalStaffEntry[]> = new Dictionary<StaffLine, GraphicalStaffEntry[]>();
        // sort the lyriceVerseNumbers for every Instrument that has Lyrics
        for (let idx: number = 0, len: number = this.graphicalMusicSheet.ParentMusicSheet.Instruments.length; idx < len; ++idx) {
            const instrument: Instrument = this.graphicalMusicSheet.ParentMusicSheet.Instruments[idx];
            if (instrument.HasLyrics && instrument.LyricVersesNumbers.length > 0) {
                instrument.LyricVersesNumbers.sort();
            }
        }
        // first calc lyrics text positions
        for (let idx2: number = 0, len2: number = this.musicSystems.length; idx2 < len2; ++idx2) {
            const musicSystem: MusicSystem = this.musicSystems[idx2];
            for (let idx3: number = 0, len3: number = musicSystem.StaffLines.length; idx3 < len3; ++idx3) {
                const staffLine: StaffLine = musicSystem.StaffLines[idx3];
                const lyricsStaffEntries: GraphicalStaffEntry[] =
                    this.calculateSingleStaffLineLyricsPosition(staffLine, staffLine.ParentStaff.ParentInstrument.LyricVersesNumbers);
                lyricStaffEntriesDict.setValue(staffLine, lyricsStaffEntries);
                this.calculateLyricsExtendsAndDashes(lyricStaffEntriesDict.getValue(staffLine));
            }
        }
        // then fill in the lyric word dashes and lyrics extends/underscores
        for (let idx2: number = 0, len2: number = this.musicSystems.length; idx2 < len2; ++idx2) {
            const musicSystem: MusicSystem = this.musicSystems[idx2];
            for (let idx3: number = 0, len3: number = musicSystem.StaffLines.length; idx3 < len3; ++idx3) {
                const staffLine: StaffLine = musicSystem.StaffLines[idx3];
                this.calculateLyricsExtendsAndDashes(lyricStaffEntriesDict.getValue(staffLine));
            }
        }
    }

    /**
     * This method calculates the dashes within the syllables of a LyricWord
     * @param lyricEntry
     */
    private calculateSingleLyricWord(lyricEntry: GraphicalLyricEntry): void {
        // const skyBottomLineCalculator: SkyBottomLineCalculator = new SkyBottomLineCalculator (this.rules);
        const graphicalLyricWord: GraphicalLyricWord = lyricEntry.ParentLyricWord;
        const index: number = graphicalLyricWord.GraphicalLyricsEntries.indexOf(lyricEntry);
        let nextLyricEntry: GraphicalLyricEntry = undefined;
        if (index >= 0) {
            nextLyricEntry = graphicalLyricWord.GraphicalLyricsEntries[index + 1];
        }
        if (!nextLyricEntry) {
            return;
        }
        const startStaffLine: StaffLine = <StaffLine>lyricEntry.StaffEntryParent.parentMeasure.ParentStaffLine;
        const nextStaffLine: StaffLine = <StaffLine>nextLyricEntry.StaffEntryParent.parentMeasure.ParentStaffLine;
        const startStaffEntry: GraphicalStaffEntry = lyricEntry.StaffEntryParent;
        const endStaffentry: GraphicalStaffEntry = nextLyricEntry.StaffEntryParent;

        // if on the same StaffLine
        if (lyricEntry.StaffEntryParent.parentMeasure.ParentStaffLine === nextLyricEntry.StaffEntryParent.parentMeasure.ParentStaffLine) {
            // start- and End margins from the text Labels
            const startX: number = startStaffEntry.parentMeasure.PositionAndShape.RelativePosition.x +
                startStaffEntry.PositionAndShape.RelativePosition.x +
                lyricEntry.GraphicalLabel.PositionAndShape.RelativePosition.x +
                lyricEntry.GraphicalLabel.PositionAndShape.BorderMarginRight;

            const endX: number = endStaffentry.parentMeasure.PositionAndShape.RelativePosition.x +
                endStaffentry.PositionAndShape.RelativePosition.x +
                lyricEntry.GraphicalLabel.PositionAndShape.RelativePosition.x +
                nextLyricEntry.GraphicalLabel.PositionAndShape.BorderMarginLeft;
            const y: number = lyricEntry.GraphicalLabel.PositionAndShape.RelativePosition.y;
            let numberOfDashes: number = 1;
            if ((endX - startX) > this.rules.MinimumDistanceBetweenDashes * 3) {
                // *3: need distance between word to first dash, dash to dash, dash to next word
                numberOfDashes = Math.floor((endX - startX) / this.rules.MinimumDistanceBetweenDashes) - 1;
            }
            // check distance and create the adequate number of Dashes
            if (numberOfDashes === 1) {
                // distance between the two GraphicalLyricEntries is big for only one Dash, position in the middle
                this.calculateSingleDashForLyricWord(startStaffLine, startX, endX, y);
            } else {
                // distance is big enough for more Dashes
                // calculate the adequate number of Dashes from the distance between the two LyricEntries
                // distance between the Dashes should be equal
                this.calculateDashes(startStaffLine, startX, endX, y);
            }
        } else {
            // start and end on different StaffLines
            // start margin from the text Label until the End of StaffLine
            const startX: number = startStaffEntry.parentMeasure.PositionAndShape.RelativePosition.x +
                startStaffEntry.PositionAndShape.RelativePosition.x +
                lyricEntry.GraphicalLabel.PositionAndShape.BorderMarginRight;
            const lastGraphicalMeasure: GraphicalMeasure = startStaffLine.Measures[startStaffLine.Measures.length - 1];
            const endX: number = lastGraphicalMeasure.PositionAndShape.RelativePosition.x + lastGraphicalMeasure.PositionAndShape.Size.width;
            let y: number = lyricEntry.GraphicalLabel.PositionAndShape.RelativePosition.y;

            // calculate Dashes for the first StaffLine
            this.calculateDashes(startStaffLine, startX, endX, y);

            // calculate Dashes for the second StaffLine (only if endStaffEntry isn't the first StaffEntry of the StaffLine)
            if (nextStaffLine && // check for undefined objects e.g. when drawingRange given
                nextStaffLine.Measures[0] &&
                endStaffentry.parentMeasure.ParentStaffLine &&
                !(endStaffentry === endStaffentry.parentMeasure.staffEntries[0] &&
                endStaffentry.parentMeasure === endStaffentry.parentMeasure.ParentStaffLine.Measures[0])) {
                const secondStartX: number = nextStaffLine.Measures[0].staffEntries[0].PositionAndShape.RelativePosition.x;
                const secondEndX: number = endStaffentry.parentMeasure.PositionAndShape.RelativePosition.x +
                    endStaffentry.PositionAndShape.RelativePosition.x +
                    nextLyricEntry.GraphicalLabel.PositionAndShape.BorderMarginLeft;
                y = nextLyricEntry.GraphicalLabel.PositionAndShape.RelativePosition.y;
                this.calculateDashes(nextStaffLine, secondStartX, secondEndX, y);
            }
        }
    }

    /**
     * This method calculates Dashes for a LyricWord.
     * @param staffLine
     * @param startX
     * @param endX
     * @param y
     */
    private calculateDashes(staffLine: StaffLine, startX: number, endX: number, y: number): void {
        let distance: number = endX - startX;
        if (distance < this.rules.MinimumDistanceBetweenDashes * 3) {
            this.calculateSingleDashForLyricWord(staffLine, startX, endX, y);
        } else {
            // enough distance for more Dashes
            const numberOfDashes: number = Math.floor(distance / this.rules.MinimumDistanceBetweenDashes) - 1;
            const distanceBetweenDashes: number = distance / (numberOfDashes + 1);
            let counter: number = 0;

            startX += distanceBetweenDashes;
            endX -= distanceBetweenDashes;
            while (counter <= Math.floor(numberOfDashes / 2.0) && endX > startX) {
                distance = this.calculateRightAndLeftDashesForLyricWord(staffLine, startX, endX, y);
                startX += distanceBetweenDashes;
                endX -= distanceBetweenDashes;
                counter++;
            }

            // if the remaining distance isn't big enough for two Dashes,
            // but long enough for a middle dash inbetween,
            // then put the last Dash in the middle of the remaining distance
            if (distance > distanceBetweenDashes * 2) {
                this.calculateSingleDashForLyricWord(staffLine, startX, endX, y);
            }
        }
    }

    /**
     * This method calculates a single Dash for a LyricWord, positioned in the middle of the given distance.
     * @param {StaffLine} staffLine
     * @param {number} startX
     * @param {number} endX
     * @param {number} y
     */
    private calculateSingleDashForLyricWord(staffLine: StaffLine, startX: number, endX: number, y: number): void {
        const label: Label = new Label("-");
        const dash: GraphicalLabel = new GraphicalLabel(
            label, this.rules.LyricsHeight, TextAlignmentEnum.CenterBottom, this.rules);
        dash.setLabelPositionAndShapeBorders();
        staffLine.LyricsDashes.push(dash);
        if (this.staffLinesWithLyricWords.indexOf(staffLine) === -1) {
            this.staffLinesWithLyricWords.push(staffLine);
        }
        dash.PositionAndShape.Parent = staffLine.PositionAndShape;
        const relative: PointF2D = new PointF2D(startX + (endX - startX) / 2, y);
        dash.PositionAndShape.RelativePosition = relative;
    }

    /**
     * Layouts the underscore line when a lyric entry is marked as extend
     * @param {GraphicalLyricEntry} lyricEntry
     */
    private calculateLyricExtend(lyricEntry: GraphicalLyricEntry): void {
        let startY: number = lyricEntry.GraphicalLabel.PositionAndShape.RelativePosition.y;
        const startStaffEntry: GraphicalStaffEntry = lyricEntry.StaffEntryParent;
        const startStaffLine: StaffLine = startStaffEntry.parentMeasure.ParentStaffLine;

        // find endstaffEntry and staffLine
        let endStaffEntry: GraphicalStaffEntry = undefined;
        let endStaffLine: StaffLine = undefined;
        const staffIndex: number = startStaffEntry.parentMeasure.ParentStaff.idInMusicSheet;
        for (let index: number = startStaffEntry.parentVerticalContainer.Index + 1;
            index < this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers.length;
            ++index) {
            const gse: GraphicalStaffEntry = this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers[index].StaffEntries[staffIndex];
            if (!gse) {
                continue;
            }
            if (gse.hasOnlyRests()) {
                break;
            }
            if (gse.LyricsEntries.length > 0) {
                break;
            }
            endStaffEntry = gse;
            endStaffLine = endStaffEntry.parentMeasure.ParentStaffLine;
            if (!endStaffLine) {
                endStaffLine = startStaffEntry.parentMeasure.ParentStaffLine;
            }
        }
        if (!endStaffEntry || !endStaffLine) {
            return;
        }
        // if on the same StaffLine
        if (startStaffLine === endStaffLine && endStaffEntry.parentMeasure.ParentStaffLine) {
            // start- and End margins from the text Labels
            const startX: number = startStaffEntry.parentMeasure.PositionAndShape.RelativePosition.x +
                startStaffEntry.PositionAndShape.RelativePosition.x +
                lyricEntry.GraphicalLabel.PositionAndShape.BorderMarginRight;
            // + startStaffLine.PositionAndShape.AbsolutePosition.x; // doesn't work, done in drawer
            const endX: number = endStaffEntry.parentMeasure.PositionAndShape.RelativePosition.x +
                endStaffEntry.PositionAndShape.RelativePosition.x +
                endStaffEntry.PositionAndShape.BorderMarginRight;
            // + endStaffLine.PositionAndShape.AbsolutePosition.x; // doesn't work, done in drawer
            // TODO maybe add half-width of following note.
            // though we don't have the vexflow note's bbox yet and extend layouting is unconstrained,
            // we have more room for spacing without it.
            // needed in order to line up with the Label's text bottom line (is the y position of the underscore)
            startY -= lyricEntry.GraphicalLabel.PositionAndShape.Size.height / 4;
            // create a Line (as underscore after the LyricLabel's End)
            this.calculateSingleLyricWordWithUnderscore(startStaffLine, startX, endX, startY);
        } else { // start and end on different StaffLines
            // start margin from the text Label until the End of StaffLine
            const lastMeasureBb: BoundingBox = startStaffLine.Measures[startStaffLine.Measures.length - 1].PositionAndShape;
            const startX: number = startStaffEntry.parentMeasure.PositionAndShape.RelativePosition.x +
                startStaffEntry.PositionAndShape.RelativePosition.x +
                lyricEntry.GraphicalLabel.PositionAndShape.BorderMarginRight;
            const endX: number = lastMeasureBb.RelativePosition.x +
                lastMeasureBb.Size.width;
            // needed in order to line up with the Label's text bottom line
            startY -= lyricEntry.GraphicalLabel.PositionAndShape.Size.height / 4;
            // first Underscore until the StaffLine's End
            this.calculateSingleLyricWordWithUnderscore(startStaffLine, startX, endX, startY);
            if (!endStaffEntry) {
                return;
            }
            // second Underscore in the endStaffLine until endStaffEntry (if endStaffEntry isn't the first StaffEntry of the StaffLine))
            if (endStaffEntry.parentMeasure.ParentStaffLine && endStaffEntry.parentMeasure.staffEntries &&
                !(endStaffEntry === endStaffEntry.parentMeasure.staffEntries[0] &&
                endStaffEntry.parentMeasure === endStaffEntry.parentMeasure.ParentStaffLine.Measures[0])) {
                const secondStartX: number = endStaffLine.Measures[0].staffEntries[0].PositionAndShape.RelativePosition.x;
                const secondEndX: number = endStaffEntry.parentMeasure.PositionAndShape.RelativePosition.x +
                    endStaffEntry.PositionAndShape.RelativePosition.x +
                    endStaffEntry.PositionAndShape.BorderMarginRight;
                this.calculateSingleLyricWordWithUnderscore(endStaffLine, secondStartX, secondEndX, startY);
            }
        }
    }

    /**
     * This method calculates a single underscoreLine.
     * @param staffLine
     * @param startX
     * @param end
     * @param y
     */
    private calculateSingleLyricWordWithUnderscore(staffLine: StaffLine, startX: number, endX: number, y: number): void {
        const lineStart: PointF2D = new PointF2D(startX, y);
        const lineEnd: PointF2D = new PointF2D(endX, y);
        const graphicalLine: GraphicalLine = new GraphicalLine(lineStart, lineEnd, this.rules.LyricUnderscoreLineWidth);
        staffLine.LyricLines.push(graphicalLine);
        if (this.staffLinesWithLyricWords.indexOf(staffLine) === -1) {
            this.staffLinesWithLyricWords.push(staffLine);
        }
    }

    /**
     * This method calculates two Dashes for a LyricWord, positioned at the the two ends of the given distance.
     * @param {StaffLine} staffLine
     * @param {number} startX
     * @param {number} endX
     * @param {number} y
     * @returns {number}
     */
    private calculateRightAndLeftDashesForLyricWord(staffLine: StaffLine, startX: number, endX: number, y: number): number {
        const leftLabel: Label = new Label("-");
        const leftDash: GraphicalLabel = new GraphicalLabel(
            leftLabel, this.rules.LyricsHeight, TextAlignmentEnum.CenterBottom, this.rules);
        leftDash.setLabelPositionAndShapeBorders();
        staffLine.LyricsDashes.push(leftDash);
        if (this.staffLinesWithLyricWords.indexOf(staffLine) === -1) {
            this.staffLinesWithLyricWords.push(staffLine);
        }
        leftDash.PositionAndShape.Parent = staffLine.PositionAndShape;
        const leftDashRelative: PointF2D = new PointF2D(startX, y);
        leftDash.PositionAndShape.RelativePosition = leftDashRelative;

        const rightLabel: Label = new Label("-");
        const rightDash: GraphicalLabel = new GraphicalLabel(
            rightLabel, this.rules.LyricsHeight, TextAlignmentEnum.CenterBottom, this.rules);
        rightDash.setLabelPositionAndShapeBorders();
        staffLine.LyricsDashes.push(rightDash);
        rightDash.PositionAndShape.Parent = staffLine.PositionAndShape;
        const rightDashRelative: PointF2D = new PointF2D(endX, y);
        rightDash.PositionAndShape.RelativePosition = rightDashRelative;
        return (rightDash.PositionAndShape.RelativePosition.x - leftDash.PositionAndShape.RelativePosition.x);
    }

    private calculateDynamicExpressions(): void {
        const maxIndex: number = Math.min(this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures.length - 1, this.rules.MaxMeasureToDrawIndex);
        const minIndex: number = Math.min(this.rules.MinMeasureToDrawIndex, this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures.length);
        for (let i: number = minIndex; i <= maxIndex; i++) {
            const sourceMeasure: SourceMeasure = this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures[i];
            for (let j: number = 0; j < sourceMeasure.StaffLinkedExpressions.length; j++) {
                if (!this.graphicalMusicSheet.MeasureList[i] || !this.graphicalMusicSheet.MeasureList[i][j]) {
                    continue;
                }

                if (this.graphicalMusicSheet.MeasureList[i][j].ParentStaff.ParentInstrument.Visible) {
                    for (let k: number = 0; k < sourceMeasure.StaffLinkedExpressions[j].length; k++) {
                        if (sourceMeasure.StaffLinkedExpressions[j][k].InstantaneousDynamic !== undefined ||
                            (sourceMeasure.StaffLinkedExpressions[j][k].StartingContinuousDynamic !== undefined &&
                                sourceMeasure.StaffLinkedExpressions[j][k].StartingContinuousDynamic.StartMultiExpression ===
                                sourceMeasure.StaffLinkedExpressions[j][k] && sourceMeasure.StaffLinkedExpressions[j][k].UnknownList.length === 0)
                        ) {
                            this.calculateDynamicExpressionsForMultiExpression(sourceMeasure.StaffLinkedExpressions[j][k], i, j);
                        }
                    }
                }
            }
        }
    }

    private calculateOctaveShifts(): void {
        for (let i: number = 0; i < this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures.length; i++) {
            const sourceMeasure: SourceMeasure = this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures[i];
            for (let j: number = 0; j < sourceMeasure.StaffLinkedExpressions.length; j++) {
                if (!this.graphicalMusicSheet.MeasureList[i] || !this.graphicalMusicSheet.MeasureList[i][j]) {
                    continue;
                }
                if (this.graphicalMusicSheet.MeasureList[i][j].ParentStaff.ParentInstrument.Visible) {
                    for (let k: number = 0; k < sourceMeasure.StaffLinkedExpressions[j].length; k++) {
                        if ((sourceMeasure.StaffLinkedExpressions[j][k].OctaveShiftStart)) {
                            this.calculateSingleOctaveShift(sourceMeasure, sourceMeasure.StaffLinkedExpressions[j][k], i, j);
                        }
                    }
                }
            }
        }
    }

    private getFirstLeftNotNullStaffEntryFromContainer(horizontalIndex: number, verticalIndex: number, multiStaffInstrument: boolean): GraphicalStaffEntry {
        if (this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers[horizontalIndex].StaffEntries[verticalIndex]) {
            return this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers[horizontalIndex].StaffEntries[verticalIndex];
        }
        for (let i: number = horizontalIndex - 1; i >= 0; i--) {
            if (this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers[i].StaffEntries[verticalIndex]) {
                return this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers[i].StaffEntries[verticalIndex];
            }
        }
        return undefined;
    }

    private getFirstRightNotNullStaffEntryFromContainer(horizontalIndex: number, verticalIndex: number, multiStaffInstrument: boolean): GraphicalStaffEntry {
        if (this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers[horizontalIndex].StaffEntries[verticalIndex]) {
            return this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers[horizontalIndex].StaffEntries[verticalIndex];
        }
        for (let i: number = horizontalIndex + 1; i < this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers.length; i++) {
            if (this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers[i].StaffEntries[verticalIndex]) {
                return this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers[i].StaffEntries[verticalIndex];
            }
        }
        return undefined;
    }

    private calculateWordRepetitionInstructions(): void {
        for (let i: number = 0; i < this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures.length; i++) {
            const sourceMeasure: SourceMeasure = this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures[i];
            for (let idx: number = 0, len: number = sourceMeasure.FirstRepetitionInstructions.length; idx < len; ++idx) {
                const instruction: RepetitionInstruction = sourceMeasure.FirstRepetitionInstructions[idx];
                this.calculateWordRepetitionInstruction(instruction, i);
            }
            for (let idx: number = 0, len: number = sourceMeasure.LastRepetitionInstructions.length; idx < len; ++idx) {
                const instruction: RepetitionInstruction = sourceMeasure.LastRepetitionInstructions[idx];
                this.calculateWordRepetitionInstruction(instruction, i);
            }
        }
    }

    private calculateRepetitionEndings(): void {
        const musicsheet: MusicSheet = this.graphicalMusicSheet.ParentMusicSheet;
        for (let idx: number = 0, len: number = musicsheet.Repetitions.length; idx < len; ++idx) {
            const repetition: Repetition = musicsheet.Repetitions[idx];
            this.calcGraphicalRepetitionEndingsRecursively(repetition);
        }
    }

    private calculateTempoExpressions(): void {
        const maxIndex: number = Math.min(this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures.length - 1, this.rules.MaxMeasureToDrawIndex);
        const minIndex: number = this.rules.MinMeasureToDrawIndex;
        for (let i: number = minIndex; i <= maxIndex; i++) {
            const sourceMeasure: SourceMeasure = this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures[i];
            for (let j: number = 0; j < sourceMeasure.TempoExpressions.length; j++) {
                this.calculateTempoExpressionsForMultiTempoExpression(sourceMeasure, sourceMeasure.TempoExpressions[j], i);
            }
        }
    }

    private calculateRehearsalMarks(): void {
        if (!this.rules.RenderRehearsalMarks) {
            return;
        }
        for (const measure of this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures) {
            this.calculateRehearsalMark(measure);
        }
    }

    protected calculateRehearsalMark(measure: SourceMeasure): void {
        throw new Error(this.abstractNotImplementedErrorMessage);
    }

    private calculateMoodAndUnknownExpressions(): void {
        for (let i: number = 0; i < this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures.length; i++) {
            const sourceMeasure: SourceMeasure = this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures[i];
            for (let j: number = 0; j < sourceMeasure.StaffLinkedExpressions.length; j++) {
                if (!this.graphicalMusicSheet.MeasureList[i] || !this.graphicalMusicSheet.MeasureList[i][j]) {
                    continue;
                }
                if (this.graphicalMusicSheet.MeasureList[i][j].ParentStaff.ParentInstrument.Visible) {
                    for (let k: number = 0; k < sourceMeasure.StaffLinkedExpressions[j].length; k++) {
                        if ((sourceMeasure.StaffLinkedExpressions[j][k].MoodList.length > 0) ||
                            (sourceMeasure.StaffLinkedExpressions[j][k].UnknownList.length > 0)) {
                            this.calculateMoodAndUnknownExpression(sourceMeasure.StaffLinkedExpressions[j][k], i, j);
                        }
                    }
                }
            }
        }
    }

    /**
     * Calculates the desired stem direction depending on the number (or type) of voices.
     * If more than one voice is there, the main voice (typically the first or upper voice) will get stem up direction.
     * The others get stem down direction.
     * @param voiceEntry the voiceEntry for which the stem direction has to be calculated
     */
    private calculateStemDirectionFromVoices(voiceEntry: VoiceEntry): void {
        // Stem direction calculation:
        const hasLink: boolean = voiceEntry.ParentSourceStaffEntry.Link !== undefined;
        if (hasLink) {
            // in case of StaffEntryLink don't check mainVoice / linkedVoice
            if (voiceEntry === voiceEntry.ParentSourceStaffEntry.VoiceEntries[0]) {
                // set stem up:
                voiceEntry.WantedStemDirection = StemDirectionType.Up;
                return;
            } else {
                // set stem down:
                voiceEntry.WantedStemDirection = StemDirectionType.Down;
                return;
            }
        } else {
            if (voiceEntry.ParentVoice instanceof LinkedVoice) {
                // Linked voice: set stem down:
                voiceEntry.WantedStemDirection = StemDirectionType.Down;
            } else {
                // if this voiceEntry belongs to the mainVoice:
                // check first that there are also more voices present:
                if (voiceEntry.ParentSourceStaffEntry.VoiceEntries.length > 1) {
                    // as this voiceEntry belongs to the mainVoice: stem Up
                    voiceEntry.WantedStemDirection = StemDirectionType.Up;
                }
            }
        }
        // setBeamNotesWantedStemDirections() will be called at end of measure (createGraphicalMeasure)
    }

    /** Sets a voiceEntry's stem direction to one already set in other notes in its beam, if it has one. */
    private setBeamNotesWantedStemDirections(voiceEntry: VoiceEntry): void {
        if (!(voiceEntry.Notes.length > 0)) {
            return;
        }
        // don't just set direction if undefined. if there's a note in the beam with a different stem direction, Vexflow draws it with an unending stem.
        // if (voiceEntry.WantedStemDirection === StemDirectionType.Undefined) {
        const beam: Beam = voiceEntry.Notes[0].NoteBeam;
        if (beam) {
            // if there is a beam, find any already set stemDirection in the beam:
            for (const note of beam.Notes) {
                // if (note.ParentVoiceEntry === voiceEntry) {
                //     continue; // this could cause a misreading, also potentially in cross-staf beams, in any case it's unnecessary.
                //} else if
                if (note.ParentVoiceEntry.WantedStemDirection !== StemDirectionType.Undefined) {
                    if (note.ParentVoiceEntry.ParentSourceStaffEntry.ParentStaff.Id === voiceEntry.ParentSourceStaffEntry.ParentStaff.Id) {
                        // set the stem direction
                        voiceEntry.WantedStemDirection = note.ParentVoiceEntry.WantedStemDirection;
                        break;
                    }
                }
            }
        }
    }
}
