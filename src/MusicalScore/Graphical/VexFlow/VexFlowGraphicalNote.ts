import Vex from "vexflow";
import {GraphicalNote} from "../GraphicalNote";
import {Note} from "../../VoiceData/Note";
import {ClefInstruction} from "../../VoiceData/Instructions/ClefInstruction";
import {VexFlowConverter} from "./VexFlowConverter";
import {Pitch} from "../../../Common/DataObjects/Pitch";
import {Fraction} from "../../../Common/DataObjects/Fraction";
import {OctaveEnum, OctaveShift} from "../../VoiceData/Expressions/ContinuousExpressions/OctaveShift";
import { GraphicalVoiceEntry } from "../GraphicalVoiceEntry";
import { KeyInstruction } from "../../VoiceData/Instructions/KeyInstruction";

/**
 * The VexFlow version of a [[GraphicalNote]].
 */
export class VexFlowGraphicalNote extends GraphicalNote {
    constructor(note: Note, parent: GraphicalVoiceEntry, activeClef: ClefInstruction,
                octaveShift: OctaveEnum = OctaveEnum.NONE,  graphicalNoteLength: Fraction = undefined) {
        super(note, parent, graphicalNoteLength);
        this.clef = activeClef;
        this.octaveShift = octaveShift;
        if (note.Pitch) {
            // TODO: Maybe shift to Transpose function when available
            const drawPitch: Pitch = OctaveShift.getPitchFromOctaveShift(note.Pitch, octaveShift);
            this.vfpitch = VexFlowConverter.pitch(this, drawPitch);
            this.vfpitch[1] = undefined;
        }
    }

    public octaveShift: OctaveEnum;
    // The pitch of this note as given by VexFlowConverter.pitch
    public vfpitch: [string, string, ClefInstruction];
    // The corresponding VexFlow StaveNote (plus its index in the chord)
    public vfnote: [Vex.Flow.StemmableNote, number];
    // The current clef
    private clef: ClefInstruction;

    /**
     * Update the pitch of this note. Necessary in order to display accidentals correctly.
     * This is called by VexFlowGraphicalSymbolFactory.addGraphicalAccidental.
     * @param pitch
     */
    public setAccidental(pitch: Pitch): void {
        // if (this.vfnote) {
        //     let pitchAcc: AccidentalEnum = pitch.Accidental;
        //     const acc: string = Pitch.accidentalVexflow(pitch.Accidental);
        //     if (acc) {
        //         alert(acc);
        //         this.vfnote[0].addAccidental(this.vfnote[1], new Vex.Flow.Accidental(acc));
        //     }
        // } else {
        // revert octave shift, as the placement of the note is independent of octave brackets
        const drawPitch: Pitch = OctaveShift.getPitchFromOctaveShift(pitch, this.octaveShift);
        // recalculate the pitch, and this time don't ignore the accidental:
        this.vfpitch = VexFlowConverter.pitch(this, drawPitch);
        //}
    }
    public Transpose(keyInstruction: KeyInstruction, activeClef: ClefInstruction, halfTones: number, octaveEnum: OctaveEnum): Pitch {
        const tranposedPitch: Pitch = super.Transpose(keyInstruction, activeClef, halfTones, octaveEnum);
        const drawPitch: Pitch = OctaveShift.getPitchFromOctaveShift(tranposedPitch, this.octaveShift);
        this.vfpitch = VexFlowConverter.pitch(this, drawPitch);
        this.vfpitch[1] = undefined;
        return drawPitch;
    }

    /**
     * Set the VexFlow StaveNote corresponding to this GraphicalNote, together with its index in the chord.
     * @param note
     * @param index
     */
    public setIndex(note: Vex.Flow.StemmableNote, index: number): void {
        this.vfnote = [note, index];
    }

    /**
     * Gets the clef for this note
     */
    public Clef(): ClefInstruction {
        return this.clef;
    }

    /**
     * Gets the id of the SVGGElement containing this note, given the SVGRenderer is used.
     * This is for low-level rendering hacks and should be used with caution.
     */
    public getSVGId(): string {
        return this.vfnote[0].getAttribute("id");
    }

    /**
     * Gets the SVGGElement containing this note, given the SVGRenderer is used.
     * This is for low-level rendering hacks and should be used with caution.
     */
    public getSVGGElement(): SVGGElement {
        return this.vfnote[0].getAttribute("el");
    }
}
