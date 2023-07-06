import { Pitch } from "../../Common/DataObjects/Pitch";
import { KeyInstruction } from "../VoiceData/Instructions/KeyInstruction";
import { TransposeOptions } from "../../Plugins";

export interface ITransposeCalculator {
    Options?: TransposeOptions;
    transposePitch(pitch: Pitch, currentKeyInstruction: KeyInstruction, halftones: number): Pitch;
    transposeKey(keyInstruction: KeyInstruction, transpose: number): void;
}
