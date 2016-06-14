import {MusicSystem} from "../MusicSystem";
import {GraphicalMusicPage} from "../GraphicalMusicPage";
import {SystemLinesEnum} from "../SystemLinesEnum";
import {EngravingRules} from "../EngravingRules";
import {PointF2D} from "../../../Common/DataObjects/PointF2D";
export class VexFlowMusicSystem extends MusicSystem {
    constructor(parent: GraphicalMusicPage, id: number) {
        super(parent, id);

    }
    public createSystemLeftVerticalLineObject(lineWidth: number, systemLabelsRightMargin: number): void {

    }
    public createVerticalLineForMeasure(position: number, lineType: SystemLinesEnum, lineWidth: number, index: number): void {

    }
    public setYPositionsToVerticalLineObjectsAndCreateLines(rules: EngravingRules): void {

    }
    protected calcInstrumentsBracketsWidth(): number {
        return 0;
    }
    protected createInstrumentBracket(rightUpper: PointF2D, rightLower: PointF2D): void {

    }
    protected createGroupBracket(rightUpper: PointF2D, rightLower: PointF2D, staffHeight: number, recursionDepth: number): void {

    }
}