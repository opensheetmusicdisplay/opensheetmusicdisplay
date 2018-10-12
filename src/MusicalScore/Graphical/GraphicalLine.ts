
import {OutlineAndFillStyleEnum} from "./DrawingEnums";
import {PointF2D} from "../../Common/DataObjects/PointF2D";

export class GraphicalLine {
    constructor(start: PointF2D, end: PointF2D, width: number = 0, styleEnum: OutlineAndFillStyleEnum = OutlineAndFillStyleEnum.BaseWritingColor) {
        this.start = start;
        this.end = end;
        this.width = width;
        this.styleId = <number>styleEnum;
    }
    public styleId: number;

    private start: PointF2D;
    private end: PointF2D;
    private width: number;

    public get Start(): PointF2D {
        return this.start;
    }
    public set Start(value: PointF2D) {
        this.start = value;
    }
    public get End(): PointF2D {
        return this.end;
    }
    public set End(value: PointF2D) {
        this.end = value;
    }
    public get Width(): number {
        return this.width;
    }
    public set Width(value: number) {
        this.width = value;
    }
}
