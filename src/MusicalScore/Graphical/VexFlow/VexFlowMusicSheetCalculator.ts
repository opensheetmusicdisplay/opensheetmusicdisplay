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
import {MultiExpression} from "../../VoiceData/Expressions/MultiExpression";
import {RepetitionInstruction} from "../../VoiceData/Instructions/RepetitionInstruction";
import {Beam} from "../../VoiceData/Beam";
import {ClefInstruction} from "../../VoiceData/Instructions/ClefInstruction";
import {OctaveEnum} from "../../VoiceData/Expressions/ContinuousExpressions/OctaveShift";
import {Fraction} from "../../../Common/DataObjects/Fraction";
import {LyricsEntry} from "../../VoiceData/Lyrics/LyricsEntry";
import {LyricWord} from "../../VoiceData/Lyrics/LyricsWord";
import {OrnamentContainer} from "../../VoiceData/OrnamentContainer";
import {ArticulationEnum} from "../../VoiceData/VoiceEntry";
import {Tuplet} from "../../VoiceData/Tuplet";
import Dictionary from "typescript-collections/dist/lib/Dictionary";
import {VexFlowMeasure} from "./VexFlowMeasure";
import {VexFlowTextMeasurer} from "./VexFlowTextMeasurer";

import Vex = require("vexflow");
import {Logging} from "../../../Common/Logging";
import {unitInPixels} from "./VexFlowMusicSheetDrawer";
import {VexFlowGraphicalNote} from "./VexFlowGraphicalNote";

export class VexFlowMusicSheetCalculator extends MusicSheetCalculator {
    constructor() {
        super(new VexFlowGraphicalSymbolFactory());
        let a: LyricsEntry = new LyricsEntry(undefined, undefined, undefined);
        a = a;
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
        /*for (let measure of measures) {
            (measure as VexFlowMeasure).finalizeBeams();
            (measure as VexFlowMeasure).finalizeTuplets();
        }*/
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
                Logging.warn("Found a measure with no voices... Continuing anyway.", mvoices);
                continue;
            }
            formatter.joinVoices(voices);
        }

        let width: number = 200;
        if (allVoices.length > 0) {
            let firstMeasure: VexFlowMeasure = measures[0] as VexFlowMeasure;
            // FIXME: The following ``+ 5.0'' is temporary: it was added as a workaround for
            // FIXME: a more relaxed formatting of voices
            width = formatter.preCalculateMinTotalWidth(allVoices) / unitInPixels + 5.0;
            for (let measure of measures) {
                measure.minimumStaffEntriesWidth = width;
                (measure as VexFlowMeasure).formatVoices = undefined;
            }
            firstMeasure.formatVoices = (w: number) => {
                formatter.format(allVoices, w);
            };
        }

        return width;
    }

    protected createGraphicalTie(tie: Tie, startGse: GraphicalStaffEntry, endGse: GraphicalStaffEntry,
                                 startNote: GraphicalNote, endNote: GraphicalNote): GraphicalTie {
        return new GraphicalTie(tie, startNote, endNote);
    }


    protected updateStaffLineBorders(staffLine: StaffLine): void {
        return;
    }

    protected calculateMeasureNumberPlacement(musicSystem: MusicSystem): void {
        return;
    }

    protected staffMeasureCreatedCalculations(measure: StaffMeasure): void {
        (measure as VexFlowMeasure).staffMeasureCreatedCalculations();
    }

    /**
     * Can be used to calculate articulations, stem directions, helper(ledger) lines, and overlapping note x-displacement.
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
                let globalY: number = this.rules.PageTopMargin + this.rules.TitleTopDistance + this.rules.SheetTitleHeight +
                    this.rules.TitleBottomDistance;
                for (let idx2: number = 0, len2: number = graphicalMusicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                    let musicSystem: MusicSystem = graphicalMusicPage.MusicSystems[idx2];
                    // calculate y positions of stafflines within system
                    let y: number = 0;
                    for (let line of musicSystem.StaffLines) {
                        line.PositionAndShape.RelativePosition.y = y;
                        y += 10;
                    }
                    // set y positions of systems using the previous system and a fixed distance.
                    musicSystem.PositionAndShape.BorderBottom = y + 0;
                    musicSystem.PositionAndShape.RelativePosition.x = this.rules.PageLeftMargin + this.rules.SystemLeftMargin;
                    musicSystem.PositionAndShape.RelativePosition.y = globalY;
                    globalY += y + 5;
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

    protected layoutGraphicalTie(tie: GraphicalTie, tieIsAtSystemBreak: boolean): void {
        let startNote: VexFlowGraphicalNote = (tie.StartNote as VexFlowGraphicalNote);
        let vfStartNote: Vex.Flow.StaveNote = undefined;
        if (startNote !== undefined) {
            vfStartNote = startNote.vfnote[0];
        }

        let endNote: VexFlowGraphicalNote = (tie.EndNote as VexFlowGraphicalNote);
        let vfEndNote: Vex.Flow.StaveNote = undefined;
        if (endNote !== undefined) {
            vfEndNote = endNote.vfnote[0];
        }


        if (tieIsAtSystemBreak) {
            // split tie into two ties:
            let vfTie1: Vex.Flow.StaveTie = new Vex.Flow.StaveTie({
                first_note: vfStartNote,
            });
            let measure1: VexFlowMeasure = (startNote.parentStaffEntry.parentMeasure as VexFlowMeasure);
            measure1.vfTies.push(vfTie1);

            let vfTie2: Vex.Flow.StaveTie = new Vex.Flow.StaveTie({
                last_note : vfEndNote,
            });
            let measure2: VexFlowMeasure = (endNote.parentStaffEntry.parentMeasure as VexFlowMeasure);
            measure2.vfTies.push(vfTie2);
        } else {
            let vfTie: Vex.Flow.StaveTie = new Vex.Flow.StaveTie({
                first_note: vfStartNote,
                last_note : vfEndNote,
            });
            let measure: VexFlowMeasure = (endNote.parentStaffEntry.parentMeasure as VexFlowMeasure);
            measure.vfTies.push(vfTie);
        }
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

    protected handleTiedGraphicalNote(  tiedGraphicalNote: GraphicalNote, beams: Beam[], activeClef: ClefInstruction,
                                        octaveShiftValue: OctaveEnum, graphicalStaffEntry: GraphicalStaffEntry, duration: Fraction,
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
        (graphicalNote.parentStaffEntry.parentMeasure as VexFlowMeasure).handleTuplet(graphicalNote, tuplet);
    }
}
