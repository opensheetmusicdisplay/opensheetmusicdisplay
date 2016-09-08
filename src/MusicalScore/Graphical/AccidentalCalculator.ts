import {IGraphicalSymbolFactory} from "../Interfaces/IGraphicalSymbolFactory";
import {AccidentalEnum} from "../../Common/DataObjects/Pitch";
import {KeyInstruction} from "../VoiceData/Instructions/KeyInstruction";
import {GraphicalNote} from "./GraphicalNote";
import {Pitch} from "../../Common/DataObjects/Pitch";
import {NoteEnum} from "../../Common/DataObjects/Pitch";
import Dictionary from "typescript-collections/dist/lib/Dictionary";

/**
 * Compute the accidentals for notes according to the current key instruction
 */
export class AccidentalCalculator {
    private symbolFactory: IGraphicalSymbolFactory;
    private keySignatureNoteAlterationsDict: Dictionary<number, AccidentalEnum> = new Dictionary<number, AccidentalEnum>();
    private currentAlterationsComparedToKeyInstructionList: number[] = [];
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

    /**
     * This method is called after each Measure
     */
    public doCalculationsAtEndOfMeasure(): void {
        this.currentInMeasureNoteAlterationsDict.clear();
        for (let key of this.keySignatureNoteAlterationsDict.keys()) {
            this.currentInMeasureNoteAlterationsDict.setValue(key, this.keySignatureNoteAlterationsDict.getValue(key));
        }
    }

    public checkAccidental(graphicalNote: GraphicalNote, pitch: Pitch, grace: boolean, graceScalingFactor: number): void {
        if (pitch === undefined) {
            return;
        }
        let pitchKey: number = <number>pitch.FundamentalNote + pitch.Octave * 12;
        /*let pitchKeyGivenInMeasureDict: boolean = this.currentInMeasureNoteAlterationsDict.containsKey(pitchKey);
        if (
            (pitchKeyGivenInMeasureDict && this.currentInMeasureNoteAlterationsDict.getValue(pitchKey) !== pitch.Accidental)
            || (!pitchKeyGivenInMeasureDict && pitch.Accidental !== AccidentalEnum.NONE)
        ) {
            if (this.currentAlterationsComparedToKeyInstructionList.indexOf(pitchKey) === -1) {
                this.currentAlterationsComparedToKeyInstructionList.push(pitchKey);
            }
            this.currentInMeasureNoteAlterationsDict.setValue(pitchKey, pitch.Accidental);
            this.symbolFactory.addGraphicalAccidental(graphicalNote, pitch, grace, graceScalingFactor);
        } else if (
            this.currentAlterationsComparedToKeyInstructionList.indexOf(pitchKey) !== -1
            && ((pitchKeyGivenInMeasureDict && this.currentInMeasureNoteAlterationsDict.getValue(pitchKey) !== pitch.Accidental)
            || (!pitchKeyGivenInMeasureDict && pitch.Accidental === AccidentalEnum.NONE))
        ) {
            this.currentAlterationsComparedToKeyInstructionList.splice(this.currentAlterationsComparedToKeyInstructionList.indexOf(pitchKey), 1);
            this.currentInMeasureNoteAlterationsDict.setValue(pitchKey, pitch.Accidental);
            this.symbolFactory.addGraphicalAccidental(graphicalNote, pitch, grace, graceScalingFactor);
        }*/

        let isInCurrentAlterationsToKeyList: boolean = this.currentAlterationsComparedToKeyInstructionList.indexOf(pitchKey) >= 0;
        if (this.currentInMeasureNoteAlterationsDict.containsKey(pitchKey)) {
            if (isInCurrentAlterationsToKeyList) {
                this.currentAlterationsComparedToKeyInstructionList.splice(this.currentAlterationsComparedToKeyInstructionList.indexOf(pitchKey), 1);
            }
            if (this.currentInMeasureNoteAlterationsDict.getValue(pitchKey) !== pitch.Accidental) {
                if (this.keySignatureNoteAlterationsDict.containsKey(pitchKey) &&
                    this.keySignatureNoteAlterationsDict.getValue(pitchKey) !== pitch.Accidental) {
                    this.currentAlterationsComparedToKeyInstructionList.push(pitchKey);
                    this.currentInMeasureNoteAlterationsDict.setValue(pitchKey, pitch.Accidental);
                } else {
                    this.currentInMeasureNoteAlterationsDict.remove(pitchKey);
                }
                this.symbolFactory.addGraphicalAccidental(graphicalNote, pitch, grace, graceScalingFactor);
            }
        } else {
            if (pitch.Accidental !== AccidentalEnum.NONE) {
                if (!isInCurrentAlterationsToKeyList) {
                    this.currentAlterationsComparedToKeyInstructionList.push(pitchKey);
                }
                this.currentInMeasureNoteAlterationsDict.setValue(pitchKey, pitch.Accidental);
                this.symbolFactory.addGraphicalAccidental(graphicalNote, pitch, grace, graceScalingFactor);
            } else {
                if (isInCurrentAlterationsToKeyList) {
                    this.currentAlterationsComparedToKeyInstructionList.splice(this.currentAlterationsComparedToKeyInstructionList.indexOf(pitchKey), 1);
                    this.symbolFactory.addGraphicalAccidental(graphicalNote, pitch, grace, graceScalingFactor);
                }
            }
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
        this.keySignatureNoteAlterationsDict.clear();
        this.currentAlterationsComparedToKeyInstructionList.length = 0;
        for (let octave: number = -9; octave < 9; octave++) {
            for (let i: number = 0; i < noteEnums.length; i++) {
                this.keySignatureNoteAlterationsDict.setValue(<number>noteEnums[i] + octave * 12, keyAccidentalType);
            }
        }
        this.doCalculationsAtEndOfMeasure();
    }
}
