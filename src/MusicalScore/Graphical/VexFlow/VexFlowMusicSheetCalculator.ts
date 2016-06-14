import {MusicSheetCalculator} from "../MusicSheetCalculator";
import {VexFlowGraphicalSymbolFactory} from "./VexFlowGraphicalSymbolFactory";
import {GraphicalMusicSheet} from "../GraphicalMusicSheet";
import {StaffMeasure} from "../StaffMeasure";
import {MusicSystemBuilder} from "../MusicSystemBuilder";
import {StaffLine} from "../StaffLine";
import {VoiceEntry} from "../../VoiceData/VoiceEntry";
import {MusicSystem} from "../MusicSystem";
import {GraphicalNote} from "../GraphicalNote";
import {GraphicalStaffEntry} from "../GraphicalStaffEntry";
import {GraphicalMusicPage} from "../GraphicalMusicPage";
import {GraphicalTie} from "../GraphicalTie";
import {Tie} from "../../VoiceData/Tie";
import {SourceMeasure} from "../../VoiceData/SourceMeasure";
import {MultiExpression} from "../../VoiceData/Expressions/multiExpression";
import {RepetitionInstruction} from "../../VoiceData/Instructions/RepetitionInstruction";
import {Beam} from "../../VoiceData/Beam";
import {ClefInstruction} from "../../VoiceData/Instructions/ClefInstruction";
import {OctaveEnum} from "../../VoiceData/Expressions/ContinuousExpressions/octaveShift";
import {Fraction} from "../../../Common/DataObjects/fraction";
import {LyricsEntry} from "../../VoiceData/Lyrics/LyricsEntry";
import {LyricWord} from "../../VoiceData/Lyrics/LyricsWord";
import {OrnamentContainer} from "../../VoiceData/OrnamentContainer";
import {ArticulationEnum} from "../../VoiceData/VoiceEntry";
import {Tuplet} from "../../VoiceData/Tuplet";
import {VexFlowMeasure} from "./VexFlowMeasure";
export class VexFlowMusicSheetCalculator extends MusicSheetCalculator {
    constructor() {
        super(new VexFlowGraphicalSymbolFactory());

    }

    /**
     * The main method for the Calculator.
     */
    public calculate(): void {
        this.clearSystemsAndMeasures();
        this.clearRecreatedObjects();
        this.calculateXLayout(this.graphicalMusicSheet, this.maxInstrNameLabelLength());
        this.graphicalMusicSheet.MusicPages.length = 0;
        this.calculateMusicSystems();
        this.graphicalMusicSheet.MusicPages[0].PositionAndShape.BorderMarginBottom += 9;
        GraphicalMusicSheet.transformRelativeToAbsolutePosition(this.graphicalMusicSheet);
    }

    /**
     * Calculates the x layout of the staff entries within the staff measures belonging to one source measure.
     * All staff entries are x-aligned throughout all vertically aligned staff measures.
     * This method is called within calculateXLayout.
     * The staff entries are aligned with minimum needed x distances.
     * The MinimumStaffEntriesWidth of every measure will be set - needed for system building.
     * @param measures
     */
    protected calculateMeasureXLayout(measures: StaffMeasure[]): number {
        // set measure length and Borders
        for (let idx: number = 0, len: number = measures.length; idx < len; ++idx) {
            let measure: VexFlowMeasure  = <VexFlowMeasure>measures[idx];
            // set Measure StaffEntriesLength (needed later to calculate the whole Measure Width)
            //measure.MinimumStaffEntriesWidth = measureLength;


        }
    }

    /**
     * Creates the music systems and calculates their layout.
     */
    protected calculateMusicSystems(): void {
        let measureList: StaffMeasure[][] = this.graphicalMusicSheet.MeasureList.Select(ml => ml.Where(m => m.isVisible()).ToList()).ToList();
        let numberOfStaffLines: number = 0;
        for (let idx: number = 0, len: number = measureList.length; idx < len; ++idx) {
            let gmlist: StaffMeasure[] = measureList[idx];
            numberOfStaffLines = Math.max(gmlist.length, numberOfStaffLines);
            break;
        }
        if (numberOfStaffLines === 0)
            return;
        let musicSystemBuilder: MusicSystemBuilder = new MusicSystemBuilder();
        musicSystemBuilder.initialize(this.graphicalMusicSheet, measureList, numberOfStaffLines, this.symbolFactory);
        musicSystemBuilder.buildMusicSystems();
        this.checkMeasuresForWholeRestNotes();
    }
    protected updateStaffLineBorders(staffLine: StaffLine): void {

    }
    protected calculateMeasureNumberPlacement(musicSystem: MusicSystem): void {

    }

    /**
     * Can be used to calculate stem directions, helper(ledger) lines, and overlapping note x-displacement.
     * Is Excecuted per voice entry of a staff entry.
     * After that layoutStaffEntry is called.
     * @param voiceEntry
     * @param graphicalNotes
     * @param graphicalStaffEntry
     * @param hasPitchedNote
     * @param isGraceStaffEntry
     */
    protected layoutVoiceEntry(voiceEntry: VoiceEntry, graphicalNotes: GraphicalNote[], graphicalStaffEntry: GraphicalStaffEntry, hasPitchedNote: boolean, isGraceStaffEntry: boolean): void {

    }

    /**
     * Do all layout calculations that have to be done per staff entry, like dots, ornaments, arpeggios....
     * This method is called after the voice entries are handled by layoutVoiceEntry().
     * @param graphicalStaffEntry
     */
    protected layoutStaffEntry(graphicalStaffEntry: GraphicalStaffEntry): void {

    }

    /**
     * calculates the y positions of the staff lines within a system and
     * furthermore the y positions of the systems themselves.
     */
    protected calculateSystemYLayout(): void {
        for (let idx: number = 0, len: number = this.graphicalMusicSheet.MusicPages.length; idx < len; ++idx) {
            let graphicalMusicPage: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            if (!this.leadSheet) {
                for (let idx2: number = 0, len2: number = graphicalMusicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                    let musicSystem: MusicSystem = graphicalMusicPage.MusicSystems[idx2];
                    // calculate y positions of stafflines within system
                    // ...
                }
            }
            // set y positions of systems using the previous system and a fixed distance.
            // ...
        }
    }

    /**
     * Is called at the begin of the method for creating the vertically aligned staff measures belonging to one source measure.
     */
    protected initStaffMeasuresCreation(): void {

    }
    protected handleTie(tie: Tie, startGraphicalStaffEntry: GraphicalStaffEntry, staffIndex: number, measureIndex: number): void {

    }
    protected layoutGraphicalTie(tie: GraphicalTie, tieIsAtSystemBreak: boolean): void {

    }
    protected calculateSingleStaffLineLyricsPosition(staffLine: StaffLine, lyricVersesNumber: number[]): void {

    }
    protected calculateSingleOctaveShift(sourceMeasure: SourceMeasure, multiExpression: MultiExpression, measureIndex: number, staffIndex: number): void {

    }
    protected calculateWordRepetitionInstruction(repetitionInstruction: RepetitionInstruction, measureIndex: number): void {

    }
    protected calculateMoodAndUnknownExpression(multiExpression: MultiExpression, measureIndex: number, staffIndex: number): void {

    }
    protected createGraphicalTieNote(beams: Beam[], activeClef: ClefInstruction,
        octaveShiftValue: OctaveEnum, graphicalStaffEntry: GraphicalStaffEntry, duration: Fraction, numberOfDots: number,
        openTie: Tie, isLastTieNote: boolean): void {

    }

    /**
     * Is called if a note is part of a beam.
     * @param graphicalNote
     * @param beam
     * @param openBeams a list of all currently open beams
     */
    protected handleBeam(graphicalNote: GraphicalNote, beam: Beam, openBeams: Beam[]): void {

    }
    protected handleVoiceEntryLyrics(lyricsEntries: { [_: number]: LyricsEntry; }, voiceEntry: VoiceEntry, graphicalStaffEntry: GraphicalStaffEntry, openLyricWords: LyricWord[]): void {

    }
    protected handleVoiceEntryOrnaments(ornamentContainer: OrnamentContainer, voiceEntry: VoiceEntry, graphicalStaffEntry: GraphicalStaffEntry): void {

    }
    protected handleVoiceEntryArticulations(articulations: ArticulationEnum[], voiceEntry: VoiceEntry, graphicalStaffEntry: GraphicalStaffEntry): void {

    }

    /**
     * Is called if a note is part of a tuplet.
     * @param graphicalNote
     * @param tuplet
     * @param openTuplets a list of all currently open tuplets
     */
    protected handleTuplet(graphicalNote: GraphicalNote, tuplet: Tuplet, openTuplets: Tuplet[]): void {

    }
}