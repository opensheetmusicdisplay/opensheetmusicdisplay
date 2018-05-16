import {GraphicalStaffEntry} from "./GraphicalStaffEntry";
import {StaffLine} from "./StaffLine";
import {GraphicalMusicSheet} from "./GraphicalMusicSheet";
import {EngravingRules} from "./EngravingRules";
import {Tie} from "../VoiceData/Tie";
import {Fraction} from "../../Common/DataObjects/Fraction";
import {Note} from "../VoiceData/Note";
import {MusicSheet} from "../MusicSheet";
import {StaffMeasure} from "./StaffMeasure";
import {ClefInstruction} from "../VoiceData/Instructions/ClefInstruction";
import {LyricWord} from "../VoiceData/Lyrics/LyricsWord";
import {SourceMeasure} from "../VoiceData/SourceMeasure";
import {GraphicalMusicPage} from "./GraphicalMusicPage";
import {GraphicalNote} from "./GraphicalNote";
import {Beam} from "../VoiceData/Beam";
import {OctaveEnum} from "../VoiceData/Expressions/ContinuousExpressions/OctaveShift";
import {VoiceEntry, StemDirectionType} from "../VoiceData/VoiceEntry";
import {OrnamentContainer} from "../VoiceData/OrnamentContainer";
import {ArticulationEnum} from "../VoiceData/VoiceEntry";
import {Tuplet} from "../VoiceData/Tuplet";
import {MusicSystem} from "./MusicSystem";
import {GraphicalTie} from "./GraphicalTie";
import {RepetitionInstruction} from "../VoiceData/Instructions/RepetitionInstruction";
import {MultiExpression} from "../VoiceData/Expressions/MultiExpression";
import {StaffEntryLink} from "../VoiceData/StaffEntryLink";
import {MusicSystemBuilder} from "./MusicSystemBuilder";
import {MultiTempoExpression} from "../VoiceData/Expressions/MultiTempoExpression";
import {Repetition} from "../MusicSource/Repetition";
import {PointF2D} from "../../Common/DataObjects/PointF2D";
import {SourceStaffEntry} from "../VoiceData/SourceStaffEntry";
import {BoundingBox} from "./BoundingBox";
import {Instrument} from "../Instrument";
import {GraphicalLabel} from "./GraphicalLabel";
import {TextAlignment} from "../../Common/Enums/TextAlignment";
import {VerticalGraphicalStaffEntryContainer} from "./VerticalGraphicalStaffEntryContainer";
import {KeyInstruction} from "../VoiceData/Instructions/KeyInstruction";
import {AbstractNotationInstruction} from "../VoiceData/Instructions/AbstractNotationInstruction";
import {TechnicalInstruction} from "../VoiceData/Instructions/TechnicalInstruction";
import {Pitch} from "../../Common/DataObjects/Pitch";
import {LinkedVoice} from "../VoiceData/LinkedVoice";
import {ColDirEnum} from "./BoundingBox";
import {IGraphicalSymbolFactory} from "../Interfaces/IGraphicalSymbolFactory";
import {ITextMeasurer} from "../Interfaces/ITextMeasurer";
import {ITransposeCalculator} from "../Interfaces/ITransposeCalculator";
import {OctaveShiftParams} from "./OctaveShiftParams";
import {AccidentalCalculator} from "./AccidentalCalculator";
import {MidiInstrument} from "../VoiceData/Instructions/ClefInstruction";
import {Staff} from "../VoiceData/Staff";
import {OctaveShift} from "../VoiceData/Expressions/ContinuousExpressions/OctaveShift";
import {Logging} from "../../Common/Logging";
import Dictionary from "typescript-collections/dist/lib/Dictionary";
import {CollectionUtil} from "../../Util/CollectionUtil";
import {GraphicalLyricEntry} from "./GraphicalLyricEntry";
import {GraphicalLyricWord} from "./GraphicalLyricWord";
import {GraphicalLine} from "./GraphicalLine";
import {Label} from "../Label";

/**
 * Class used to do all the calculations in a MusicSheet, which in the end populates a GraphicalMusicSheet.
 */
export abstract class MusicSheetCalculator {
    public static transposeCalculator: ITransposeCalculator;
    protected static textMeasurer: ITextMeasurer;

    protected staffEntriesWithGraphicalTies: GraphicalStaffEntry[] = [];
    protected staffEntriesWithOrnaments: GraphicalStaffEntry[] = [];
    protected staffEntriesWithChordSymbols: GraphicalStaffEntry[] = [];
    protected staffLinesWithLyricWords: StaffLine[] = [];
    protected staffLinesWithGraphicalExpressions: StaffLine[] = [];

    protected graphicalLyricWords: GraphicalLyricWord[] = [];

    protected graphicalMusicSheet: GraphicalMusicSheet;
    protected rules: EngravingRules;
    protected symbolFactory: IGraphicalSymbolFactory;

    constructor(symbolFactory: IGraphicalSymbolFactory) {
        this.symbolFactory = symbolFactory;
    }

    public static get TextMeasurer(): ITextMeasurer {
        return MusicSheetCalculator.textMeasurer;
    }

    public static set TextMeasurer(value: ITextMeasurer) {
        MusicSheetCalculator.textMeasurer = value;
    }

    protected get leadSheet(): boolean {
        return this.graphicalMusicSheet.LeadSheet;
    }

    private static addTieToTieTimestampsDict(tieTimestampListDict: Dictionary<Tie, Fraction[]>, note: Note): void {
        note.NoteTie.initializeBoolList();
        const tieTimestampList: Fraction[] = [];
        for (let m: number = 0; m < note.NoteTie.Fractions.length; m++) {
            let musicTimestamp: Fraction;
            if (m === 0) {
                musicTimestamp = Fraction.plus(note.calculateNoteLengthWithoutTie(), note.getAbsoluteTimestamp());
            } else {
                musicTimestamp = Fraction.plus(tieTimestampList[m - 1], note.NoteTie.Fractions[m - 1]);
            }
            tieTimestampList.push(musicTimestamp);
        }
        tieTimestampListDict.setValue(note.NoteTie, tieTimestampList);
    }

    private static setMeasuresMinStaffEntriesWidth(measures: StaffMeasure[], minimumStaffEntriesWidth: number): void {
        for (let idx: number = 0, len: number = measures.length; idx < len; ++idx) {
            const measure: StaffMeasure = measures[idx];
            measure.minimumStaffEntriesWidth = minimumStaffEntriesWidth;
        }
    }

    public initialize(graphicalMusicSheet: GraphicalMusicSheet): void {
        this.graphicalMusicSheet = graphicalMusicSheet;
        this.rules = graphicalMusicSheet.ParentMusicSheet.rules;
        this.prepareGraphicalMusicSheet();
        //this.calculate();
    }

    /**
     * Build the 2D [[GraphicalMeasure]] ist needed for the [[MusicSheetCalculator]].
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
        this.staffLinesWithGraphicalExpressions = [];

        this.graphicalMusicSheet.Initialize();
        const measureList: StaffMeasure[][] = this.graphicalMusicSheet.MeasureList;

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
        const tieTimestampListDictList: Dictionary<Tie, Fraction[]>[] = [];
        for (let i: number = 0; i < completeNumberOfStaves; i++) {
            const tieTimestampListDict: Dictionary<Tie, Fraction[]> = new Dictionary<Tie, Fraction[]>();
            tieTimestampListDictList.push(tieTimestampListDict);
            openOctaveShifts.push(undefined);
        }

        // go through all SourceMeasures (taking into account normal SourceMusicParts and Repetitions)
        for (let idx: number = 0, len: number = musicSheet.SourceMeasures.length; idx < len; ++idx) {
            const sourceMeasure: SourceMeasure = musicSheet.SourceMeasures[idx];
            const graphicalMeasures: StaffMeasure[] = this.createGraphicalMeasuresForSourceMeasure(
                sourceMeasure,
                accidentalCalculators,
                lyricWords,
                tieTimestampListDictList,
                openOctaveShifts,
                activeClefs
            );
            measureList.push(graphicalMeasures);
        }
        this.handleStaffEntries();
        this.calculateVerticalContainersList();
        this.setIndecesToVerticalGraphicalContainers();
    }

    /**
     * The main method for the Calculator.
     */
    public calculate(): void {
        this.clearSystemsAndMeasures();

        // delete graphicalObjects that will be recalculated and create the GraphicalObjects that strech over a single StaffEntry new.
        this.clearRecreatedObjects();

        this.createGraphicalTies();

        // calculate SheetLabelBoundingBoxes
        this.calculateSheetLabelBoundingBoxes();
        this.calculateXLayout(this.graphicalMusicSheet, this.maxInstrNameLabelLength());

        // create List<MusicPage>
        this.graphicalMusicSheet.MusicPages.length = 0;

        // create new MusicSystems and StaffLines (as many as necessary) and populate them with Measures from measureList
        this.calculateMusicSystems();

        this.formatMeasures();

        // calculate all LyricWords Positions
        this.calculateLyricsPosition();

        // Add some white space at the end of the piece:
        // this.graphicalMusicSheet.MusicPages[0].PositionAndShape.BorderMarginBottom += 9;

        // transform Relative to Absolute Positions
        GraphicalMusicSheet.transformRelativeToAbsolutePosition(this.graphicalMusicSheet);
    }

    public calculateXLayout(graphicalMusicSheet: GraphicalMusicSheet, maxInstrNameLabelLength: number): void {
        // for each inner List in big Measure List calculate new Positions for the StaffEntries
        // and adjust Measures sizes
        // calculate max measure length for maximum zoom in.
        let minLength: number = 0;
        const maxInstructionsLength: number = this.rules.MaxInstructionsConstValue;
        if (this.graphicalMusicSheet.MeasureList.length > 0) {
            let measures: StaffMeasure[] = this.graphicalMusicSheet.MeasureList[0];
            let minimumStaffEntriesWidth: number = this.calculateMeasureXLayout(measures);
            MusicSheetCalculator.setMeasuresMinStaffEntriesWidth(measures, minimumStaffEntriesWidth);
            minLength = minimumStaffEntriesWidth * 1.2 + maxInstrNameLabelLength + maxInstructionsLength;
            for (let i: number = 1; i < this.graphicalMusicSheet.MeasureList.length; i++) {
                measures = this.graphicalMusicSheet.MeasureList[i];
                minimumStaffEntriesWidth = this.calculateMeasureXLayout(measures);
                MusicSheetCalculator.setMeasuresMinStaffEntriesWidth(measures, minimumStaffEntriesWidth);
                minLength = Math.max(minLength, minimumStaffEntriesWidth * 1.2 + maxInstructionsLength);
            }
        }
        this.graphicalMusicSheet.MinAllowedSystemWidth = minLength;
    }

    protected formatMeasures(): void {
        throw new Error("abstract, not implemented");
    }
    /**
     * Calculates the x layout of the staff entries within the staff measures belonging to one source measure.
     * All staff entries are x-aligned throughout all the measures.
     * @param measures - The minimum required x width of the source measure
     */
    protected calculateMeasureXLayout(measures: StaffMeasure[]): number {
        throw new Error("abstract, not implemented");
    }

    protected calculateSystemYLayout(): void {
        throw new Error("abstract, not implemented");
    }

    /**
     * Called for every source measure when generating the list of staff measures for it.
     */
    protected initStaffMeasuresCreation(): void {
        throw new Error("abstract, not implemented");
    }

    protected handleBeam(graphicalNote: GraphicalNote, beam: Beam, openBeams: Beam[]): void {
        throw new Error("abstract, not implemented");
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
        throw new Error("abstract, not implemented");
    }

    protected handleVoiceEntryLyrics(voiceEntry: VoiceEntry, graphicalStaffEntry: GraphicalStaffEntry,
                                     openLyricWords: LyricWord[]): void {
        throw new Error("abstract, not implemented");
    }

    protected handleVoiceEntryOrnaments(ornamentContainer: OrnamentContainer, voiceEntry: VoiceEntry,
                                        graphicalStaffEntry: GraphicalStaffEntry): void {
        throw new Error("abstract, not implemented");
    }

    protected handleVoiceEntryArticulations(articulations: ArticulationEnum[],
                                            voiceEntry: VoiceEntry,
                                            staffEntry: GraphicalStaffEntry): void {
        throw new Error("abstract, not implemented");
    }

  /**
   * Adds a technical instruction at the given staff entry.
   * @param technicalInstructions
   * @param voiceEntry
   * @param staffEntry
   */
  protected handleVoiceEntryTechnicalInstructions(technicalInstructions: TechnicalInstruction[],
                                                  voiceEntry: VoiceEntry, staffEntry: GraphicalStaffEntry): void {
                                                    throw new Error("abstract, not implemented");
  }


  protected handleTuplet(graphicalNote: GraphicalNote, tuplet: Tuplet, openTuplets: Tuplet[]): void {
        throw new Error("abstract, not implemented");
    }

    protected layoutVoiceEntry(voiceEntry: VoiceEntry, graphicalNotes: GraphicalNote[],
                               graphicalStaffEntry: GraphicalStaffEntry, hasPitchedNote: boolean, isGraceStaffEntry: boolean): void {
        throw new Error("abstract, not implemented");
    }

    protected layoutStaffEntry(graphicalStaffEntry: GraphicalStaffEntry): void {
        throw new Error("abstract, not implemented");
    }

    protected createGraphicalTie(tie: Tie, startGse: GraphicalStaffEntry, endGse: GraphicalStaffEntry, startNote: GraphicalNote,
                                 endNote: GraphicalNote): GraphicalTie {
        throw new Error("abstract, not implemented");
    }

    protected updateStaffLineBorders(staffLine: StaffLine): void {
        throw new Error("abstract, not implemented");
    }

    /**
     * Iterate through all Measures and calculates the MeasureNumberLabels.
     * @param musicSystem
     */
    protected calculateMeasureNumberPlacement(musicSystem: MusicSystem): void {
        const staffLine: StaffLine = musicSystem.StaffLines[0];
        let currentMeasureNumber: number = staffLine.Measures[0].MeasureNumber;
        for (const measure of staffLine.Measures) {
            if (measure.MeasureNumber === 0 || measure.MeasureNumber === 1) {
                currentMeasureNumber = measure.MeasureNumber;
            }

            if ((measure.MeasureNumber === currentMeasureNumber ||
                measure.MeasureNumber === currentMeasureNumber + this.rules.MeasureNumberLabelOffset) &&
                !measure.parentSourceMeasure.ImplicitMeasure) {
                if (measure.MeasureNumber !== 1 ||
                    (measure.MeasureNumber === 1 && measure !== staffLine.Measures[0])) {
                        this.calculateSingleMeasureNumberPlacement(measure, staffLine, musicSystem);
                    }
                currentMeasureNumber = measure.MeasureNumber;
            }
        }
    }

        /// <summary>
        /// This method calculates a single MeasureNumberLabel and adds it to the graphical label list of the music system
        /// </summary>
        /// <param name="measure"></param>
        /// <param name="staffLine"></param>
        /// <param name="musicSystem"></param>
        private calculateSingleMeasureNumberPlacement(measure: StaffMeasure, staffLine: StaffLine, musicSystem: MusicSystem): void {
            const labelNumber: string = measure.MeasureNumber.toString();
            const graphicalLabel: GraphicalLabel = new GraphicalLabel(new Label(labelNumber), this.rules.MeasureNumberLabelHeight,
                                                                      TextAlignment.LeftBottom);
            // FIXME: Change if Skyline is available
            // const skyBottomLineCalculator: SkyBottomLineCalculator = new SkyBottomLineCalculator(this.rules);

            // calculate LabelBoundingBox and set PSI parent
            graphicalLabel.setLabelPositionAndShapeBorders();
            graphicalLabel.PositionAndShape.Parent = musicSystem.PositionAndShape;

            // calculate relative Position
            const relativeX: number = staffLine.PositionAndShape.RelativePosition.x +
                              measure.PositionAndShape.RelativePosition.x - graphicalLabel.PositionAndShape.BorderMarginLeft;
            let relativeY: number;

            // and the corresponding SkyLine indeces
            // tslint:disable-next-line:no-unused-variable
            let start: number = relativeX;
            // tslint:disable-next-line:no-unused-variable
            let end: number = relativeX - graphicalLabel.PositionAndShape.BorderLeft + graphicalLabel.PositionAndShape.BorderMarginRight;

            // take into account the InstrumentNameLabel's at the beginning of the first MusicSystem
            if (staffLine === musicSystem.StaffLines[0] && musicSystem === musicSystem.Parent.MusicSystems[0]) {
                start -= staffLine.PositionAndShape.RelativePosition.x;
                end -= staffLine.PositionAndShape.RelativePosition.x;
            }

            // get the minimum corresponding SkyLine value
            // FIXME: Change if Skyline is available
            // const skyLineMinValue: number = skyBottomLineCalculator.getSkyLineMinInRange(staffLine, start, end);
            const skyLineMinValue: number = 0;

            if (measure === staffLine.Measures[0]) {
                // must take into account possible MusicSystem Bracket's
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
            // FIXME: Change if Skyline is available
            // skyBottomLineCalculator.updateSkyLineInRange(staffLine, start, end, relativeY + graphicalLabel.PositionAndShape.BorderMarginTop);
            musicSystem.MeasureNumberLabels.push(graphicalLabel);
        }

    /**
     * Calculate the shape (Bézier curve) for this tie.
     * @param tie
     * @param tieIsAtSystemBreak
     */
    protected layoutGraphicalTie(tie: GraphicalTie, tieIsAtSystemBreak: boolean): void {
        throw new Error("abstract, not implemented");
    }

    // FIXME: There are several HACKS in this function to make multiline lyrics work without the skyline.
    // These need to be reverted once the skyline is available
    /**
     * Calculate the Lyrics YPositions for a single [[StaffLine]].
     * @param staffLine
     * @param lyricVersesNumber
     */
    protected calculateSingleStaffLineLyricsPosition(staffLine: StaffLine, lyricVersesNumber: number[]): GraphicalStaffEntry[] {
        let numberOfVerses: number = 0;
        // FIXME: There is no class SkyBottomLineCalculator -> Fix value
        let lyricsStartYPosition: number = this.rules.StaffHeight + 6.0; // Add offset to prevent collision
        const lyricsStaffEntriesList: GraphicalStaffEntry[] = [];
        // const skyBottomLineCalculator: SkyBottomLineCalculator = new SkyBottomLineCalculator(this.rules);

        // first find maximum Ycoordinate for the whole StaffLine
        let len: number = staffLine.Measures.length;
        for (let idx: number = 0; idx < len; ++idx) {
            const measure: StaffMeasure = staffLine.Measures[idx];
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
                    let maxMarginRight: number = Number.MAX_VALUE;

                    // if more than one LyricEntry in StaffEntry, find minMarginLeft, maxMarginRight of all corresponding Labels
                    for (let i: number = 0; i < staffEntry.LyricsEntries.length; i++) {
                        const lyricsEntryLabel: GraphicalLabel = staffEntry.LyricsEntries[i].GraphicalLabel;
                        minMarginLeft = Math.min(minMarginLeft, staffEntryPositionX + lyricsEntryLabel.PositionAndShape.BorderMarginLeft);
                        maxMarginRight = Math.max(maxMarginRight, staffEntryPositionX + lyricsEntryLabel.PositionAndShape.BorderMarginRight);
                    }

                    // check BottomLine in this range and take the maximum between the two values
                    // FIXME: There is no class SkyBottomLineCalculator -> Fix value
                    // float bottomLineMax = skyBottomLineCalculator.getBottomLineMaxInRange(staffLine, minMarginLeft, maxMarginRight);
                    const bottomLineMax: number = 0.0;
                    lyricsStartYPosition = Math.max(lyricsStartYPosition, bottomLineMax);
                }
            }
        }

        let maxPosition: number = 4.0;
        // iterate again through the Staffentries with LyricEntries
        len = lyricsStaffEntriesList.length;
        for (let idx: number = 0; idx < len; ++idx) {
            const staffEntry: GraphicalStaffEntry = lyricsStaffEntriesList[idx];
            // set LyricEntryLabel RelativePosition
            for (let i: number = 0; i < staffEntry.LyricsEntries.length; i++) {
                const lyricEntry: GraphicalLyricEntry = staffEntry.LyricsEntries[i];
                const lyricsEntryLabel: GraphicalLabel = lyricEntry.GraphicalLabel;

                // read the verseNumber and get index of this number in the sorted LyricVerseNumbersList of Instrument
                // eg verseNumbers: 2,3,4,6 => 1,2,3,4
                const verseNumber: number = lyricEntry.GetLyricsEntry.VerseNumber;
                const sortedLyricVerseNumberIndex: number = lyricVersesNumber.indexOf(verseNumber);
                const firstPosition: number = lyricsStartYPosition + this.rules.LyricsHeight;

                // Y-position calculated according to aforementioned mapping
                let position: number = firstPosition + (this.rules.VerticalBetweenLyricsDistance + this.rules.LyricsHeight) * (sortedLyricVerseNumberIndex);
                if (this.leadSheet) {
                    position = 3.4 + (this.rules.VerticalBetweenLyricsDistance + this.rules.LyricsHeight) * (sortedLyricVerseNumberIndex);
                }
                lyricsEntryLabel.PositionAndShape.RelativePosition = new PointF2D(0, position);
                maxPosition = Math.max(maxPosition, position);
            }
        }

        // update BottomLine (on the whole StaffLine's length)
        if (lyricsStaffEntriesList.length > 0) {
            /**
             * HACK START
             */
            let additionalPageLength: number = 0;
            maxPosition -= this.rules.StaffHeight;
            let iterator: StaffLine = staffLine.NextStaffLine;
            let systemMaxCount: number = 0;
            while (iterator !== undefined) {
                iterator.PositionAndShape.RelativePosition.y += maxPosition;
                iterator = iterator.NextStaffLine;
                systemMaxCount += maxPosition;
                additionalPageLength += maxPosition;
            }

            systemMaxCount -= this.rules.BetweenStaffDistance;
            let systemIterator: MusicSystem = staffLine.ParentMusicSystem.NextSystem;
            while (systemIterator !== undefined) {
                systemIterator.PositionAndShape.RelativePosition.y += systemMaxCount;
                systemIterator = systemIterator.NextSystem;
                additionalPageLength += systemMaxCount;
            }
            staffLine.ParentMusicSystem.Parent.PositionAndShape.BorderBottom += additionalPageLength;
            // Update the instrument labels
            staffLine.ParentMusicSystem.setMusicSystemLabelsYPosition();
            /**
             * HACK END
             */
            // const endX: number = staffLine.PositionAndShape.Size.width;
            // const startX: number = lyricsStaffEntriesList[0].PositionAndShape.RelativePosition.x +
            // lyricsStaffEntriesList[0].PositionAndShape.BorderMarginLeft +
            // lyricsStaffEntriesList[0].parentMeasure.PositionAndShape.RelativePosition.x;
            // FIXME: There is no class SkyBottomLineCalculator. This call should update the positions according to the last run
            // skyBottomLineCalculator.updateBottomLineInRange(staffLine, startX, endX, maxPosition);
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
                if (lyricEntry.ParentLyricWord !== undefined &&
                    lyricEntry.ParentLyricWord.GraphicalLyricsEntries[lyricEntry.ParentLyricWord.GraphicalLyricsEntries.length - 1] !== lyricEntry) {
                    this.calculateSingleLyricWord(lyricEntry);
                }
                // calculate the underscore line extend if needed
                if (lyricEntry.GetLyricsEntry.extend) {
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
        throw new Error("abstract, not implemented");
    }

    /**
     * Calculate all the textual [[RepetitionInstruction]]s (e.g. dal segno) for a single [[SourceMeasure]].
     * @param repetitionInstruction
     * @param measureIndex
     */
    protected calculateWordRepetitionInstruction(repetitionInstruction: RepetitionInstruction,
                                                 measureIndex: number): void {
        throw new Error("abstract, not implemented");
    }

    /**
     * Calculate all the Mood and Unknown Expressions for a single [[MultiExpression]].
     * @param multiExpression
     * @param measureIndex
     * @param staffIndex
     */
    protected calculateMoodAndUnknownExpression(multiExpression: MultiExpression, measureIndex: number, staffIndex: number): void {
        throw new Error("abstract, not implemented");
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
        Logging.debug("handleStaffEntryLink not implemented");
    }

    /**
     * Store the newly computed [[Measure]]s in newly created [[MusicSystem]]s.
     */
    protected calculateMusicSystems(): void {
        if (this.graphicalMusicSheet.MeasureList === undefined) {
            return;
        }

        const allMeasures: StaffMeasure[][] = this.graphicalMusicSheet.MeasureList;
        if (allMeasures === undefined) {
            return;
        }

        // visible 2D-MeasureList
        const visibleMeasureList: StaffMeasure[][] = [];
        for (let idx: number = 0, len: number = allMeasures.length; idx < len; ++idx) {
            const staffMeasures: StaffMeasure[] = allMeasures[idx];
            const visibleStaffMeasures: StaffMeasure[] = [];
            for (let idx2: number = 0, len2: number = staffMeasures.length; idx2 < len2; ++idx2) {
                const staffMeasure: StaffMeasure = allMeasures[idx][idx2];
                if (staffMeasure.isVisible()) {
                    visibleStaffMeasures.push(staffMeasure);
                }
            }
            visibleMeasureList.push(visibleStaffMeasures);
        }

        // find out how many StaffLine Instances we need
        let numberOfStaffLines: number = 0;

        for (let idx: number = 0, len: number = visibleMeasureList.length; idx < len; ++idx) {
            const gmlist: StaffMeasure[] = visibleMeasureList[idx];
            numberOfStaffLines = Math.max(gmlist.length, numberOfStaffLines);
            break;
        }
        if (numberOfStaffLines === 0) {
            return;
        }

        // build the MusicSystems
        const musicSystemBuilder: MusicSystemBuilder = new MusicSystemBuilder();
        musicSystemBuilder.initialize(this.graphicalMusicSheet, visibleMeasureList, numberOfStaffLines, this.symbolFactory);
        musicSystemBuilder.buildMusicSystems();

        // check for Measures with only WholeRestNotes and correct their X-Position (middle of Measure)
        this.checkMeasuresForWholeRestNotes();
        if (!this.leadSheet) {
            // calculate Beam Placement
            this.calculateBeams();
            // possible Displacement of RestNotes
            this.optimizeRestPlacement();
            // possible Displacement of RestNotes
            this.calculateStaffEntryArticulationMarks();
            // calculate Ties
            this.calculateTieCurves();
        }
        // calculate Sky- and BottomLine
        // will have reasonable values only between ObjectsBorders (eg StaffEntries)
        this.calculateSkyBottomLines();
        // calculate TupletsNumbers
        this.calculateTupletNumbers();
        // calculate MeasureNumbers
        for (let idx: number = 0, len: number = this.graphicalMusicSheet.MusicPages.length; idx < len; ++idx) {
            const graphicalMusicPage: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (let idx2: number = 0, len2: number = graphicalMusicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                const musicSystem: MusicSystem = graphicalMusicPage.MusicSystems[idx2];
                this.calculateMeasureNumberPlacement(musicSystem);
            }
        }
        // calculate Slurs
        if (!this.leadSheet) {
            this.calculateSlurs();
        }
        // calculate StaffEntry Ornaments
        // (must come after Slurs)
        if (!this.leadSheet) {
            this.calculateOrnaments();
        }
        // update Sky- and BottomLine with borderValues 0.0 and 4.0 respectively
        // (must also come after Slurs)
        this.updateSkyBottomLines();
        // calculate StaffEntry ChordSymbols
        this.calculateChordSymbols();
        if (!this.leadSheet) {
            // calculate all Instantanious/Continuous Dynamics Expressions
            this.calculateDynamicExpressions();
            // place neighbouring DynamicExpressions at the same height
            this.optimizeStaffLineDynamicExpressionsPositions();
            // calculate all Mood and Unknown Expression
            this.calculateMoodAndUnknownExpressions();
            // calculate all OctaveShifts
            this.calculateOctaveShifts();
            // calucalte RepetitionInstructions (Dal Segno, Coda, etc)
            this.calculateWordRepetitionInstructions();
        }
        // calculate endings last, so they appear above measure numbers
        this.calculateRepetitionEndings();
        // calcualte all Tempo Expressions
        if (!this.leadSheet) {
            this.calculateTempoExpressions();
        }

        // update all StaffLine's Borders
        // create temporary Object, just to call the methods (in order to avoid declaring them static)
        for (let idx: number = 0, len: number = this.graphicalMusicSheet.MusicPages.length; idx < len; ++idx) {
            const graphicalMusicPage: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (let idx2: number = 0, len2: number = graphicalMusicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                const musicSystem: MusicSystem = graphicalMusicPage.MusicSystems[idx2];
                for (let idx3: number = 0, len3: number = musicSystem.StaffLines.length; idx3 < len3; ++idx3) {
                    const staffLine: StaffLine = musicSystem.StaffLines[idx3];
                    this.updateStaffLineBorders(staffLine);
                }
            }
        }
        // calculate Comments for each Staffline
        this.calculateComments();
        // Y-spacing
        this.calculateSystemYLayout();
        // calculate marked Areas for Systems
        this.calculateMarkedAreas();

        // the following must be done after Y-spacing, when the MusicSystems's final Dimensions are set
        // set the final yPositions of Objects such as SystemLabels and SystemLinesContainers,
        // create all System Lines, Brackets and MeasureNumbers (for all systems and for all pages)
        for (let idx: number = 0, len: number = this.graphicalMusicSheet.MusicPages.length; idx < len; ++idx) {
            const graphicalMusicPage: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (let idx2: number = 0, len2: number = graphicalMusicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                const musicSystem: MusicSystem = graphicalMusicPage.MusicSystems[idx2];
                musicSystem.setMusicSystemLabelsYPosition();
                if (!this.leadSheet) {
                    musicSystem.setYPositionsToVerticalLineObjectsAndCreateLines(this.rules);
                    musicSystem.createSystemLeftLine(this.rules.SystemThinLineWidth, this.rules.SystemLabelsRightMargin);
                    musicSystem.createInstrumentBrackets(this.graphicalMusicSheet.ParentMusicSheet.Instruments, this.rules.StaffHeight);
                    musicSystem.createGroupBrackets(this.graphicalMusicSheet.ParentMusicSheet.InstrumentalGroups, this.rules.StaffHeight, 0);
                    musicSystem.alignBeginInstructions();
                } else if (musicSystem === musicSystem.Parent.MusicSystems[0]) {
                    musicSystem.createSystemLeftLine(this.rules.SystemThinLineWidth, this.rules.SystemLabelsRightMargin);
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
            // calculate all Labels's Positions for the first Page
            if (graphicalMusicPage === this.graphicalMusicSheet.MusicPages[0]) {
                this.calculatePageLabels(graphicalMusicPage);
            }
            // calculate TopBottom Borders for all elements recursively
            graphicalMusicPage.PositionAndShape.calculateTopBottomBorders();
        }
    }

    protected updateSkyBottomLine(staffLine: StaffLine): void {
        //Logging.debug("updateSkyBottomLine not implemented");
        return;
    }

    protected calculateSkyBottomLine(staffLine: StaffLine): void {
        //Logging.debug("calculateSkyBottomLine not implemented");
        return;
    }

    protected calculateMarkedAreas(): void {
        //Logging.debug("calculateMarkedAreas not implemented");
        return;
    }

    protected calculateComments(): void {
        //Logging.debug("calculateComments not implemented");
        return;
    }

    /**
     * Iterate through all the [[StaffLine]]s in order to check for possible optimizations in the placement of the [[GraphicalExpression]]s.
     */
    protected optimizeStaffLineDynamicExpressionsPositions(): void {
        return;
    }

    protected calculateChordSymbols(): void {
        return;
    }

    /**
     * Do layout on staff measures with only consist of a full rest.
     * @param rest
     * @param gse
     * @param measure
     */
    protected layoutMeasureWithWholeRest(rest: GraphicalNote, gse: GraphicalStaffEntry,
                                         measure: StaffMeasure): void {
        return;
    }

    protected layoutBeams(staffEntry: GraphicalStaffEntry): void {
        return;
    }

    protected layoutArticulationMarks(articulations: ArticulationEnum[], voiceEntry: VoiceEntry, graphicalStaffEntry: GraphicalStaffEntry): void {
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

    protected calculateDynamicExpressionsForSingleMultiExpression(multiExpression: MultiExpression, measureIndex: number, staffIndex: number): void {
        return;
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
    protected layoutSingleRepetitionEnding(start: StaffMeasure, end: StaffMeasure, numberText: string,
                                           offset: number, leftOpen: boolean, rightOpen: boolean): void {
        return;
    }

    protected calculateTempoExpressionsForSingleMultiTempoExpression(sourceMeasure: SourceMeasure, multiTempoExpression: MultiTempoExpression,
                                                                     measureIndex: number): void {
        return;
    }

    protected staffMeasureCreatedCalculations(measure: StaffMeasure): void {
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
                        const graphicalMeasure: StaffMeasure = staffLine.Measures[idx4];
                        if (graphicalMeasure.FirstInstructionStaffEntry !== undefined) {
                            const index: number = graphicalMeasure.PositionAndShape.ChildElements.indexOf(
                                graphicalMeasure.FirstInstructionStaffEntry.PositionAndShape
                            );
                            if (index > -1) {
                                graphicalMeasure.PositionAndShape.ChildElements.splice(index, 1);
                            }
                            graphicalMeasure.FirstInstructionStaffEntry = undefined;
                            graphicalMeasure.beginInstructionsWidth = 0.0;
                        }
                        if (graphicalMeasure.LastInstructionStaffEntry !== undefined) {
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
                               tieTimestampListDict: Dictionary<Tie, Fraction[]>, activeClef: ClefInstruction,
                               openTuplets: Tuplet[], openBeams: Beam[],
                               octaveShiftValue: OctaveEnum, grace: boolean = false, linkedNotes: Note[] = undefined,
                               sourceStaffEntry: SourceStaffEntry = undefined): OctaveEnum {
        this.calculateStemDirectionFromVoices(voiceEntry);
        const graphicalNotes: GraphicalNote[] = graphicalStaffEntry.findOrCreateGraphicalNotesListFromVoiceEntry(voiceEntry);
        for (let idx: number = 0, len: number = voiceEntry.Notes.length; idx < len; ++idx) {
            const note: Note = voiceEntry.Notes[idx];
            if (sourceStaffEntry !== undefined && sourceStaffEntry.Link !== undefined && linkedNotes !== undefined && linkedNotes.indexOf(note) > -1) {
                continue;
            }
            let graphicalNote: GraphicalNote;
            if (grace) {
                graphicalNote = this.symbolFactory.createGraceNote(note, graphicalStaffEntry, activeClef, octaveShiftValue);
            } else {
                graphicalNote = this.symbolFactory.createNote(note, graphicalStaffEntry, activeClef, octaveShiftValue, undefined);
            }
            if (note.NoteTie !== undefined) {
                MusicSheetCalculator.addTieToTieTimestampsDict(tieTimestampListDict, note);
            }
            if (note.Pitch !== undefined) {
                this.checkNoteForAccidental(graphicalNote, accidentalCalculator, activeClef, octaveShiftValue, grace);
            }
            this.resetYPositionForLeadSheet(graphicalNote.PositionAndShape);
            graphicalStaffEntry.addGraphicalNoteToListAtCorrectYPosition(graphicalNotes, graphicalNote);
            graphicalNote.PositionAndShape.calculateBoundingBox();
            if (!this.leadSheet) {
                if (note.NoteBeam !== undefined) {
                    this.handleBeam(graphicalNote, note.NoteBeam, openBeams);
                }
                if (note.NoteTuplet !== undefined) {
                    this.handleTuplet(graphicalNote, note.NoteTuplet, openTuplets);
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
        if (voiceEntry.OrnamentContainer !== undefined) {
            this.handleVoiceEntryOrnaments(voiceEntry.OrnamentContainer, voiceEntry, graphicalStaffEntry);
        }
        return octaveShiftValue;
    }

    protected handleVoiceEntryGraceNotes(graceEntries: VoiceEntry[], graphicalGraceEntries: GraphicalStaffEntry[], graphicalStaffEntry: GraphicalStaffEntry,
                                         accidentalCalculator: AccidentalCalculator, activeClef: ClefInstruction,
                                         octaveShiftValue: OctaveEnum, lyricWords: LyricWord[],
                                         tieTimestampListDict: Dictionary<Tie, Fraction[]>,
                                         tuplets: Tuplet[], beams: Beam[]): void {
        if (graceEntries !== undefined) {
            for (let idx: number = 0, len: number = graceEntries.length; idx < len; ++idx) {
                const graceVoiceEntry: VoiceEntry = graceEntries[idx];
                const graceStaffEntry: GraphicalStaffEntry = this.symbolFactory.createGraceStaffEntry(
                    graphicalStaffEntry,
                    graphicalStaffEntry.parentMeasure
                );
                graphicalGraceEntries.push(graceStaffEntry);
                this.handleVoiceEntry(
                    graceVoiceEntry, graceStaffEntry, accidentalCalculator, lyricWords,
                    tieTimestampListDict, activeClef, tuplets,
                    beams, octaveShiftValue, true
                );
            }
        }
    }

    protected handleOpenTies(measure: StaffMeasure, beams: Beam[], tieTimestampListDict: Dictionary<Tie, Fraction[]>,
                             activeClef: ClefInstruction, octaveShiftParams: OctaveShiftParams): void {
        CollectionUtil.removeDictElementIfTrue( this, tieTimestampListDict,
                                                function (thisPointer: MusicSheetCalculator, openTie: Tie, tieTimestamps: Fraction[]): boolean {
            // for (let m: number = tieTimestampListDict.size() - 1; m >= 0; m--) {
            //     let keyValuePair: KeyValuePair<Tie, Fraction[]> = tieTimestampListDict.ElementAt(m);
            //     let openTie: Tie = keyValuePair.Key;
            //    let tieTimestamps: Fraction[] = keyValuePair.Value;
            let absoluteTimestamp: Fraction = undefined;

            let removeTie: boolean = false;
            for (let k: number = 0; k < tieTimestamps.length; k++) {
                if (!openTie.NoteHasBeenCreated[k]) {
                    absoluteTimestamp = tieTimestamps[k];
                    if (Fraction.plus(measure.parentSourceMeasure.AbsoluteTimestamp, measure.parentSourceMeasure.Duration).lte(absoluteTimestamp)) {
                        continue;
                    }
                    let graphicalStaffEntry: GraphicalStaffEntry = undefined;
                    if (absoluteTimestamp !== undefined) {
                        for (let idx: number = 0, len: number = measure.staffEntries.length; idx < len; ++idx) {
                            const gse: GraphicalStaffEntry = measure.staffEntries[idx];
                            if (gse.getAbsoluteTimestamp().Equals(absoluteTimestamp)) {
                                graphicalStaffEntry = gse;
                                break;
                            }
                        }
                        if (graphicalStaffEntry === undefined) {
                            graphicalStaffEntry = thisPointer.createStaffEntryForTieNote(measure, absoluteTimestamp, openTie);
                        }
                    }
                    if (graphicalStaffEntry !== undefined) {
                        let octaveShiftValue: OctaveEnum = OctaveEnum.NONE;
                        if (octaveShiftParams !== undefined) {
                            if (octaveShiftParams.getAbsoluteStartTimestamp.lte(graphicalStaffEntry.getAbsoluteTimestamp()) &&
                                graphicalStaffEntry.getAbsoluteTimestamp().lte(octaveShiftParams.getAbsoluteEndTimestamp)) {
                                octaveShiftValue = octaveShiftParams.getOpenOctaveShift.Type;
                            }
                        }
                        const isLastTieNote: boolean = k === tieTimestamps.length - 1;
                        const tieFraction: Fraction = openTie.Fractions[k];
                        // GraphicalNote points to tieStartNote, but must get the correct Length (eg the correct Fraction of tieStartNote's Length)
                        const tiedGraphicalNote: GraphicalNote = thisPointer.symbolFactory.createNote(openTie.Start, graphicalStaffEntry, activeClef,
                                                                                                      octaveShiftValue, tieFraction);

                        const graphicalNotes: GraphicalNote[] =
                            graphicalStaffEntry.findOrCreateGraphicalNotesListFromGraphicalNote(tiedGraphicalNote);
                        graphicalStaffEntry.addGraphicalNoteToListAtCorrectYPosition(graphicalNotes, tiedGraphicalNote);

                        thisPointer.handleTiedGraphicalNote(tiedGraphicalNote, beams, activeClef, octaveShiftValue, graphicalStaffEntry, tieFraction,
                                                            openTie, isLastTieNote);

                        const tieStartNote: Note = openTie.Start;
                        if (isLastTieNote && tieStartNote.ParentVoiceEntry.Articulations.length === 1 &&
                            tieStartNote.ParentVoiceEntry.Articulations[0] === ArticulationEnum.fermata) {
                            thisPointer.symbolFactory.addFermataAtTiedEndNote(tieStartNote, graphicalStaffEntry);
                        }
                        openTie.NoteHasBeenCreated[k] = true;
                        if (openTie.allGraphicalNotesHaveBeenCreated()) {
                            removeTie = true;
                            //tieTimestampListDict.remove(openTie);
                        }
                    }
                }
            }
            return removeTie;
        });
    }

    protected resetYPositionForLeadSheet(psi: BoundingBox): void {
        if (this.leadSheet) {
            psi.RelativePosition = new PointF2D(psi.RelativePosition.x, 0.0);
        }
    }

    protected layoutVoiceEntries(graphicalStaffEntry: GraphicalStaffEntry): void {
        graphicalStaffEntry.PositionAndShape.RelativePosition = new PointF2D(0.0, 0.0);
        if (!this.leadSheet) {
            const isGraceStaffEntry: boolean = graphicalStaffEntry.staffEntryParent !== undefined;
            const graphicalStaffEntryNotes: GraphicalNote[][] = graphicalStaffEntry.notes;
            for (let idx4: number = 0, len4: number = graphicalStaffEntryNotes.length; idx4 < len4; ++idx4) {
                const graphicalNotes: GraphicalNote[] = graphicalStaffEntryNotes[idx4];
                if (graphicalNotes.length === 0) {
                    continue;
                }
                const voiceEntry: VoiceEntry = graphicalNotes[0].sourceNote.ParentVoiceEntry;
                const hasPitchedNote: boolean = graphicalNotes[0].sourceNote.Pitch !== undefined;
                this.layoutVoiceEntry(voiceEntry, graphicalNotes, graphicalStaffEntry, hasPitchedNote, isGraceStaffEntry);
            }
        }
    }

    protected maxInstrNameLabelLength(): number {
        let maxLabelLength: number = 0.0;
        for (const instrument of this.graphicalMusicSheet.ParentMusicSheet.Instruments) {
            if (instrument.Voices.length > 0 && instrument.Voices[0].Visible) {
                const graphicalLabel: GraphicalLabel = new GraphicalLabel(instrument.NameLabel, this.rules.InstrumentLabelTextHeight, TextAlignment.LeftCenter);
                graphicalLabel.setLabelPositionAndShapeBorders();
                maxLabelLength = Math.max(maxLabelLength, graphicalLabel.PositionAndShape.MarginSize.width);
            }
        }
        return maxLabelLength;
    }

    protected calculateSheetLabelBoundingBoxes(): void {
        const musicSheet: MusicSheet = this.graphicalMusicSheet.ParentMusicSheet;
        if (musicSheet.Title !== undefined) {
            const title: GraphicalLabel = new GraphicalLabel(musicSheet.Title, this.rules.SheetTitleHeight, TextAlignment.CenterBottom);
            this.graphicalMusicSheet.Title = title;
            title.setLabelPositionAndShapeBorders();
        }
        if (musicSheet.Subtitle !== undefined) {
            const subtitle: GraphicalLabel = new GraphicalLabel(musicSheet.Subtitle, this.rules.SheetSubtitleHeight, TextAlignment.CenterCenter);
            this.graphicalMusicSheet.Subtitle = subtitle;
            subtitle.setLabelPositionAndShapeBorders();
        }
        if (musicSheet.Composer !== undefined) {
            const composer: GraphicalLabel = new GraphicalLabel(musicSheet.Composer, this.rules.SheetComposerHeight, TextAlignment.RightCenter);
            this.graphicalMusicSheet.Composer = composer;
            composer.setLabelPositionAndShapeBorders();
        }
        if (musicSheet.Lyricist !== undefined) {
            const lyricist: GraphicalLabel = new GraphicalLabel(musicSheet.Lyricist, this.rules.SheetAuthorHeight, TextAlignment.LeftCenter);
            this.graphicalMusicSheet.Lyricist = lyricist;
            lyricist.setLabelPositionAndShapeBorders();
        }
    }

    protected checkMeasuresForWholeRestNotes(): void {
        for (let idx: number = 0, len: number = this.graphicalMusicSheet.MusicPages.length; idx < len; ++idx) {
            const musicPage: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (let idx2: number = 0, len2: number = musicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                const musicSystem: MusicSystem = musicPage.MusicSystems[idx2];
                for (let idx3: number = 0, len3: number = musicSystem.StaffLines.length; idx3 < len3; ++idx3) {
                    const staffLine: StaffLine = musicSystem.StaffLines[idx3];
                    for (let idx4: number = 0, len4: number = staffLine.Measures.length; idx4 < len4; ++idx4) {
                        const measure: StaffMeasure = staffLine.Measures[idx4];
                        if (measure.staffEntries.length === 1) {
                            const gse: GraphicalStaffEntry = measure.staffEntries[0];
                            if (gse.notes.length > 0 && gse.notes[0].length > 0) {
                                const graphicalNote: GraphicalNote = gse.notes[0][0];
                                if (graphicalNote.sourceNote.Pitch === undefined && (new Fraction(1, 2)).lt(graphicalNote.sourceNote.Length)) {
                                    this.layoutMeasureWithWholeRest(graphicalNote, gse, measure);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    protected optimizeRestNotePlacement(graphicalStaffEntry: GraphicalStaffEntry, measure: StaffMeasure): void {
        if (graphicalStaffEntry.notes.length === 0) {
            return;
        }
        const voice1Notes: GraphicalNote[] = graphicalStaffEntry.notes[0];
        if (voice1Notes.length === 0) {
            return;
        }
        const voice1Note1: GraphicalNote = voice1Notes[0];
        const voice1Note1IsRest: boolean = voice1Note1.sourceNote.Pitch === undefined;
        if (graphicalStaffEntry.notes.length === 2) {
            let voice2Note1IsRest: boolean = false;
            const voice2Notes: GraphicalNote[] = graphicalStaffEntry.notes[1];
            if (voice2Notes.length > 0) {
                const voice2Note1: GraphicalNote = voice2Notes[0];
                voice2Note1IsRest = voice2Note1.sourceNote.Pitch === undefined;
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
            if (previousStaffEntry.notes.length === 1) {
                const previousNote: GraphicalNote = previousStaffEntry.notes[0][0];
                if (previousNote.sourceNote.NoteBeam !== undefined && nextStaffEntry.notes.length === 1) {
                    const nextNote: GraphicalNote = nextStaffEntry.notes[0][0];
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
        if (leftStaffEntry !== undefined && rightStaffEntry !== undefined) {
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

        // The PositionAndShape child elements of page need to be manually connected to the lyricist, composer, subtitle, etc.
        // because the page are only available now
        let firstSystemAbsoluteTopMargin: number = 10;
        if (page.MusicSystems.length > 0) {
            const firstMusicSystem: MusicSystem = page.MusicSystems[0];
            firstSystemAbsoluteTopMargin = firstMusicSystem.PositionAndShape.RelativePosition.y + firstMusicSystem.PositionAndShape.BorderTop;
        }
        if (this.graphicalMusicSheet.Title !== undefined) {
            const title: GraphicalLabel = this.graphicalMusicSheet.Title;
            title.PositionAndShape.Parent = page.PositionAndShape;
            const relative: PointF2D = new PointF2D();
            relative.x = this.graphicalMusicSheet.ParentMusicSheet.pageWidth / 2;
            relative.y = this.rules.TitleTopDistance + this.rules.SheetTitleHeight;
            title.PositionAndShape.RelativePosition = relative;
            page.Labels.push(title);
        }
        if (this.graphicalMusicSheet.Subtitle !== undefined) {
            const subtitle: GraphicalLabel = this.graphicalMusicSheet.Subtitle;
            subtitle.PositionAndShape.Parent = page.PositionAndShape;
            const relative: PointF2D = new PointF2D();
            relative.x = this.graphicalMusicSheet.ParentMusicSheet.pageWidth / 2;
            relative.y = this.rules.TitleTopDistance + this.rules.SheetTitleHeight + this.rules.SheetMinimumDistanceBetweenTitleAndSubtitle;
            subtitle.PositionAndShape.RelativePosition = relative;
            page.Labels.push(subtitle);
        }
        if (this.graphicalMusicSheet.Composer !== undefined) {
            const composer: GraphicalLabel = this.graphicalMusicSheet.Composer;
            composer.PositionAndShape.Parent = page.PositionAndShape;
            composer.setLabelPositionAndShapeBorders();
            const relative: PointF2D = new PointF2D();
            relative.x = this.graphicalMusicSheet.ParentMusicSheet.pageWidth - this.rules.PageRightMargin;
            relative.y = firstSystemAbsoluteTopMargin - this.rules.SystemComposerDistance;
            composer.PositionAndShape.RelativePosition = relative;
            page.Labels.push(composer);
        }
        if (this.graphicalMusicSheet.Lyricist !== undefined) {
            const lyricist: GraphicalLabel = this.graphicalMusicSheet.Lyricist;
            lyricist.PositionAndShape.Parent = page.PositionAndShape;
            lyricist.setLabelPositionAndShapeBorders();
            const relative: PointF2D = new PointF2D();
            relative.x = this.rules.PageLeftMargin;
            relative.y = firstSystemAbsoluteTopMargin - this.rules.SystemComposerDistance;
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
                    if (sourceStaffEntry !== undefined) {
                        const startStaffEntry: GraphicalStaffEntry = this.graphicalMusicSheet.findGraphicalStaffEntryFromMeasureList(
                            staffIndex, measureIndex, sourceStaffEntry
                        );
                        for (let idx: number = 0, len: number = sourceStaffEntry.VoiceEntries.length; idx < len; ++idx) {
                            const voiceEntry: VoiceEntry = sourceStaffEntry.VoiceEntries[idx];
                            for (let idx2: number = 0, len2: number = voiceEntry.Notes.length; idx2 < len2; ++idx2) {
                                const note: Note = voiceEntry.Notes[idx2];
                                if (note.NoteTie !== undefined) {
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
        let startGse: GraphicalStaffEntry = startGraphicalStaffEntry;
        let endGse: GraphicalStaffEntry = undefined;
        let startNote: GraphicalNote = undefined;
        let endNote: GraphicalNote = undefined;
        for (let i: number = 0; i < tie.Fractions.length; i++) {
            let verticalGraphicalStaffEntryContainer: VerticalGraphicalStaffEntryContainer;
            let endTimestamp: Fraction;
            const startContainerIndex: number = startGraphicalStaffEntry.parentVerticalContainer.Index;
            if (i === 0) {
                endTimestamp = Fraction.plus(startGraphicalStaffEntry.getAbsoluteTimestamp(), tie.Start.calculateNoteLengthWithoutTie());
            } else {
                endTimestamp = Fraction.plus(startGse.getAbsoluteTimestamp(), tie.Fractions[i - 1]);
            }
            verticalGraphicalStaffEntryContainer = this.graphicalMusicSheet.GetVerticalContainerFromTimestamp(endTimestamp, startContainerIndex + 1);
            if (verticalGraphicalStaffEntryContainer !== undefined) {
                endGse = verticalGraphicalStaffEntryContainer.StaffEntries[staffIndex];
                startNote = startGse.findEndTieGraphicalNoteFromNote(tie.Start);
                if (endGse !== undefined) {
                    endNote = endGse.findEndTieGraphicalNoteFromNote(tie.Start);
                }
            }
            if (startNote !== undefined && endNote !== undefined && endGse !== undefined) {
                const graphicalTie: GraphicalTie = this.createGraphicalTie(tie, startGse, endGse, startNote, endNote);
                startGse.GraphicalTies.push(graphicalTie);
                if (this.staffEntriesWithGraphicalTies.indexOf(startGse) >= 0) {
                    this.staffEntriesWithGraphicalTies.push(startGse);
                }
            }
            if (endGse !== undefined) {
                if (endGse.parentMeasure !== startGse.parentMeasure) {
                    measureIndex++;
                }
                startGse = endGse;
                endGse = this.graphicalMusicSheet.findNextGraphicalStaffEntry(staffIndex, measureIndex, startGse);
            }
        }
    }

    private createAccidentalCalculators(): AccidentalCalculator[] {
        const accidentalCalculators: AccidentalCalculator[] = [];
        const firstSourceMeasure: SourceMeasure = this.graphicalMusicSheet.ParentMusicSheet.getFirstSourceMeasure();
        if (firstSourceMeasure !== undefined) {
            for (let i: number = 0; i < firstSourceMeasure.CompleteNumberOfStaves; i++) {
                const accidentalCalculator: AccidentalCalculator = new AccidentalCalculator(this.symbolFactory);
                accidentalCalculators.push(accidentalCalculator);
                if (firstSourceMeasure.FirstInstructionsStaffEntries[i] !== undefined) {
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
                const measure: StaffMeasure = this.graphicalMusicSheet.MeasureList[i][j];
                for (let idx: number = 0, len: number = measure.staffEntries.length; idx < len; ++idx) {
                    const graphicalStaffEntry: GraphicalStaffEntry = measure.staffEntries[idx];
                    const verticalContainer: VerticalGraphicalStaffEntryContainer =
                        this.graphicalMusicSheet.getOrCreateVerticalContainer(graphicalStaffEntry.getAbsoluteTimestamp());
                    if (verticalContainer !== undefined) {
                        verticalContainer.StaffEntries[j] = graphicalStaffEntry;
                        graphicalStaffEntry.parentVerticalContainer = verticalContainer;
                    }
                }
            }
        }
    }

    private setIndecesToVerticalGraphicalContainers(): void {
        for (let i: number = 0; i < this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers.length; i++) {
            this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers[i].Index = i;
        }
    }

    private createGraphicalMeasuresForSourceMeasure(sourceMeasure: SourceMeasure, accidentalCalculators: AccidentalCalculator[],
                                                    openLyricWords: LyricWord[],
                                                    tieTimestampListDictList: Dictionary<Tie, Fraction[]>[],
                                                    openOctaveShifts: OctaveShiftParams[], activeClefs: ClefInstruction[]): StaffMeasure[] {
        this.initStaffMeasuresCreation();
        const verticalMeasureList: StaffMeasure[] = [];
        const openBeams: Beam[] = [];
        const openTuplets: Tuplet[] = [];
        const staffEntryLinks: StaffEntryLink[] = [];
        for (let staffIndex: number = 0; staffIndex < sourceMeasure.CompleteNumberOfStaves; staffIndex++) {
            const measure: StaffMeasure = this.createGraphicalMeasure(
                sourceMeasure, tieTimestampListDictList[staffIndex], openTuplets, openBeams,
                accidentalCalculators[staffIndex], activeClefs, openOctaveShifts, openLyricWords, staffIndex, staffEntryLinks
            );
            this.staffMeasureCreatedCalculations(measure);
            verticalMeasureList.push(measure);
        }
        this.graphicalMusicSheet.sourceToGraphicalMeasureLinks.setValue(sourceMeasure, verticalMeasureList);
        return verticalMeasureList;
    }

    private createGraphicalMeasure(sourceMeasure: SourceMeasure, tieTimestampListDict: Dictionary<Tie, Fraction[]>, openTuplets: Tuplet[], openBeams: Beam[],
                                   accidentalCalculator: AccidentalCalculator, activeClefs: ClefInstruction[],
                                   openOctaveShifts: OctaveShiftParams[], openLyricWords: LyricWord[], staffIndex: number,
                                   staffEntryLinks: StaffEntryLink[]): StaffMeasure {
        const staff: Staff = this.graphicalMusicSheet.ParentMusicSheet.getStaffFromIndex(staffIndex);
        const measure: StaffMeasure = this.symbolFactory.createStaffMeasure(sourceMeasure, staff);
        measure.hasError = sourceMeasure.getErrorInMeasure(staffIndex);
        if (sourceMeasure.FirstInstructionsStaffEntries[staffIndex] !== undefined) {
            for (let idx: number = 0, len: number = sourceMeasure.FirstInstructionsStaffEntries[staffIndex].Instructions.length; idx < len; ++idx) {
                const instruction: AbstractNotationInstruction = sourceMeasure.FirstInstructionsStaffEntries[staffIndex].Instructions[idx];
                if (instruction instanceof KeyInstruction) {
                    const key: KeyInstruction = KeyInstruction.copy(instruction);
                    if (this.graphicalMusicSheet.ParentMusicSheet.Transpose !== 0 &&
                        measure.ParentStaff.ParentInstrument.MidiInstrumentId !== MidiInstrument.Percussion &&
                        MusicSheetCalculator.transposeCalculator !== undefined) {
                        MusicSheetCalculator.transposeCalculator.transposeKey(
                            key, this.graphicalMusicSheet.ParentMusicSheet.Transpose
                        );
                    }
                    accidentalCalculator.ActiveKeyInstruction = key;
                }
            }
        }
        for (let idx: number = 0, len: number = sourceMeasure.StaffLinkedExpressions[staffIndex].length; idx < len; ++idx) {
            const multiExpression: MultiExpression = sourceMeasure.StaffLinkedExpressions[staffIndex][idx];
            if (multiExpression.OctaveShiftStart !== undefined) {
                const openOctaveShift: OctaveShift = multiExpression.OctaveShiftStart;
                openOctaveShifts[staffIndex] = new OctaveShiftParams(
                    openOctaveShift, multiExpression.AbsoluteTimestamp,
                    openOctaveShift.ParentEndMultiExpression.AbsoluteTimestamp
                );
            }
        }
        for (let entryIndex: number = 0; entryIndex < sourceMeasure.VerticalSourceStaffEntryContainers.length; entryIndex++) {
            const sourceStaffEntry: SourceStaffEntry = sourceMeasure.VerticalSourceStaffEntryContainers[entryIndex].StaffEntries[staffIndex];
            if (sourceStaffEntry !== undefined) {
                for (let idx: number = 0, len: number = sourceStaffEntry.Instructions.length; idx < len; ++idx) {
                    const abstractNotationInstruction: AbstractNotationInstruction = sourceStaffEntry.Instructions[idx];
                    if (abstractNotationInstruction instanceof ClefInstruction) {
                        activeClefs[staffIndex] = <ClefInstruction>abstractNotationInstruction;
                    }
                }
                const graphicalStaffEntry: GraphicalStaffEntry = this.symbolFactory.createStaffEntry(sourceStaffEntry, measure);
                if (measure.staffEntries.length > entryIndex) {
                    measure.addGraphicalStaffEntryAtTimestamp(graphicalStaffEntry);
                } else {
                    measure.addGraphicalStaffEntry(graphicalStaffEntry);
                }
                const linkedNotes: Note[] = [];
                if (sourceStaffEntry.Link !== undefined) {
                    sourceStaffEntry.findLinkedNotes(linkedNotes);
                    this.handleStaffEntryLink(graphicalStaffEntry, staffEntryLinks);
                }
                let octaveShiftValue: OctaveEnum = OctaveEnum.NONE;
                if (openOctaveShifts[staffIndex] !== undefined) {
                    const octaveShiftParams: OctaveShiftParams = openOctaveShifts[staffIndex];
                    if (octaveShiftParams.getAbsoluteStartTimestamp.lte(sourceStaffEntry.AbsoluteTimestamp)  &&
                        sourceStaffEntry.AbsoluteTimestamp.lte(octaveShiftParams.getAbsoluteEndTimestamp)) {
                        octaveShiftValue = octaveShiftParams.getOpenOctaveShift.Type;
                    }
                }
                for (let idx: number = 0, len: number = sourceStaffEntry.VoiceEntries.length; idx < len; ++idx) {
                    const voiceEntry: VoiceEntry = sourceStaffEntry.VoiceEntries[idx];
                    this.handleVoiceEntryGraceNotes(
                        voiceEntry.graceVoiceEntriesBefore, graphicalStaffEntry.graceStaffEntriesBefore, graphicalStaffEntry,
                        accidentalCalculator, activeClefs[staffIndex], octaveShiftValue, openLyricWords,
                        tieTimestampListDict, openTuplets, openBeams
                    );
                    octaveShiftValue = this.handleVoiceEntry(
                        voiceEntry, graphicalStaffEntry,
                        accidentalCalculator, openLyricWords,
                        tieTimestampListDict,
                        activeClefs[staffIndex], openTuplets,
                        openBeams, octaveShiftValue, false, linkedNotes,
                        sourceStaffEntry
                    );
                    this.handleVoiceEntryGraceNotes(
                        voiceEntry.graceVoiceEntriesAfter, graphicalStaffEntry.graceStaffEntriesAfter, graphicalStaffEntry,
                        accidentalCalculator, activeClefs[staffIndex], octaveShiftValue, openLyricWords,
                        tieTimestampListDict, openTuplets, openBeams
                    );
                }
                if (sourceStaffEntry.Instructions.length > 0) {
                    const clefInstruction: ClefInstruction = <ClefInstruction>sourceStaffEntry.Instructions[0];
                    this.symbolFactory.createInStaffClef(graphicalStaffEntry, clefInstruction);
                }
                if (sourceStaffEntry.ChordContainer !== undefined) {
                    sourceStaffEntry.ParentStaff.ParentInstrument.HasChordSymbols = true;
                    this.symbolFactory.createChordSymbol(sourceStaffEntry, graphicalStaffEntry, this.graphicalMusicSheet.ParentMusicSheet.Transpose);
                }
            }
        }
        if (tieTimestampListDict.size() > 0) {
            this.handleOpenTies(
                measure, openBeams,
                tieTimestampListDict, activeClefs[staffIndex], openOctaveShifts[staffIndex]
            );
        }
        accidentalCalculator.doCalculationsAtEndOfMeasure();
        if (sourceMeasure.LastInstructionsStaffEntries[staffIndex] !== undefined) {
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
        if (measure.staffEntries.length === 0) {
            const sourceStaffEntry: SourceStaffEntry = new SourceStaffEntry(undefined, staff);
            const note: Note = new Note(undefined, sourceStaffEntry, Fraction.createFromFraction(sourceMeasure.Duration), undefined);
            const graphicalStaffEntry: GraphicalStaffEntry = this.symbolFactory.createStaffEntry(sourceStaffEntry, measure);
            measure.addGraphicalStaffEntry(graphicalStaffEntry);
            graphicalStaffEntry.relInMeasureTimestamp = new Fraction(0, 1);
            const graphicalNotes: GraphicalNote[] = [];
            graphicalStaffEntry.notes.push(graphicalNotes);
            const graphicalNote: GraphicalNote = this.symbolFactory.createNote(   note,
                                                                                  graphicalStaffEntry,
                                                                                  new ClefInstruction(),
                                                                                  OctaveEnum.NONE, undefined);
            graphicalNotes.push(graphicalNote);
        }
        return measure;
    }

    private checkNoteForAccidental(graphicalNote: GraphicalNote, accidentalCalculator: AccidentalCalculator, activeClef: ClefInstruction,
                                   octaveEnum: OctaveEnum, grace: boolean = false): void {
        let pitch: Pitch = graphicalNote.sourceNote.Pitch;
        const transpose: number = this.graphicalMusicSheet.ParentMusicSheet.Transpose;
        if (transpose !== 0 && graphicalNote.sourceNote.ParentStaffEntry.ParentStaff.ParentInstrument.MidiInstrumentId !== MidiInstrument.Percussion) {
            pitch = graphicalNote.Transpose(
                accidentalCalculator.ActiveKeyInstruction, activeClef, transpose, octaveEnum
            );
            if (graphicalNote.sourceNote.NoteTie !== undefined) {
                graphicalNote.sourceNote.NoteTie.BaseNoteYPosition = graphicalNote.PositionAndShape.RelativePosition.y;
            }
        }
        graphicalNote.sourceNote.halfTone = pitch.getHalfTone();
        let scalingFactor: number = 1.0;
        if (grace) {
            scalingFactor = this.rules.GraceNoteScalingFactor;
        }
        accidentalCalculator.checkAccidental(graphicalNote, pitch, grace, scalingFactor);
    }

    // needed to disable linter, as it doesn't recognize the existing usage of this method.
    // ToDo: check if a newer version doesn't have the problem.
    /* tslint:disable:no-unused-variable */
    private createStaffEntryForTieNote(measure: StaffMeasure, absoluteTimestamp: Fraction, openTie: Tie): GraphicalStaffEntry {
        /* tslint:enable:no-unused-variable */
        let graphicalStaffEntry: GraphicalStaffEntry;
        graphicalStaffEntry = this.symbolFactory.createStaffEntry(openTie.Start.ParentStaffEntry, measure);
        graphicalStaffEntry.relInMeasureTimestamp = Fraction.minus(absoluteTimestamp, measure.parentSourceMeasure.AbsoluteTimestamp);
        this.resetYPositionForLeadSheet(graphicalStaffEntry.PositionAndShape);
        measure.addGraphicalStaffEntryAtTimestamp(graphicalStaffEntry);
        return graphicalStaffEntry;
    }

    private updateSkyBottomLines(): void {
        for (let idx: number = 0, len: number = this.graphicalMusicSheet.MusicPages.length; idx < len; ++idx) {
            const graphicalMusicPage: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (let idx2: number = 0, len2: number = graphicalMusicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                const musicSystem: MusicSystem = graphicalMusicPage.MusicSystems[idx2];
                for (let idx3: number = 0, len3: number = musicSystem.StaffLines.length; idx3 < len3; ++idx3) {
                    const staffLine: StaffLine = musicSystem.StaffLines[idx3];
                    this.updateSkyBottomLine(staffLine);
                }
            }
        }
    }

    private handleStaffEntries(): void {
        for (let idx: number = 0, len: number = this.graphicalMusicSheet.MeasureList.length; idx < len; ++idx) {
            const measures: StaffMeasure[] = this.graphicalMusicSheet.MeasureList[idx];
            for (let idx2: number = 0, len2: number = measures.length; idx2 < len2; ++idx2) {
                const measure: StaffMeasure = measures[idx2];
                for (let idx3: number = 0, len3: number = measure.staffEntries.length; idx3 < len3; ++idx3) {
                    const graphicalStaffEntry: GraphicalStaffEntry = measure.staffEntries[idx3];
                    if (graphicalStaffEntry.parentMeasure !== undefined && graphicalStaffEntry.notes.length > 0 && graphicalStaffEntry.notes[0].length > 0) {
                        this.layoutVoiceEntries(graphicalStaffEntry);
                        this.layoutStaffEntry(graphicalStaffEntry);
                    }
                }
            }
        }
    }

    private calculateSkyBottomLines(): void {
        for (let idx: number = 0, len: number = this.graphicalMusicSheet.MusicPages.length; idx < len; ++idx) {
            const graphicalMusicPage: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (let idx2: number = 0, len2: number = graphicalMusicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                const musicSystem: MusicSystem = graphicalMusicPage.MusicSystems[idx2];
                for (let idx3: number = 0, len3: number = musicSystem.StaffLines.length; idx3 < len3; ++idx3) {
                    const staffLine: StaffLine = musicSystem.StaffLines[idx3];
                    this.calculateSkyBottomLine(staffLine);
                }
            }
        }
    }

    private calculateBeams(): void {
        for (let idx: number = 0, len: number = this.graphicalMusicSheet.MusicPages.length; idx < len; ++idx) {
            const musicPage: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (let idx2: number = 0, len2: number = musicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                const musicSystem: MusicSystem = musicPage.MusicSystems[idx2];
                for (let idx3: number = 0, len3: number = musicSystem.StaffLines.length; idx3 < len3; ++idx3) {
                    const staffLine: StaffLine = musicSystem.StaffLines[idx3];
                    for (let idx4: number = 0, len4: number = staffLine.Measures.length; idx4 < len4; ++idx4) {
                        const measure: StaffMeasure = staffLine.Measures[idx4];
                        for (let idx5: number = 0, len5: number = measure.staffEntries.length; idx5 < len5; ++idx5) {
                            const staffEntry: GraphicalStaffEntry = measure.staffEntries[idx5];
                            this.layoutBeams(staffEntry);
                        }
                    }
                }
            }
        }
    }

    private calculateStaffEntryArticulationMarks(): void {
        for (let idx: number = 0, len: number = this.graphicalMusicSheet.MusicPages.length; idx < len; ++idx) {
            const page: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (let idx2: number = 0, len2: number = page.MusicSystems.length; idx2 < len2; ++idx2) {
                const system: MusicSystem = page.MusicSystems[idx2];
                for (let idx3: number = 0, len3: number = system.StaffLines.length; idx3 < len3; ++idx3) {
                    const line: StaffLine = system.StaffLines[idx3];
                    for (let idx4: number = 0, len4: number = line.Measures.length; idx4 < len4; ++idx4) {
                        const measure: StaffMeasure = line.Measures[idx4];
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
    }

    private calculateOrnaments(): void {
        for (let idx: number = 0, len: number = this.graphicalMusicSheet.MusicPages.length; idx < len; ++idx) {
            const page: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (let idx2: number = 0, len2: number = page.MusicSystems.length; idx2 < len2; ++idx2) {
                const system: MusicSystem = page.MusicSystems[idx2];
                for (let idx3: number = 0, len3: number = system.StaffLines.length; idx3 < len3; ++idx3) {
                    const line: StaffLine = system.StaffLines[idx3];
                    for (let idx4: number = 0, len4: number = line.Measures.length; idx4 < len4; ++idx4) {
                        const measure: StaffMeasure = line.Measures[idx4];
                        for (let idx5: number = 0, len5: number = measure.staffEntries.length; idx5 < len5; ++idx5) {
                            const graphicalStaffEntry: GraphicalStaffEntry = measure.staffEntries[idx5];
                            for (let idx6: number = 0, len6: number = graphicalStaffEntry.sourceStaffEntry.VoiceEntries.length; idx6 < len6; ++idx6) {
                                const voiceEntry: VoiceEntry = graphicalStaffEntry.sourceStaffEntry.VoiceEntries[idx6];
                                if (voiceEntry.OrnamentContainer !== undefined) {
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
    }

    private optimizeRestPlacement(): void {
        for (let idx: number = 0, len: number = this.graphicalMusicSheet.MusicPages.length; idx < len; ++idx) {
            const page: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (let idx2: number = 0, len2: number = page.MusicSystems.length; idx2 < len2; ++idx2) {
                const system: MusicSystem = page.MusicSystems[idx2];
                for (let idx3: number = 0, len3: number = system.StaffLines.length; idx3 < len3; ++idx3) {
                    const line: StaffLine = system.StaffLines[idx3];
                    for (let idx4: number = 0, len4: number = line.Measures.length; idx4 < len4; ++idx4) {
                        const measure: StaffMeasure = line.Measures[idx4];
                        for (let idx5: number = 0, len5: number = measure.staffEntries.length; idx5 < len5; ++idx5) {
                            const graphicalStaffEntry: GraphicalStaffEntry = measure.staffEntries[idx5];
                            this.optimizeRestNotePlacement(graphicalStaffEntry, measure);
                        }
                    }
                }
            }
        }
    }

    private calculateTwoRestNotesPlacementWithCollisionDetection(graphicalStaffEntry: GraphicalStaffEntry): void {
        const firstRestNote: GraphicalNote = graphicalStaffEntry.notes[0][0];
        const secondRestNote: GraphicalNote = graphicalStaffEntry.notes[1][0];
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
        if (graphicalStaffEntry.notes[0][0].sourceNote.Pitch === undefined) {
            restNote = graphicalStaffEntry.notes[0][0];
            graphicalNotes = graphicalStaffEntry.notes[1];
        } else {
            graphicalNotes = graphicalStaffEntry.notes[0];
            restNote = graphicalStaffEntry.notes[1][0];
        }
        let collision: boolean = false;
        graphicalStaffEntry.PositionAndShape.calculateAbsolutePositionsRecursiveWithoutTopelement();
        for (let idx: number = 0, len: number = graphicalNotes.length; idx < len; ++idx) {
            const graphicalNote: GraphicalNote = graphicalNotes[idx];
            if (restNote.PositionAndShape.marginCollisionDetection(graphicalNote.PositionAndShape)) {
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
        for (let idx: number = 0, len: number = this.graphicalMusicSheet.MusicPages.length; idx < len; ++idx) {
            const graphicalMusicPage: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (let idx2: number = 0, len2: number = graphicalMusicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                const musicSystem: MusicSystem = graphicalMusicPage.MusicSystems[idx2];
                for (let idx3: number = 0, len3: number = musicSystem.StaffLines.length; idx3 < len3; ++idx3) {
                    const staffLine: StaffLine = musicSystem.StaffLines[idx3];
                    for (let idx4: number = 0, len5: number = staffLine.Measures.length; idx4 < len5; ++idx4) {
                        const measure: StaffMeasure = staffLine.Measures[idx4];
                        for (let idx6: number = 0, len6: number = measure.staffEntries.length; idx6 < len6; ++idx6) {
                            const staffEntry: GraphicalStaffEntry = measure.staffEntries[idx6];
                            const graphicalTies: GraphicalTie[] = staffEntry.GraphicalTies;
                            for (let idx7: number = 0, len7: number = graphicalTies.length; idx7 < len7; ++idx7) {
                                const graphicalTie: GraphicalTie = graphicalTies[idx7];
                                if (graphicalTie.StartNote !== undefined && graphicalTie.StartNote.parentStaffEntry === staffEntry) {
                                    const tieIsAtSystemBreak: boolean = (
                                        graphicalTie.StartNote.parentStaffEntry.parentMeasure.ParentStaffLine !==
                                        graphicalTie.EndNote.parentStaffEntry.parentMeasure.ParentStaffLine
                                    );
                                    this.layoutGraphicalTie(graphicalTie, tieIsAtSystemBreak);
                                }
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
        for (let idx: number = 0, len: number = this.graphicalMusicSheet.MusicPages.length; idx < len; ++idx) {
            const graphicalMusicPage: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (let idx2: number = 0, len2: number = graphicalMusicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                const musicSystem: MusicSystem = graphicalMusicPage.MusicSystems[idx2];
                for (let idx3: number = 0, len3: number = musicSystem.StaffLines.length; idx3 < len3; ++idx3) {
                    const staffLine: StaffLine = musicSystem.StaffLines[idx3];
                    const lyricsStaffEntries: GraphicalStaffEntry[] =
                        this.calculateSingleStaffLineLyricsPosition(staffLine, staffLine.ParentStaff.ParentInstrument.LyricVersesNumbers);
                    lyricStaffEntriesDict.setValue(staffLine, lyricsStaffEntries);
                    this.calculateLyricsExtendsAndDashes(lyricStaffEntriesDict.getValue(staffLine));
                }
            }
        }
        // the fill in the lyric word dashes and lyrics extends/underscores
        for (let idx: number = 0, len: number = this.graphicalMusicSheet.MusicPages.length; idx < len; ++idx) {
            const graphicalMusicPage: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (let idx2: number = 0, len2: number = graphicalMusicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                const musicSystem: MusicSystem = graphicalMusicPage.MusicSystems[idx2];
                for (let idx3: number = 0, len3: number = musicSystem.StaffLines.length; idx3 < len3; ++idx3) {
                    const staffLine: StaffLine = musicSystem.StaffLines[idx3];
                    this.calculateLyricsExtendsAndDashes(lyricStaffEntriesDict.getValue(staffLine));
                }
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
        if (nextLyricEntry === undefined) {
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
            lyricEntry.GraphicalLabel.PositionAndShape.BorderMarginRight;
            const endX: number = endStaffentry.parentMeasure.PositionAndShape.RelativePosition.x +
            endStaffentry.PositionAndShape.RelativePosition.x +
            nextLyricEntry.GraphicalLabel.PositionAndShape.BorderMarginLeft;
            const y: number = lyricEntry.GraphicalLabel.PositionAndShape.RelativePosition.y;
            let numberOfDashes: number = 1;
            if ((endX - startX) > this.rules.BetweenSyllabelMaximumDistance) {
                numberOfDashes = Math.ceil((endX - startX) / this.rules.BetweenSyllabelMaximumDistance);
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
            const lastStaffMeasure: StaffMeasure = startStaffLine.Measures[startStaffLine.Measures.length - 1];
            const endX: number = lastStaffMeasure.PositionAndShape.RelativePosition.x + lastStaffMeasure.PositionAndShape.Size.width;
            let y: number = lyricEntry.GraphicalLabel.PositionAndShape.RelativePosition.y;

            // calculate Dashes for the first StaffLine
            this.calculateDashes(startStaffLine, startX, endX, y);

            // calculate Dashes for the second StaffLine (only if endStaffEntry isn't the first StaffEntry of the StaffLine)
            if (!(endStaffentry === endStaffentry.parentMeasure.staffEntries[0] &&
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
        if (distance < this.rules.MinimumDistanceBetweenDashes) {
            this.calculateSingleDashForLyricWord(staffLine, startX, endX, y);
        } else {
            // enough distance for more Dashes
            const numberOfDashes: number = Math.floor(distance / this.rules.MinimumDistanceBetweenDashes);
            const distanceBetweenDashes: number = distance / this.rules.MinimumDistanceBetweenDashes;
            let counter: number = 0;

            startX += distanceBetweenDashes / 2;
            endX -= distanceBetweenDashes / 2;
            while (counter <= Math.floor(numberOfDashes / 2.0) && endX > startX) {
                distance = this.calculateRightAndLeftDashesForLyricWord(staffLine, startX, endX, y);
                startX += distanceBetweenDashes;
                endX -= distanceBetweenDashes;
                counter++;
            }

            // if the remaining distance isn't big enough for two Dashes (another check would be if numberOfDashes is uneven),
            // then put the last Dash in the middle of the remaining distance
            if (distance > distanceBetweenDashes) {
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
        const dash: GraphicalLabel = new GraphicalLabel(new Label("-"), this.rules.LyricsHeight, TextAlignment.CenterBottom);
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
        const startStaffLine: StaffLine = <StaffLine>lyricEntry.StaffEntryParent.parentMeasure.ParentStaffLine;

        // find endstaffEntry and staffLine
        let endStaffEntry: GraphicalStaffEntry = undefined;
        let endStaffLine: StaffLine = undefined;
        const staffIndex: number = startStaffEntry.parentMeasure.ParentStaff.idInMusicSheet;
        for (let index: number = startStaffEntry.parentVerticalContainer.Index + 1;
             index < this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers.length;
             ++index) {
            const gse: GraphicalStaffEntry = this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers[index].StaffEntries[staffIndex];
            if (gse === undefined) {
                continue;
            }
            if (gse.hasOnlyRests()) {
                break;
            }
            if (gse.LyricsEntries.length > 0) {
                break;
            }
            endStaffEntry = gse;
            endStaffLine = <StaffLine>endStaffEntry.parentMeasure.ParentStaffLine;
        }
        if (endStaffEntry === undefined) {
            return;
        }
        // if on the same StaffLine
        if (startStaffLine === endStaffLine) {
            // start- and End margins from the text Labels
            const startX: number = startStaffEntry.parentMeasure.PositionAndShape.RelativePosition.x +
                startStaffEntry.PositionAndShape.RelativePosition.x +
                lyricEntry.GraphicalLabel.PositionAndShape.BorderMarginRight;
            const endX: number = endStaffEntry.parentMeasure.PositionAndShape.RelativePosition.x +
                endStaffEntry.PositionAndShape.RelativePosition.x +
                endStaffEntry.PositionAndShape.BorderMarginRight;
            // needed in order to line up with the Label's text bottom line (is the y psoition of the underscore)
            startY -= lyricEntry.GraphicalLabel.PositionAndShape.Size.height / 4;
            // create a Line (as underscope after the LyricLabel's End)
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
            if (endStaffEntry === undefined) {
                return;
            }
            // second Underscore in the endStaffLine until endStaffEntry (if endStaffEntry isn't the first StaffEntry of the StaffLine))
            if (!(endStaffEntry === endStaffEntry.parentMeasure.staffEntries[0] &&
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
    private calculateRightAndLeftDashesForLyricWord (staffLine: StaffLine, startX: number, endX: number, y: number): number {
        const leftDash: GraphicalLabel = new GraphicalLabel (new Label ("-"), this.rules.LyricsHeight, TextAlignment.CenterBottom);
        leftDash.setLabelPositionAndShapeBorders();
        staffLine.LyricsDashes.push(leftDash);
        if (this.staffLinesWithLyricWords.indexOf(staffLine) === -1) {
            this.staffLinesWithLyricWords.push(staffLine);
        }
        leftDash.PositionAndShape.Parent = staffLine.PositionAndShape;
        const leftDashRelative: PointF2D = new PointF2D (startX, y);
        leftDash.PositionAndShape.RelativePosition = leftDashRelative;
        const rightDash: GraphicalLabel = new GraphicalLabel (new Label ("-"), this.rules.LyricsHeight, TextAlignment.CenterBottom);
        rightDash.setLabelPositionAndShapeBorders();
        staffLine.LyricsDashes.push(rightDash);
        rightDash.PositionAndShape.Parent = staffLine.PositionAndShape;
        const rightDashRelative: PointF2D = new PointF2D (endX, y);
        rightDash.PositionAndShape.RelativePosition = rightDashRelative;
        return (rightDash.PositionAndShape.RelativePosition.x - leftDash.PositionAndShape.RelativePosition.x);
    }

    private calculateDynamicExpressions(): void {
        for (let i: number = 0; i < this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures.length; i++) {
            const sourceMeasure: SourceMeasure = this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures[i];
            for (let j: number = 0; j < sourceMeasure.StaffLinkedExpressions.length; j++) {
                if (this.graphicalMusicSheet.MeasureList[i][j].ParentStaff.ParentInstrument.Visible) {
                    for (let k: number = 0; k < sourceMeasure.StaffLinkedExpressions[j].length; k++) {
                        if (sourceMeasure.StaffLinkedExpressions[j][k].InstantaniousDynamic !== undefined ||
                            (sourceMeasure.StaffLinkedExpressions[j][k].StartingContinuousDynamic !== undefined &&
                            sourceMeasure.StaffLinkedExpressions[j][k].StartingContinuousDynamic.StartMultiExpression ===
                            sourceMeasure.StaffLinkedExpressions[j][k] && sourceMeasure.StaffLinkedExpressions[j][k].UnknownList.length === 0)
                        ) {
                            this.calculateDynamicExpressionsForSingleMultiExpression(sourceMeasure.StaffLinkedExpressions[j][k], i, j);
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
                if (this.graphicalMusicSheet.MeasureList[i][j].ParentStaff.ParentInstrument.Visible) {
                    for (let k: number = 0; k < sourceMeasure.StaffLinkedExpressions[j].length; k++) {
                        if ((sourceMeasure.StaffLinkedExpressions[j][k].OctaveShiftStart !== undefined)) {
                            this.calculateSingleOctaveShift(sourceMeasure, sourceMeasure.StaffLinkedExpressions[j][k], i, j);
                        }
                    }
                }
            }
        }
    }

    private getFirstLeftNotNullStaffEntryFromContainer(horizontalIndex: number, verticalIndex: number, multiStaffInstrument: boolean): GraphicalStaffEntry {
        if (this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers[horizontalIndex].StaffEntries[verticalIndex] !== undefined) {
            return this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers[horizontalIndex].StaffEntries[verticalIndex];
        }
        for (let i: number = horizontalIndex - 1; i >= 0; i--) {
            if (this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers[i].StaffEntries[verticalIndex] !== undefined) {
                return this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers[i].StaffEntries[verticalIndex];
            }
        }
        return undefined;
    }

    private getFirstRightNotNullStaffEntryFromContainer(horizontalIndex: number, verticalIndex: number, multiStaffInstrument: boolean): GraphicalStaffEntry {
        if (this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers[horizontalIndex].StaffEntries[verticalIndex] !== undefined) {
            return this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers[horizontalIndex].StaffEntries[verticalIndex];
        }
        for (let i: number = horizontalIndex + 1; i < this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers.length; i++) {
            if (this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers[i].StaffEntries[verticalIndex] !== undefined) {
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
            const partListEntry: Repetition = musicsheet.Repetitions[idx];
            this.calcGraphicalRepetitionEndingsRecursively(partListEntry);
        }
    }

    private calculateTempoExpressions(): void {
        for (let i: number = 0; i < this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures.length; i++) {
            const sourceMeasure: SourceMeasure = this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures[i];
            for (let j: number = 0; j < sourceMeasure.TempoExpressions.length; j++) {
                this.calculateTempoExpressionsForSingleMultiTempoExpression(sourceMeasure, sourceMeasure.TempoExpressions[j], i);
            }
        }
    }

    private calculateMoodAndUnknownExpressions(): void {
        for (let i: number = 0; i < this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures.length; i++) {
            const sourceMeasure: SourceMeasure = this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures[i];
            for (let j: number = 0; j < sourceMeasure.StaffLinkedExpressions.length; j++) {
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
            voiceEntry.StemDirection = StemDirectionType.Up;
            return;
            } else {
            // set stem down:
            voiceEntry.StemDirection = StemDirectionType.Down;
            return;
            }
        } else {
            if (voiceEntry.ParentVoice instanceof LinkedVoice) {
                // Linked voice: set stem down:
                voiceEntry.StemDirection = StemDirectionType.Down;
            } else {
                // if this voiceEntry belongs to the mainVoice:
                // check first that there are also more voices present:
                if (voiceEntry.ParentSourceStaffEntry.VoiceEntries.length > 1) {
                    // as this voiceEntry belongs to the mainVoice: stem Up
                    voiceEntry.StemDirection = StemDirectionType.Up;
                }
            }
        }

        // ToDo: shift code to end of measure to only check once for all beams
        // check for a beam:
        // if this voice entry currently has no desired direction yet:
        if (voiceEntry.StemDirection === StemDirectionType.Undefined &&
            voiceEntry.Notes.length > 0) {
            const beam: Beam = voiceEntry.Notes[0].NoteBeam;
            if (beam !== undefined) {
                // if there is a beam, find any already set stemDirection in the beam:
                for (const note of beam.Notes) {
                    if (note.ParentVoiceEntry === voiceEntry) {
                        continue;
                    } else if (note.ParentVoiceEntry.StemDirection !== StemDirectionType.Undefined) {
                        // set the stem direction
                        voiceEntry.StemDirection = note.ParentVoiceEntry.StemDirection;
                        break;
                    }
                }
            }
        }
    }
}
