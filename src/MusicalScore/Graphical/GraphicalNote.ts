import {Note} from "../VoiceData/Note";
import {Fraction} from "../../Common/DataObjects/fraction";
import {KeyInstruction} from "../VoiceData/Instructions/KeyInstruction";
import {ClefInstruction} from "../VoiceData/Instructions/ClefInstruction";
import {OctaveEnum} from "../VoiceData/Expressions/ContinuousExpressions/octaveShift";
import {Pitch} from "../../Common/DataObjects/pitch";
module PhonicScore.MusicalScore.Graphical.SheetData {
    export class GraphicalNote extends GraphicalObject {
        constructor(note: Note, parent: GraphicalStaffEntry) {
            this.SourceNote = note;
            this.ParentStaffEntry = parent;
        }
        public SourceNote: Note;
        public GraphicalNoteLength: Fraction;
        public ParentStaffEntry: GraphicalStaffEntry;
        public get ParentList(): List<GraphicalNote> {
            for (var idx: number = 0, len = this.ParentStaffEntry.Notes.Count; idx < len; ++idx) {
                var graphicalNotes: List<GraphicalNote> = this.ParentStaffEntry.Notes[idx];
                if (graphicalNotes.Contains(this))
                    return graphicalNotes;
            }
            return null;
        }
        public Transpose(keyInstruction: KeyInstruction, activeClef: ClefInstruction, halfTones: number, octaveEnum: OctaveEnum): Pitch {
            var transposedPitch: Pitch = this.SourceNote.Pitch;
            if (MusicSheetCalculator.TransposeCalculator != null)
                transposedPitch = MusicSheetCalculator.TransposeCalculator.TransposePitch(this.SourceNote.Pitch, keyInstruction, halfTones);
            return transposedPitch;
        }
    }
}