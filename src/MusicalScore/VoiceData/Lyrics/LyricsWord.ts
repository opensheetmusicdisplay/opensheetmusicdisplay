import {LyricsEntry} from "./LyricsEntry";
import {VoiceEntry} from "../VoiceEntry";

export class LyricWord {
    private syllables: LyricsEntry[] = [];

    public get Syllables(): LyricsEntry[] {
        return this.syllables;
    }
    public addSyllable(lyricsEntry: LyricsEntry): void {
        const previousSyllable: LyricsEntry = this.syllables[this.syllables.length - 1];
        if (previousSyllable && this.hasInterveningPitchedVoiceEntry(previousSyllable.Parent, lyricsEntry.Parent)) {
            previousSyllable.markAsInferredMelisma();
        }
        this.syllables.push(lyricsEntry);
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

    private hasInterveningPitchedVoiceEntry(startEntry: VoiceEntry, endEntry: VoiceEntry): boolean {
        if (!startEntry || !endEntry || startEntry.ParentVoice !== endEntry.ParentVoice) {
            return false;
        }
        const voiceEntries: VoiceEntry[] = startEntry.ParentVoice.VoiceEntries;
        const startIndex: number = voiceEntries.indexOf(startEntry);
        const endIndex: number = voiceEntries.indexOf(endEntry);
        if (startIndex < 0 || endIndex <= startIndex + 1) {
            return false;
        }
        return voiceEntries.slice(startIndex + 1, endIndex).some(
            (voiceEntry: VoiceEntry): boolean =>
                !voiceEntry.IsGrace && voiceEntry.Notes.some(note => !note.isRest()),
        );
    }
}
