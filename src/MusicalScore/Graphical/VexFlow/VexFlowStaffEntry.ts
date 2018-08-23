import {GraphicalStaffEntry} from "../GraphicalStaffEntry";
import {VexFlowMeasure} from "./VexFlowMeasure";
import {SourceStaffEntry} from "../../VoiceData/SourceStaffEntry";
import {unitInPixels} from "./VexFlowMusicSheetDrawer";
import { VexFlowVoiceEntry } from "./VexFlowVoiceEntry";

export class VexFlowStaffEntry extends GraphicalStaffEntry {
    constructor(measure: VexFlowMeasure, sourceStaffEntry: SourceStaffEntry, staffEntryParent: VexFlowStaffEntry) {
        super(measure, sourceStaffEntry, staffEntryParent);
    }

    // if there is a in-measure clef given before this staffEntry,
    // it will be converted to a Vex.Flow.ClefNote and assigned to this variable:
    public vfClefBefore: Vex.Flow.ClefNote;

    /**
     * Calculates the staff entry positions from the VexFlow stave information and the tickabels inside the staff.
     * This is needed in order to set the OSMD staff entries (which are almost the same as tickables) to the correct positionts.
     * It is also needed to be done after formatting!
     */
    public calculateXPosition(): void {
        const stave: Vex.Flow.Stave = (this.parentMeasure as VexFlowMeasure).getVFStave();

        // sets the vexflow x positions back into the bounding boxes of the staff entries in the osmd object model.
        // The positions are needed for cursor placement and mouse/tap interactions
        let lastBorderLeft: number = 0;
        for (const gve of this.graphicalVoiceEntries as VexFlowVoiceEntry[]) {
            if (gve.vfStaveNote) {
                gve.vfStaveNote.setStave(stave);
                gve.applyBordersFromVexflow();
                this.PositionAndShape.RelativePosition.x = gve.vfStaveNote.getBoundingBox().x / unitInPixels;
                if (gve.PositionAndShape.BorderLeft < lastBorderLeft) {
                    lastBorderLeft = gve.PositionAndShape.BorderLeft;
                }
            }
        }
        this.PositionAndShape.RelativePosition.x -= lastBorderLeft;
        this.PositionAndShape.calculateBoundingBox();
    }
}
