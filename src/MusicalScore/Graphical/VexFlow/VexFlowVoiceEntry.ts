import { VoiceEntry } from "../../VoiceData/VoiceEntry";
import { GraphicalVoiceEntry } from "../GraphicalVoiceEntry";
import { GraphicalStaffEntry } from "../GraphicalStaffEntry";
import { unitInPixels } from "./VexFlowMusicSheetDrawer";

export class VexFlowVoiceEntry extends GraphicalVoiceEntry {
    private mVexFlowStaveNote: Vex.Flow.StemmableNote;

    constructor(parentVoiceEntry: VoiceEntry, parentStaffEntry: GraphicalStaffEntry) {
        super(parentVoiceEntry, parentStaffEntry);
    }

    public applyBordersFromVexflow(): void {
        const staveNote: any = (this.vfStaveNote as any);
        if (!staveNote.getNoteHeadBeginX) {
            return;
        }
        const boundingBox: any = staveNote.getBoundingBox();
        const modifierWidth: number = staveNote.getNoteHeadBeginX() - boundingBox.x;

        this.PositionAndShape.RelativePosition.y = boundingBox.y / unitInPixels;
        this.PositionAndShape.BorderTop = 0;
        this.PositionAndShape.BorderBottom = boundingBox.h / unitInPixels;
        this.PositionAndShape.BorderLeft = -(modifierWidth + staveNote.width / 2) / unitInPixels; // Left of our X origin is the modifier
        this.PositionAndShape.BorderRight = (boundingBox.w - modifierWidth) / unitInPixels; // Right of x origin is the note
    }

    public set vfStaveNote(value: Vex.Flow.StemmableNote) {
        this.mVexFlowStaveNote = value;
    }

    public get vfStaveNote(): Vex.Flow.StemmableNote {
        return this.mVexFlowStaveNote;
    }
}
