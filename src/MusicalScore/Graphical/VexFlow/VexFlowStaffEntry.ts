import {GraphicalStaffEntry} from "../GraphicalStaffEntry";
import {VexFlowMeasure} from "./VexFlowMeasure";
import {SourceStaffEntry} from "../../VoiceData/SourceStaffEntry";
import {unitInPixels} from "./VexFlowMusicSheetDrawer";
import { VexFlowVoiceEntry } from "./VexFlowVoiceEntry";
import { Note } from "../../VoiceData/Note";
import { EngravingRules } from "../EngravingRules";

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
                if (!gve.vfStaveNote.preFormatted || gve.vfStaveNote.getBoundingBox() === null) {
                    continue;
                }
                gve.applyBordersFromVexflow();
                this.PositionAndShape.RelativePosition.x = gve.vfStaveNote.getBoundingBox().x / unitInPixels;
                const sourceNote: Note = gve.notes[0].sourceNote;
                if (sourceNote.isRest() && sourceNote.Length.WholeValue === 1) { // whole rest
                    this.PositionAndShape.RelativePosition.x +=
                        EngravingRules.Rules.WholeRestXShiftVexflow - 0.1; // xShift from VexFlowConverter
                    gve.PositionAndShape.BorderLeft = -0.7;
                    gve.PositionAndShape.BorderRight = 0.7;
                }
                if (gve.PositionAndShape.BorderLeft < lastBorderLeft) {
                    lastBorderLeft = gve.PositionAndShape.BorderLeft;
                }
            }
        }
        this.PositionAndShape.RelativePosition.x -= lastBorderLeft;
        this.PositionAndShape.calculateBoundingBox();
    }
}
