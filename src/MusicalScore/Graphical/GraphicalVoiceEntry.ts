import { GraphicalObject } from "./GraphicalObject";
import { VoiceEntry } from "../VoiceData/VoiceEntry";
import { BoundingBox } from "./BoundingBox";
import { GraphicalNote } from "./GraphicalNote";
import { GraphicalStaffEntry } from "./GraphicalStaffEntry";
import { OctaveEnum } from "../VoiceData/Expressions/ContinuousExpressions/OctaveShift";
import { EngravingRules } from "./EngravingRules";

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
        this.rules = parentStaffEntry ?
                        parentStaffEntry.parentMeasure.parentSourceMeasure.Rules : new EngravingRules();
    }

    public parentVoiceEntry: VoiceEntry;
    public parentStaffEntry: GraphicalStaffEntry;
    public notes: GraphicalNote[];
    /** Contains octave shifts affecting this voice entry, caused by octave brackets. */
    public octaveShiftValue: OctaveEnum;
    protected rules: EngravingRules;

    /** Sort this entry's notes by pitch.
     * Notes need to be sorted for Vexflow StaveNote creation.
     * Note that Vexflow needs the reverse order, see VexFlowConverter.StaveNote().
     */
    public sort(): GraphicalNote[] {
        this.notes.sort((a, b) => {
            return (b.sourceNote.Pitch?.getHalfTone() ?? 0) - (a.sourceNote.Pitch?.getHalfTone() ?? 0);
        });
        // note that this is the reverse order of what vexflow needs
        return this.notes;
    }

    /** Sort notes for vexflow (bottom to top), which needs them in the reverse order OSMD likes to have them.
     *  Note that sort() and reverse() replace the array in place,
     *  so to avoid changing the array one could copy it first, see sortedNotesCopyForVexflow() (commented),
     *  though copying the array is also unnecessary (time+memory) for now.
     */
    public sortForVexflow(): GraphicalNote[] {
        this.notes.sort((a, b) => {
            return (a.sourceNote.Pitch?.getHalfTone() ?? 0) - (b.sourceNote.Pitch.getHalfTone() ?? 0);
        });
        return this.notes;
    }

    // probably unnecessary, can just go through the array in reverse
    // public sortedNotesCopyForVexflow(): GraphicalNote[] {
    //     // we need a copy since sort replaces the array (in place sorting)
    //     let sortedArray = Array.from(this.notes.sort());
    //     sortedArray.reverse();
    //     return sortedArray;
    // }

    /** (Re-)color notes and stems
     */
    public color(): void {
        // override
    }
}
