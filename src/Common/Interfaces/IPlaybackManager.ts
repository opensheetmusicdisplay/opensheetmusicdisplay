import { VoiceEntry } from "../../MusicalScore/VoiceData/VoiceEntry";
//TODO: This will go to the playback plugin
export interface IPlaybackManager {
    playVoiceEntry(voiceEntry: VoiceEntry): void;
    reset(): void;
}
