import { Note } from "../VoiceData/Note";
export interface IQualityFeedbackTone {
    ParentNote: Note;
    TimingScore: number;
    PitchScore: number;
    getOverallQualityFeedbackScore(): number;
}
