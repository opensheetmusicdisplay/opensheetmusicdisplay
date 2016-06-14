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
        this.SourceNote = note;
        this.ParentStaffEntry = parent;
    }
    public SourceNote: Note;
    public GraphicalNoteLength: Fraction;
    public ParentStaffEntry: GraphicalStaffEntry;
    public get ParentList(): GraphicalNote[] {
        for (let idx: number = 0, len: number = this.ParentStaffEntry.Notes.length; idx < len; ++idx) {
            let graphicalNotes: GraphicalNote[] = this.ParentStaffEntry.Notes[idx];
            if (graphicalNotes.indexOf(this) !== -1)
                return graphicalNotes;
        }
        return undefined;
    }
    public Transpose(keyInstruction: KeyInstruction, activeClef: ClefInstruction, halfTones: number, octaveEnum: OctaveEnum): Pitch {
        let transposedPitch: Pitch = this.SourceNote.Pitch;
        if (MusicSheetCalculator.TransposeCalculator !== undefined)
            transposedPitch = MusicSheetCalculator.TransposeCalculator.transposePitch(this.SourceNote.Pitch, keyInstruction, halfTones);
        return transposedPitch;
    }
}
