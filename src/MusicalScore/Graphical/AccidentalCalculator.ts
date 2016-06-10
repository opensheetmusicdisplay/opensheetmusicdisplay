import {IGraphicalSymbolFactory} from "../Interfaces/IGraphicalSymbolFactory";
import {AccidentalEnum} from "../../Common/DataObjects/pitch";
import {KeyInstruction} from "../VoiceData/Instructions/KeyInstruction";
import {GraphicalNote} from "./GraphicalNote";
import {Pitch} from "../../Common/DataObjects/pitch";
import {NoteEnum} from "../../Common/DataObjects/pitch";
export class AccidentalCalculator {
    private symbolFactory: IGraphicalSymbolFactory;
    private keySignatureNoteAlterationsDict: Dictionary<number, AccidentalEnum> = new Dictionary<number, AccidentalEnum>();
    private currentAlterationsComparedToKeyInstructionDict: List<number> = new List<number>();
    private currentInMeasureNoteAlterationsDict: Dictionary<number, AccidentalEnum> = new Dictionary<number, AccidentalEnum>();
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
        this.currentInMeasureNoteAlterationsDict.Clear();
        var keySignatureNoteAlterationsDictArr: KeyValuePair<number, AccidentalEnum>[] = this.keySignatureNoteAlterationsDict.ToArray();
        for (var idx: number = 0, len = keySignatureNoteAlterationsDictArr.length; idx < len; ++idx) {
            var pair: KeyValuePair<number, AccidentalEnum> = keySignatureNoteAlterationsDictArr[idx];
            this.currentInMeasureNoteAlterationsDict[pair.Key] = pair.Value;
        }
    }
    public checkAccidental(graphicalNote: GraphicalNote, pitch: Pitch, grace: boolean, graceScalingFactor: number): void {
        if (pitch == null)
            return
        var pitchKey: number = <number>pitch.FundamentalNote + pitch.Octave * 12;
        var pitchKeyGivenInMeasureDict: boolean = this.currentInMeasureNoteAlterationsDict.ContainsKey(pitchKey);
        if ((pitchKeyGivenInMeasureDict && this.currentInMeasureNoteAlterationsDict[pitchKey] != pitch.Accidental) || (!pitchKeyGivenInMeasureDict && pitch.Accidental != AccidentalEnum.NONE)) {
            if (!this.currentAlterationsComparedToKeyInstructionDict.Contains(pitchKey))
                this.currentAlterationsComparedToKeyInstructionDict.Add(pitchKey);
            this.currentInMeasureNoteAlterationsDict[pitchKey] = pitch.Accidental;
            this.symbolFactory.addGraphicalAccidental(graphicalNote, pitch, grace, graceScalingFactor);
        }
        else if (this.currentAlterationsComparedToKeyInstructionDict.Contains(pitchKey) && ((pitchKeyGivenInMeasureDict && this.currentInMeasureNoteAlterationsDict[pitchKey] != pitch.Accidental) || (!pitchKeyGivenInMeasureDict && pitch.Accidental == AccidentalEnum.NONE))) {
            this.currentAlterationsComparedToKeyInstructionDict.Remove(pitchKey);
            this.currentInMeasureNoteAlterationsDict[pitchKey] = pitch.Accidental;
            this.symbolFactory.addGraphicalAccidental(graphicalNote, pitch, grace, graceScalingFactor);
        }
    }
    private reactOnKeyInstructionChange(): void {
        var noteEnums: List<NoteEnum> = KeyInstruction.getNoteEnumList(this.activeKeyInstruction);
        var keyAccidentalType: AccidentalEnum;
        if (this.activeKeyInstruction.Key > 0)
            keyAccidentalType = AccidentalEnum.SHARP;
        else keyAccidentalType = AccidentalEnum.FLAT;
        this.keySignatureNoteAlterationsDict.Clear();
        this.currentAlterationsComparedToKeyInstructionDict.Clear();
        for (var octave: number = -9; octave < 9; octave++) {
            for (var i: number = 0; i < noteEnums.Count; i++) {
                this.keySignatureNoteAlterationsDict.Add(<number>noteEnums[i] + octave * 12, keyAccidentalType);
            }
        }
        this.doCalculationsAtEndOfMeasure();
    }
}