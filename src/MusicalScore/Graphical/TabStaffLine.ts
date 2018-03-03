import { StaffLine } from "./StaffLine";
import { MusicSystem } from "./MusicSystem";
import { Staff } from "../VoiceData/Staff";

export abstract class TabStaffLine extends StaffLine {

    constructor(parentSystem: MusicSystem, parentStaff: Staff) {
        super(parentSystem, parentStaff);
    }
}
