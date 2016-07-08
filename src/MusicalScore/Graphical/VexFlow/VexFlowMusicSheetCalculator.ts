import {MusicSheetCalculator} from "../MusicSheetCalculator";
import {VexFlowGraphicalSymbolFactory} from "./VexFlowGraphicalSymbolFactory";
import {StaffMeasure} from "../StaffMeasure";
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
import Dictionary from "typescript-collections/dist/lib/Dictionary";
import {VexFlowMeasure} from "./VexFlowMeasure";
import {VexFlowTextMeasurer} from "./VexFlowTextMeasurer";

import Vex = require("vexflow");

export class VexFlowMusicSheetCalculator extends MusicSheetCalculator {
    constructor() {
        super(new VexFlowGraphicalSymbolFactory());
        MusicSheetCalculator.TextMeasurer = new VexFlowTextMeasurer();
    }

    protected clearRecreatedObjects(): void {
        super.clearRecreatedObjects();
        for (let staffMeasures of this.graphicalMusicSheet.MeasureList) {
            for (let staffMeasure of staffMeasures) {
                (<VexFlowMeasure>staffMeasure).clean();
            }
        }
    }

    //protected clearSystemsAndMeasures(): void {
    //    for (let measure of measures) {
    //
    //    }
    //}

    /**
     * Calculates the x layout of the staff entries within the staff measures belonging to one source measure.
     * All staff entries are x-aligned throughout all vertically aligned staff measures.
     * This method is called within calculateXLayout.
     * The staff entries are aligned with minimum needed x distances.
     * The MinimumStaffEntriesWidth of every measure will be set - needed for system building.
     * @param measures
     * @returns the minimum required x width of the source measure (=list of staff measures)
     */
    protected calculateMeasureXLayout(measures: StaffMeasure[]): number {
        // Finalize beams
        for (let measure of measures) {
            (measure as VexFlowMeasure).finalizeBeams();
        }
        // Format the voices
        let allVoices: Vex.Flow.Voice[] = [];
        let formatter: Vex.Flow.Formatter = new Vex.Flow.Formatter({
            align_rests: true,
        });
        for (let measure of measures) {
            let mvoices:  { [voiceID: number]: Vex.Flow.Voice; } = (measure as VexFlowMeasure).vfVoices;
            let voices: Vex.Flow.Voice[] = [];
            for (let voiceID in mvoices) {
                if (mvoices.hasOwnProperty(voiceID)) {
                    voices.push(mvoices[voiceID]);
                    allVoices.push(mvoices[voiceID]);
                }
            }
            if (voices.length === 0) {
                console.warn("Found a measure with no voices... Continuing anyway.", mvoices);
                continue;
            }
            formatter.joinVoices(voices);
        }
        let firstMeasure: VexFlowMeasure = measures[0] as VexFlowMeasure;
        // FIXME: The following ``+ 5.0'' is temporary: it was added as a workaround for
        // FIXME: a more relaxed formatting of voices
        let width: number = formatter.preCalculateMinTotalWidth(allVoices) / 10.0 + 5.0;
        for (let measure of measures) {
            measure.minimumStaffEntriesWidth = width;
            (measure as VexFlowMeasure).formatVoices = undefined;
        }
        firstMeasure.formatVoices = (w: number) => {
            formatter.format(allVoices, w);
        };
        return width;
    }

    protected updateStaffLineBorders(staffLine: StaffLine): void {
        return;
    }

    protected calculateMeasureNumberPlacement(musicSystem: MusicSystem): void {
        return;
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
    protected layoutVoiceEntry(voiceEntry: VoiceEntry, graphicalNotes: GraphicalNote[], graphicalStaffEntry: GraphicalStaffEntry,
                               hasPitchedNote: boolean, isGraceStaffEntry: boolean): void {
        return;
    }

    /**
     * Do all layout calculations that have to be done per staff entry, like dots, ornaments, arpeggios....
     * This method is called after the voice entries are handled by layoutVoiceEntry().
     * @param graphicalStaffEntry
     */
    protected layoutStaffEntry(graphicalStaffEntry: GraphicalStaffEntry): void {
        (graphicalStaffEntry.parentMeasure as VexFlowMeasure).layoutStaffEntry(graphicalStaffEntry);
    }

    /**
     * calculates the y positions of the staff lines within a system and
     * furthermore the y positions of the systems themselves.
     */
    protected calculateSystemYLayout(): void {
        for (let idx: number = 0, len: number = this.graphicalMusicSheet.MusicPages.length; idx < len; ++idx) {
            let graphicalMusicPage: GraphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            if (!this.leadSheet) {
                let globalY: number = 0;
                for (let idx2: number = 0, len2: number = graphicalMusicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                    let musicSystem: MusicSystem = graphicalMusicPage.MusicSystems[idx2];
                    // calculate y positions of stafflines within system
                    let y: number = 10;
                    for (let line of musicSystem.StaffLines) {
                        line.PositionAndShape.RelativePosition.y = y;
                        y += 10;
                    }
                    // set y positions of systems using the previous system and a fixed distance.
                    musicSystem.PositionAndShape.BorderBottom = y + 0;
                    musicSystem.PositionAndShape.RelativePosition.y = globalY;
                    globalY += y + 0;
                }
            }
        }
    }

    /**
     * Is called at the begin of the method for creating the vertically aligned staff measures belonging to one source measure.
     */
    protected initStaffMeasuresCreation(): void {
        return;
    }

    protected handleTie(tie: Tie, startGraphicalStaffEntry: GraphicalStaffEntry, staffIndex: number, measureIndex: number): void {
        return;
    }

    protected layoutGraphicalTie(tie: GraphicalTie, tieIsAtSystemBreak: boolean): void {
        return;
    }

    protected calculateSingleStaffLineLyricsPosition(staffLine: StaffLine, lyricVersesNumber: number[]): void {
        return;
    }

    protected calculateSingleOctaveShift(sourceMeasure: SourceMeasure, multiExpression: MultiExpression, measureIndex: number, staffIndex: number): void {
        return;
    }

    protected calculateWordRepetitionInstruction(repetitionInstruction: RepetitionInstruction, measureIndex: number): void {
        return;
    }

    protected calculateMoodAndUnknownExpression(multiExpression: MultiExpression, measureIndex: number, staffIndex: number): void {
        return;
    }

    protected createGraphicalTieNote(beams: Beam[], activeClef: ClefInstruction,
                                     octaveShiftValue: OctaveEnum, graphicalStaffEntry: GraphicalStaffEntry, duration: Fraction, numberOfDots: number,
                                     openTie: Tie, isLastTieNote: boolean): void {
        return;
    }

    /**
     * Is called if a note is part of a beam.
     * @param graphicalNote
     * @param beam
     * @param openBeams a list of all currently open beams
     */
    protected handleBeam(graphicalNote: GraphicalNote, beam: Beam, openBeams: Beam[]): void {
        (graphicalNote.parentStaffEntry.parentMeasure as VexFlowMeasure).handleBeam(graphicalNote, beam);
    }

    protected handleVoiceEntryLyrics(lyricsEntries: Dictionary<number, LyricsEntry>, voiceEntry: VoiceEntry,
                                     graphicalStaffEntry: GraphicalStaffEntry, openLyricWords: LyricWord[]): void {
        return;
    }

    protected handleVoiceEntryOrnaments(ornamentContainer: OrnamentContainer, voiceEntry: VoiceEntry, graphicalStaffEntry: GraphicalStaffEntry): void {
        return;
    }

    protected handleVoiceEntryArticulations(articulations: ArticulationEnum[], voiceEntry: VoiceEntry, graphicalStaffEntry: GraphicalStaffEntry): void {
        return;
    }

    /**
     * Is called if a note is part of a tuplet.
     * @param graphicalNote
     * @param tuplet
     * @param openTuplets a list of all currently open tuplets
     */
    protected handleTuplet(graphicalNote: GraphicalNote, tuplet: Tuplet, openTuplets: Tuplet[]): void {
        return;
    }
}
