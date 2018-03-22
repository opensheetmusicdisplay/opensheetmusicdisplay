import {GraphicalStaffEntry} from "../GraphicalStaffEntry";
import {VexFlowMeasure} from "./VexFlowMeasure";
import {SourceStaffEntry} from "../../VoiceData/SourceStaffEntry";
import {GraphicalNote} from "../GraphicalNote";
import {unitInPixels} from "./VexFlowMusicSheetDrawer";

export class VexFlowStaffEntry extends GraphicalStaffEntry {
    constructor(measure: VexFlowMeasure, sourceStaffEntry: SourceStaffEntry, staffEntryParent: VexFlowStaffEntry) {
        super(measure, sourceStaffEntry, staffEntryParent);
    }

    // The Graphical Notes belonging to this StaffEntry, sorted by voiceID
    public graphicalNotes: { [voiceID: number]: GraphicalNote[]; } = {};
    // The corresponding VexFlow.StaveNotes
    public vfNotes: { [voiceID: number]: Vex.Flow.StaveNote; } = {};

    /**
     * Calculates the staff entry positions from the VexFlow stave information and the tickabels inside the staff.
     * This is needed in order to set the OSMD staff entries (which are almost the same as tickables) to the correct positionts.
     * It is also needed to be done after formatting!
     */
    public calculateXPosition(): void {
        const vfNotes: { [voiceID: number]: Vex.Flow.StaveNote; } = this.vfNotes;
        const stave: Vex.Flow.Stave = (this.parentMeasure as VexFlowMeasure).getVFStave();
        let tickablePosition: number = 0;
        let numberOfValidTickables: number = 0;
        for (const voiceId in vfNotes) {
            if (vfNotes.hasOwnProperty(voiceId)) {
                const tickable: Vex.Flow.StaveNote = vfNotes[voiceId];
                // This will let the tickable know how to calculate it's bounding box
                tickable.setStave(stave);
                // The middle of the tickable is also the OSMD BoundingBox center
                const staveNote: Vex.Flow.StaveNote = (<Vex.Flow.StaveNote>tickable);
                tickablePosition += staveNote.getNoteHeadEndX() - staveNote.getGlyphWidth() / 2;
                numberOfValidTickables++;
            }
        }
        tickablePosition = tickablePosition / numberOfValidTickables;
        // Calculate parent absolute position and reverse calculate the relative position
        // All the modifiers signs, clefs, you name it have an offset in the measure. Therefore remove it.
        // NOTE: Somehow vexflows shift is off by 25px.
        const modifierOffset: number = stave.getModifierXShift() - (this.parentMeasure.MeasureNumber === 1 ? 25 : 0);
        // const modifierOffset: number = 0;
        // sets the vexflow x positions back into the bounding boxes of the staff entries in the osmd object model.
        // The positions are needed for cursor placement and mouse/tap interactions
        this.PositionAndShape.RelativePosition.x = (tickablePosition - stave.getNoteStartX() + modifierOffset) / unitInPixels;
    }
}
