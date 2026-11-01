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
    /** The hidden notes (print-object="no") sharing a visible unison note's head that would have got an accidental,
     * by pitch key: see addAccidental(). */
    private hiddenNoteWithAccidentalDict: Dictionary<number, { note: GraphicalNote, accidental: AccidentalEnum }> =
        new Dictionary<number, { note: GraphicalNote, accidental: AccidentalEnum }>();
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
        this.hiddenNoteWithAccidentalDict.clear();
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
                // Same written note held across the tie — the accidental is implied, unless the file writes it
                //   (<accidental> on the continued note: the engraver repeats the sign, e.g. after a beat or a system break).
                if (pitch.AccidentalXml && pitch.Accidental !== AccidentalEnum.NONE && this.Transpose === 0) {
                    this.addAccidental(graphicalNote, pitch, pitchKey);
                }
                return;
            }
        }

        // A printed sign that disagrees with <alter> is drawn as printed (a historical sharp cancelling the key's flat,
        //   sounding E natural); the measure keeps the sounding alteration, so the next E natural gets no natural sign.
        //   VexFlowGraphicalNote.setAccidental() draws the printed glyph.
        if (this.Transpose === 0 && AccidentalCalculator.printedMismatchGlyph(pitch)) {
            this.currentInMeasureNoteAlterationsDict.setValue(pitchKey, pitch.AccidentalHalfTones);
            this.addAccidental(graphicalNote, pitch, pitchKey);
            return;
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
            } else if ((pitch.AccidentalXml && this.Transpose === 0 || this.isAccidentalOfHiddenNoteAtSameTime(graphicalNote, pitch, pitchKey)) &&
                !this.isAccidentalDrawnAtSameTime(graphicalNote, pitch, pitchKey)) {
                // courtesy accidental, or the accidental a hidden note at the same time left to this note (see addAccidental())
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

    /** The VexFlow glyph of the printed <accidental> of the pitch when it is a plain sign whose alteration differs from
     *  the sounding one (<alter>), else undefined. Signs drawn as two glyphs (natural-sharp, ...) are left to
     *  VexFlowGraphicalNote.setAccidental(). A transposed pitch has no AccidentalXml. */
    public static printedMismatchGlyph(pitch: Pitch): string | undefined {
        const glyph: [string, number] = pitch?.AccidentalXml ? AccidentalCalculator.printedGlyphs[pitch.AccidentalXml] : undefined;
        return glyph && glyph[1] !== pitch.AccidentalHalfTones ? glyph[0] : undefined;
    }

    private static readonly printedGlyphs: { [accidentalXml: string]: [string, number] } = {
        "double-flat": ["bb", -2],
        "double-sharp": ["##", 2],
        "flat": ["b", -1],
        "flat-flat": ["bb", -2],
        "natural": ["n", 0],
        "sharp": ["#", 1],
    };

    /** Adds the accidental of the pitch to the note, and remembers the note for isAccidentalDrawnAtSameTime(). */
    private addAccidental(graphicalNote: GraphicalNote, pitch: Pitch, pitchKey: number): void {
        // A hidden note (print-object="no") sharing the head of a visible unison note in another voice doesn't draw its
        //   accidental, but VexFlow kept a column for it, so the visible note's accidental stood a head away (or the
        //   visible note drew none, its pitch being altered in the measure already). The visible note draws it instead,
        //   also without an accidental in the XML: e.g. a hidden eighth C flat starting an arpeggio on the open head of
        //   a half note C flat, first in the measure.
        if (!graphicalNote.sourceNote.PrintObject && graphicalNote.sourceNote.sharesNoteheadWithVisibleUnisonNote()) {
            this.hiddenNoteWithAccidentalDict.setValue(pitchKey, { note: graphicalNote, accidental: pitch.Accidental });
            return;
        }
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

    /** Whether a hidden note of the same pitch at the same time left this accidental to the visible note (see addAccidental()). */
    private isAccidentalOfHiddenNoteAtSameTime(graphicalNote: GraphicalNote, pitch: Pitch, pitchKey: number): boolean {
        const hidden: { note: GraphicalNote, accidental: AccidentalEnum } = this.hiddenNoteWithAccidentalDict.getValue(pitchKey);
        return hidden !== undefined &&
            graphicalNote.sourceNote.PrintObject &&
            !graphicalNote.parentVoiceEntry.parentVoiceEntry.IsGrace &&
            hidden.note.parentVoiceEntry.parentStaffEntry === graphicalNote.parentVoiceEntry.parentStaffEntry &&
            hidden.accidental === pitch.Accidental;
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
