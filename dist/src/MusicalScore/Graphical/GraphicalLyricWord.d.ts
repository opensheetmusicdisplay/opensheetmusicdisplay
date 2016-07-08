import { LyricWord } from "../VoiceData/Lyrics/LyricsWord";
import { GraphicalLyricEntry } from "./GraphicalLyricEntry";
export declare class GraphicalLyricWord {
    private lyricWord;
    private graphicalLyricsEntries;
    constructor(lyricWord: LyricWord);
    GetLyricWord: LyricWord;
    GraphicalLyricsEntries: GraphicalLyricEntry[];
    isFilled(): boolean;
    private initialize();
}
