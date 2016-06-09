import {LyricWord} from "../VoiceData/Lyrics/LyricsWord";
import {GraphicalLyricEntry} from "./GraphicalLyricEntry";
export class GraphicalLyricWord {
    private lyricWord: LyricWord;
    private graphicalLyricsEntries: List<GraphicalLyricEntry> = new List<GraphicalLyricEntry>();
    constructor(lyricWord: LyricWord) {
        this.lyricWord = lyricWord;
        this.initialize();
    }
    public get GetLyricWord(): LyricWord {
        return this.lyricWord;
    }
    public get GraphicalLyricsEntries(): List<GraphicalLyricEntry> {
        return this.graphicalLyricsEntries;
    }
    public set GraphicalLyricsEntries(value: List<GraphicalLyricEntry>) {
        this.graphicalLyricsEntries = value;
    }
    public isFilled(): boolean {
        for (var i: number = 0; i < this.graphicalLyricsEntries.Count; i++)
            if (this.graphicalLyricsEntries[i] == null)
                return false;
        return true;
    }
    private initialize(): void {
        for (var i: number = 0; i < this.lyricWord.Syllabels.Count; i++)
            this.graphicalLyricsEntries.Add(null);
    }
}