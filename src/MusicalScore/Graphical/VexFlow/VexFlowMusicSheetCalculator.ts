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
export class VexFlowMusicSheetCalculator extends MusicSheetCalculator {
    constructor() {
        super(new VexFlowGraphicalSymbolFactory());

    }
    public calculate(): void {
        this.clearSystemsAndMeasures();
        this.clearRecreatedObjects();
        this.calculateXLayout(this.graphicalMusicSheet, this.maxInstrNameLabelLength());
        this.graphicalMusicSheet.MusicPages.length = 0;
        this.calculateMusicSystems();
        this.graphicalMusicSheet.MusicPages[0].PositionAndShape.BorderMarginBottom += 9;
        GraphicalMusicSheet.transformRelativeToAbsolutePosition(this.graphicalMusicSheet);
    }
    protected calculateMeasureXLayout(measures: StaffMeasure[]): number {
        throw new NotImplementedException();
    }
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
    protected layoutVoiceEntry(voiceEntry: VoiceEntry, graphicalNotes: GraphicalNote[], graphicalStaffEntry: GraphicalStaffEntry, hasPitchedNote: boolean, isGraceStaffEntry: boolean): void {

    }
    protected layoutStaffEntry(graphicalStaffEntry: GraphicalStaffEntry): void {

    }
    protected calculateSystemYLayout(): void {
        for (let idx: number = 0, len: number = this.graphicalMusicSheet.MusicPages.length; idx < len; ++idx) {
            let graphicalMusicPage: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            if (!this.leadSheet) {
                for (let idx2: number = 0, len2: number = graphicalMusicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                    let musicSystem: MusicSystem = graphicalMusicPage.MusicSystems[idx2];
                }
            }
        }
    }
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
    protected handleBeam(graphicalNote: GraphicalNote, beam: Beam, openBeams: Beam[]): void {

    }
    protected handleVoiceEntryLyrics(lyricsEntries: Dictionary<number, LyricsEntry>, voiceEntry: VoiceEntry, graphicalStaffEntry: GraphicalStaffEntry, openLyricWords: LyricWord[]): void {

    }
    protected handleVoiceEntryOrnaments(ornamentContainer: OrnamentContainer, voiceEntry: VoiceEntry, graphicalStaffEntry: GraphicalStaffEntry): void {

    }
    protected handleVoiceEntryArticulations(articulations: ArticulationEnum[], voiceEntry: VoiceEntry, graphicalStaffEntry: GraphicalStaffEntry): void {

    }
    protected handleTuplet(graphicalNote: GraphicalNote, tuplet: Tuplet, openTuplets: Tuplet[]): void {

    }
}