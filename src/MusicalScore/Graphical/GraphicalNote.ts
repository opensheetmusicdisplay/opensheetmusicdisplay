import {Note} from "../VoiceData/Note";
import {Fraction} from "../../Common/DataObjects/fraction";
import {KeyInstruction} from "../VoiceData/Instructions/KeyInstruction";
import {ClefInstruction} from "../VoiceData/Instructions/ClefInstruction";
import {OctaveEnum} from "../VoiceData/Expressions/ContinuousExpressions/octaveShift";
import {Pitch} from "../../Common/DataObjects/pitch";
import {GraphicalStaffEntry} from "./GraphicalStaffEntry";
import {GraphicalObject} from "./GraphicalObject";
import {MusicSheetCalculator} from "./MusicSheetCalculator";

export class GraphicalNote extends GraphicalObject {
    constructor(note: Note, parent: GraphicalStaffEntry) {
        super();
        this.sourceNote = note;
        this.parentStaffEntry = parent;
    }

    public sourceNote: Note;
    public graphicalNoteLength: Fraction;
    public parentStaffEntry: GraphicalStaffEntry;

    public get ParentList(): GraphicalNote[] {
        for (let idx: number = 0, len: number = this.parentStaffEntry.notes.length; idx < len; ++idx) {
            let graphicalNotes: GraphicalNote[] = this.parentStaffEntry.notes[idx];
            if (graphicalNotes.indexOf(this) !== -1) {
                return graphicalNotes;
            }
        }
        return undefined;
    }

    public Transpose(keyInstruction: KeyInstruction, activeClef: ClefInstruction, halfTones: number, octaveEnum: OctaveEnum): Pitch {
        let transposedPitch: Pitch = this.sourceNote.Pitch;
        if (MusicSheetCalculator.transposeCalculator !== undefined) {
            transposedPitch = MusicSheetCalculator.transposeCalculator.transposePitch(this.sourceNote.Pitch, keyInstruction, halfTones);
        }
        return transposedPitch;
    }
}
