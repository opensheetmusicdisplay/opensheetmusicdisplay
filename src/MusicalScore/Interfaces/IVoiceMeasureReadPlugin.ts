import { VoiceEntry, RhythmInstruction, KeyInstruction } from "../VoiceData";

export interface IVoiceMeasureReadPlugin {
    measureReadCalculations(measureVoiceEntries: VoiceEntry[], activeKey: KeyInstruction, activeRhythm: RhythmInstruction): void;
}
