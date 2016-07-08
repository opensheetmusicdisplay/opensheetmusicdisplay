import { StaffMeasure } from "./StaffMeasure";
import { StaffLine } from "./StaffLine";
import { MusicSystem } from "./MusicSystem";
import { SystemLinePosition } from "./SystemLinePosition";
import { SystemLinesEnum } from "./SystemLinesEnum";
import { GraphicalObject } from "./GraphicalObject";
import { EngravingRules } from "./EngravingRules";
export declare class SystemLine extends GraphicalObject {
    constructor(lineType: SystemLinesEnum, linePosition: SystemLinePosition, musicSystem: MusicSystem, topMeasure: StaffMeasure, bottomMeasure?: StaffMeasure);
    lineType: SystemLinesEnum;
    linePosition: SystemLinePosition;
    parentMusicSystem: MusicSystem;
    parentTopStaffLine: StaffLine;
    topMeasure: StaffMeasure;
    bottomMeasure: StaffMeasure;
    static getObjectWidthForLineType(rules: EngravingRules, systemLineType: SystemLinesEnum): number;
}
