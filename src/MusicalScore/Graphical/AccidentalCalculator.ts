import {IGraphicalSymbolFactory} from "../Interfaces/IGraphicalSymbolFactory";
import {AccidentalEnum} from "../../Common/DataObjects/pitch";
import {KeyInstruction} from "../VoiceData/Instructions/KeyInstruction";
import {GraphicalNote} from "./GraphicalNote";
import {Pitch} from "../../Common/DataObjects/pitch";
import {NoteEnum} from "../../Common/DataObjects/pitch";

export class AccidentalCalculator {
    private symbolFactory: IGraphicalSymbolFactory;
    private keySignatureNoteAlterationsDict: { [_: number]: AccidentalEnum; } = {};
    private currentAlterationsComparedToKeyInstructionDict: number[] = [];
    private currentInMeasureNoteAlterationsDict: { [_: number]: AccidentalEnum; } = {};
    private activeKeyInstruction: KeyInstruction;

    constructor(symbolFactory: IGraphicalSymbolFactory) {
        this.symbolFactory = symbolFactory;
    }

    public get ActiveKeyInstruction(): KeyInstruction {
        return this.activeKeyInstruction;
    }

    public set ActiveKeyInstruction(value: KeyInstruction) {
        this.activeKeyInstruction = value;
        this.reactOnKeyInstructionChange();
    }

    public doCalculationsAtEndOfMeasure(): void {
        this.currentInMeasureNoteAlterationsDict = {};
        for (let key in this.keySignatureNoteAlterationsDict) {
            if (this.keySignatureNoteAlterationsDict.hasOwnProperty(key)) {
                this.currentInMeasureNoteAlterationsDict[key] = this.keySignatureNoteAlterationsDict[key];
            }
        }
    }

    public checkAccidental(graphicalNote: GraphicalNote, pitch: Pitch, grace: boolean, graceScalingFactor: number): void {
        if (pitch === undefined) {
            return;
        }
        let pitchKey: number = <number>pitch.FundamentalNote + pitch.Octave * 12;
        let pitchKeyGivenInMeasureDict: boolean = this.currentInMeasureNoteAlterationsDict.hasOwnProperty(pitchKey as string);
        if (
            (pitchKeyGivenInMeasureDict && this.currentInMeasureNoteAlterationsDict[pitchKey] !== pitch.Accidental)
            || (!pitchKeyGivenInMeasureDict && pitch.Accidental !== AccidentalEnum.NONE)
        ) {
            if (this.currentAlterationsComparedToKeyInstructionDict.indexOf(pitchKey) === -1) {
                this.currentAlterationsComparedToKeyInstructionDict.push(pitchKey);
            }
            this.currentInMeasureNoteAlterationsDict[pitchKey] = pitch.Accidental;
            this.symbolFactory.addGraphicalAccidental(graphicalNote, pitch, grace, graceScalingFactor);
        } else if (
            this.currentAlterationsComparedToKeyInstructionDict.indexOf(pitchKey) !== -1
            && ((pitchKeyGivenInMeasureDict && this.currentInMeasureNoteAlterationsDict[pitchKey] !== pitch.Accidental)
            || (!pitchKeyGivenInMeasureDict && pitch.Accidental === AccidentalEnum.NONE))
        ) {
            delete this.currentAlterationsComparedToKeyInstructionDict[pitchKey];
            this.currentInMeasureNoteAlterationsDict[pitchKey] = pitch.Accidental;
            this.symbolFactory.addGraphicalAccidental(graphicalNote, pitch, grace, graceScalingFactor);
        }
    }

    private reactOnKeyInstructionChange(): void {
        let noteEnums: NoteEnum[] = KeyInstruction.getNoteEnumList(this.activeKeyInstruction);
        let keyAccidentalType: AccidentalEnum;
        if (this.activeKeyInstruction.Key > 0) {
            keyAccidentalType = AccidentalEnum.SHARP;
        } else {
            keyAccidentalType = AccidentalEnum.FLAT;
        }
        this.keySignatureNoteAlterationsDict = {};
        this.currentAlterationsComparedToKeyInstructionDict.length = 0;
        for (let octave: number = -9; octave < 9; octave++) {
            for (let i: number = 0; i < noteEnums.length; i++) {
                this.keySignatureNoteAlterationsDict[<number>noteEnums[i] + octave * 12] = keyAccidentalType;
            }
        }
        this.doCalculationsAtEndOfMeasure();
    }
}
