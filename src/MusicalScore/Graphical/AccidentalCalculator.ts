import {AccidentalEnum} from "../../Common/DataObjects/Pitch";
import {KeyInstruction} from "../VoiceData/Instructions/KeyInstruction";
import {GraphicalNote} from "./GraphicalNote";
import {Pitch} from "../../Common/DataObjects/Pitch";
import {NoteEnum} from "../../Common/DataObjects/Pitch";
import Dictionary from "typescript-collections/dist/lib/Dictionary";
import { MusicSheetCalculator } from "./MusicSheetCalculator";

/**
 * Compute the accidentals for notes according to the current key instruction
 */
export class AccidentalCalculator {
    private keySignatureNoteAlterationsDict: Dictionary<number, AccidentalEnum> = new Dictionary<number, AccidentalEnum>();
    private currentAlterationsComparedToKeyInstructionList: number[] = [];
    private currentInMeasureNoteAlterationsDict: Dictionary<number, AccidentalEnum> = new Dictionary<number, AccidentalEnum>();
    private activeKeyInstruction: KeyInstruction;

    public get ActiveKeyInstruction(): KeyInstruction {
        return this.activeKeyInstruction;
    }

    public set ActiveKeyInstruction(value: KeyInstruction) {
        this.activeKeyInstruction = value;
        this.reactOnKeyInstructionChange();
    }

    /**
     * This method is called after each Measure
     * It clears the in-measure alterations dict for the next measure
     * and pre-loads with the alterations of the key signature
     */
    public doCalculationsAtEndOfMeasure(): void {
        this.currentInMeasureNoteAlterationsDict.clear();
        for (const key of this.keySignatureNoteAlterationsDict.keys()) {
            this.currentInMeasureNoteAlterationsDict.setValue(key, this.keySignatureNoteAlterationsDict.getValue(key));
        }
    }

    public checkAccidental(graphicalNote: GraphicalNote, pitch: Pitch): void {
        if (!pitch) {
            return;
        }
        const pitchKey: number = <number>pitch.FundamentalNote + pitch.Octave * 12;
        /*let pitchKeyGivenInMeasureDict: boolean = this.currentInMeasureNoteAlterationsDict.containsKey(pitchKey);
        if (
            (pitchKeyGivenInMeasureDict && this.currentInMeasureNoteAlterationsDict.getValue(pitchKey) !== pitch.Accidental)
            || (!pitchKeyGivenInMeasureDict && pitch.Accidental !== AccidentalEnum.NONE)
        ) {
            if (this.currentAlterationsComparedToKeyInstructionList.indexOf(pitchKey) === -1) {
                this.currentAlterationsComparedToKeyInstructionList.push(pitchKey);
            }
            this.currentInMeasureNoteAlterationsDict.setValue(pitchKey, pitch.Accidental);
            this.symbolFactory.addGraphicalAccidental(graphicalNote, pitch);
        } else if (
            this.currentAlterationsComparedToKeyInstructionList.indexOf(pitchKey) !== -1
            && ((pitchKeyGivenInMeasureDict && this.currentInMeasureNoteAlterationsDict.getValue(pitchKey) !== pitch.Accidental)
            || (!pitchKeyGivenInMeasureDict && pitch.Accidental === AccidentalEnum.NONE))
        ) {
            this.currentAlterationsComparedToKeyInstructionList.splice(this.currentAlterationsComparedToKeyInstructionList.indexOf(pitchKey), 1);
            this.currentInMeasureNoteAlterationsDict.setValue(pitchKey, pitch.Accidental);
            this.symbolFactory.addGraphicalAccidental(graphicalNote, pitch);
        }*/

        const isInCurrentAlterationsToKeyList: boolean = this.currentAlterationsComparedToKeyInstructionList.indexOf(pitchKey) >= 0;
        if (this.currentInMeasureNoteAlterationsDict.containsKey(pitchKey)) {
            if (isInCurrentAlterationsToKeyList) {
                this.currentAlterationsComparedToKeyInstructionList.splice(this.currentAlterationsComparedToKeyInstructionList.indexOf(pitchKey), 1);
            }
            if (this.currentInMeasureNoteAlterationsDict.getValue(pitchKey) !== pitch.AccidentalHalfTones) {
                if (this.keySignatureNoteAlterationsDict.containsKey(pitchKey) &&
                    this.keySignatureNoteAlterationsDict.getValue(pitchKey) !== pitch.AccidentalHalfTones) {
                    this.currentAlterationsComparedToKeyInstructionList.push(pitchKey);
                    this.currentInMeasureNoteAlterationsDict.setValue(pitchKey, pitch.AccidentalHalfTones);
                } else {
                    this.currentInMeasureNoteAlterationsDict.remove(pitchKey);
                }

                if (pitch.Accidental === AccidentalEnum.NONE) {
                    // If an AccidentalEnum.NONE is given, it would not be rendered.
                    // We need here to convert to a AccidentalEnum.NATURAL:
                    pitch = new Pitch(pitch.FundamentalNote, pitch.Octave, AccidentalEnum.NATURAL);
                }
                MusicSheetCalculator.symbolFactory.addGraphicalAccidental(graphicalNote, pitch);
            }
        } else { // pitchkey not in measure dict:
            if (pitch.Accidental !== AccidentalEnum.NONE) {
                if (!isInCurrentAlterationsToKeyList) {
                    this.currentAlterationsComparedToKeyInstructionList.push(pitchKey);
                }
                this.currentInMeasureNoteAlterationsDict.setValue(pitchKey, pitch.AccidentalHalfTones);
                MusicSheetCalculator.symbolFactory.addGraphicalAccidental(graphicalNote, pitch);
            } else {
                if (isInCurrentAlterationsToKeyList) {
                    // we need here a AccidentalEnum.NATURAL now to get it rendered - AccidentalEnum.NONE would not be rendered
                    pitch = new Pitch(pitch.FundamentalNote, pitch.Octave, AccidentalEnum.NATURAL);
                    this.currentAlterationsComparedToKeyInstructionList.splice(this.currentAlterationsComparedToKeyInstructionList.indexOf(pitchKey), 1);
                    MusicSheetCalculator.symbolFactory.addGraphicalAccidental(graphicalNote, pitch);
                }
            }
        }
    }

    private reactOnKeyInstructionChange(): void {
        const noteEnums: NoteEnum[] = this.activeKeyInstruction.AlteratedNotes;
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
                this.keySignatureNoteAlterationsDict.setValue(<number>noteEnums[i] + octave * 12, Pitch.HalfTonesFromAccidental(keyAccidentalType));
            }
        }
        this.doCalculationsAtEndOfMeasure();
    }
}
