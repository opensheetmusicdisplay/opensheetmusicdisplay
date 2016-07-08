import { IGraphicalSymbolFactory } from "../Interfaces/IGraphicalSymbolFactory";
import { KeyInstruction } from "../VoiceData/Instructions/KeyInstruction";
import { GraphicalNote } from "./GraphicalNote";
import { Pitch } from "../../Common/DataObjects/pitch";
export declare class AccidentalCalculator {
    private symbolFactory;
    private keySignatureNoteAlterationsDict;
    private currentAlterationsComparedToKeyInstructionDict;
    private currentInMeasureNoteAlterationsDict;
    private activeKeyInstruction;
    constructor(symbolFactory: IGraphicalSymbolFactory);
    ActiveKeyInstruction: KeyInstruction;
    doCalculationsAtEndOfMeasure(): void;
    checkAccidental(graphicalNote: GraphicalNote, pitch: Pitch, grace: boolean, graceScalingFactor: number): void;
    private reactOnKeyInstructionChange();
}
