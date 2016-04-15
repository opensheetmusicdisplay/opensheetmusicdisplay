import {LyricWord} from "./LyricsWord";

export class LyricsEntry {
    constructor(text: string, word: LyricWord, parent: VoiceEntry) {
        this._text = text;
        this._word = word;
        this._parent = parent;
    }
    private _text: string;
    private _word: LyricWord;
    private _parent: VoiceEntry;
    public get Text(): string {
        return this._text;
    }
    public set Text(value: string) {
        this._text = value;
    }
    public get Word(): LyricWord {
        return this._word;
    }
    public get Parent(): VoiceEntry {
        return this._parent;
    }
    public set Parent(value: VoiceEntry) {
        this._parent = value;
    }
}
