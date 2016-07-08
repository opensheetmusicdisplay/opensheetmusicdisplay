import { LyricsEntry } from "../VoiceData/Lyrics/LyricsEntry";
import { GraphicalLyricWord } from "./GraphicalLyricWord";
import { GraphicalLabel } from "./GraphicalLabel";
import { GraphicalStaffEntry } from "./GraphicalStaffEntry";
export declare class GraphicalLyricEntry {
    private lyricsEntry;
    private graphicalLyricWord;
    private graphicalLabel;
    private graphicalStaffEntry;
    constructor(lyricsEntry: LyricsEntry, graphicalStaffEntry: GraphicalStaffEntry, lyricsHeight: number, staffHeight: number);
    GetLyricsEntry: LyricsEntry;
    ParentLyricWord: GraphicalLyricWord;
    GraphicalLabel: GraphicalLabel;
    StaffEntryParent: GraphicalStaffEntry;
}
