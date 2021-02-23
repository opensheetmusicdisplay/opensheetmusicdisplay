import { Note } from "../../MusicalScore/VoiceData/Note";
import { VoiceEntry } from "../../MusicalScore/VoiceData/VoiceEntry";
import { IPlaybackEntry } from "./IPlaybackEntry";
import { IPlaybackNote } from "./IPlaybackNote";

export interface IPlaybackFactory {
    createPlaybackEntry(parentVoiceEntry: VoiceEntry): IPlaybackEntry;
    createPlaybackNote(playbackEntry: IPlaybackEntry, parentNote: Note): IPlaybackNote;
}
