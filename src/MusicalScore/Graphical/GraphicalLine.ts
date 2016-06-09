import PointF_2D = PhonicScore.Common.DataObjects.PointF_2D;
import {OutlineAndFillStyleEnum} from "./DrawingEnums";
export class GraphicalLine {
    private start: PointF_2D;
    private end: PointF_2D;
    private width: number;
    constructor(start: PointF_2D, end: PointF_2D, width: number = 0, styleEnum: OutlineAndFillStyleEnum = OutlineAndFillStyleEnum.BaseWritingColor) {
        this.start = start;
        this.end = end;
        this.width = width;
        this.StyleId = <number>styleEnum;
    }
    public StyleId: number;
    public get Start(): PointF_2D {
        return this.start;
    }
    public set Start(value: PointF_2D) {
        this.start = value;
    }
    public get End(): PointF_2D {
        return this.end;
    }
    public set End(value: PointF_2D) {
        this.end = value;
    }
    public get Width(): number {
        return this.width;
    }
    public set Width(value: number) {
        this.width = value;
    }
}
