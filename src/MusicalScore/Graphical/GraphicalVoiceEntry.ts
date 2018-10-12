import {GraphicalObject} from "./GraphicalObject";
import { VoiceEntry } from "../VoiceData/VoiceEntry";
import { BoundingBox } from "./BoundingBox";
import { GraphicalNote } from "./GraphicalNote";
import { GraphicalStaffEntry } from "./GraphicalStaffEntry";
import { OctaveEnum } from "../VoiceData/Expressions/ContinuousExpressions/OctaveShift";

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
}
