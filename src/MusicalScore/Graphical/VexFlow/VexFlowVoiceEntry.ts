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
        const a: any = (this.vfStaveNote as any);
        const bb: any = a.getBoundingBox();
        this.PositionAndShape.RelativePosition.y = bb.y / unitInPixels;
        this.PositionAndShape.BorderTop = 0;
        this.PositionAndShape.BorderBottom = bb.h / unitInPixels;
        this.PositionAndShape.BorderLeft = bb.x / unitInPixels;
        this.PositionAndShape.BorderRight = bb.w / unitInPixels;
    }

    public set vfStaveNote(value: Vex.Flow.StemmableNote) {
        this.mVexFlowStaveNote = value;
    }

    public get vfStaveNote(): Vex.Flow.StemmableNote {
        return this.mVexFlowStaveNote;
    }
}
