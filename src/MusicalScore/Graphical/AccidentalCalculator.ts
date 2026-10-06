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
    private currentInMeasureNoteAlterationsDict: Dictionary<number, AccidentalEnum> = new Dictionary<number, AccidentalEnum>();
    /** The last note of each pitch in the current measure that got an accidental, except grace notes (see isAccidentalDrawnAtSameTime()) */
    private lastNoteWithAccidentalDict: Dictionary<number, GraphicalNote> = new Dictionary<number, GraphicalNote>();
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
        this.lastNoteWithAccidentalDict.clear();
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
            // The continued note of a tie carries its accidental over implicitly, so it's
            // normally suppressed. The exception is an enharmonic tie (e.g. F#–Gb, #1694),
            // which respells one sounding pitch with a *different letter name* — that note must
            // draw its own accidental. Distinguish by letter (FundamentalNote), not by the
            // accidental enum: a natural-to-natural tie across a barline (e.g. B♮ tied to B under
            // a B♭ key signature) is the same written note and its NATURAL/NONE enums may differ,
            // yet it must stay suppressed (#1695 review). Only a different letter falls through.
            const startPitch: Pitch = tie.StartNote.Pitch;
            const sameLetter: boolean = startPitch !== undefined
                && startPitch.FundamentalNote === pitch.FundamentalNote;
            if (sameLetter) {
                return; // same written note held across the tie — accidental is implied
            }
        }

        if (this.currentInMeasureNoteAlterationsDict.containsKey(pitchKey)) {
            if (this.currentInMeasureNoteAlterationsDict.getValue(pitchKey) !== pitch.AccidentalHalfTones) {
                if (this.keySignatureNoteAlterationsDict.containsKey(pitchKey) &&
                    this.keySignatureNoteAlterationsDict.getValue(pitchKey) !== pitch.AccidentalHalfTones) {
                    this.currentInMeasureNoteAlterationsDict.setValue(pitchKey, pitch.AccidentalHalfTones);
                } else if (pitch.Accidental !== AccidentalEnum.NONE) {
                    // explicit accidental that matches the key signature, or of a pitch the key signature doesn't alter:
                    //   restore the key signature state (#1564), or remember a sharp or flat the key signature doesn't have,
                    //   e.g. F# after F natural in C major, so that the next F natural gets its natural sign again.
                    if (this.keySignatureNoteAlterationsDict.containsKey(pitchKey)) {
                        this.currentInMeasureNoteAlterationsDict.setValue(
                            pitchKey,
                            this.keySignatureNoteAlterationsDict.getValue(pitchKey)
                        );
                    } else if (pitch.AccidentalHalfTones === 0) {
                        this.currentInMeasureNoteAlterationsDict.remove(pitchKey);
                    } else {
                        this.currentInMeasureNoteAlterationsDict.setValue(pitchKey, pitch.AccidentalHalfTones);
                    }
                } else {
                    // pitch.Accidental === NONE: returning to natural state
                    // Update dict so subsequent alterations are properly detected (#1564)
                    this.currentInMeasureNoteAlterationsDict.setValue(pitchKey, pitch.AccidentalHalfTones);
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
                this.addAccidental(graphicalNote, pitch, pitchKey);
            } else if (pitch.AccidentalXml && this.Transpose === 0 && !this.isAccidentalDrawnAtSameTime(graphicalNote, pitch, pitchKey)) {
                // courtesy accidental
                this.addAccidental(graphicalNote, pitch, pitchKey);
                // if transpose !== 0 (we're transposing), the courtesy accidental might not be appropriate here.
            }
        } else { // pitchkey not in measure dict:
            if (pitch.Accidental !== AccidentalEnum.NONE) {
                this.currentInMeasureNoteAlterationsDict.setValue(pitchKey, pitch.AccidentalHalfTones);
                if (this.isAlterAmbiguousAccidental(pitch.Accidental) && ! pitch.AccidentalXml) {
                    return;
                }
                this.addAccidental(graphicalNote, pitch, pitchKey);
            }
        }
    }

    /** Adds the accidental of the pitch to the note, and remembers the note for isAccidentalDrawnAtSameTime(). */
    private addAccidental(graphicalNote: GraphicalNote, pitch: Pitch, pitchKey: number): void {
        MusicSheetCalculator.symbolFactory.addGraphicalAccidental(graphicalNote, pitch);
        if (!graphicalNote.parentVoiceEntry.parentVoiceEntry.IsGrace) {
            this.lastNoteWithAccidentalDict.setValue(pitchKey, graphicalNote);
        }
    }

    /**
     * Whether a note of the same pitch at the same time, in another voice or in the same chord, already got this accidental.
     * One accidental serves all these notes, e.g. in Dichterliebe measure 9, where two voices start with G natural,
     * both with a natural given in the XML: drawing both would put two naturals in front of the note.
     * Grace notes are drawn at their own position, so they are not counted.
     */
    private isAccidentalDrawnAtSameTime(graphicalNote: GraphicalNote, pitch: Pitch, pitchKey: number): boolean {
        const noteWithAccidental: GraphicalNote = this.lastNoteWithAccidentalDict.getValue(pitchKey);
        return noteWithAccidental !== undefined &&
            !graphicalNote.parentVoiceEntry.parentVoiceEntry.IsGrace &&
            noteWithAccidental.parentVoiceEntry.parentStaffEntry === graphicalNote.parentVoiceEntry.parentStaffEntry &&
            noteWithAccidental.DrawnAccidental === pitch.Accidental;
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
        for (let octave: number = -9; octave < 9; octave++) {
            for (let i: number = 0; i < noteEnums.length; i++) {
                this.keySignatureNoteAlterationsDict.setValue(<number>noteEnums[i] + octave * 12, Pitch.HalfTonesFromAccidental(keyAccidentalType));
            }
        }
        this.doCalculationsAtEndOfMeasure();
    }
}
