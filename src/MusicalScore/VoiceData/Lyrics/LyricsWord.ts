import {LyricsEntry} from "./LyricsEntry";

export class LyricWord {
    private _syllabels: Array<LyricsEntry> = new Array<LyricsEntry>();
    public get Syllabels(): Array<LyricsEntry> {
        return this._syllabels;
    }
    public containsVoiceEntry(voiceEntry: VoiceEntry): boolean {
        for (let idx: number = 0, len: number = this.Syllabels.length; idx < len; ++idx) {
            let lyricsEntry: LyricsEntry = this.Syllabels[idx];
            if (lyricsEntry.Parent === voiceEntry) {
                return true;
            }
        }
        return false;
    }
    public findLyricEntryInVoiceEntry(voiceEntry: VoiceEntry): LyricsEntry {
        for (let idx: number = 0, len: number = this.Syllabels.length; idx < len; ++idx) {
            let lyricsEntry: LyricsEntry = this.Syllabels[idx];
            if (lyricsEntry.Parent === voiceEntry) {
                return lyricsEntry;
            }
        }
        return undefined;
    }
}
