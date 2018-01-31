import {GraphicalStaffEntry} from "../GraphicalStaffEntry";
import {VexFlowMeasure} from "./VexFlowMeasure";
import {SourceStaffEntry} from "../../VoiceData/SourceStaffEntry";
import {GraphicalNote} from "../GraphicalNote";
import {unitInPixels} from "./VexFlowMusicSheetDrawer";
import {VoiceEntry} from "../../VoiceData/VoiceEntry";
import {GraphicalLyricEntry} from "../GraphicalLyricEntry";
import {LyricsEntry} from "../../VoiceData/Lyrics/LyricsEntry";
import { LyricWord } from "../../VoiceData/Lyrics/LyricsWord";

export class VexFlowStaffEntry extends GraphicalStaffEntry {
    constructor(measure: VexFlowMeasure, sourceStaffEntry: SourceStaffEntry, staffEntryParent: VexFlowStaffEntry) {
        super(measure, sourceStaffEntry, staffEntryParent);
    }

    // The Graphical Notes belonging to this StaffEntry, sorted by voiceID
    public graphicalNotes: { [voiceID: number]: GraphicalNote[]; } = {};
    // The corresponding VexFlow.StaveNotes
    public vfNotes: { [voiceID: number]: Vex.Flow.StaveNote; } = {};

    /**
     *
     * @returns {number} the x-position (in units) of this StaffEntry
     */
    public getX(): number {
        let x: number = 0;
        let n: number = 0;
        const vfNotes: { [voiceID: number]: Vex.Flow.StaveNote; } = this.vfNotes;
        for (const voiceId in vfNotes) {
            if (vfNotes.hasOwnProperty(voiceId)) {
                x += (vfNotes[voiceId].getNoteHeadBeginX() + vfNotes[voiceId].getNoteHeadEndX()) / 2;
                n += 1;
            }
        }
        if (n === 0) {
            return 0;
        }
        return x / n / unitInPixels;
    }

    public handleVoiceEntryLyrics(voiceEntry: VoiceEntry, graphicalStaffEntry: GraphicalStaffEntry, openLyricWords: LyricWord[]): void {
        // FIXME: lyricsEntries is private. BUT it would seem that I should set these entries here.protected?
        voiceEntry.LyricsEntries.forEach((key: number, value: LyricsEntry) => {
            const graphicalLyricsEntry: GraphicalLyricEntry = new GraphicalLyricEntry(value, graphicalStaffEntry, 1.8, 0);
            this.LyricsEntries.push(graphicalLyricsEntry);
            if (value.Word !== undefined && openLyricWords.indexOf(value.Word) === -1) {
                openLyricWords.push(value.Word);
            }
        });
    }
}
