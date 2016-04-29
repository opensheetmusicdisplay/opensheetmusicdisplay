import {LyricWord} from "./LyricsWord";
import {VoiceEntry} from "../VoiceEntry";

export class LyricsEntry {
    constructor(text: string, word: LyricWord, parent: VoiceEntry) {
        this.text = text;
        this.word = word;
        this.parent = parent;
    }
    private text: string;
    private word: LyricWord;
    private parent: VoiceEntry;

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
}
