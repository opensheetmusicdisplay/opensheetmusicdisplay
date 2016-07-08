import { LyricWord } from "./LyricsWord";
import { VoiceEntry } from "../VoiceEntry";
export declare class LyricsEntry {
    constructor(text: string, word: LyricWord, parent: VoiceEntry);
    private text;
    private word;
    private parent;
    Text: string;
    Word: LyricWord;
    Parent: VoiceEntry;
}
