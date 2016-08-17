import Vex = require("vexflow");
import {GraphicalNote} from "../GraphicalNote";
import {Note} from "../../VoiceData/Note";
import {GraphicalStaffEntry} from "../GraphicalStaffEntry";
import {ClefInstruction} from "../../VoiceData/Instructions/ClefInstruction";
import {VexFlowConverter} from "./VexFlowConverter";
import {Pitch} from "../../../Common/DataObjects/Pitch";
import {Fraction} from "../../../Common/DataObjects/Fraction";
import {OctaveEnum} from "../../VoiceData/Expressions/ContinuousExpressions/OctaveShift";

/**
 * The VexFlow version of a [[GraphicalNote]].
 */
export class VexFlowGraphicalNote extends GraphicalNote {
    constructor(note: Note, parent: GraphicalStaffEntry, activeClef: ClefInstruction,
                octaveShift: OctaveEnum = OctaveEnum.NONE,  graphicalNoteLength: Fraction = undefined) {
        super(note, parent, graphicalNoteLength);
        this.clef = activeClef;
        if (note.Pitch) {
            this.vfpitch = VexFlowConverter.pitch(note.Pitch, this.clef);
            this.vfpitch[1] = undefined;
        }
    }

    // The pitch of this note as given by VexFlowConverter.pitch
    public vfpitch: [string, string, ClefInstruction];
    // The corresponding VexFlow StaveNote (plus its index in the chord)
    public vfnote: [Vex.Flow.StaveNote, number];
    // The current clef
    private clef: ClefInstruction;

    /**
     * Update the pitch of this note. Necessary in order to display correctly
     * accidentals, this is called by VexFlowGraphicalSymbolFactory.addGraphicalAccidental.
     * @param pitch
     */
    public setPitch(pitch: Pitch): void {
        if (this.vfnote) {
            let acc: string = VexFlowConverter.accidental(pitch.Accidental);
            if (acc) {
                alert(acc);
                this.vfnote[0].addAccidental(this.vfnote[1], new Vex.Flow.Accidental(acc));
            }
        } else {
            this.vfpitch = VexFlowConverter.pitch(pitch, this.clef);
        }
    }

    /**
     * Set the VexFlow StaveNote corresponding to this GraphicalNote, together with its index in the chord.
     * @param note
     * @param index
     */
    public setIndex(note: Vex.Flow.StaveNote, index: number): void {
        this.vfnote = [note, index];
    }
}
