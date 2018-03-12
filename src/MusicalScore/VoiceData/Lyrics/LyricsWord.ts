import {LyricsEntry} from "./LyricsEntry";
import {VoiceEntry} from "../VoiceEntry";

export class LyricWord {
    private syllables: LyricsEntry[] = [];

    public get Syllables(): LyricsEntry[] {
        return this.syllables;
    }
    public containsVoiceEntry(voiceEntry: VoiceEntry): boolean {
        for (let idx: number = 0, len: number = this.Syllables.length; idx < len; ++idx) {
            const lyricsEntry: LyricsEntry = this.Syllables[idx];
            if (lyricsEntry.Parent === voiceEntry) {
                return true;
            }
        }
        return false;
    }
    public findLyricEntryInVoiceEntry(voiceEntry: VoiceEntry): LyricsEntry {
        for (let idx: number = 0, len: number = this.Syllables.length; idx < len; ++idx) {
            const lyricsEntry: LyricsEntry = this.Syllables[idx];
            if (lyricsEntry.Parent === voiceEntry) {
                return lyricsEntry;
            }
        }
    }
}
