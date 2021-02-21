import { VoiceEntry } from "../../MusicalScore/VoiceData/VoiceEntry";

export interface IPlaybackManager {
    playVoiceEntry(voiceEntry: VoiceEntry): void;
    reset(): void;
}
