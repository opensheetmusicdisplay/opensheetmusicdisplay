import { Staff } from "../VoiceData/Staff";
import { GraphicalLine } from "./GraphicalLine";
import { GraphicalStaffEntry } from "./GraphicalStaffEntry";
import { GraphicalObject } from "./GraphicalObject";
import { StaffMeasure } from "./StaffMeasure";
import { MusicSystem } from "./MusicSystem";
export declare abstract class StaffLine extends GraphicalObject {
    protected measures: StaffMeasure[];
    protected staffLines: GraphicalLine[];
    protected parentMusicSystem: MusicSystem;
    protected parentStaff: Staff;
    protected skyLine: number[];
    protected bottomLine: number[];
    constructor(parentSystem: MusicSystem, parentStaff: Staff);
    Measures: StaffMeasure[];
    StaffLines: GraphicalLine[];
    ParentMusicSystem: MusicSystem;
    ParentStaff: Staff;
    SkyLine: number[];
    BottomLine: number[];
    addActivitySymbolClickArea(): void;
    isPartOfMultiStaffInstrument(): boolean;
    findClosestStaffEntry(xPosition: number): GraphicalStaffEntry;
}
