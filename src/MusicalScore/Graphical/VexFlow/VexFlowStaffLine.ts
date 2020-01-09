import {StaffLine} from "../StaffLine";
import {MusicSystem} from "../MusicSystem";
import {Staff} from "../../VoiceData/Staff";
import { VexFlowSlur } from "./VexFlowSlur";
import { AlignmentManager } from "./AlignmentManager";

export class VexFlowStaffLine extends StaffLine {
    constructor(parentSystem: MusicSystem, parentStaff: Staff) {
        super(parentSystem, parentStaff);
        this.alignmentManager = new AlignmentManager(this);
    }

    protected slursInVFStaffLine: VexFlowSlur[] = [];
    protected alignmentManager: AlignmentManager;

    public get SlursInVFStaffLine(): VexFlowSlur[] {
        return this.slursInVFStaffLine;
    }
    public addVFSlurToVFStaffline(vfSlur: VexFlowSlur): void {
        this.slursInVFStaffLine.push(vfSlur);
    }

    public get AlignmentManager(): AlignmentManager {
        return this.alignmentManager;
    }
}
