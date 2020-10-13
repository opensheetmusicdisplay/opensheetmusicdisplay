import {LyricWord} from "../VoiceData/Lyrics/LyricsWord";
import {GraphicalLyricEntry} from "./GraphicalLyricEntry";

/**
 * The graphical counterpart of a [[LyricWord]]
 */
export class GraphicalLyricWord {
    private lyricWord: LyricWord;
    private graphicalLyricsEntries: GraphicalLyricEntry[] = [];

    constructor(lyricWord: LyricWord) {
        this.lyricWord = lyricWord;
        this.initialize();
    }

    public get GetLyricWord(): LyricWord {
        return this.lyricWord;
    }

    public get GraphicalLyricsEntries(): GraphicalLyricEntry[] {
        return this.graphicalLyricsEntries;
    }

    public set GraphicalLyricsEntries(value: GraphicalLyricEntry[]) {
        this.graphicalLyricsEntries = value;
    }

    public isFilled(): boolean {
        for (let i: number = 0; i < this.graphicalLyricsEntries.length; i++) {
            if (!this.graphicalLyricsEntries[i]) {
                return false;
            }
        }
        return true;
    }

    private initialize(): void {
        // FIXME: This is actually not needed in Javascript as we have dynamic memory allication?
        for (let i: number = 0; i < this.lyricWord.Syllables.length; i++) {
            this.graphicalLyricsEntries.push(undefined);
        }
    }
}
