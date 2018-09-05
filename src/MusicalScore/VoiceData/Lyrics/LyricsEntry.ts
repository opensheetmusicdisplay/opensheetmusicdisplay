import {LyricWord} from "./LyricsWord";
import {VoiceEntry} from "../VoiceEntry";

export class LyricsEntry {
    constructor(text: string, verseNumber: number, word: LyricWord, parent: VoiceEntry, syllableNumber: number = -1) {
        this.text = text;
        this.word = word;
        this.parent = parent;
        this.verseNumber = verseNumber;
        if (syllableNumber >= 0) {
            this.syllableIndex = syllableNumber;
        }
    }
    private text: string;
    private word: LyricWord;
    private parent: VoiceEntry;
    private verseNumber: number;
    private syllableIndex: number;
    public extend: boolean;

    public get Text(): string {
        return this.text;
    }
    public set Text(value: string) {
        this.text = value;
    }
    public get Word(): LyricWord {
        return this.word;
    }
    public get Parent(): VoiceEntry {
        return this.parent;
    }
    public set Parent(value: VoiceEntry) {
        this.parent = value;
    }

    public get VerseNumber(): number {
        return this.verseNumber;
    }

    public get SyllableIndex(): number {
        return this.syllableIndex;
    }
}
