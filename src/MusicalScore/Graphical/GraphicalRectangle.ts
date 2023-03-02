import {OutlineAndFillStyleEnum} from "./DrawingEnums";
import {BoundingBox} from "./BoundingBox";
import {PointF2D} from "../../Common/DataObjects/PointF2D";
import {GraphicalObject} from "./GraphicalObject";
import { RectangleF2D } from "../../Common/DataObjects/RectangleF2D";

export class GraphicalRectangle extends GraphicalObject {
    public UpperLeftPoint: PointF2D;
    public LowerRightPoint: PointF2D;

    constructor(upperLeftPoint: PointF2D, lowerRightPoint: PointF2D, parent: BoundingBox, style: OutlineAndFillStyleEnum) {
        super();
        this.boundingBox = new BoundingBox(this, parent);
        this.UpperLeftPoint = upperLeftPoint;
        this.LowerRightPoint = lowerRightPoint;
        // this.boundingBox.RelativePosition = upperLeftPoint; // this prevents RelativePosition from being useful/settable from the outside
        this.boundingBox.BorderRight = lowerRightPoint.x - upperLeftPoint.x;
        this.boundingBox.BorderBottom = lowerRightPoint.y - upperLeftPoint.y;
        this.style = style;
    }

    public get RectangleF2D(): RectangleF2D {
        const width: number = this.LowerRightPoint.x - this.UpperLeftPoint.x;
        const height: number = this.LowerRightPoint.y - this.UpperLeftPoint.y;
        return new RectangleF2D(this.UpperLeftPoint.x, this.UpperLeftPoint.y, width, height);
    }

    public style: OutlineAndFillStyleEnum;
}
