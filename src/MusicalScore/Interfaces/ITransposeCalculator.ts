import {Pitch} from "../../Common/DataObjects/Pitch";
import {KeyInstruction} from "../VoiceData/Instructions/KeyInstruction";
import {EngravingRules} from "../Graphical/EngravingRules";

export interface ITransposeCalculator {
    /** Set by OpenSheetMusicDisplay.TransposeCalculator, so that a calculator can read transposition rules
     * like EngravingRules.StrictTransposeSpelling. Optional: a custom calculator can ignore the rules. */
    rules?: EngravingRules;
    transposePitch(pitch: Pitch, currentKeyInstruction: KeyInstruction, halftones: number): Pitch;
    transposeKey(keyInstruction: KeyInstruction, transpose: number): void;
}
