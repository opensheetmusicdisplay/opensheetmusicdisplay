import {StaffLine} from "../StaffLine";
import {MusicSystem} from "../MusicSystem";
import {Staff} from "../../VoiceData/Staff";

export class VexFlowStaffLine extends StaffLine {
    constructor(parentSystem: MusicSystem, parentStaff: Staff) {
        super(parentSystem, parentStaff);

    }
}
