import {AccidentalEnum} from "../../Common/DataObjects/Pitch";
import {KeyInstruction} from "../VoiceData/Instructions/KeyInstruction";
import {GraphicalNote} from "./GraphicalNote";
import {Pitch} from "../../Common/DataObjects/Pitch";
import {NoteEnum} from "../../Common/DataObjects/Pitch";
import { Dictionary } from "typescript-collections";
// import { Dictionary } from "typescript-collections/dist/lib";
import { MusicSheetCalculator } from "./MusicSheetCalculator";
import { Tie } from "../VoiceData/Tie";

/**
 * Compute the accidentals for notes according to the current key instruction
 */
export class AccidentalCalculator {
    private keySignatureNoteAlterationsDict: Dictionary<number, AccidentalEnum> = new Dictionary<number, AccidentalEnum>();
    private currentAlterationsComparedToKeyInstructionList: number[] = [];
    private currentInMeasureNoteAlterationsDict: Dictionary<number, AccidentalEnum> = new Dictionary<number, AccidentalEnum>();
    private activeKeyInstruction: KeyInstruction;
    public Transpose: number; // set in MusicSheetCalculator

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
        this.currentAlterationsComparedToKeyInstructionList.clear();
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

        const tie: Tie = graphicalNote.sourceNote.NoteTie;
        if (tie && graphicalNote.sourceNote !== tie.StartNote) {
            return; // don't add accidentals on continued tie note
            // note that continued tie notes may incorrectly use the same pitch object, with the same accidentalXml value.
        }

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
                } else if (pitch.Accidental !== AccidentalEnum.NONE) {
                    this.currentInMeasureNoteAlterationsDict.remove(pitchKey);
                }

                const inMeasureAlterationAccidental: AccidentalEnum = this.currentInMeasureNoteAlterationsDict.getValue(pitchKey);
                if (pitch.Accidental === AccidentalEnum.NONE) {
                    if (Math.abs(inMeasureAlterationAccidental) === 0.5) {
                        // fix to remember quartersharp and quarterflat and not make them natural on following notes
                        pitch = new Pitch(pitch.FundamentalNote, pitch.Octave, AccidentalEnum.NONE,
                            undefined, false, pitch.OctaveShiftApplied);
                    } else {
                        // If an AccidentalEnum.NONE is given, it would not be rendered.
                        // We need here to convert to a AccidentalEnum.NATURAL:
                        pitch = new Pitch(pitch.FundamentalNote, pitch.Octave, AccidentalEnum.NATURAL,
                            undefined, false, pitch.OctaveShiftApplied);
                    }
                }
                if (this.isAlterAmbiguousAccidental(pitch.Accidental) && ! pitch.AccidentalXml) {
                    return; // only display accidental if it was given as an accidental in the XML
                }
                MusicSheetCalculator.symbolFactory.addGraphicalAccidental(graphicalNote, pitch);
            } else if (pitch.AccidentalXml && this.Transpose === 0 && !isInCurrentAlterationsToKeyList) {
                // courtesy accidental
                //   without the !isInCurrentAlterationsToKeyList check, we get a double natural in Dichterliebe measure 9.
                MusicSheetCalculator.symbolFactory.addGraphicalAccidental(graphicalNote, pitch);
                // if transpose !== 0 (we're transposing), the courtesy accidental might not be appropriate here.
            }
        } else { // pitchkey not in measure dict:
            if (pitch.Accidental !== AccidentalEnum.NONE) {
                if (!isInCurrentAlterationsToKeyList) {
                    this.currentAlterationsComparedToKeyInstructionList.push(pitchKey);
                }
                this.currentInMeasureNoteAlterationsDict.setValue(pitchKey, pitch.AccidentalHalfTones);
                if (this.isAlterAmbiguousAccidental(pitch.Accidental) && ! pitch.AccidentalXml) {
                    return;
                }
                MusicSheetCalculator.symbolFactory.addGraphicalAccidental(graphicalNote, pitch);
            } else {
                if (isInCurrentAlterationsToKeyList) {
                    // we need here a AccidentalEnum.NATURAL now to get it rendered - AccidentalEnum.NONE would not be rendered
                    pitch = new Pitch(pitch.FundamentalNote, pitch.Octave, AccidentalEnum.NATURAL,
                        undefined, false, pitch.OctaveShiftApplied);
                    this.currentAlterationsComparedToKeyInstructionList.splice(this.currentAlterationsComparedToKeyInstructionList.indexOf(pitchKey), 1);
                    MusicSheetCalculator.symbolFactory.addGraphicalAccidental(graphicalNote, pitch);
                }
            }
        }
    }

    private isAlterAmbiguousAccidental(accidental: AccidentalEnum): boolean {
        return accidental === AccidentalEnum.SLASHFLAT || accidental === AccidentalEnum.QUARTERTONEFLAT;
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
