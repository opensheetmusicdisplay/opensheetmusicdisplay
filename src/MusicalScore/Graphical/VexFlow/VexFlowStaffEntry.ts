import {GraphicalStaffEntry} from "../GraphicalStaffEntry";
import {VexFlowMeasure} from "./VexFlowMeasure";
import {SourceStaffEntry} from "../../VoiceData/SourceStaffEntry";
import {unitInPixels} from "./VexFlowMusicSheetDrawer";
import { VexFlowVoiceEntry } from "./VexFlowVoiceEntry";

export class VexFlowStaffEntry extends GraphicalStaffEntry {
    constructor(measure: VexFlowMeasure, sourceStaffEntry: SourceStaffEntry, staffEntryParent: VexFlowStaffEntry) {
        super(measure, sourceStaffEntry, staffEntryParent);
    }

    /**
     * Calculates the staff entry positions from the VexFlow stave information and the tickabels inside the staff.
     * This is needed in order to set the OSMD staff entries (which are almost the same as tickables) to the correct positionts.
     * It is also needed to be done after formatting!
     */
    public calculateXPosition(): void {
        const stave: Vex.Flow.Stave = (this.parentMeasure as VexFlowMeasure).getVFStave();
        let tickablePosition: number = 0;
        let numberOfValidTickables: number = 0;
        for (const gve of this.graphicalVoiceEntries) {
            const tickable: Vex.Flow.StemmableNote = (gve as VexFlowVoiceEntry).vfStaveNote;
            // This will let the tickable know how to calculate it's bounding box
            tickable.setStave(stave);
            // The middle of the tickable is also the OSMD BoundingBox center
            if (tickable.getAttribute("type") === "StaveNote") {
                // The middle of the tickable is also the OSMD BoundingBox center
                const staveNote: Vex.Flow.StaveNote = tickable as Vex.Flow.StaveNote;
                tickablePosition += staveNote.getNoteHeadEndX() - staveNote.getGlyphWidth() / 2;
            } else {
                console.log(tickable);
                const ghostNote: Vex.Flow.GhostNote = tickable;
                // That's basically the same as the StaveNote does.
                tickablePosition = ghostNote.getAbsoluteX() + ghostNote.x_shift;
            }
            numberOfValidTickables++;
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
