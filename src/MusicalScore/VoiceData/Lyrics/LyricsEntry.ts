import {LyricWord} from "./LyricsWord";
import {VoiceEntry} from "../VoiceEntry";
import { FontStyles } from "../../../Common/Enums/FontStyles";

export class LyricsEntry {
    constructor(text: string, verseNumber: string, word: LyricWord, parent: VoiceEntry, syllableNumber: number = -1) {
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
    private verseNumber: string;
    private syllableIndex: number;
    public extend: boolean;
    /** The syllabic value read from the XML (single/begin/middle/end).
     *  Kept to allow re-linking word chains across voices after reading. */
    public syllabic: string = "single";

    public get Text(): string {
        return this.text;
    }
    public set Text(value: string) {
        this.text = value;
    }
    public get Word(): LyricWord {
        return this.word;
    }
    public set Word(value: LyricWord) {
        this.word = value;
    }
    public get Parent(): VoiceEntry {
        return this.parent;
    }
    public set Parent(value: VoiceEntry) {
        this.parent = value;
    }

    public get VerseNumber(): string {
        return this.verseNumber;
    }

    public get SyllableIndex(): number {
        return this.syllableIndex;
    }
    public set SyllableIndex(value: number) {
        this.syllableIndex = value;
    }

    public get IsTranslation(): boolean {
        return this.VerseNumber.endsWith("translation");
    }

    public get IsChorus(): boolean {
        return this.VerseNumber.startsWith("chorus");
    }

    public get FontStyle(): FontStyles {
        return this.IsChorus || this.IsTranslation ? FontStyles.Italic : FontStyles.Regular;
    }
}
