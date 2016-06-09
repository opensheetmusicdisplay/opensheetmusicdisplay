import {GraphicalStaffEntry} from "./GraphicalStaffEntry";
import {StaffLine} from "./StaffLine";
import {GraphicalMusicSheet} from "./GraphicalMusicSheet";
import {EngravingRules} from "./EngravingRules";
import {Tie} from "../VoiceData/Tie";
import {Fraction} from "../../Common/DataObjects/fraction";
import {Note} from "../VoiceData/Note";
import {MusicSheet} from "../MusicSheet";
import {StaffMeasure} from "./StaffMeasure";
import {ClefInstruction} from "../VoiceData/Instructions/ClefInstruction";
import {LyricWord} from "../VoiceData/Lyrics/LyricsWord";
import {SourceMeasure} from "../VoiceData/SourceMeasure";
import {GraphicalMusicPage} from "./GraphicalMusicPage";
import {GraphicalNote} from "./GraphicalNote";
import {Beam} from "../VoiceData/Beam";
import {OctaveEnum} from "../VoiceData/Expressions/ContinuousExpressions/octaveShift";
import {LyricsEntry} from "../VoiceData/Lyrics/LyricsEntry";
import {VoiceEntry} from "../VoiceData/VoiceEntry";
import {OrnamentContainer} from "../VoiceData/OrnamentContainer";
import {ArticulationEnum} from "../VoiceData/VoiceEntry";
import {Tuplet} from "../VoiceData/Tuplet";
import {MusicSystem} from "./MusicSystem";
import {GraphicalTie} from "./GraphicalTie";
import {RepetitionInstruction} from "../VoiceData/Instructions/RepetitionInstruction";
import {MultiExpression} from "../VoiceData/Expressions/multiExpression";
import {StaffEntryLink} from "../VoiceData/StaffEntryLink";
import {MusicSystemBuilder} from "./MusicSystemBuilder";
import {MultiTempoExpression} from "../VoiceData/Expressions/multiTempoExpression";
import {Repetition} from "../MusicSource/Repetition";
import {PointF_2D} from "../../Common/DataObjects/PointF_2D";
import {SourceStaffEntry} from "../VoiceData/SourceStaffEntry";
import {BoundingBox} from "./BoundingBox";
import {Instrument} from "../Instrument";
import {GraphicalLabel} from "./GraphicalLabel";
import {TextAlignment} from "../../Common/Enums/TextAlignment";
import {VerticalGraphicalStaffEntryContainer} from "./VerticalGraphicalStaffEntryContainer";
import {KeyInstruction} from "../VoiceData/Instructions/KeyInstruction";
import {AbstractNotationInstruction} from "../VoiceData/Instructions/AbstractNotationInstruction";
import {ClefEnum} from "../VoiceData/Instructions/ClefInstruction";
import {TechnicalInstruction} from "../VoiceData/Instructions/TechnicalInstruction";
import {Pitch} from "../../Common/DataObjects/pitch";
import {LinkedVoice} from "../VoiceData/LinkedVoice";
import {ColDirEnum} from "./BoundingBox";
export class MusicSheetCalculator {
    public static TransposeCalculator: ITransposeCalculator;
    protected static textMeasurer: ITextMeasurer;
    protected staffEntriesWithGraphicalTies: List<GraphicalStaffEntry> = new List<GraphicalStaffEntry>();
    protected staffEntriesWithOrnaments: List<GraphicalStaffEntry> = new List<GraphicalStaffEntry>();
    protected staffEntriesWithChordSymbols: List<GraphicalStaffEntry> = new List<GraphicalStaffEntry>();
    protected staffLinesWithLyricWords: List<StaffLine> = new List<StaffLine>();
    protected staffLinesWithGraphicalExpressions: List<StaffLine> = new List<StaffLine>();
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
    private static addTieToTieTimestampsDict(tieTimestampListDict: Dictionary<Tie, List<Fraction>>, note: Note): void {
        note.NoteTie.initializeBoolList();
        var tieTimestampList: List<Fraction> = new List<Fraction>();
        for (var m: number = 0; m < note.NoteTie.Fractions.Count; m++) {
            var musicTimestamp: Fraction;
            if (m == 0)
                musicTimestamp = new Fraction(note.calculateNoteLengthWithoutTie() + note.getAbsoluteTimestamp());
            else musicTimestamp = new Fraction(tieTimestampList[m - 1] + note.NoteTie.Fractions[m - 1]);
            tieTimestampList.Add(musicTimestamp);
        }
        tieTimestampListDict.Add(note.NoteTie, tieTimestampList);
    }
    public initialize(graphicalMusicSheet: GraphicalMusicSheet): void {
        this.graphicalMusicSheet = graphicalMusicSheet;
        this.rules = graphicalMusicSheet.ParentMusicSheet.Rules;
        this.prepareGraphicalMusicSheet();
        this.calculate();
    }
    public prepareGraphicalMusicSheet(): void {
        this.graphicalMusicSheet.SystemImages.Clear();
        var musicSheet: MusicSheet = this.graphicalMusicSheet.ParentMusicSheet;
        this.staffEntriesWithGraphicalTies.Clear();
        this.staffEntriesWithOrnaments.Clear();
        this.staffEntriesWithChordSymbols.Clear();
        this.staffLinesWithLyricWords.Clear();
        this.staffLinesWithGraphicalExpressions.Clear();
        this.graphicalMusicSheet.Initialize();
        var measureList: List<List<StaffMeasure>> = this.graphicalMusicSheet.MeasureList;
        var accidentalCalculators: List<AccidentalCalculator> = this.createAccidentalCalculators();
        var activeClefs: List<ClefInstruction> = this.graphicalMusicSheet.initializeActiveClefs();
        var lyricWords: List<LyricWord> = new List<LyricWord>();
        var completeNumberOfStaves: number = musicSheet.getCompleteNumberOfStaves();
        var openOctaveShifts: List<OctaveShiftParams> = new List<OctaveShiftParams>();
        var tieTimestampListDictList: List<Dictionary<Tie, List<Fraction>>> = new List<Dictionary<Tie, List<Fraction>>>();
        for (var i: number = 0; i < completeNumberOfStaves; i++) {
            var tieTimestampListDict: Dictionary<Tie, List<Fraction>> = new Dictionary<Tie, List<Fraction>>();
            tieTimestampListDictList.Add(tieTimestampListDict);
            openOctaveShifts.Add(null);
        }
        for (var idx: number = 0, len = musicSheet.SourceMeasures.Count; idx < len; ++idx) {
            var sourceMeasure: SourceMeasure = musicSheet.SourceMeasures[idx];
            var graphicalMeasures: List<StaffMeasure> = this.createGraphicalMeasuresForSourceMeasure(sourceMeasure,
                accidentalCalculators,
                lyricWords,
                tieTimestampListDictList,
                openOctaveShifts,
                activeClefs);
            measureList.Add(graphicalMeasures);
        }
        this.handleStaffEntries();
        this.calculateVerticalContainersList();
        this.setIndecesToVerticalGraphicalContainers();
    }
    public calculate(): void {
        this.clearSystemsAndMeasures();
        this.clearRecreatedObjects();
        this.createGraphicalTies();
        this.calculateSheetLabelBoundingBoxes();
        this.calculateXLayout(this.graphicalMusicSheet, this.maxInstrNameLabelLength());
        this.graphicalMusicSheet.MusicPages = new List<GraphicalMusicPage>();
        this.calculateMusicSystems();
        this.graphicalMusicSheet.MusicPages[0].PositionAndShape.BorderMarginBottom += 9;
        GraphicalMusicSheet.transformRelativeToAbsolutePosition(this.graphicalMusicSheet);
    }
    public calculateXLayout(graphicalMusicSheet: GraphicalMusicSheet, maxInstrNameLabelLength: number): void {
        var maxLength: number = 0;
        var maxInstructionsLength: number = this.rules.MaxInstructionsConstValue;
        if (this.graphicalMusicSheet.MeasureList.Count > 0) {
            maxLength = calculateMeasureXLayout(this.graphicalMusicSheet.MeasureList[0]) * 1.2f + maxInstrNameLabelLength + maxInstructionsLength;
            for (var i: number = 1; i < this.graphicalMusicSheet.MeasureList.Count; i++) {
                var measures: List<StaffMeasure> = this.graphicalMusicSheet.MeasureList[i];
                maxLength = Math.Max(maxLength, this.calculateMeasureXLayout(measures) * 1.2f + maxInstructionsLength);
            }
        }
        this.graphicalMusicSheet.MaxAllowedSystemWidth = maxLength;
    }
    protected calculateMeasureXLayout(measures: List<StaffMeasure>): number { throw new Error('not implemented'); }
    protected calculateSystemYLayout(): void { throw new Error('not implemented'); }
    protected initStaffMeasuresCreation(): void { throw new Error('not implemented'); }
    protected handleBeam(graphicalNote: GraphicalNote, beam: Beam, openBeams: List<Beam>): void { throw new Error('not implemented'); }
    protected createGraphicalTieNote(beams: List<Beam>, activeClef: ClefInstruction,
        octaveShiftValue: OctaveEnum,
        graphicalStaffEntry: GraphicalStaffEntry, duration: Fraction, numberOfDots: number,
        openTie: Tie, isLastTieNote: boolean): void { throw new Error('not implemented'); }
    protected handleVoiceEntryLyrics(lyricsEntries: Dictionary<number, LyricsEntry>, voiceEntry: VoiceEntry, graphicalStaffEntry: GraphicalStaffEntry,
        openLyricWords: List<LyricWord>): void { throw new Error('not implemented'); }
    protected handleVoiceEntryOrnaments(ornamentContainer: OrnamentContainer, voiceEntry: VoiceEntry,
        graphicalStaffEntry: GraphicalStaffEntry): void { throw new Error('not implemented'); }
    protected handleVoiceEntryArticulations(articulations: List<ArticulationEnum>,
        voiceEntry: VoiceEntry,
        graphicalStaffEntry: GraphicalStaffEntry): void { throw new Error('not implemented'); }
    protected handleTuplet(graphicalNote: GraphicalNote, tuplet: Tuplet, openTuplets: List<Tuplet>): void { throw new Error('not implemented'); }
    protected layoutVoiceEntry(voiceEntry: VoiceEntry, graphicalNotes: List<GraphicalNote>, graphicalStaffEntry: GraphicalStaffEntry, hasPitchedNote: boolean, isGraceStaffEntry: boolean): void { throw new Error('not implemented'); }
    protected layoutStaffEntry(graphicalStaffEntry: GraphicalStaffEntry): void { throw new Error('not implemented'); }
    protected handleTie(tie: Tie, startGraphicalStaffEntry: GraphicalStaffEntry, staffIndex: number,
        measureIndex: number): void { throw new Error('not implemented'); }
    protected updateStaffLineBorders(staffLine: StaffLine): void { throw new Error('not implemented'); }
    protected calculateMeasureNumberPlacement(musicSystem: MusicSystem): void { throw new Error('not implemented'); }
    protected layoutGraphicalTie(tie: GraphicalTie, tieIsAtSystemBreak: boolean): void { throw new Error('not implemented'); }
    protected calculateSingleStaffLineLyricsPosition(staffLine: StaffLine, lyricVersesNumber: List<number>): void { throw new Error('not implemented'); }
    protected calculateSingleOctaveShift(sourceMeasure: SourceMeasure, multiExpression: MultiExpression,
        measureIndex: number, staffIndex: number): void { throw new Error('not implemented'); }
    protected calculateWordRepetitionInstruction(repetitionInstruction: RepetitionInstruction,
        measureIndex: number): void { throw new Error('not implemented'); }
    protected calculateMoodAndUnknownExpression(multiExpression: MultiExpression, measureIndex: number, staffIndex: number): void { throw new Error('not implemented'); }
    protected clearRecreatedObjects(): void {

    }
    protected handleStaffEntryLink(graphicalStaffEntry: GraphicalStaffEntry,
        staffEntryLinks: List<StaffEntryLink>): void {

    }
    protected calculateMusicSystems(): void {
        if (this.graphicalMusicSheet.MeasureList != null) {
            var measureList: List<List<StaffMeasure>> = this.graphicalMusicSheet.MeasureList.Select(ml => ml.Where(m => m.isVisible()).ToList()).ToList();
            var numberOfStaffLines: number = 0;
            for (var idx: number = 0, len = measureList.Count; idx < len; ++idx) {
                var gmlist: List<StaffMeasure> = measureList[idx];
                numberOfStaffLines = Math.Max(gmlist.Count, numberOfStaffLines);
                break;
            }
            if (numberOfStaffLines == 0)
                return
            var musicSystemBuilder: MusicSystemBuilder = new MusicSystemBuilder();
            musicSystemBuilder.initialize(this.graphicalMusicSheet, measureList, numberOfStaffLines, this.symbolFactory);
            musicSystemBuilder.buildMusicSystems();
            this.checkMeasuresForWholeRestNotes();
            if (!this.leadSheet) {
                this.calculateBeams();
                this.optimizeRestPlacement();
                this.calculateStaffEntryArticulationMarks();
                this.calculateTieCurves();
            }
            this.calculateSkyBottomLines();
            this.calculateTupletNumbers();
            for (var idx: number = 0, len = this.graphicalMusicSheet.MusicPages.Count; idx < len; ++idx) {
                var graphicalMusicPage: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
                for (var idx2: number = 0, len2 = graphicalMusicPage.MusicSystems.Count; idx2 < len2; ++idx2) {
                    var musicSystem: MusicSystem = graphicalMusicPage.MusicSystems[idx2];
                    this.calculateMeasureNumberPlacement(musicSystem);
                }
            }
            if (!this.leadSheet)
                this.calculateSlurs();
            if (!this.leadSheet)
                this.calculateOrnaments();
            this.updateSkyBottomLines();
            this.calculateChordSymbols();
            if (!this.leadSheet) {
                this.calculateDynamicExpressions();
                this.optimizeStaffLineDynamicExpressionsPositions();
                this.calculateMoodAndUnknownExpressions();
                this.calculateOctaveShifts();
                this.calculateWordRepetitionInstructions();
            }
            this.calculateRepetitionEndings();
            if (!this.leadSheet)
                this.calculateTempoExpressions();
            this.calculateLyricsPosition();
            for (var idx: number = 0, len = this.graphicalMusicSheet.MusicPages.Count; idx < len; ++idx) {
                var graphicalMusicPage: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
                for (var idx2: number = 0, len2 = graphicalMusicPage.MusicSystems.Count; idx2 < len2; ++idx2) {
                    var musicSystem: MusicSystem = graphicalMusicPage.MusicSystems[idx2];
                    for (var idx3: number = 0, len3 = musicSystem.StaffLines.Count; idx3 < len3; ++idx3) {
                        var staffLine: StaffLine = musicSystem.StaffLines[idx3];
                        this.updateStaffLineBorders(staffLine);
                    }
                }
            }
            this.calculateComments();
            this.calculateSystemYLayout();
            this.calculateMarkedAreas();
            for (var idx: number = 0, len = this.graphicalMusicSheet.MusicPages.Count; idx < len; ++idx) {
                var graphicalMusicPage: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
                for (var idx2: number = 0, len2 = graphicalMusicPage.MusicSystems.Count; idx2 < len2; ++idx2) {
                    var musicSystem: MusicSystem = graphicalMusicPage.MusicSystems[idx2];
                    musicSystem.setMusicSystemLabelsYPosition();
                    if (!this.leadSheet) {
                        musicSystem.setYPositionsToVerticalLineObjectsAndCreateLines(this.rules);
                        musicSystem.createSystemLeftVerticalLineObject(this.rules.SystemThinLineWidth, this.rules.SystemLabelsRightMargin);
                        musicSystem.createInstrumentBrackets(this.graphicalMusicSheet.ParentMusicSheet.Instruments, this.rules.StaffHeight);
                        musicSystem.createGroupBrackets(this.graphicalMusicSheet.ParentMusicSheet.InstrumentalGroups, this.rules.StaffHeight, 0);
                        musicSystem.alignBeginInstructions();
                    }
                    else if (musicSystem == musicSystem.Parent.MusicSystems[0]) {
                        musicSystem.createSystemLeftVerticalLineObject(this.rules.SystemThinLineWidth, this.rules.SystemLabelsRightMargin);
                    }
                    musicSystem.calculateBorders(this.rules);
                }
                var distance: number = graphicalMusicPage.MusicSystems[0].PositionAndShape.BorderTop;
                for (var idx2: number = 0, len2 = graphicalMusicPage.MusicSystems.Count; idx2 < len2; ++idx2) {
                    var musicSystem: MusicSystem = graphicalMusicPage.MusicSystems[idx2];
                    var newPosition: PointF_2D = new PointF_2D(musicSystem.PositionAndShape.RelativePosition.X, musicSystem.PositionAndShape.RelativePosition.Y - distance);
                    musicSystem.PositionAndShape.RelativePosition = newPosition;
                }
                if (graphicalMusicPage == this.graphicalMusicSheet.MusicPages[0])
                    this.calculatePageLabels(graphicalMusicPage);
                graphicalMusicPage.PositionAndShape.calculateTopBottomBorders();
            }
        }
    }
    protected updateSkyBottomLine(staffLine: StaffLine): void {

    }
    protected calculateSkyBottomLine(staffLine: StaffLine): void {

    }
    protected calculateMarkedAreas(): void {

    }
    protected calculateComments(): void {

    }
    protected optimizeStaffLineDynamicExpressionsPositions(): void {

    }
    protected calculateChordSymbols(): void {

    }
    protected layoutMeasureWithWholeRest(rest: GraphicalNote, gse: GraphicalStaffEntry,
        measure: StaffMeasure): void {

    }
    protected layoutBeams(staffEntry: GraphicalStaffEntry): void {

    }
    protected layoutArticulationMarks(articulations: List<ArticulationEnum>, voiceEntry: VoiceEntry, graphicalStaffEntry: GraphicalStaffEntry): void {

    }
    protected layoutOrnament(ornaments: OrnamentContainer, voiceEntry: VoiceEntry,
        graphicalStaffEntry: GraphicalStaffEntry): void {

    }
    protected calculateRestNotePlacementWithinGraphicalBeam(graphicalStaffEntry: GraphicalStaffEntry,
        restNote: GraphicalNote,
        previousNote: GraphicalNote,
        nextStaffEntry: GraphicalStaffEntry,
        nextNote: GraphicalNote): void {

    }
    protected calculateTupletNumbers(): void {

    }
    protected calculateSlurs(): void {

    }
    protected layoutFingering(staffLine: StaffLine, skyBottomLineCalculator: SkyBottomLineCalculator,
        staffEntry: GraphicalStaffEntry, measureRelativePosition: PointF_2D): void {

    }
    protected calculateDynamicExpressionsForSingleMultiExpression(multiExpression: MultiExpression, measureIndex: number, staffIndex: number): void {

    }
    protected calcGraphicalRepetitionEndingsRecursively(repetition: Repetition): void {

    }
    protected layoutSingleRepetitionEnding(start: StaffMeasure, end: StaffMeasure, numberText: string, offset: number, leftOpen: boolean, rightOpen: boolean): void {

    }
    protected calculateTempoExpressionsForSingleMultiTempoExpression(sourceMeasure: SourceMeasure, multiTempoExpression: MultiTempoExpression, measureIndex: number): void {

    }
    protected clearSystemsAndMeasures(): void {
        for (var idx: number = 0, len = this.graphicalMusicSheet.MusicPages.Count; idx < len; ++idx) {
            var graphicalMusicPage: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (var idx2: number = 0, len2 = graphicalMusicPage.MusicSystems.Count; idx2 < len2; ++idx2) {
                var musicSystem: MusicSystem = graphicalMusicPage.MusicSystems[idx2];
                for (var idx3: number = 0, len3 = musicSystem.StaffLines.Count; idx3 < len3; ++idx3) {
                    var staffLine: StaffLine = musicSystem.StaffLines[idx3];
                    for (var idx4: number = 0, len4 = staffLine.Measures.Count; idx4 < len4; ++idx4) {
                        var graphicalMeasure: StaffMeasure = staffLine.Measures[idx4];
                        if (graphicalMeasure.FirstInstructionStaffEntry != null) {
                            graphicalMeasure.PositionAndShape.ChildElements.Remove(graphicalMeasure.FirstInstructionStaffEntry.PositionAndShape);
                            graphicalMeasure.FirstInstructionStaffEntry = null;
                            graphicalMeasure.BeginInstructionsWidth = 0.0f;
                        }
                        if (graphicalMeasure.LastInstructionStaffEntry != null) {
                            graphicalMeasure.PositionAndShape.ChildElements.Remove(graphicalMeasure.LastInstructionStaffEntry.PositionAndShape);
                            graphicalMeasure.LastInstructionStaffEntry = null;
                            graphicalMeasure.EndInstructionsWidth = 0.0f;
                        }
                    }
                    staffLine.Measures.Clear();
                    staffLine.PositionAndShape.ChildElements.Clear();
                }
                musicSystem.StaffLines.Clear();
                musicSystem.PositionAndShape.ChildElements.Clear();
            }
            graphicalMusicPage.MusicSystems.Clear();
            graphicalMusicPage.PositionAndShape.ChildElements.Clear();
        }
        this.graphicalMusicSheet.MusicPages.Clear();
    }
    protected handleVoiceEntry(voiceEntry: VoiceEntry, graphicalStaffEntry: GraphicalStaffEntry,
        accidentalCalculator: AccidentalCalculator, openLyricWords: List<LyricWord>,
        tieTimestampListDict: Dictionary<Tie, List<Fraction>>, activeClef: ClefInstruction,
        openTuplets: List<Tuplet>, openBeams: List<Beam>,
        octaveShiftValue: OctaveEnum, grace: boolean = false, linkedNotes: List<Note> = null, sourceStaffEntry: SourceStaffEntry = null): OctaveEnum {
        var graphicalNotes: List<GraphicalNote> = graphicalStaffEntry.findOrCreateGraphicalNotesListFromVoiceEntry(voiceEntry);
        for (var idx: number = 0, len = voiceEntry.Notes.Count; idx < len; ++idx) {
            var note: Note = voiceEntry.Notes[idx];
            if (sourceStaffEntry != null && sourceStaffEntry.Link != null && linkedNotes != null && !linkedNotes.Contains(note))
                continue;
            var graphicalNote: GraphicalNote;
            var numberOfDots: number = note.calculateNumberOfNeededDots();
            if (grace)
                graphicalNote = this.symbolFactory.createGraceNote(note, numberOfDots, graphicalStaffEntry, activeClef, octaveShiftValue);
            else {
                graphicalNote = this.symbolFactory.createNote(note, numberOfDots, graphicalStaffEntry, activeClef, octaveShiftValue);
            }
            if (note.NoteTie != null) {
                MusicSheetCalculator.addTieToTieTimestampsDict(tieTimestampListDict, note);
            }
            if (note.Pitch != null) {
                this.checkNoteForAccidental(graphicalNote, accidentalCalculator, activeClef, octaveShiftValue, grace);
            }
            this.resetYPositionForLeadSheet(graphicalNote.PositionAndShape);
            graphicalStaffEntry.addGraphicalNoteToListAtCorrectYPosition(graphicalNotes, graphicalNote);
            graphicalStaffEntry.PositionAndShape.ChildElements.Add(graphicalNote.PositionAndShape);
            graphicalNote.PositionAndShape.calculateBoundingBox();
            if (!this.leadSheet) {
                if (note.NoteBeam != null)
                    handleBeam(graphicalNote, note.NoteBeam, openBeams);
                if (note.NoteTuplet != null)
                    handleTuplet(graphicalNote, note.NoteTuplet, openTuplets);
            }
        }
        if (voiceEntry.Articulations.Count > 0)
            this.handleVoiceEntryArticulations(voiceEntry.Articulations, voiceEntry, graphicalStaffEntry);
        if (voiceEntry.TechnicalInstructions.Count > 0)
            this.checkVoiceEntriesForTechnicalInstructions(voiceEntry, graphicalStaffEntry);
        if (voiceEntry.LyricsEntries.Count > 0)
            this.handleVoiceEntryLyrics(voiceEntry.LyricsEntries, voiceEntry, graphicalStaffEntry, openLyricWords);
        if (voiceEntry.OrnamentContainer != null)
            this.handleVoiceEntryOrnaments(voiceEntry.OrnamentContainer, voiceEntry, graphicalStaffEntry);
        return octaveShiftValue;
    }
    protected handleVoiceEntryGraceNotes(graceEntries: List<VoiceEntry>, graphicalGraceEntries: List<GraphicalStaffEntry>, graphicalStaffEntry: GraphicalStaffEntry,
        accidentalCalculator: AccidentalCalculator, activeClef: ClefInstruction,
        octaveShiftValue: OctaveEnum, lyricWords: List<LyricWord>,
        tieTimestampListDict: Dictionary<Tie, List<Fraction>>,
        tuplets: List<Tuplet>, beams: List<Beam>): void {
        if (graceEntries != null) {
            for (var idx: number = 0, len = graceEntries.Count; idx < len; ++idx) {
                var graceVoiceEntry: VoiceEntry = graceEntries[idx];
                var graceStaffEntry: GraphicalStaffEntry = this.symbolFactory.createGraceStaffEntry(graphicalStaffEntry,
                    graphicalStaffEntry.ParentMeasure);
                graphicalGraceEntries.Add(graceStaffEntry);
                graphicalStaffEntry.PositionAndShape.ChildElements.Add(graceStaffEntry.PositionAndShape);
                this.handleVoiceEntry(graceVoiceEntry, graceStaffEntry, accidentalCalculator, lyricWords,
                    tieTimestampListDict, activeClef, tuplets,
                    beams, octaveShiftValue, true);
            }
        }
    }
    protected handleOpenTies(measure: StaffMeasure, beams: List<Beam>, tieTimestampListDict: Dictionary<Tie, List<Fraction>>,
        activeClef: ClefInstruction, octaveShiftParams: OctaveShiftParams): void {
        for (var m: number = tieTimestampListDict.Count - 1; m >= 0; m--) {
            var keyValuePair: KeyValuePair<Tie, List<Fraction>> = tieTimestampListDict.ElementAt(m);
            var openTie: Tie = keyValuePair.Key;
            var tieTimestamps: List<Fraction> = keyValuePair.Value;
            var absoluteTimestamp: Fraction = null;
            var k: number;
            for (; k < tieTimestamps.Count; k++) {
                if (!openTie.NoteHasBeenCreated[k]) {
                    absoluteTimestamp = tieTimestamps[k];
                    if (absoluteTimestamp >= (measure.ParentSourceMeasure.AbsoluteTimestamp + measure.ParentSourceMeasure.Duration))
                        continue;
                    var graphicalStaffEntry: GraphicalStaffEntry = null;
                    if (absoluteTimestamp != null) {
                        for (var idx: number = 0, len = measure.StaffEntries.Count; idx < len; ++idx) {
                            var gse: GraphicalStaffEntry = measure.StaffEntries[idx];
                            if (gse.getAbsoluteTimestamp() == absoluteTimestamp) {
                                graphicalStaffEntry = gse;
                                break;
                            }
                        }
                        if (graphicalStaffEntry == null) {
                            graphicalStaffEntry = this.createStaffEntryForTieNote(measure, absoluteTimestamp, openTie);
                        }
                    }
                    if (graphicalStaffEntry != null) {
                        var octaveShiftValue: OctaveEnum = OctaveEnum.NONE;
                        if (octaveShiftParams != null) {
                            if (graphicalStaffEntry.getAbsoluteTimestamp() >= octaveShiftParams.GetAbsoluteStartTimestamp && graphicalStaffEntry.getAbsoluteTimestamp() <= octaveShiftParams.GetAbsoluteEndTimestamp) {
                                octaveShiftValue = octaveShiftParams.GetOpenOctaveShift.Type;
                            }
                        }
                        var isLastTieNote: boolean = k == tieTimestamps.Count - 1;
                        var tieFraction: Fraction = openTie.Fractions[k];
                        var numberOfDots: number = openTie.Start.calculateNumberOfNeededDots();
                        this.createGraphicalTieNote(beams, activeClef, octaveShiftValue, graphicalStaffEntry, tieFraction, numberOfDots, openTie, isLastTieNote);
                        var tieStartNote: Note = openTie.Start;
                        if (isLastTieNote && tieStartNote.ParentVoiceEntry.Articulations.Count == 1 && tieStartNote.ParentVoiceEntry.Articulations[0] == ArticulationEnum.fermata) {
                            this.symbolFactory.addFermataAtTiedEndNote(tieStartNote, graphicalStaffEntry);
                        }
                        openTie.NoteHasBeenCreated[k] = true;
                        if (openTie.allGraphicalNotesHaveBeenCreated())
                            tieTimestampListDict.Remove(openTie);
                    }
                }
            }
        }
    }
    protected resetYPositionForLeadSheet(psi: BoundingBox): void {
        if (this.leadSheet) {
            psi.RelativePosition = new PointF_2D(psi.RelativePosition.X, 0.0f);
        }
    }
    protected layoutVoiceEntries(graphicalStaffEntry: GraphicalStaffEntry): void {
        graphicalStaffEntry.PositionAndShape.RelativePosition = new PointF_2D(0.0f, 0.0f);
        var isGraceStaffEntry: boolean = graphicalStaffEntry.StaffEntryParent != null;
        if (!this.leadSheet) {
            var graphicalStaffEntryNotes: List<GraphicalNote>[] = graphicalStaffEntry.Notes.Where(n => n.Count > 0).ToArray();
            for (var idx4: number = 0, len4 = graphicalStaffEntryNotes.length; idx4 < len4; ++idx4) {
                var graphicalNotes: List<GraphicalNote> = graphicalStaffEntryNotes[idx4];
                var voiceEntry: VoiceEntry = graphicalNotes[0].SourceNote.ParentVoiceEntry;
                var hasPitchedNote: boolean = graphicalNotes[0].SourceNote.Pitch != null;
                this.layoutVoiceEntry(voiceEntry, graphicalNotes, graphicalStaffEntry, hasPitchedNote, isGraceStaffEntry);
            }
        }
    }
    protected maxInstrNameLabelLength(): number {
        var maxLabelLength: number = 0.0f;
        var instrumentsArr: Instrument[] = this.graphicalMusicSheet.ParentMusicSheet.Instruments.Where(i => i.Voices.Count > 0 && i.Voices[0].Visible).ToArray();
        for (var idx: number = 0, len = instrumentsArr.length; idx < len; ++idx) {
            var instrument: Instrument = instrumentsArr[idx];
            var graphicalLabel: GraphicalLabel = new GraphicalLabel(instrument.NameLabel, this.rules.InstrumentLabelTextHeight, TextAlignment.LeftCenter);
            graphicalLabel.setLabelPositionAndShapeBorders();
            maxLabelLength = Math.Max(maxLabelLength, graphicalLabel.PositionAndShape.MarginSize.Width);
        }
        return maxLabelLength;
    }
    protected calculateSheetLabelBoundingBoxes(): void {
        var musicSheet: MusicSheet = this.graphicalMusicSheet.ParentMusicSheet;
        if (musicSheet.Title != null) {
            var title: GraphicalLabel = new GraphicalLabel(musicSheet.Title, this.rules.SheetTitleHeight, TextAlignment.CenterBottom);
            this.graphicalMusicSheet.Title = title;
            title.setLabelPositionAndShapeBorders();
        }
        if (musicSheet.Subtitle != null) {
            var subtitle: GraphicalLabel = new GraphicalLabel(musicSheet.Subtitle, this.rules.SheetSubtitleHeight, TextAlignment.CenterCenter);
            this.graphicalMusicSheet.Subtitle = subtitle;
            subtitle.setLabelPositionAndShapeBorders();
        }
        if (musicSheet.Composer != null) {
            var composer: GraphicalLabel = new GraphicalLabel(musicSheet.Composer, this.rules.SheetComposerHeight, TextAlignment.RightCenter);
            this.graphicalMusicSheet.Composer = composer;
            composer.setLabelPositionAndShapeBorders();
        }
        if (musicSheet.Lyricist != null) {
            var lyricist: GraphicalLabel = new GraphicalLabel(musicSheet.Lyricist, this.rules.SheetAuthorHeight, TextAlignment.LeftCenter);
            this.graphicalMusicSheet.Lyricist = lyricist;
            lyricist.setLabelPositionAndShapeBorders();
        }
    }
    protected checkMeasuresForWholeRestNotes(): void {
        for (var idx: number = 0, len = this.graphicalMusicSheet.MusicPages.Count; idx < len; ++idx) {
            var musicPage: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (var idx2: number = 0, len2 = musicPage.MusicSystems.Count; idx2 < len2; ++idx2) {
                var musicSystem: MusicSystem = musicPage.MusicSystems[idx2];
                for (var idx3: number = 0, len3 = musicSystem.StaffLines.Count; idx3 < len3; ++idx3) {
                    var staffLine: StaffLine = musicSystem.StaffLines[idx3];
                    for (var idx4: number = 0, len4 = staffLine.Measures.Count; idx4 < len4; ++idx4) {
                        var measure: StaffMeasure = staffLine.Measures[idx4];
                        if (measure.StaffEntries.Count == 1) {
                            var gse: GraphicalStaffEntry = measure.StaffEntries[0];
                            if (gse.Notes.Count > 0 && gse.Notes[0].Count > 0) {
                                var graphicalNote: GraphicalNote = gse.Notes[0][0];
                                if (graphicalNote.SourceNote.Pitch == null && graphicalNote.SourceNote.Length >= new Fraction(1, 2)) {
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
        if (graphicalStaffEntry.Notes.Count == 0)
            return
        var voice1Notes: List<GraphicalNote> = graphicalStaffEntry.Notes[0];
        if (voice1Notes.Count == 0)
            return
        var voice1Note1: GraphicalNote = voice1Notes[0];
        var voice1Note1IsRest: boolean = voice1Note1.SourceNote.Pitch == null;
        if (graphicalStaffEntry.Notes.Count == 2) {
            var voice2Note1IsRest: boolean = false;
            var voice2Notes: List<GraphicalNote> = graphicalStaffEntry.Notes[1];
            if (voice2Notes.Count > 0) {
                var voice2Note1: GraphicalNote = voice1Notes[0];
                voice2Note1IsRest = voice2Note1.SourceNote.Pitch == null;
            }
            if (voice1Note1IsRest && voice2Note1IsRest) {
                this.calculateTwoRestNotesPlacementWithCollisionDetection(graphicalStaffEntry);
            }
            else if (voice1Note1IsRest || voice2Note1IsRest) {
                this.calculateRestNotePlacementWithCollisionDetectionFromGraphicalNote(graphicalStaffEntry);
            }
        }
        else if (voice1Note1IsRest && graphicalStaffEntry != measure.StaffEntries[0] && graphicalStaffEntry != measure.StaffEntries[measure.StaffEntries.Count - 1]) {
            var staffEntryIndex: number = measure.StaffEntries.IndexOf(graphicalStaffEntry);
            var previousStaffEntry: GraphicalStaffEntry = measure.StaffEntries[staffEntryIndex - 1];
            var nextStaffEntry: GraphicalStaffEntry = measure.StaffEntries[staffEntryIndex + 1];
            if (previousStaffEntry.Notes.Count == 1) {
                var previousNote: GraphicalNote = previousStaffEntry.Notes[0][0];
                if (previousNote.SourceNote.NoteBeam != null && nextStaffEntry.Notes.Count == 1) {
                    var nextNote: GraphicalNote = nextStaffEntry.Notes[0][0];
                    if (nextNote.SourceNote.NoteBeam != null && previousNote.SourceNote.NoteBeam == nextNote.SourceNote.NoteBeam) {
                        this.calculateRestNotePlacementWithinGraphicalBeam(graphicalStaffEntry, voice1Note1,
                            previousNote,
                            nextStaffEntry,
                            nextNote);
                        graphicalStaffEntry.PositionAndShape.calculateBoundingBox();
                    }
                }
            }
        }
    }
    protected getRelativePositionInStaffLineFromTimestamp(timestamp: Fraction, verticalIndex: number, staffLine: StaffLine,
        multiStaffInstrument: boolean, firstVisibleMeasureRelativeX: number = 0.0): PointF_2D {
        var relative: PointF_2D = new PointF_2D();
        var leftStaffEntry: GraphicalStaffEntry = null;
        var rightStaffEntry: GraphicalStaffEntry = null;
        var numEntries: number = this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers.Count;
        var index: number = this.graphicalMusicSheet.GetInterpolatedIndexInVerticalContainers(timestamp);
        var leftIndex: number = <number>Math.Min(Math.Floor(index), numEntries - 1);
        var rightIndex: number = <number>Math.Min(Math.Ceiling(index), numEntries - 1);
        if (leftIndex < 0 || verticalIndex < 0)
            return relative;
        leftStaffEntry = this.getFirstLeftNotNullStaffEntryFromContainer(leftIndex, verticalIndex, multiStaffInstrument);
        rightStaffEntry = this.getFirstRightNotNullStaffEntryFromContainer(rightIndex, verticalIndex, multiStaffInstrument);
        if (leftStaffEntry != null && rightStaffEntry != null) {
            var measureRelativeX: number = leftStaffEntry.ParentMeasure.PositionAndShape.RelativePosition.X;
            if (firstVisibleMeasureRelativeX > 0)
                measureRelativeX = firstVisibleMeasureRelativeX;
            var leftX: number = leftStaffEntry.PositionAndShape.RelativePosition.X + measureRelativeX;
            var rightX: number = rightStaffEntry.PositionAndShape.RelativePosition.X + rightStaffEntry.ParentMeasure.PositionAndShape.RelativePosition.X;
            if (firstVisibleMeasureRelativeX > 0)
                rightX = rightStaffEntry.PositionAndShape.RelativePosition.X + measureRelativeX;
            var timestampQuotient: number = 0.0f;
            if (leftStaffEntry != rightStaffEntry) {
                var leftTimestamp: Fraction = leftStaffEntry.getAbsoluteTimestamp();
                var rightTimestamp: Fraction = rightStaffEntry.getAbsoluteTimestamp();
                var leftDifference: Fraction = new Fraction(timestamp - leftTimestamp);
                timestampQuotient = leftDifference.RealValue / (rightTimestamp - leftTimestamp).RealValue;
            }
            if (leftStaffEntry.ParentMeasure.ParentStaffLine != rightStaffEntry.ParentMeasure.ParentStaffLine) {
                if (leftStaffEntry.ParentMeasure.ParentStaffLine == staffLine)
                    rightX = staffLine.PositionAndShape.Size.Width;
                else leftX = staffLine.PositionAndShape.RelativePosition.X;
            }
            relative = new PointF_2D(leftX + (rightX - leftX) * timestampQuotient, 0.0f);
        }
        return relative;
    }
    protected getRelativeXPositionFromTimestamp(timestamp: Fraction): number {
        var numEntries: number = this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers.Count;
        var index: number = this.graphicalMusicSheet.GetInterpolatedIndexInVerticalContainers(timestamp);
        var discreteIndex: number = <number>Math.Max(0, Math.Min(Math.Round(index), numEntries - 1));
        var gse: GraphicalStaffEntry = this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers[discreteIndex].getFirstNonNullStaffEntry();
        var posX: number = gse.PositionAndShape.RelativePosition.X + gse.ParentMeasure.PositionAndShape.RelativePosition.X;
        return posX;
    }
    private createAccidentalCalculators(): List<AccidentalCalculator> {
        var accidentalCalculators: List<AccidentalCalculator> = new List<AccidentalCalculator>();
        var firstSourceMeasure: SourceMeasure = this.graphicalMusicSheet.ParentMusicSheet.getFirstSourceMeasure();
        if (firstSourceMeasure != null) {
            for (var i: number = 0; i < firstSourceMeasure.CompleteNumberOfStaves; i++) {
                for (var idx: number = 0, len = firstSourceMeasure.FirstInstructionsStaffEntries[i].Instructions.Count; idx < len; ++idx) {
                    var abstractNotationInstruction: AbstractNotationInstruction = firstSourceMeasure.FirstInstructionsStaffEntries[i].Instructions[idx];
                    if (abstractNotationInstruction instanceof KeyInstruction) {
                        var keyInstruction: KeyInstruction = <KeyInstruction>abstractNotationInstruction;
                        var accidentalCalculator: AccidentalCalculator = new AccidentalCalculator(this.symbolFactory);
                        accidentalCalculator.ActiveKeyInstruction = keyInstruction;
                        accidentalCalculators.Add(accidentalCalculator);
                    }
                }
            }
        }
        return accidentalCalculators;
    }
    private calculateVerticalContainersList(): void {
        var numberOfEntries: number = this.graphicalMusicSheet.MeasureList[0].Count;
        for (var i: number = 0; i < this.graphicalMusicSheet.MeasureList.Count; i++) {
            for (var j: number = 0; j < numberOfEntries; j++) {
                var measure: StaffMeasure = this.graphicalMusicSheet.MeasureList[i][j];
                for (var idx: number = 0, len = measure.StaffEntries.Count; idx < len; ++idx) {
                    var graphicalStaffEntry: GraphicalStaffEntry = measure.StaffEntries[idx];
                    var verticalContainer: VerticalGraphicalStaffEntryContainer = this.graphicalMusicSheet.getOrCreateVerticalContainer(graphicalStaffEntry.getAbsoluteTimestamp());
                    if (verticalContainer != null) {
                        verticalContainer.StaffEntries[j] = graphicalStaffEntry;
                        graphicalStaffEntry.ParentVerticalContainer = verticalContainer;
                    }
                    else {

                    }
                }
            }
        }
    }
    private setIndecesToVerticalGraphicalContainers(): void {
        for (var i: number = 0; i < this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers.Count; i++)
            this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers[i].Index = i;
    }
    private createGraphicalMeasuresForSourceMeasure(sourceMeasure: SourceMeasure, accidentalCalculators: List<AccidentalCalculator>,
        openLyricWords: List<LyricWord>,
        tieTimestampListDictList: List<Dictionary<Tie, List<Fraction>>>,
        openOctaveShifts: List<OctaveShiftParams>, activeClefs: List<ClefInstruction>): List<StaffMeasure> {
        this.initStaffMeasuresCreation();
        var verticalMeasureList: List<StaffMeasure> = new List<StaffMeasure>();
        var openBeams: List<Beam> = new List<Beam>();
        var openTuplets: List<Tuplet> = new List<Tuplet>();
        var staffEntryLinks: List<StaffEntryLink> = new List<StaffEntryLink>();
        for (var staffIndex: number = 0; staffIndex < sourceMeasure.CompleteNumberOfStaves; staffIndex++) {
            var measure: StaffMeasure = createGraphicalMeasure(sourceMeasure, tieTimestampListDictList[staffIndex], openTuplets, openBeams, accidentalCalculators[staffIndex], activeClefs, openOctaveShifts, openLyricWords, staffIndex, staffEntryLinks);
            verticalMeasureList.Add(measure);
        }
        this.graphicalMusicSheet.SourceToGraphicalMeasureLinks[sourceMeasure] = verticalMeasureList;
        return verticalMeasureList;
    }
    private createGraphicalMeasure(sourceMeasure: SourceMeasure, tieTimestampListDict: Dictionary<Tie, List<Fraction>>, openTuplets: List<Tuplet>, openBeams: List<Beam>,
        accidentalCalculator: AccidentalCalculator, activeClefs: List<ClefInstruction>, openOctaveShifts: List<OctaveShiftParams>, openLyricWords: List<LyricWord>, staffIndex: number,
        staffEntryLinks: List<StaffEntryLink>): StaffMeasure {
        var staff: Staff = this.graphicalMusicSheet.ParentMusicSheet.getStaffFromIndex(staffIndex);
        var measure: StaffMeasure = this.symbolFactory.createStaffMeasure(sourceMeasure, staff);
        measure.hasError = sourceMeasure.getErrorInMeasure(staffIndex);
        if (sourceMeasure.FirstInstructionsStaffEntries[staffIndex] != null) {
            for (var idx: number = 0, len = sourceMeasure.FirstInstructionsStaffEntries[staffIndex].Instructions.Count; idx < len; ++idx) {
                var instruction: AbstractNotationInstruction = sourceMeasure.FirstInstructionsStaffEntries[staffIndex].Instructions[idx];
                if (instruction instanceof KeyInstruction) {
                    var key: KeyInstruction = new KeyInstruction(<KeyInstruction>instruction);
                    if (this.graphicalMusicSheet.ParentMusicSheet.Transpose != 0 && measure.ParentStaff.ParentInstrument.MidiInstrumentId != Common.Enums.MidiInstrument.Percussion && MusicSheetCalculator.TransposeCalculator != null)
                        MusicSheetCalculator.TransposeCalculator.TransposeKey(key,
                            this.graphicalMusicSheet.ParentMusicSheet.Transpose);
                    accidentalCalculator.ActiveKeyInstruction = key;
                }
            }
        }
        for (var idx: number = 0, len = sourceMeasure.StaffLinkedExpressions[staffIndex].Count; idx < len; ++idx) {
            var multiExpression: MultiExpression = sourceMeasure.StaffLinkedExpressions[staffIndex][idx];
            if (multiExpression.OctaveShiftStart != null) {
                var openOctaveShift: OctaveShift = multiExpression.OctaveShiftStart;
                openOctaveShifts[staffIndex] = new OctaveShiftParams(openOctaveShift, multiExpression.AbsoluteTimestamp,
                    openOctaveShift.ParentEndMultiExpression.AbsoluteTimestamp);
            }
        }
        for (var entryIndex: number = 0; entryIndex < sourceMeasure.VerticalSourceStaffEntryContainers.Count; entryIndex++) {
            if (sourceMeasure.VerticalSourceStaffEntryContainers[entryIndex][staffIndex] != null) {
                var sourceStaffEntry: SourceStaffEntry = sourceMeasure.VerticalSourceStaffEntryContainers[entryIndex][staffIndex];
                for (var idx: number = 0, len = sourceStaffEntry.Instructions.Count; idx < len; ++idx) {
                    var abstractNotationInstruction: AbstractNotationInstruction = sourceStaffEntry.Instructions[idx];
                    if (abstractNotationInstruction instanceof ClefInstruction)
                        activeClefs[staffIndex] = <ClefInstruction>abstractNotationInstruction;
                }
                var graphicalStaffEntry: GraphicalStaffEntry = this.symbolFactory.createStaffEntry(sourceStaffEntry, measure);
                if (measure.StaffEntries.Count > entryIndex) {
                    measure.addGraphicalStaffEntryAtTimestamp(graphicalStaffEntry);
                }
                else measure.addGraphicalStaffEntry(graphicalStaffEntry);
                var linkedNotes: List<Note> = new List<Note>();
                if (sourceStaffEntry.Link != null) {
                    sourceStaffEntry.findLinkedNotes(linkedNotes);
                    this.handleStaffEntryLink(graphicalStaffEntry, staffEntryLinks);
                }
                var octaveShiftValue: OctaveEnum = OctaveEnum.NONE;
                if (openOctaveShifts[staffIndex] != null) {
                    var octaveShiftParams: OctaveShiftParams = openOctaveShifts[staffIndex];
                    if (sourceStaffEntry.AbsoluteTimestamp >= octaveShiftParams.GetAbsoluteStartTimestamp && sourceStaffEntry.AbsoluteTimestamp <= octaveShiftParams.GetAbsoluteEndTimestamp) {
                        octaveShiftValue = octaveShiftParams.GetOpenOctaveShift.Type;
                    }
                }
                for (var idx: number = 0, len = sourceStaffEntry.VoiceEntries.Count; idx < len; ++idx) {
                    var voiceEntry: VoiceEntry = sourceStaffEntry.VoiceEntries[idx];
                    handleVoiceEntryGraceNotes(voiceEntry.GraceVoiceEntriesBefore, graphicalStaffEntry.GraceStaffEntriesBefore, graphicalStaffEntry, accidentalCalculator, activeClefs[staffIndex], octaveShiftValue, openLyricWords,
                        tieTimestampListDict,
                        openTuplets,
                        openBeams);
                    octaveShiftValue = handleVoiceEntry(voiceEntry, graphicalStaffEntry,
                        accidentalCalculator, openLyricWords,
                        tieTimestampListDict,
                        activeClefs[staffIndex], openTuplets,
                        openBeams, octaveShiftValue, false, linkedNotes,
                        sourceStaffEntry);
                    handleVoiceEntryGraceNotes(voiceEntry.GraceVoiceEntriesAfter, graphicalStaffEntry.GraceStaffEntriesAfter, graphicalStaffEntry, accidentalCalculator, activeClefs[staffIndex], octaveShiftValue, openLyricWords,
                        tieTimestampListDict,
                        openTuplets,
                        openBeams);
                }
                if (sourceStaffEntry.Instructions.Count > 0) {
                    var clefInstruction: ClefInstruction = <ClefInstruction>sourceStaffEntry.Instructions[0];
                    this.symbolFactory.createInStaffClef(graphicalStaffEntry, clefInstruction);
                }
                if (sourceStaffEntry.ChordContainer != null) {
                    sourceStaffEntry.ParentStaff.ParentInstrument.HasChordSymbols = true;
                    this.symbolFactory.createChordSymbol(sourceStaffEntry, graphicalStaffEntry, this.graphicalMusicSheet.ParentMusicSheet.Transpose);
                }
            }
        }
        if (tieTimestampListDict.Count > 0) {
            handleOpenTies(measure, openBeams,
                tieTimestampListDict, activeClefs[staffIndex], openOctaveShifts[staffIndex]);
        }
        accidentalCalculator.DoCalculationsAtEndOfMeasure();
        if (sourceMeasure.LastInstructionsStaffEntries[staffIndex] != null) {
            var lastStaffEntry: SourceStaffEntry = sourceMeasure.LastInstructionsStaffEntries[staffIndex];
            for (var idx: number = 0, len = lastStaffEntry.Instructions.Count; idx < len; ++idx) {
                var abstractNotationInstruction: AbstractNotationInstruction = lastStaffEntry.Instructions[idx];
                if (abstractNotationInstruction instanceof ClefInstruction)
                    activeClefs[staffIndex] = <ClefInstruction>abstractNotationInstruction;
            }
        }
        for (var idx: number = 0, len = sourceMeasure.StaffLinkedExpressions[staffIndex].Count; idx < len; ++idx) {
            var multiExpression: MultiExpression = sourceMeasure.StaffLinkedExpressions[staffIndex][idx];
            if (multiExpression.OctaveShiftEnd != null && openOctaveShifts[staffIndex] != null && multiExpression.OctaveShiftEnd == openOctaveShifts[staffIndex].GetOpenOctaveShift) {
                openOctaveShifts[staffIndex] = null;
            }
        }
        if (measure.StaffEntries.Count == 0) {
            var sourceStaffEntry: SourceStaffEntry = new SourceStaffEntry(null, staff);
            var note: Note = new Note(null, sourceStaffEntry, new Fraction(sourceMeasure.Duration), null);
            var graphicalStaffEntry: GraphicalStaffEntry = this.symbolFactory.createStaffEntry(sourceStaffEntry, measure);
            measure.addGraphicalStaffEntry(graphicalStaffEntry);
            graphicalStaffEntry.RelInMeasureTimestamp = new Fraction(0, 1);
            var graphicalNotes: List<GraphicalNote> = new List<GraphicalNote>();
            graphicalStaffEntry.Notes.Add(graphicalNotes);
            var numberOfDots: number = note.calculateNumberOfNeededDots();
            var graphicalNote: GraphicalNote = this.symbolFactory.createNote(note, numberOfDots, graphicalStaffEntry, new ClefInstruction(ClefEnum.G, 0, 2));
            graphicalNotes.Add(graphicalNote);
            graphicalStaffEntry.PositionAndShape.ChildElements.Add(graphicalNote.PositionAndShape);
        }
        return measure;
    }
    private calculatePageLabels(page: GraphicalMusicPage): void {
        var relative: PointF_2D = new PointF_2D();
        var firstSystemAbsoluteTopMargin: number = 10;
        if (page.MusicSystems.Count > 0) {
            var firstMusicSystem: MusicSystem = page.MusicSystems.First();
            firstSystemAbsoluteTopMargin = firstMusicSystem.PositionAndShape.RelativePosition.Y + firstMusicSystem.PositionAndShape.BorderTop;
        }
        if (this.graphicalMusicSheet.Title != null) {
            var title: GraphicalLabel = this.graphicalMusicSheet.Title;
            title.PositionAndShape.Parent = page.PositionAndShape;
            page.PositionAndShape.ChildElements.Add(title.PositionAndShape);
            relative.X = this.graphicalMusicSheet.ParentMusicSheet.PageWidth / 2;
            relative.Y = this.rules.TitleTopDistance + this.rules.SheetTitleHeight;
            title.PositionAndShape.RelativePosition = relative;
            page.Labels.Add(title);
        }
        if (this.graphicalMusicSheet.Subtitle != null) {
            var subtitle: GraphicalLabel = this.graphicalMusicSheet.Subtitle;
            subtitle.PositionAndShape.Parent = page.PositionAndShape;
            page.PositionAndShape.ChildElements.Add(subtitle.PositionAndShape);
            relative.X = this.graphicalMusicSheet.ParentMusicSheet.PageWidth / 2;
            relative.Y = this.rules.TitleTopDistance + this.rules.SheetTitleHeight + this.rules.SheetMinimumDistanceBetweenTitleAndSubtitle;
            subtitle.PositionAndShape.RelativePosition = relative;
            page.Labels.Add(subtitle);
        }
        if (this.graphicalMusicSheet.Composer != null) {
            var composer: GraphicalLabel = this.graphicalMusicSheet.Composer;
            composer.PositionAndShape.Parent = page.PositionAndShape;
            page.PositionAndShape.ChildElements.Add(composer.PositionAndShape);
            composer.setLabelPositionAndShapeBorders();
            relative.X = this.graphicalMusicSheet.ParentMusicSheet.PageWidth - this.rules.PageRightMargin;
            relative.Y = firstSystemAbsoluteTopMargin - this.rules.SystemComposerDistance;
            composer.PositionAndShape.RelativePosition = relative;
            page.Labels.Add(composer);
        }
        if (this.graphicalMusicSheet.Lyricist != null) {
            var lyricist: GraphicalLabel = this.graphicalMusicSheet.Lyricist;
            lyricist.PositionAndShape.Parent = page.PositionAndShape;
            page.PositionAndShape.ChildElements.Add(lyricist.PositionAndShape);
            lyricist.setLabelPositionAndShapeBorders();
            relative.X = this.rules.PageLeftMargin;
            relative.Y = firstSystemAbsoluteTopMargin - this.rules.SystemComposerDistance;
            lyricist.PositionAndShape.RelativePosition = relative;
            page.Labels.Add(lyricist);
        }
    }
    private checkVoiceEntriesForTechnicalInstructions(voiceEntry: VoiceEntry, graphicalStaffEntry: GraphicalStaffEntry): void {
        for (var idx: number = 0, len = voiceEntry.TechnicalInstructions.Count; idx < len; ++idx) {
            var technicalInstruction: TechnicalInstruction = voiceEntry.TechnicalInstructions[idx];
            this.symbolFactory.createGraphicalTechnicalInstruction(technicalInstruction, graphicalStaffEntry);
        }
    }
    private checkNoteForAccidental(graphicalNote: GraphicalNote, accidentalCalculator: AccidentalCalculator, activeClef: ClefInstruction,
        octaveEnum: OctaveEnum, grace: boolean = false): void {
        var pitch: Pitch = graphicalNote.SourceNote.Pitch;
        var transpose: number = this.graphicalMusicSheet.ParentMusicSheet.Transpose;
        if (transpose != 0 && graphicalNote.SourceNote.ParentStaffEntry.ParentStaff.ParentInstrument.MidiInstrumentId != Common.Enums.MidiInstrument.Percussion) {
            pitch = graphicalNote.Transpose(accidentalCalculator.ActiveKeyInstruction, activeClef,
                transpose, octaveEnum);
            if (graphicalNote.SourceNote.NoteTie != null)
                graphicalNote.SourceNote.NoteTie.BaseNoteYPosition = graphicalNote.PositionAndShape.RelativePosition.Y;
        }
        graphicalNote.SourceNote.HalfTone = pitch.getHalfTone();
        var scalingFactor: number = 1.0f;
        if (grace)
            scalingFactor = this.rules.GraceNoteScalingFactor;
        accidentalCalculator.CheckAccidental(graphicalNote, pitch, grace, scalingFactor);
    }
    private createStaffEntryForTieNote(measure: StaffMeasure, absoluteTimestamp: Fraction, openTie: Tie): GraphicalStaffEntry {
        var graphicalStaffEntry: GraphicalStaffEntry;
        graphicalStaffEntry = this.symbolFactory.createStaffEntry(openTie.Start.ParentStaffEntry, measure);
        graphicalStaffEntry.RelInMeasureTimestamp = new Fraction(absoluteTimestamp - measure.ParentSourceMeasure.AbsoluteTimestamp);
        resetYPositionForLeadSheet(graphicalStaffEntry.PositionAndShape);
        measure.addGraphicalStaffEntry(graphicalStaffEntry);
        return graphicalStaffEntry;
    }
    private updateSkyBottomLines(): void {
        for (var idx: number = 0, len = this.graphicalMusicSheet.MusicPages.Count; idx < len; ++idx) {
            var graphicalMusicPage: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (var idx2: number = 0, len2 = graphicalMusicPage.MusicSystems.Count; idx2 < len2; ++idx2) {
                var musicSystem: MusicSystem = graphicalMusicPage.MusicSystems[idx2];
                for (var idx3: number = 0, len3 = musicSystem.StaffLines.Count; idx3 < len3; ++idx3) {
                    var staffLine: StaffLine = musicSystem.StaffLines[idx3];
                    this.updateSkyBottomLine(staffLine);
                }
            }
        }
    }
    private handleStaffEntries(): void {
        for (var idx: number = 0, len = this.graphicalMusicSheet.MeasureList.Count; idx < len; ++idx) {
            var measures: List<StaffMeasure> = this.graphicalMusicSheet.MeasureList[idx];
            for (var idx2: number = 0, len2 = measures.Count; idx2 < len2; ++idx2) {
                var measure: StaffMeasure = measures[idx2];
                for (var idx3: number = 0, len3 = measure.StaffEntries.Count; idx3 < len3; ++idx3) {
                    var graphicalStaffEntry: GraphicalStaffEntry = measure.StaffEntries[idx3];
                    if (graphicalStaffEntry.ParentMeasure != null && graphicalStaffEntry.Notes.Count > 0 && graphicalStaffEntry.Notes[0].Count > 0) {
                        this.layoutVoiceEntries(graphicalStaffEntry);
                        this.layoutStaffEntry(graphicalStaffEntry);
                    }
                }
            }
        }
    }
    private createGraphicalTies(): void {
        for (var measureIndex: number = 0; measureIndex < this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures.Count; measureIndex++) {
            var sourceMeasure: SourceMeasure = this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures[measureIndex];
            for (var staffIndex: number = 0; staffIndex < sourceMeasure.CompleteNumberOfStaves; staffIndex++) {
                for (var j: number = 0; j < sourceMeasure.VerticalSourceStaffEntryContainers.Count; j++) {
                    if (sourceMeasure.VerticalSourceStaffEntryContainers[j][staffIndex] != null) {
                        var sourceStaffEntry: SourceStaffEntry = sourceMeasure.VerticalSourceStaffEntryContainers[j][staffIndex];
                        var startStaffEntry: GraphicalStaffEntry = this.graphicalMusicSheet.findGraphicalStaffEntryFromMeasureList(staffIndex, measureIndex, sourceStaffEntry);
                        for (var idx: number = 0, len = sourceStaffEntry.VoiceEntries.Count; idx < len; ++idx) {
                            var voiceEntry: VoiceEntry = sourceStaffEntry.VoiceEntries[idx];
                            for (var idx2: number = 0, len2 = voiceEntry.Notes.Count; idx2 < len2; ++idx2) {
                                var note: Note = voiceEntry.Notes[idx2];
                                if (note.NoteTie != null) {
                                    var tie: Tie = note.NoteTie;
                                    this.handleTie(tie, startStaffEntry, staffIndex, measureIndex);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    private calculateSkyBottomLines(): void {
        for (var idx: number = 0, len = this.graphicalMusicSheet.MusicPages.Count; idx < len; ++idx) {
            var graphicalMusicPage: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (var idx2: number = 0, len2 = graphicalMusicPage.MusicSystems.Count; idx2 < len2; ++idx2) {
                var musicSystem: MusicSystem = graphicalMusicPage.MusicSystems[idx2];
                for (var idx3: number = 0, len3 = musicSystem.StaffLines.Count; idx3 < len3; ++idx3) {
                    var staffLine: StaffLine = musicSystem.StaffLines[idx3];
                    this.calculateSkyBottomLine(staffLine);
                }
            }
        }
    }
    private calculateBeams(): void {
        for (var idx: number = 0, len = this.graphicalMusicSheet.MusicPages.Count; idx < len; ++idx) {
            var musicPage: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (var idx2: number = 0, len2 = musicPage.MusicSystems.Count; idx2 < len2; ++idx2) {
                var musicSystem: MusicSystem = musicPage.MusicSystems[idx2];
                for (var idx3: number = 0, len3 = musicSystem.StaffLines.Count; idx3 < len3; ++idx3) {
                    var staffLine: StaffLine = musicSystem.StaffLines[idx3];
                    for (var idx4: number = 0, len4 = staffLine.Measures.Count; idx4 < len4; ++idx4) {
                        var measure: StaffMeasure = staffLine.Measures[idx4];
                        for (var idx5: number = 0, len5 = measure.StaffEntries.Count; idx5 < len5; ++idx5) {
                            var staffEntry: GraphicalStaffEntry = measure.StaffEntries[idx5];
                            this.layoutBeams(staffEntry);
                        }
                    }
                }
            }
        }
    }
    private calculateStaffEntryArticulationMarks(): void {
        for (var idx: number = 0, len = this.graphicalMusicSheet.MusicPages.Count; idx < len; ++idx) {
            var page: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (var idx2: number = 0, len2 = page.MusicSystems.Count; idx2 < len2; ++idx2) {
                var system: MusicSystem = page.MusicSystems[idx2];
                for (var idx3: number = 0, len3 = system.StaffLines.Count; idx3 < len3; ++idx3) {
                    var line: StaffLine = system.StaffLines[idx3];
                    for (var idx4: number = 0, len4 = line.Measures.Count; idx4 < len4; ++idx4) {
                        var measure: StaffMeasure = line.Measures[idx4];
                        for (var idx5: number = 0, len5 = measure.StaffEntries.Count; idx5 < len5; ++idx5) {
                            var graphicalStaffEntry: GraphicalStaffEntry = measure.StaffEntries[idx5];
                            for (var idx6: number = 0, len6 = graphicalStaffEntry.SourceStaffEntry.VoiceEntries.Count; idx6 < len6; ++idx6) {
                                var voiceEntry: VoiceEntry = graphicalStaffEntry.SourceStaffEntry.VoiceEntries[idx6];
                                if (voiceEntry.Articulations.Count > 0)
                                    this.layoutArticulationMarks(voiceEntry.Articulations, voiceEntry, graphicalStaffEntry);
                            }
                        }
                    }
                }
            }
        }
    }
    private calculateOrnaments(): void {
        for (var idx: number = 0, len = this.graphicalMusicSheet.MusicPages.Count; idx < len; ++idx) {
            var page: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (var idx2: number = 0, len2 = page.MusicSystems.Count; idx2 < len2; ++idx2) {
                var system: MusicSystem = page.MusicSystems[idx2];
                for (var idx3: number = 0, len3 = system.StaffLines.Count; idx3 < len3; ++idx3) {
                    var line: StaffLine = system.StaffLines[idx3];
                    for (var idx4: number = 0, len4 = line.Measures.Count; idx4 < len4; ++idx4) {
                        var measure: StaffMeasure = line.Measures[idx4];
                        for (var idx5: number = 0, len5 = measure.StaffEntries.Count; idx5 < len5; ++idx5) {
                            var graphicalStaffEntry: GraphicalStaffEntry = measure.StaffEntries[idx5];
                            for (var idx6: number = 0, len6 = graphicalStaffEntry.SourceStaffEntry.VoiceEntries.Count; idx6 < len6; ++idx6) {
                                var voiceEntry: VoiceEntry = graphicalStaffEntry.SourceStaffEntry.VoiceEntries[idx6];
                                if (voiceEntry.OrnamentContainer != null) {
                                    if (voiceEntry.hasTie() && graphicalStaffEntry.RelInMeasureTimestamp != voiceEntry.Timestamp)
                                        continue;
                                    this.layoutOrnament(voiceEntry.OrnamentContainer, voiceEntry, graphicalStaffEntry);
                                    if (!this.staffEntriesWithOrnaments.Contains(graphicalStaffEntry))
                                        this.staffEntriesWithOrnaments.Add(graphicalStaffEntry);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    private optimizeRestPlacement(): void {
        for (var idx: number = 0, len = this.graphicalMusicSheet.MusicPages.Count; idx < len; ++idx) {
            var page: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (var idx2: number = 0, len2 = page.MusicSystems.Count; idx2 < len2; ++idx2) {
                var system: MusicSystem = page.MusicSystems[idx2];
                for (var idx3: number = 0, len3 = system.StaffLines.Count; idx3 < len3; ++idx3) {
                    var line: StaffLine = system.StaffLines[idx3];
                    for (var idx4: number = 0, len4 = line.Measures.Count; idx4 < len4; ++idx4) {
                        var measure: StaffMeasure = line.Measures[idx4];
                        for (var idx5: number = 0, len5 = measure.StaffEntries.Count; idx5 < len5; ++idx5) {
                            var graphicalStaffEntry: GraphicalStaffEntry = measure.StaffEntries[idx5];
                            this.optimizeRestNotePlacement(graphicalStaffEntry, measure);
                        }
                    }
                }
            }
        }
    }
    private calculateTwoRestNotesPlacementWithCollisionDetection(graphicalStaffEntry: GraphicalStaffEntry): void {
        var firstRestNote: GraphicalNote = graphicalStaffEntry.Notes[0][0];
        var secondRestNote: GraphicalNote = graphicalStaffEntry.Notes[1][0];
        secondRestNote.PositionAndShape.RelativePosition = new PointF_2D(0.0f, 2.5f);
        graphicalStaffEntry.PositionAndShape.calculateAbsolutePositionsRecursiveWithoutTopelement();
        firstRestNote.PositionAndShape.computeNonOverlappingPositionWithMargin(graphicalStaffEntry.PositionAndShape, ColDirEnum.Up,
            new PointF_2D(0.0f, secondRestNote.PositionAndShape.RelativePosition.Y));
        var relative: PointF_2D = firstRestNote.PositionAndShape.RelativePosition;
        relative.Y -= 1.0f;
        firstRestNote.PositionAndShape.RelativePosition = relative;
        graphicalStaffEntry.PositionAndShape.calculateBoundingBox();
    }
    private calculateRestNotePlacementWithCollisionDetectionFromGraphicalNote(graphicalStaffEntry: GraphicalStaffEntry): void {
        var restNote: GraphicalNote;
        var graphicalNotes: List<GraphicalNote>;
        if (graphicalStaffEntry.Notes[0][0].SourceNote.Pitch == null) {
            restNote = graphicalStaffEntry.Notes[0][0];
            graphicalNotes = graphicalStaffEntry.Notes[1];
        }
        else {
            graphicalNotes = graphicalStaffEntry.Notes[0];
            restNote = graphicalStaffEntry.Notes[1][0];
        }
        var collision: boolean = false;
        graphicalStaffEntry.PositionAndShape.calculateAbsolutePositionsRecursiveWithoutTopelement();
        for (var idx: number = 0, len = graphicalNotes.Count; idx < len; ++idx) {
            var graphicalNote: GraphicalNote = graphicalNotes[idx];
            if (restNote.PositionAndShape.marginCollisionDetection(graphicalNote.PositionAndShape)) {
                collision = true;
                break;
            }
        }
        if (collision) {
            if (restNote.SourceNote.ParentVoiceEntry.ParentVoice instanceof LinkedVoice) {
                var bottomBorder: number = graphicalNotes[0].PositionAndShape.BorderMarginBottom + graphicalNotes[0].PositionAndShape.RelativePosition.Y;
                restNote.PositionAndShape.RelativePosition = new PointF_2D(0.0f, bottomBorder - restNote.PositionAndShape.BorderMarginTop + 0.5f);
            }
            else {
                if (graphicalNotes[0].SourceNote.ParentVoiceEntry.ParentVoice instanceof LinkedVoice) {
                    var topBorder: number = graphicalNotes.Last().PositionAndShape.BorderMarginTop + graphicalNotes.Last().PositionAndShape.RelativePosition.Y;
                    restNote.PositionAndShape.RelativePosition = new PointF_2D(0.0f, topBorder - restNote.PositionAndShape.BorderMarginBottom - 0.5f);
                }
                else {
                    var topBorder: number = graphicalNotes.Last().PositionAndShape.BorderMarginTop + graphicalNotes.Last().PositionAndShape.RelativePosition.Y;
                    var bottomBorder: number = graphicalNotes[0].PositionAndShape.BorderMarginBottom + graphicalNotes[0].PositionAndShape.RelativePosition.Y;
                    if (bottomBorder < 2.0f)
                    restNote.PositionAndShape.RelativePosition = new PointF_2D(0.0f, bottomBorder - restNote.PositionAndShape.BorderMarginTop + 0.5f);
 else restNote.PositionAndShape.RelativePosition = new PointF_2D(0.0f, topBorder - restNote.PositionAndShape.BorderMarginBottom - 0.0f);
                }
            }
        }
        graphicalStaffEntry.PositionAndShape.calculateBoundingBox();
    }
    private calculateTieCurves(): void {
        for (var idx: number = 0, len = this.graphicalMusicSheet.MusicPages.Count; idx < len; ++idx) {
            var graphicalMusicPage: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (var idx2: number = 0, len2 = graphicalMusicPage.MusicSystems.Count; idx2 < len2; ++idx2) {
                var musicSystem: MusicSystem = graphicalMusicPage.MusicSystems[idx2];
                for (var idx3: number = 0, len3 = musicSystem.StaffLines.Count; idx3 < len3; ++idx3) {
                    var staffLine: StaffLine = musicSystem.StaffLines[idx3];
                    for (var idx4: number = 0, len5 = staffLine.Measures.Count; idx4 < len5; ++idx4) {
                        var measure: StaffMeasure = staffLine.Measures[idx4];
                        for (var idx6: number = 0, len6 = measure.StaffEntries.Count; idx6 < len6; ++idx6) {
                            var staffEntry: GraphicalStaffEntry = measure.StaffEntries[idx6];
                            var graphicalTies: List<GraphicalTie> = staffEntry.GraphicalTies;
                            for (var idx7: number = 0, len7 = graphicalTies.Count; idx7 < len7; ++idx7) {
                                var graphicalTie: GraphicalTie = graphicalTies[idx7];
                                if (graphicalTie.StartNote != null && graphicalTie.StartNote.ParentStaffEntry == staffEntry) {
                                    var tieIsAtSystemBreak: boolean = (graphicalTie.StartNote.ParentStaffEntry.ParentMeasure.ParentStaffLine != graphicalTie.EndNote.ParentStaffEntry.ParentMeasure.ParentStaffLine);
                                    this.layoutGraphicalTie(graphicalTie, tieIsAtSystemBreak);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    private calculateFingering(): void {
        for (var idx: number = 0, len = this.graphicalMusicSheet.MusicPages.Count; idx < len; ++idx) {
            var graphicalMusicPage: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (var idx2: number = 0, len2 = graphicalMusicPage.MusicSystems.Count; idx2 < len2; ++idx2) {
                var musicSystem: MusicSystem = graphicalMusicPage.MusicSystems[idx2];
                for (var idx3: number = 0, len3 = musicSystem.StaffLines.Count; idx3 < len3; ++idx3) {
                    var staffLine: StaffLine = musicSystem.StaffLines[idx3];
                    var skyBottomLineCalculator: SkyBottomLineCalculator = new SkyBottomLineCalculator(this.rules);
                    for (var idx4: number = 0, len4 = staffLine.Measures.Count; idx4 < len4; ++idx4) {
                        var measure: StaffMeasure = staffLine.Measures[idx4];
                        var measureRelativePosition: PointF_2D = measure.PositionAndShape.RelativePosition;
                        for (var idx5: number = 0, len5 = measure.StaffEntries.Count; idx5 < len5; ++idx5) {
                            var staffEntry: GraphicalStaffEntry = measure.StaffEntries[idx5];
                            var hasTechnicalInstruction: boolean = false;
                            for (var idx6: number = 0, len6 = staffEntry.SourceStaffEntry.VoiceEntries.Count; idx6 < len6; ++idx6) {
                                var ve: VoiceEntry = staffEntry.SourceStaffEntry.VoiceEntries[idx6];
                                if (ve.TechnicalInstructions.Count > 0) {
                                    hasTechnicalInstruction = true;
                                    break;
                                }
                            }
                            if (hasTechnicalInstruction) {
                                this.layoutFingering(staffLine, skyBottomLineCalculator, staffEntry, measureRelativePosition);
                            }
                        }
                    }
                }
            }
        }
    }
    private calculateLyricsPosition(): void {
        for (var idx: number = 0, len = this.graphicalMusicSheet.ParentMusicSheet.Instruments.Count; idx < len; ++idx) {
            var instrument: Instrument = this.graphicalMusicSheet.ParentMusicSheet.Instruments[idx];
            if (instrument.HasLyrics && instrument.LyricVersesNumbers.Count > 0)
                instrument.LyricVersesNumbers.Sort();
        }
        for (var idx: number = 0, len = this.graphicalMusicSheet.MusicPages.Count; idx < len; ++idx) {
            var graphicalMusicPage: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            for (var idx2: number = 0, len2 = graphicalMusicPage.MusicSystems.Count; idx2 < len2; ++idx2) {
                var musicSystem: MusicSystem = graphicalMusicPage.MusicSystems[idx2];
                for (var idx3: number = 0, len3 = musicSystem.StaffLines.Count; idx3 < len3; ++idx3) {
                    var staffLine: StaffLine = musicSystem.StaffLines[idx3];
                    this.calculateSingleStaffLineLyricsPosition(staffLine, staffLine.ParentStaff.ParentInstrument.LyricVersesNumbers);
                }
            }
        }
    }
    private calculateDynamicExpressions(): void {
        for (var i: number = 0; i < this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures.Count; i++) {
            var sourceMeasure: SourceMeasure = this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures[i];
            for (var j: number = 0; j < sourceMeasure.StaffLinkedExpressions.Count; j++) {
                if (this.graphicalMusicSheet.MeasureList[i][j].ParentStaff.ParentInstrument.Visible)
                    for (var k: number = 0; k < sourceMeasure.StaffLinkedExpressions[j].Count; k++)
                        if (sourceMeasure.StaffLinkedExpressions[j][k].InstantaniousDynamic != null || (sourceMeasure.StaffLinkedExpressions[j][k].StartingContinuousDynamic != null && sourceMeasure.StaffLinkedExpressions[j][k].StartingContinuousDynamic.StartMultiExpression == sourceMeasure.StaffLinkedExpressions[j][k] && sourceMeasure.StaffLinkedExpressions[j][k].UnknownList.Count == 0)) {
                            this.calculateDynamicExpressionsForSingleMultiExpression(sourceMeasure.StaffLinkedExpressions[j][k], i, j);
                        }
            }
        }
    }
    private calculateOctaveShifts(): void {
        for (var i: number = 0; i < this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures.Count; i++) {
            var sourceMeasure: SourceMeasure = this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures[i];
            for (var j: number = 0; j < sourceMeasure.StaffLinkedExpressions.Count; j++) {
                if (this.graphicalMusicSheet.MeasureList[i][j].ParentStaff.ParentInstrument.Visible)
                    for (var k: number = 0; k < sourceMeasure.StaffLinkedExpressions[j].Count; k++)
                        if ((sourceMeasure.StaffLinkedExpressions[j][k].OctaveShiftStart != null)) {
                            this.calculateSingleOctaveShift(sourceMeasure, sourceMeasure.StaffLinkedExpressions[j][k], i, j);
                        }
            }
        }
    }
    private getFirstLeftNotNullStaffEntryFromContainer(horizontalIndex: number, verticalIndex: number, multiStaffInstrument: boolean): GraphicalStaffEntry {
        if (this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers[horizontalIndex].StaffEntries[verticalIndex] != null)
            return this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers[horizontalIndex].StaffEntries[verticalIndex];
        for (var i: number = horizontalIndex - 1; i >= 0; i--)
            if (this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers[i].StaffEntries[verticalIndex] != null)
                return this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers[i].StaffEntries[verticalIndex];
        return null;
    }
    private getFirstRightNotNullStaffEntryFromContainer(horizontalIndex: number, verticalIndex: number, multiStaffInstrument: boolean): GraphicalStaffEntry {
        if (this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers[horizontalIndex].StaffEntries[verticalIndex] != null)
            return this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers[horizontalIndex].StaffEntries[verticalIndex];
        for (var i: number = horizontalIndex + 1; i < this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers.Count; i++)
            if (this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers[i].StaffEntries[verticalIndex] != null)
                return this.graphicalMusicSheet.VerticalGraphicalStaffEntryContainers[i].StaffEntries[verticalIndex];
        return null;
    }
    private calculateWordRepetitionInstructions(): void {
        for (var i: number = 0; i < this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures.Count; i++) {
            var sourceMeasure: SourceMeasure = this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures[i];
            for (var idx: number = 0, len = sourceMeasure.FirstRepetitionInstructions.Count; idx < len; ++idx) {
                var instruction: RepetitionInstruction = sourceMeasure.FirstRepetitionInstructions[idx];
                this.calculateWordRepetitionInstruction(instruction, i);
            }
            for (var idx: number = 0, len = sourceMeasure.LastRepetitionInstructions.Count; idx < len; ++idx) {
                var instruction: RepetitionInstruction = sourceMeasure.LastRepetitionInstructions[idx];
                this.calculateWordRepetitionInstruction(instruction, i);
            }
        }
    }
    private calculateRepetitionEndings(): void {
        var musicsheet: MusicSheet = this.graphicalMusicSheet.ParentMusicSheet;
        for (var idx: number = 0, len = musicsheet.Repetitions.Count; idx < len; ++idx) {
            var partListEntry: Repetition = musicsheet.Repetitions[idx];
            this.calcGraphicalRepetitionEndingsRecursively(partListEntry);
        }
    }
    private calculateTempoExpressions(): void {
        for (var i: number = 0; i < this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures.Count; i++) {
            var sourceMeasure: SourceMeasure = this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures[i];
            for (var j: number = 0; j < sourceMeasure.TempoExpressions.Count; j++) {
                this.calculateTempoExpressionsForSingleMultiTempoExpression(sourceMeasure, sourceMeasure.TempoExpressions[j], i);
            }
        }
    }
    private calculateMoodAndUnknownExpressions(): void {
        for (var i: number = 0; i < this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures.Count; i++) {
            var sourceMeasure: SourceMeasure = this.graphicalMusicSheet.ParentMusicSheet.SourceMeasures[i];
            for (var j: number = 0; j < sourceMeasure.StaffLinkedExpressions.Count; j++) {
                if (this.graphicalMusicSheet.MeasureList[i][j].ParentStaff.ParentInstrument.Visible)
                    for (var k: number = 0; k < sourceMeasure.StaffLinkedExpressions[j].Count; k++)
                        if ((sourceMeasure.StaffLinkedExpressions[j][k].MoodList.Count > 0) || (sourceMeasure.StaffLinkedExpressions[j][k].UnknownList.Count > 0)) {
                            this.calculateMoodAndUnknownExpression(sourceMeasure.StaffLinkedExpressions[j][k], i, j);
                        }
            }
        }
    }
}