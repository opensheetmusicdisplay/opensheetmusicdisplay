import {GraphicalMeasure} from "./GraphicalMeasure";
import {StaffLine} from "./StaffLine";
import {MusicSystem} from "./MusicSystem";
import {SystemLinePosition} from "./SystemLinePosition";
import {SystemLinesEnum} from "./SystemLinesEnum";
import {BoundingBox} from "./BoundingBox";
import {GraphicalObject} from "./GraphicalObject";
import {EngravingRules} from "./EngravingRules";

export class SystemLine extends GraphicalObject {

    constructor(lineType: SystemLinesEnum, linePosition: SystemLinePosition, musicSystem: MusicSystem,
                topMeasure: GraphicalMeasure, bottomMeasure: GraphicalMeasure = undefined) {
        super();
        this.lineType = lineType;
        this.linePosition = linePosition;
        this.parentMusicSystem = musicSystem;
        this.topMeasure = topMeasure;
        this.bottomMeasure = bottomMeasure;
        this.parentTopStaffLine = topMeasure.ParentStaffLine;
        this.boundingBox = new BoundingBox(this, musicSystem.PositionAndShape);
    }

    public lineType: SystemLinesEnum;
    public linePosition: SystemLinePosition;
    public parentMusicSystem: MusicSystem;
    public parentTopStaffLine: StaffLine;
    public topMeasure: GraphicalMeasure;
    public bottomMeasure: GraphicalMeasure;

    /**
     * Return the width of the SystemLinesContainer for the given SystemLineType.
     * @param rules
     * @param systemLineType
     * @returns {number}
     */
    public static getObjectWidthForLineType(rules: EngravingRules, systemLineType: SystemLinesEnum): number {
        switch (systemLineType) {
            case SystemLinesEnum.SingleThin:
                return rules.SystemThinLineWidth;
            case SystemLinesEnum.DoubleThin:
                return rules.SystemThinLineWidth * 2 + rules.DistanceBetweenVerticalSystemLines;
            case SystemLinesEnum.ThinBold:
                return rules.SystemThinLineWidth + rules.SystemBoldLineWidth + rules.DistanceBetweenVerticalSystemLines;
            case SystemLinesEnum.BoldThinDots:
                return rules.SystemThinLineWidth + rules.SystemBoldLineWidth + rules.DistanceBetweenVerticalSystemLines + rules.SystemDotWidth +
                    rules.DistanceBetweenDotAndLine;
            case SystemLinesEnum.DotsThinBold:
                return rules.SystemThinLineWidth + rules.SystemBoldLineWidth + rules.DistanceBetweenVerticalSystemLines + rules.SystemDotWidth +
                    rules.DistanceBetweenDotAndLine;
            case SystemLinesEnum.DotsBoldBoldDots:
                return 2 * rules.SystemBoldLineWidth + 2 * rules.SystemDotWidth + 2 * rules.DistanceBetweenDotAndLine +
                    rules.DistanceBetweenVerticalSystemLines;
            default:
                return 0;
        }
    }

}
