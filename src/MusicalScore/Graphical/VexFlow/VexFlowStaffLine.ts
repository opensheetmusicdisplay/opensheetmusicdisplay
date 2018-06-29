import {StaffLine} from "../StaffLine";
import {MusicSystem} from "../MusicSystem";
import {Staff} from "../../VoiceData/Staff";
import { VexFlowSlur } from "./VexFlowSlur";

export class VexFlowStaffLine extends StaffLine {
    constructor(parentSystem: MusicSystem, parentStaff: Staff) {
        super(parentSystem, parentStaff);
    }

    protected slursInVFStaffLine: VexFlowSlur[] = [];

    // public get SlursInVFStaffLine(): VexFlowSlur[] {
    //     return this.slursInVFStaffLine;
    // }
    public get SlursInVFStaffLine(): VexFlowSlur[] {
        return this.slursInVFStaffLine;
    }
    public set SlursInVFStaffLine(vfSlurs: VexFlowSlur[]) { //(VFIndex: number, VFSlur: VexFlowSlur) {
        this.slursInVFStaffLine = vfSlurs;
        // for (const vfsIndex in vfSlursDict) {
        //     if (vfsIndex !== undefined) {
        //         this.slursInVFStaffLine[vfsIndex] = vfSlursDict[vfsIndex];
        //     }
        // }
    }
    public addVFSlurToVFStaffline(vfSlur: VexFlowSlur): void {
        this.slursInVFStaffLine.push(vfSlur);
    }
}
