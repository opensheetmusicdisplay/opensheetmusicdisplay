import { Note } from "../../MusicalScore/VoiceData/Note";

export interface IQualityFeedbackTone {
    ParentNote: Note;
    TimingScore: number;
    PitchScore: number;
    getOverallQualityFeedbackScore(): number;
}
