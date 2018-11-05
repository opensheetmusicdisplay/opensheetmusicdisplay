import { GraphicalObject } from "./GraphicalObject";
import { VoiceEntry } from "../VoiceData/VoiceEntry";
import { BoundingBox } from "./BoundingBox";
import { GraphicalNote } from "./GraphicalNote";
import { GraphicalStaffEntry } from "./GraphicalStaffEntry";
import { OctaveEnum } from "../VoiceData/Expressions/ContinuousExpressions/OctaveShift";
import { VexFlowVoiceEntry } from "./VexFlow/VexFlowVoiceEntry";

/**
 * The graphical counterpart of a [[VoiceEntry]].
 */
export class GraphicalVoiceEntry extends GraphicalObject {
    constructor(parentVoiceEntry: VoiceEntry, parentStaffEntry: GraphicalStaffEntry) {
        super();
        this.parentVoiceEntry = parentVoiceEntry;
        this.parentStaffEntry = parentStaffEntry;
        this.PositionAndShape = new BoundingBox(this, parentStaffEntry ? parentStaffEntry.PositionAndShape : undefined, true);
        this.notes = [];
    }

    public parentVoiceEntry: VoiceEntry;
    public parentStaffEntry: GraphicalStaffEntry;
    public notes: GraphicalNote[];
    /** Contains octave shifts affecting this voice entry, caused by octave brackets. */
    public octaveShiftValue: OctaveEnum;

    /** Sort this entry's notes by pitch.
     * Notes need to be sorted for Vexflow StaveNote creation.
     * Note that Vexflow needs the reverse order, see VexFlowConverter.StaveNote().
     */
    public sort(): void {
        this.notes.sort((a, b) => {
            return b.sourceNote.Pitch.getHalfTone() - a.sourceNote.Pitch.getHalfTone();
        });
    }

    /** Re-color notes by setting their Vexflow styles.
     * Could be made redundant by a Vexflow PR, but Vexflow needs more solid and permanent color methods/variables for that
     * See VexFlowConverter.StaveNote()
     */
    public reColor(): void {
        for (let i: number = 0; i < this.notes.length; i++) {
            const note: GraphicalNote = this.notes[i];
            if (note.sourceNote.NoteheadColor) {
                const vfStaveNote: any = (<VexFlowVoiceEntry>(this as any)).vfStaveNote;
                if (!vfStaveNote) {
                    return;
                }
                if (vfStaveNote.note_heads) { // see VexFlowConverter, needs Vexflow PR
                    const noteheadColor: string = note.sourceNote.NoteheadColor;
                    vfStaveNote.note_heads[i].setStyle({ fillStyle: noteheadColor, strokeStyle: noteheadColor });
                }
            }
        }
    }
}
