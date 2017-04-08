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
import {LyricsEntry} from "../VoiceData/Lyrics/LyricsEntry";
import {VoiceEntry} from "../VoiceData/VoiceEntry";
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
        let tieTimestampList: Fraction[] = [];
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
            let measure: StaffMeasure = measures[idx];
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
        let musicSheet: MusicSheet = this.graphicalMusicSheet.ParentMusicSheet;

        this.staffEntriesWithGraphicalTies = [];
        this.staffEntriesWithOrnaments = [];
        this.staffEntriesWithChordSymbols = [];
        this.staffLinesWithLyricWords = [];
        this.staffLinesWithGraphicalExpressions = [];

        this.graphicalMusicSheet.Initialize();
        let measureList: StaffMeasure[][] = this.graphicalMusicSheet.MeasureList;

        // one AccidentalCalculator for each Staff (regardless of Instrument)
        let accidentalCalculators: AccidentalCalculator[] = this.createAccidentalCalculators();

        // List of Active ClefInstructions
        let activeClefs: ClefInstruction[] = this.graphicalMusicSheet.initializeActiveClefs();

        // LyricWord - GraphicalLyricWord Lists
        let lyricWords: LyricWord[] = [];

        let completeNumberOfStaves: number = musicSheet.getCompleteNumberOfStaves();

        // Octave Shifts List
        let openOctaveShifts: OctaveShiftParams[] = [];

        // TieList - timestampsArray
        let tieTimestampListDictList: Dictionary<Tie, Fraction[]>[] = [];
        for (let i: number = 0; i < completeNumberOfStaves; i++) {
            let tieTimestampListDict: Dictionary<Tie, Fraction[]> = new Dictionary<Tie, Fraction[]>();
            tieTimestampListDictList.push(tieTimestampListDict);
            openOctaveShifts.push(undefined);
        }

        // go through all SourceMeasures (taking into account normal SourceMusicParts and Repetitions)
        for (let idx: number = 0, len: number = musicSheet.SourceMeasures.length; idx < len; ++idx) {
            let sourceMeasure: SourceMeasure = musicSheet.SourceMeasures[idx];
            let graphicalMeasures: StaffMeasure[] = this.createGraphicalMeasuresForSourceMeasure(
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

        // Add some white space at the end of the piece:
        this.graphicalMusicSheet.MusicPages[0].PositionAndShape.BorderMarginBottom += 9;

        // transform Relative to Absolute Positions
        GraphicalMusicSheet.transformRelativeToAbsolutePosition(this.graphicalMusicSheet);
    }

    public calculateXLayout(graphicalMusicSheet: GraphicalMusicSheet, maxInstrNameLabelLength: number): void {
        // for each inner List in big Measure List calculate new Positions for the StaffEntries
        // and adjust Measures sizes
        // calculate max measure length for maximum zoom in.
        let minLength: number = 0;
        let maxInstructionsLength: number = this.rules.MaxInstructionsConstValue;
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

    protected handleVoiceEntryLyrics(lyricsEntries: Dictionary<number, LyricsEntry>, voiceEntry: VoiceEntry, graphicalStaffEntry: GraphicalStaffEntry,
                                     openLyricWords: LyricWord[]): void {
        throw new Error("abstract, not implemented");
    }

    protected handleVoiceEntryOrnaments(ornamentContainer: OrnamentContainer, voiceEntry: VoiceEntry,
                                        graphicalStaffEntry: GraphicalStaffEntry): void {
        throw new Error("abstract, not implemented");
    }

    protected handleVoiceEntryArticulations(articulations: ArticulationEnum[],
                                            voiceEntry: VoiceEntry,
                                            graphicalStaffEntry: GraphicalStaffEntry): void {
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
        throw new Error("abstract, not implemented");
    }

    /**
     * Calculate the shape (Bézier curve) for this tie.
     * @param tie
     * @param tieIsAtSystemBreak
     */
    protected layoutGraphicalTie(tie: GraphicalTie, tieIsAtSystemBreak: boolean): void {
        throw new Error("abstract, not implemented");
    }

    /**
     * Calculate the Lyrics YPositions for a single [[StaffLine]].
     * @param staffLine
     * @param lyricVersesNumber
     */
    protected calculateSingleStaffLineLyricsPosition(staffLine: StaffLine, lyricVersesNumber: number[]): void {
        throw new Error("abstract, not implemented");
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
     * Calculate all the [[RepetitionInstruction]]s for a single [[SourceMeasure]].
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
            let staffEntriesWithGraphicalTie: GraphicalStaffEntry = this.staffEntriesWithGraphicalTies[idx];
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

        let allMeasures: StaffMeasure[][] = this.graphicalMusicSheet.MeasureList;
        if (allMeasures === undefined) {
            return;
        }

        // visible 2D-MeasureList
        let visibleMeasureList: StaffMeasure[][] = [];
        for (let idx: number = 0, len: number = allMeasures.length; idx < len; ++idx) {
            let staffMeasures: StaffMeasure[] = allMeasures[idx];
            let visibleStaffMeasures: StaffMeasure[] = [];
            for (let idx2: number = 0, len2: number = staffMeasures.length; idx2 < len2; ++idx2) {
                let staffMeasure: StaffMeasure = allMeasures[idx][idx2];
                if (staffMeasure.isVisible()) {
                    visibleStaffMeasures.push(staffMeasure);
                }
            }
            visibleMeasureList.push(visibleStaffMeasures);
        }

        // find out how many StaffLine Instances we need
        let numberOfStaffLines: number = 0;

        for (let idx: number = 0, len: number = visibleMeasureList.length; idx < len; ++idx) {
            let gmlist: StaffMeasure[] = visibleMeasureList[idx];
            numberOfStaffLines = Math.max(gmlist.length, numberOfStaffLines);
            break;
        }
        if (numberOfStaffLines === 0) {
            return;
        }

        // build the MusicSystems
        let musicSystemBuilder: MusicSystemBuilder = new MusicSystemBuilder();
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
            let graphicalMusicPage: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (let idx2: number = 0, len2: number = graphicalMusicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                let musicSystem: MusicSystem = graphicalMusicPage.MusicSystems[idx2];
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
        // calculate all LyricWords Positions
        this.calculateLyricsPosition();
        // update all StaffLine's Borders
        // create temporary Object, just to call the methods (in order to avoid declaring them static)
        for (let idx: number = 0, len: number = this.graphicalMusicSheet.MusicPages.length; idx < len; ++idx) {
            let graphicalMusicPage: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (let idx2: number = 0, len2: number = graphicalMusicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                let musicSystem: MusicSystem = graphicalMusicPage.MusicSystems[idx2];
                for (let idx3: number = 0, len3: number = musicSystem.StaffLines.length; idx3 < len3; ++idx3) {
                    let staffLine: StaffLine = musicSystem.StaffLines[idx3];
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
            let graphicalMusicPage: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (let idx2: number = 0, len2: number = graphicalMusicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                let musicSystem: MusicSystem = graphicalMusicPage.MusicSystems[idx2];
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
            let distance: number = graphicalMusicPage.MusicSystems[0].PositionAndShape.BorderTop;
            for (let idx2: number = 0, len2: number = graphicalMusicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                let musicSystem: MusicSystem = graphicalMusicPage.MusicSystems[idx2];
                // let newPosition: PointF2D = new PointF2D(musicSystem.PositionAndShape.RelativePosition.x,
                // musicSystem.PositionAndShape.RelativePosition.y - distance);
                musicSystem.PositionAndShape.RelativePosition =
                    new PointF2D(musicSystem.PositionAndShape.RelativePosition.x, musicSystem.PositionAndShape.RelativePosition.y - distance);
            }
            for (let idx2: number = 0, len2: number = graphicalMusicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                let musicSystem: MusicSystem = graphicalMusicPage.MusicSystems[idx2];
                for (let idx3: number = 0, len3: number = musicSystem.StaffLines.length; idx3 < len3; ++idx3) {
                    let staffLine: StaffLine = musicSystem.StaffLines[idx3];
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
            let graphicalMusicPage: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (let idx2: number = 0, len2: number = graphicalMusicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                let musicSystem: MusicSystem = graphicalMusicPage.MusicSystems[idx2];
                for (let idx3: number = 0, len3: number = musicSystem.StaffLines.length; idx3 < len3; ++idx3) {
                    let staffLine: StaffLine = musicSystem.StaffLines[idx3];
                    for (let idx4: number = 0, len4: number = staffLine.Measures.length; idx4 < len4; ++idx4) {
                        let graphicalMeasure: StaffMeasure = staffLine.Measures[idx4];
                        if (graphicalMeasure.FirstInstructionStaffEntry !== undefined) {
                            let index: number = graphicalMeasure.PositionAndShape.ChildElements.indexOf(
                                graphicalMeasure.FirstInstructionStaffEntry.PositionAndShape
                            );
                            if (index > -1) {
                                graphicalMeasure.PositionAndShape.ChildElements.splice(index, 1);
                            }
                            graphicalMeasure.FirstInstructionStaffEntry = undefined;
                            graphicalMeasure.beginInstructionsWidth = 0.0;
                        }
                        if (graphicalMeasure.LastInstructionStaffEntry !== undefined) {
                            let index: number = graphicalMeasure.PositionAndShape.ChildElements.indexOf(
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
        let graphicalNotes: GraphicalNote[] = graphicalStaffEntry.findOrCreateGraphicalNotesListFromVoiceEntry(voiceEntry);
        for (let idx: number = 0, len: number = voiceEntry.Notes.length; idx < len; ++idx) {
            let note: Note = voiceEntry.Notes[idx];
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
            graphicalStaffEntry.PositionAndShape.ChildElements.push(graphicalNote.PositionAndShape);
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
            this.checkVoiceEntriesForTechnicalInstructions(voiceEntry, graphicalStaffEntry);
        }
        if (voiceEntry.LyricsEntries.size() > 0) {
            this.handleVoiceEntryLyrics(voiceEntry.LyricsEntries, voiceEntry, graphicalStaffEntry, openLyricWords);
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
                let graceVoiceEntry: VoiceEntry = graceEntries[idx];
                let graceStaffEntry: GraphicalStaffEntry = this.symbolFactory.createGraceStaffEntry(
                    graphicalStaffEntry,
                    graphicalStaffEntry.parentMeasure
                );
                graphicalGraceEntries.push(graceStaffEntry);
                graphicalStaffEntry.PositionAndShape.ChildElements.push(graceStaffEntry.PositionAndShape);
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
                            let gse: GraphicalStaffEntry = measure.staffEntries[idx];
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
                        let isLastTieNote: boolean = k === tieTimestamps.length - 1;
                        let tieFraction: Fraction = openTie.Fractions[k];
                        // GraphicalNote points to tieStartNote, but must get the correct Length (eg the correct Fraction of tieStartNote's Length)
                        let tiedGraphicalNote: GraphicalNote = thisPointer.symbolFactory.createNote(openTie.Start, graphicalStaffEntry, activeClef,
                                                                                                    octaveShiftValue, tieFraction);

                        let graphicalNotes: GraphicalNote[] =
                            graphicalStaffEntry.findOrCreateGraphicalNotesListFromGraphicalNote(tiedGraphicalNote);
                        graphicalStaffEntry.addGraphicalNoteToListAtCorrectYPosition(graphicalNotes, tiedGraphicalNote);
                        graphicalStaffEntry.PositionAndShape.ChildElements.push(tiedGraphicalNote.PositionAndShape);

                        thisPointer.handleTiedGraphicalNote(tiedGraphicalNote, beams, activeClef, octaveShiftValue, graphicalStaffEntry, tieFraction,
                                                            openTie, isLastTieNote);

                        let tieStartNote: Note = openTie.Start;
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
        let isGraceStaffEntry: boolean = graphicalStaffEntry.staffEntryParent !== undefined;
        if (!this.leadSheet) {
            let graphicalStaffEntryNotes: GraphicalNote[][] = graphicalStaffEntry.notes;
            for (let idx4: number = 0, len4: number = graphicalStaffEntryNotes.length; idx4 < len4; ++idx4) {
                let graphicalNotes: GraphicalNote[] = graphicalStaffEntryNotes[idx4];
                if (graphicalNotes.length === 0) {
                    continue;
                }
                let voiceEntry: VoiceEntry = graphicalNotes[0].sourceNote.ParentVoiceEntry;
                let hasPitchedNote: boolean = graphicalNotes[0].sourceNote.Pitch !== undefined;
                this.layoutVoiceEntry(voiceEntry, graphicalNotes, graphicalStaffEntry, hasPitchedNote, isGraceStaffEntry);
            }
        }
    }

    protected maxInstrNameLabelLength(): number {
        let maxLabelLength: number = 0.0;
        for (let instrument of this.graphicalMusicSheet.ParentMusicSheet.Instruments) {
            if (instrument.Voices.length > 0 && instrument.Voices[0].Visible) {
                let graphicalLabel: GraphicalLabel = new GraphicalLabel(instrument.NameLabel, this.rules.InstrumentLabelTextHeight, TextAlignment.LeftCenter);
                graphicalLabel.setLabelPositionAndShapeBorders();
                maxLabelLength = Math.max(maxLabelLength, graphicalLabel.PositionAndShape.MarginSize.width);
            }
        }
        return maxLabelLength;
    }

    protected calculateSheetLabelBoundingBoxes(): void {
        let musicSheet: MusicSheet = this.graphicalMusicSheet.ParentMusicSheet;
        if (musicSheet.Title !== undefined) {
            let title: GraphicalLabel = new GraphicalLabel(musicSheet.Title, this.rules.SheetTitleHeight, TextAlignment.CenterBottom);
            this.graphicalMusicSheet.Title = title;
            title.setLabelPositionAndShapeBorders();
        }
        if (musicSheet.Subtitle !== undefined) {
            let subtitle: GraphicalLabel = new GraphicalLabel(musicSheet.Subtitle, this.rules.SheetSubtitleHeight, TextAlignment.CenterCenter);
            this.graphicalMusicSheet.Subtitle = subtitle;
            subtitle.setLabelPositionAndShapeBorders();
        }
        if (musicSheet.Composer !== undefined) {
            let composer: GraphicalLabel = new GraphicalLabel(musicSheet.Composer, this.rules.SheetComposerHeight, TextAlignment.RightCenter);
            this.graphicalMusicSheet.Composer = composer;
            composer.setLabelPositionAndShapeBorders();
        }
        if (musicSheet.Lyricist !== undefined) {
            let lyricist: GraphicalLabel = new GraphicalLabel(musicSheet.Lyricist, this.rules.SheetAuthorHeight, TextAlignment.LeftCenter);
            this.graphicalMusicSheet.Lyricist = lyricist;
            lyricist.setLabelPositionAndShapeBorders();
        }
    }

    protected checkMeasuresForWholeRestNotes(): void {
        for (let idx: number = 0, len: number = this.graphicalMusicSheet.MusicPages.length; idx < len; ++idx) {
            let musicPage: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (let idx2: number = 0, len2: number = musicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                let musicSystem: MusicSystem = musicPage.MusicSystems[idx2];
                for (let idx3: number = 0, len3: number = musicSystem.StaffLines.length; idx3 < len3; ++idx3) {
                    let staffLine: StaffLine = musicSystem.StaffLines[idx3];
                    for (let idx4: number = 0, len4: number = staffLine.Measures.length; idx4 < len4; ++idx4) {
                        let measure: StaffMeasure = staffLine.Measures[idx4];
                        if (measure.staffEntries.length === 1) {
                            let gse: GraphicalStaffEntry = measure.staffEntries[0];
                            if (gse.notes.length > 0 && gse.notes[0].length > 0) {
                                let graphicalNote: GraphicalNote = gse.notes[0][0];
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
        let voice1Notes: GraphicalNote[] = graphicalStaffEntry.notes[0];
        if (voice1Notes.length === 0) {
            return;
        }
        let voice1Note1: GraphicalNote = voice1Notes[0];
        let voice1Note1IsRest: boolean = voice1Note1.sourceNote.Pitch === undefined;
        if (graphicalStaffEntry.notes.length === 2) {
            let voice2Note1IsRest: boolean = false;
            let voice2Notes: GraphicalNote[] = graphicalStaffEntry.notes[1];
            if (voice2Notes.length > 0) {
                let voice2Note1: GraphicalNote = voice2Notes[0];
                voice2Note1IsRest = voice2Note1.sourceNote.Pitch === undefined;
            }
            if (voice1Note1IsRest && voice2Note1IsRest) {
                this.calculateTwoRestNotesPlacementWithCollisionDetection(graphicalStaffEntry);
            } else if (voice1Note1IsRest || voice2Note1IsRest) {
                this.calculateRestNotePlacementWithCollisionDetectionFromGraphicalNote(graphicalStaffEntry);
            }
        } else if (voice1Note1IsRest && graphicalStaffEntry !== measure.staffEntries[0] &&
            graphicalStaffEntry !== measure.staffEntries[measure.staffEntries.length - 1]) {
            let staffEntryIndex: number = measure.staffEntries.indexOf(graphicalStaffEntry);
            let previousStaffEntry: GraphicalStaffEntry = measure.staffEntries[staffEntryIndex - 1];
            let nextStaffEntry: GraphicalStaffEntry = measure.staffEntries[staffEntryIndex + 1];
            if (previousStaffEntry.notes.length === 1) {
                let previousNote: GraphicalNote = previousStaffEntry.notes[0][0];
                if (previousNote.sourceNote.NoteBeam !== undefined && nextStaffEntry.notes.length === 1) {
                    let nextNote: GraphicalNote = nextStaffEntry.notes[0][0];
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
        let numEntries: number = this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers.length;
        let index: number = this.graphicalMusicSheet.GetInterpolatedIndexInVerticalContainers(timestamp);
        let leftIndex: number = <number>Math.min(Math.floor(index), numEntries - 1);
        let rightIndex: number = <number>Math.min(Math.ceil(index), numEntries - 1);
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
                let leftTimestamp: Fraction = leftStaffEntry.getAbsoluteTimestamp();
                let rightTimestamp: Fraction = rightStaffEntry.getAbsoluteTimestamp();
                let leftDifference: Fraction = Fraction.minus(timestamp, leftTimestamp);
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
        let numEntries: number = this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers.length;
        let index: number = this.graphicalMusicSheet.GetInterpolatedIndexInVerticalContainers(timestamp);
        let discreteIndex: number = <number>Math.max(0, Math.min(Math.round(index), numEntries - 1));
        let gse: GraphicalStaffEntry = this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers[discreteIndex].getFirstNonNullStaffEntry();
        let posX: number = gse.PositionAndShape.RelativePosition.x + gse.parentMeasure.PositionAndShape.RelativePosition.x;
        return posX;
    }

    protected calculatePageLabels(page: GraphicalMusicPage): void {

        let firstSystemAbsoluteTopMargin: number = 10;
        if (page.MusicSystems.length > 0) {
            let firstMusicSystem: MusicSystem = page.MusicSystems[0];
            firstSystemAbsoluteTopMargin = firstMusicSystem.PositionAndShape.RelativePosition.y + firstMusicSystem.PositionAndShape.BorderTop;
        }
        if (this.graphicalMusicSheet.Title !== undefined) {
            let title: GraphicalLabel = this.graphicalMusicSheet.Title;
            title.PositionAndShape.Parent = page.PositionAndShape;
            page.PositionAndShape.ChildElements.push(title.PositionAndShape);
            let relative: PointF2D = new PointF2D();
            relative.x = this.graphicalMusicSheet.ParentMusicSheet.pageWidth / 2;
            relative.y = this.rules.TitleTopDistance + this.rules.SheetTitleHeight;
            title.PositionAndShape.RelativePosition = relative;
            page.Labels.push(title);
        }
        if (this.graphicalMusicSheet.Subtitle !== undefined) {
            let subtitle: GraphicalLabel = this.graphicalMusicSheet.Subtitle;
            subtitle.PositionAndShape.Parent = page.PositionAndShape;
            page.PositionAndShape.ChildElements.push(subtitle.PositionAndShape);
            let relative: PointF2D = new PointF2D();
            relative.x = this.graphicalMusicSheet.ParentMusicSheet.pageWidth / 2;
            relative.y = this.rules.TitleTopDistance + this.rules.SheetTitleHeight + this.rules.SheetMinimumDistanceBetweenTitleAndSubtitle;
            subtitle.PositionAndShape.RelativePosition = relative;
            page.Labels.push(subtitle);
        }
        if (this.graphicalMusicSheet.Composer !== undefined) {
            let composer: GraphicalLabel = this.graphicalMusicSheet.Composer;
            composer.PositionAndShape.Parent = page.PositionAndShape;
            page.PositionAndShape.ChildElements.push(composer.PositionAndShape);
            composer.setLabelPositionAndShapeBorders();
            let relative: PointF2D = new PointF2D();
            relative.x = this.graphicalMusicSheet.ParentMusicSheet.pageWidth - this.rules.PageRightMargin;
            relative.y = firstSystemAbsoluteTopMargin - this.rules.SystemComposerDistance;
            composer.PositionAndShape.RelativePosition = relative;
            page.Labels.push(composer);
        }
        if (this.graphicalMusicSheet.Lyricist !== undefined) {
            let lyricist: GraphicalLabel = this.graphicalMusicSheet.Lyricist;
            lyricist.PositionAndShape.Parent = page.PositionAndShape;
            page.PositionAndShape.ChildElements.push(lyricist.PositionAndShape);
            lyricist.setLabelPositionAndShapeBorders();
            let relative: PointF2D = new PointF2D();
            relative.x = this.rules.PageLeftMargin;
            relative.y = firstSystemAbsoluteTopMargin - this.rules.SystemComposerDistance;
            lyricist.PositionAndShape.RelativePosition = relative;
            page.Labels.push(lyricist);
        }
    }

    protected createGraphicalTies(): void {
        for (let measureIndex: number = 0; measureIndex < this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures.length; measureIndex++) {
            let sourceMeasure: SourceMeasure = this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures[measureIndex];
            for (let staffIndex: number = 0; staffIndex < sourceMeasure.CompleteNumberOfStaves; staffIndex++) {
                for (let j: number = 0; j < sourceMeasure.VerticalSourceStaffEntryContainers.length; j++) {
                    let sourceStaffEntry: SourceStaffEntry = sourceMeasure.VerticalSourceStaffEntryContainers[j].StaffEntries[staffIndex];
                    if (sourceStaffEntry !== undefined) {
                        let startStaffEntry: GraphicalStaffEntry = this.graphicalMusicSheet.findGraphicalStaffEntryFromMeasureList(
                            staffIndex, measureIndex, sourceStaffEntry
                        );
                        for (let idx: number = 0, len: number = sourceStaffEntry.VoiceEntries.length; idx < len; ++idx) {
                            let voiceEntry: VoiceEntry = sourceStaffEntry.VoiceEntries[idx];
                            for (let idx2: number = 0, len2: number = voiceEntry.Notes.length; idx2 < len2; ++idx2) {
                                let note: Note = voiceEntry.Notes[idx2];
                                if (note.NoteTie !== undefined) {
                                    let tie: Tie = note.NoteTie;
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
            let startContainerIndex: number = startGraphicalStaffEntry.parentVerticalContainer.Index;
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
                let graphicalTie: GraphicalTie = this.createGraphicalTie(tie, startGse, endGse, startNote, endNote);
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
        let accidentalCalculators: AccidentalCalculator[] = [];
        let firstSourceMeasure: SourceMeasure = this.graphicalMusicSheet.ParentMusicSheet.getFirstSourceMeasure();
        if (firstSourceMeasure !== undefined) {
            for (let i: number = 0; i < firstSourceMeasure.CompleteNumberOfStaves; i++) {
                let accidentalCalculator: AccidentalCalculator = new AccidentalCalculator(this.symbolFactory);
                accidentalCalculators.push(accidentalCalculator);
                if (firstSourceMeasure.FirstInstructionsStaffEntries[i] !== undefined) {
                    for (let idx: number = 0, len: number = firstSourceMeasure.FirstInstructionsStaffEntries[i].Instructions.length; idx < len; ++idx) {
                        let abstractNotationInstruction: AbstractNotationInstruction = firstSourceMeasure.FirstInstructionsStaffEntries[i].Instructions[idx];
                        if (abstractNotationInstruction instanceof KeyInstruction) {
                            let keyInstruction: KeyInstruction = <KeyInstruction>abstractNotationInstruction;
                            accidentalCalculator.ActiveKeyInstruction = keyInstruction;
                        }
                    }
                }
            }
        }
        return accidentalCalculators;
    }

    private calculateVerticalContainersList(): void {
        let numberOfEntries: number = this.graphicalMusicSheet.MeasureList[0].length;
        for (let i: number = 0; i < this.graphicalMusicSheet.MeasureList.length; i++) {
            for (let j: number = 0; j < numberOfEntries; j++) {
                let measure: StaffMeasure = this.graphicalMusicSheet.MeasureList[i][j];
                for (let idx: number = 0, len: number = measure.staffEntries.length; idx < len; ++idx) {
                    let graphicalStaffEntry: GraphicalStaffEntry = measure.staffEntries[idx];
                    let verticalContainer: VerticalGraphicalStaffEntryContainer =
                        this.graphicalMusicSheet.getOrCreateVerticalContainer(graphicalStaffEntry.getAbsoluteTimestamp());
                    if (verticalContainer !== undefined) {
                        verticalContainer.StaffEntries[j] = graphicalStaffEntry;
                        graphicalStaffEntry.parentVerticalContainer = verticalContainer;
                    } else {
                        // TODO ?
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
        let verticalMeasureList: StaffMeasure[] = [];
        let openBeams: Beam[] = [];
        let openTuplets: Tuplet[] = [];
        let staffEntryLinks: StaffEntryLink[] = [];
        for (let staffIndex: number = 0; staffIndex < sourceMeasure.CompleteNumberOfStaves; staffIndex++) {
            let measure: StaffMeasure = this.createGraphicalMeasure(
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
        let staff: Staff = this.graphicalMusicSheet.ParentMusicSheet.getStaffFromIndex(staffIndex);
        let measure: StaffMeasure = this.symbolFactory.createStaffMeasure(sourceMeasure, staff);
        measure.hasError = sourceMeasure.getErrorInMeasure(staffIndex);
        if (sourceMeasure.FirstInstructionsStaffEntries[staffIndex] !== undefined) {
            for (let idx: number = 0, len: number = sourceMeasure.FirstInstructionsStaffEntries[staffIndex].Instructions.length; idx < len; ++idx) {
                let instruction: AbstractNotationInstruction = sourceMeasure.FirstInstructionsStaffEntries[staffIndex].Instructions[idx];
                if (instruction instanceof KeyInstruction) {
                    let key: KeyInstruction = KeyInstruction.copy(instruction);
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
            let multiExpression: MultiExpression = sourceMeasure.StaffLinkedExpressions[staffIndex][idx];
            if (multiExpression.OctaveShiftStart !== undefined) {
                let openOctaveShift: OctaveShift = multiExpression.OctaveShiftStart;
                openOctaveShifts[staffIndex] = new OctaveShiftParams(
                    openOctaveShift, multiExpression.AbsoluteTimestamp,
                    openOctaveShift.ParentEndMultiExpression.AbsoluteTimestamp
                );
            }
        }
        for (let entryIndex: number = 0; entryIndex < sourceMeasure.VerticalSourceStaffEntryContainers.length; entryIndex++) {
            let sourceStaffEntry: SourceStaffEntry = sourceMeasure.VerticalSourceStaffEntryContainers[entryIndex].StaffEntries[staffIndex];
            if (sourceStaffEntry !== undefined) {
                for (let idx: number = 0, len: number = sourceStaffEntry.Instructions.length; idx < len; ++idx) {
                    let abstractNotationInstruction: AbstractNotationInstruction = sourceStaffEntry.Instructions[idx];
                    if (abstractNotationInstruction instanceof ClefInstruction) {
                        activeClefs[staffIndex] = <ClefInstruction>abstractNotationInstruction;
                    }
                }
                let graphicalStaffEntry: GraphicalStaffEntry = this.symbolFactory.createStaffEntry(sourceStaffEntry, measure);
                if (measure.staffEntries.length > entryIndex) {
                    measure.addGraphicalStaffEntryAtTimestamp(graphicalStaffEntry);
                } else {
                    measure.addGraphicalStaffEntry(graphicalStaffEntry);
                }
                let linkedNotes: Note[] = [];
                if (sourceStaffEntry.Link !== undefined) {
                    sourceStaffEntry.findLinkedNotes(linkedNotes);
                    this.handleStaffEntryLink(graphicalStaffEntry, staffEntryLinks);
                }
                let octaveShiftValue: OctaveEnum = OctaveEnum.NONE;
                if (openOctaveShifts[staffIndex] !== undefined) {
                    let octaveShiftParams: OctaveShiftParams = openOctaveShifts[staffIndex];
                    if (octaveShiftParams.getAbsoluteStartTimestamp.lte(sourceStaffEntry.AbsoluteTimestamp)  &&
                        sourceStaffEntry.AbsoluteTimestamp.lte(octaveShiftParams.getAbsoluteEndTimestamp)) {
                        octaveShiftValue = octaveShiftParams.getOpenOctaveShift.Type;
                    }
                }
                for (let idx: number = 0, len: number = sourceStaffEntry.VoiceEntries.length; idx < len; ++idx) {
                    let voiceEntry: VoiceEntry = sourceStaffEntry.VoiceEntries[idx];
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
                    let clefInstruction: ClefInstruction = <ClefInstruction>sourceStaffEntry.Instructions[0];
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
            let lastStaffEntry: SourceStaffEntry = sourceMeasure.LastInstructionsStaffEntries[staffIndex];
            for (let idx: number = 0, len: number = lastStaffEntry.Instructions.length; idx < len; ++idx) {
                let abstractNotationInstruction: AbstractNotationInstruction = lastStaffEntry.Instructions[idx];
                if (abstractNotationInstruction instanceof ClefInstruction) {
                    activeClefs[staffIndex] = <ClefInstruction>abstractNotationInstruction;
                }
            }
        }
        for (let idx: number = 0, len: number = sourceMeasure.StaffLinkedExpressions[staffIndex].length; idx < len; ++idx) {
            let multiExpression: MultiExpression = sourceMeasure.StaffLinkedExpressions[staffIndex][idx];
            if (multiExpression.OctaveShiftEnd !== undefined && openOctaveShifts[staffIndex] !== undefined &&
                multiExpression.OctaveShiftEnd === openOctaveShifts[staffIndex].getOpenOctaveShift) {
                openOctaveShifts[staffIndex] = undefined;
            }
        }
        if (measure.staffEntries.length === 0) {
            let sourceStaffEntry: SourceStaffEntry = new SourceStaffEntry(undefined, staff);
            let note: Note = new Note(undefined, sourceStaffEntry, Fraction.createFromFraction(sourceMeasure.Duration), undefined);
            let graphicalStaffEntry: GraphicalStaffEntry = this.symbolFactory.createStaffEntry(sourceStaffEntry, measure);
            measure.addGraphicalStaffEntry(graphicalStaffEntry);
            graphicalStaffEntry.relInMeasureTimestamp = new Fraction(0, 1);
            let graphicalNotes: GraphicalNote[] = [];
            graphicalStaffEntry.notes.push(graphicalNotes);
            let graphicalNote: GraphicalNote = this.symbolFactory.createNote(   note,
                                                                                graphicalStaffEntry,
                                                                                new ClefInstruction(),
                                                                                OctaveEnum.NONE, undefined);
            graphicalNotes.push(graphicalNote);
            graphicalStaffEntry.PositionAndShape.ChildElements.push(graphicalNote.PositionAndShape);
        }
        return measure;
    }

    private checkVoiceEntriesForTechnicalInstructions(voiceEntry: VoiceEntry, graphicalStaffEntry: GraphicalStaffEntry): void {
        for (let idx: number = 0, len: number = voiceEntry.TechnicalInstructions.length; idx < len; ++idx) {
            let technicalInstruction: TechnicalInstruction = voiceEntry.TechnicalInstructions[idx];
            this.symbolFactory.createGraphicalTechnicalInstruction(technicalInstruction, graphicalStaffEntry);
        }
    }

    private checkNoteForAccidental(graphicalNote: GraphicalNote, accidentalCalculator: AccidentalCalculator, activeClef: ClefInstruction,
                                   octaveEnum: OctaveEnum, grace: boolean = false): void {
        let pitch: Pitch = graphicalNote.sourceNote.Pitch;
        let transpose: number = this.graphicalMusicSheet.ParentMusicSheet.Transpose;
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
            let graphicalMusicPage: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (let idx2: number = 0, len2: number = graphicalMusicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                let musicSystem: MusicSystem = graphicalMusicPage.MusicSystems[idx2];
                for (let idx3: number = 0, len3: number = musicSystem.StaffLines.length; idx3 < len3; ++idx3) {
                    let staffLine: StaffLine = musicSystem.StaffLines[idx3];
                    this.updateSkyBottomLine(staffLine);
                }
            }
        }
    }

    private handleStaffEntries(): void {
        for (let idx: number = 0, len: number = this.graphicalMusicSheet.MeasureList.length; idx < len; ++idx) {
            let measures: StaffMeasure[] = this.graphicalMusicSheet.MeasureList[idx];
            for (let idx2: number = 0, len2: number = measures.length; idx2 < len2; ++idx2) {
                let measure: StaffMeasure = measures[idx2];
                for (let idx3: number = 0, len3: number = measure.staffEntries.length; idx3 < len3; ++idx3) {
                    let graphicalStaffEntry: GraphicalStaffEntry = measure.staffEntries[idx3];
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
            let graphicalMusicPage: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (let idx2: number = 0, len2: number = graphicalMusicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                let musicSystem: MusicSystem = graphicalMusicPage.MusicSystems[idx2];
                for (let idx3: number = 0, len3: number = musicSystem.StaffLines.length; idx3 < len3; ++idx3) {
                    let staffLine: StaffLine = musicSystem.StaffLines[idx3];
                    this.calculateSkyBottomLine(staffLine);
                }
            }
        }
    }

    private calculateBeams(): void {
        for (let idx: number = 0, len: number = this.graphicalMusicSheet.MusicPages.length; idx < len; ++idx) {
            let musicPage: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (let idx2: number = 0, len2: number = musicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                let musicSystem: MusicSystem = musicPage.MusicSystems[idx2];
                for (let idx3: number = 0, len3: number = musicSystem.StaffLines.length; idx3 < len3; ++idx3) {
                    let staffLine: StaffLine = musicSystem.StaffLines[idx3];
                    for (let idx4: number = 0, len4: number = staffLine.Measures.length; idx4 < len4; ++idx4) {
                        let measure: StaffMeasure = staffLine.Measures[idx4];
                        for (let idx5: number = 0, len5: number = measure.staffEntries.length; idx5 < len5; ++idx5) {
                            let staffEntry: GraphicalStaffEntry = measure.staffEntries[idx5];
                            this.layoutBeams(staffEntry);
                        }
                    }
                }
            }
        }
    }

    private calculateStaffEntryArticulationMarks(): void {
        for (let idx: number = 0, len: number = this.graphicalMusicSheet.MusicPages.length; idx < len; ++idx) {
            let page: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (let idx2: number = 0, len2: number = page.MusicSystems.length; idx2 < len2; ++idx2) {
                let system: MusicSystem = page.MusicSystems[idx2];
                for (let idx3: number = 0, len3: number = system.StaffLines.length; idx3 < len3; ++idx3) {
                    let line: StaffLine = system.StaffLines[idx3];
                    for (let idx4: number = 0, len4: number = line.Measures.length; idx4 < len4; ++idx4) {
                        let measure: StaffMeasure = line.Measures[idx4];
                        for (let idx5: number = 0, len5: number = measure.staffEntries.length; idx5 < len5; ++idx5) {
                            let graphicalStaffEntry: GraphicalStaffEntry = measure.staffEntries[idx5];
                            for (let idx6: number = 0, len6: number = graphicalStaffEntry.sourceStaffEntry.VoiceEntries.length; idx6 < len6; ++idx6) {
                                let voiceEntry: VoiceEntry = graphicalStaffEntry.sourceStaffEntry.VoiceEntries[idx6];
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
            let page: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (let idx2: number = 0, len2: number = page.MusicSystems.length; idx2 < len2; ++idx2) {
                let system: MusicSystem = page.MusicSystems[idx2];
                for (let idx3: number = 0, len3: number = system.StaffLines.length; idx3 < len3; ++idx3) {
                    let line: StaffLine = system.StaffLines[idx3];
                    for (let idx4: number = 0, len4: number = line.Measures.length; idx4 < len4; ++idx4) {
                        let measure: StaffMeasure = line.Measures[idx4];
                        for (let idx5: number = 0, len5: number = measure.staffEntries.length; idx5 < len5; ++idx5) {
                            let graphicalStaffEntry: GraphicalStaffEntry = measure.staffEntries[idx5];
                            for (let idx6: number = 0, len6: number = graphicalStaffEntry.sourceStaffEntry.VoiceEntries.length; idx6 < len6; ++idx6) {
                                let voiceEntry: VoiceEntry = graphicalStaffEntry.sourceStaffEntry.VoiceEntries[idx6];
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
            let page: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (let idx2: number = 0, len2: number = page.MusicSystems.length; idx2 < len2; ++idx2) {
                let system: MusicSystem = page.MusicSystems[idx2];
                for (let idx3: number = 0, len3: number = system.StaffLines.length; idx3 < len3; ++idx3) {
                    let line: StaffLine = system.StaffLines[idx3];
                    for (let idx4: number = 0, len4: number = line.Measures.length; idx4 < len4; ++idx4) {
                        let measure: StaffMeasure = line.Measures[idx4];
                        for (let idx5: number = 0, len5: number = measure.staffEntries.length; idx5 < len5; ++idx5) {
                            let graphicalStaffEntry: GraphicalStaffEntry = measure.staffEntries[idx5];
                            this.optimizeRestNotePlacement(graphicalStaffEntry, measure);
                        }
                    }
                }
            }
        }
    }

    private calculateTwoRestNotesPlacementWithCollisionDetection(graphicalStaffEntry: GraphicalStaffEntry): void {
        let firstRestNote: GraphicalNote = graphicalStaffEntry.notes[0][0];
        let secondRestNote: GraphicalNote = graphicalStaffEntry.notes[1][0];
        secondRestNote.PositionAndShape.RelativePosition = new PointF2D(0.0, 2.5);
        graphicalStaffEntry.PositionAndShape.calculateAbsolutePositionsRecursiveWithoutTopelement();
        firstRestNote.PositionAndShape.computeNonOverlappingPositionWithMargin(
            graphicalStaffEntry.PositionAndShape, ColDirEnum.Up,
            new PointF2D(0.0, secondRestNote.PositionAndShape.RelativePosition.y)
        );
        let relative: PointF2D = firstRestNote.PositionAndShape.RelativePosition;
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
            let graphicalNote: GraphicalNote = graphicalNotes[idx];
            if (restNote.PositionAndShape.marginCollisionDetection(graphicalNote.PositionAndShape)) {
                collision = true;
                break;
            }
        }
        if (collision) {
            if (restNote.sourceNote.ParentVoiceEntry.ParentVoice instanceof LinkedVoice) {
                let bottomBorder: number = graphicalNotes[0].PositionAndShape.BorderMarginBottom + graphicalNotes[0].PositionAndShape.RelativePosition.y;
                restNote.PositionAndShape.RelativePosition = new PointF2D(0.0, bottomBorder - restNote.PositionAndShape.BorderMarginTop + 0.5);
            } else {
                let last: GraphicalNote = graphicalNotes[graphicalNotes.length - 1];
                let topBorder: number = last.PositionAndShape.BorderMarginTop + last.PositionAndShape.RelativePosition.y;
                if (graphicalNotes[0].sourceNote.ParentVoiceEntry.ParentVoice instanceof LinkedVoice) {
                    restNote.PositionAndShape.RelativePosition = new PointF2D(0.0, topBorder - restNote.PositionAndShape.BorderMarginBottom - 0.5);
                } else {
                    let bottomBorder: number = graphicalNotes[0].PositionAndShape.BorderMarginBottom + graphicalNotes[0].PositionAndShape.RelativePosition.y;
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
            let graphicalMusicPage: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (let idx2: number = 0, len2: number = graphicalMusicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                let musicSystem: MusicSystem = graphicalMusicPage.MusicSystems[idx2];
                for (let idx3: number = 0, len3: number = musicSystem.StaffLines.length; idx3 < len3; ++idx3) {
                    let staffLine: StaffLine = musicSystem.StaffLines[idx3];
                    for (let idx4: number = 0, len5: number = staffLine.Measures.length; idx4 < len5; ++idx4) {
                        let measure: StaffMeasure = staffLine.Measures[idx4];
                        for (let idx6: number = 0, len6: number = measure.staffEntries.length; idx6 < len6; ++idx6) {
                            let staffEntry: GraphicalStaffEntry = measure.staffEntries[idx6];
                            let graphicalTies: GraphicalTie[] = staffEntry.GraphicalTies;
                            for (let idx7: number = 0, len7: number = graphicalTies.length; idx7 < len7; ++idx7) {
                                let graphicalTie: GraphicalTie = graphicalTies[idx7];
                                if (graphicalTie.StartNote !== undefined && graphicalTie.StartNote.parentStaffEntry === staffEntry) {
                                    let tieIsAtSystemBreak: boolean = (
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

    // Commented because unused:
    //private calculateFingering(): void {
    //    for (let idx: number = 0, len: number = this.graphicalMusicSheet.MusicPages.length; idx < len; ++idx) {
    //        let graphicalMusicPage: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
    //        for (let idx2: number = 0, len2: number = graphicalMusicPage.MusicSystems.length; idx2 < len2; ++idx2) {
    //            let musicSystem: MusicSystem = graphicalMusicPage.MusicSystems[idx2];
    //            for (let idx3: number = 0, len3: number = musicSystem.StaffLines.length; idx3 < len3; ++idx3) {
    //                let staffLine: StaffLine = musicSystem.StaffLines[idx3];
    //                let skyBottomLineCalculator: SkyBottomLineCalculator = new SkyBottomLineCalculator(this.rules);
    //                for (let idx4: number = 0, len4: number = staffLine.Measures.length; idx4 < len4; ++idx4) {
    //                    let measure: StaffMeasure = staffLine.Measures[idx4];
    //                    let measureRelativePosition: PointF2D = measure.PositionAndShape.RelativePosition;
    //                    for (let idx5: number = 0, len5: number = measure.staffEntries.length; idx5 < len5; ++idx5) {
    //                        let staffEntry: GraphicalStaffEntry = measure.staffEntries[idx5];
    //                        let hasTechnicalInstruction: boolean = false;
    //                        for (let idx6: number = 0, len6: number = staffEntry.sourceStaffEntry.VoiceEntries.length; idx6 < len6; ++idx6) {
    //                            let ve: VoiceEntry = staffEntry.sourceStaffEntry.VoiceEntries[idx6];
    //                            if (ve.TechnicalInstructions.length > 0) {
    //                                hasTechnicalInstruction = true;
    //                                break;
    //                            }
    //                        }
    //                        if (hasTechnicalInstruction) {
    //                            this.layoutFingering(staffLine, skyBottomLineCalculator, staffEntry, measureRelativePosition);
    //                        }
    //                    }
    //                }
    //            }
    //        }
    //    }
    //}

    private calculateLyricsPosition(): void {
        for (let idx: number = 0, len: number = this.graphicalMusicSheet.ParentMusicSheet.Instruments.length; idx < len; ++idx) {
            let instrument: Instrument = this.graphicalMusicSheet.ParentMusicSheet.Instruments[idx];
            if (instrument.HasLyrics && instrument.LyricVersesNumbers.length > 0) {
                instrument.LyricVersesNumbers.sort();
            }
        }
        for (let idx: number = 0, len: number = this.graphicalMusicSheet.MusicPages.length; idx < len; ++idx) {
            let graphicalMusicPage: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (let idx2: number = 0, len2: number = graphicalMusicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                let musicSystem: MusicSystem = graphicalMusicPage.MusicSystems[idx2];
                for (let idx3: number = 0, len3: number = musicSystem.StaffLines.length; idx3 < len3; ++idx3) {
                    let staffLine: StaffLine = musicSystem.StaffLines[idx3];
                    this.calculateSingleStaffLineLyricsPosition(staffLine, staffLine.ParentStaff.ParentInstrument.LyricVersesNumbers);
                }
            }
        }
    }

    private calculateDynamicExpressions(): void {
        for (let i: number = 0; i < this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures.length; i++) {
            let sourceMeasure: SourceMeasure = this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures[i];
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
            let sourceMeasure: SourceMeasure = this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures[i];
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
            let sourceMeasure: SourceMeasure = this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures[i];
            for (let idx: number = 0, len: number = sourceMeasure.FirstRepetitionInstructions.length; idx < len; ++idx) {
                let instruction: RepetitionInstruction = sourceMeasure.FirstRepetitionInstructions[idx];
                this.calculateWordRepetitionInstruction(instruction, i);
            }
            for (let idx: number = 0, len: number = sourceMeasure.LastRepetitionInstructions.length; idx < len; ++idx) {
                let instruction: RepetitionInstruction = sourceMeasure.LastRepetitionInstructions[idx];
                this.calculateWordRepetitionInstruction(instruction, i);
            }
        }
    }

    private calculateRepetitionEndings(): void {
        let musicsheet: MusicSheet = this.graphicalMusicSheet.ParentMusicSheet;
        for (let idx: number = 0, len: number = musicsheet.Repetitions.length; idx < len; ++idx) {
            let partListEntry: Repetition = musicsheet.Repetitions[idx];
            this.calcGraphicalRepetitionEndingsRecursively(partListEntry);
        }
    }

    private calculateTempoExpressions(): void {
        for (let i: number = 0; i < this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures.length; i++) {
            let sourceMeasure: SourceMeasure = this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures[i];
            for (let j: number = 0; j < sourceMeasure.TempoExpressions.length; j++) {
                this.calculateTempoExpressionsForSingleMultiTempoExpression(sourceMeasure, sourceMeasure.TempoExpressions[j], i);
            }
        }
    }

    private calculateMoodAndUnknownExpressions(): void {
        for (let i: number = 0; i < this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures.length; i++) {
            let sourceMeasure: SourceMeasure = this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures[i];
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
}
