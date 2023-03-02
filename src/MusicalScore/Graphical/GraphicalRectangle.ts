import {OutlineAndFillStyleEnum} from "./DrawingEnums";
import {BoundingBox} from "./BoundingBox";
import {PointF2D} from "../../Common/DataObjects/PointF2D";
import {GraphicalObject} from "./GraphicalObject";

export class GraphicalRectangle extends GraphicalObject {

    constructor(upperLeftPoint: PointF2D, lowerRightPoint: PointF2D, parent: BoundingBox, style: OutlineAndFillStyleEnum) {
        super();
        this.boundingBox = new BoundingBox(this, parent);
        this.boundingBox.RelativePosition = upperLeftPoint;
        this.boundingBox.BorderRight = lowerRightPoint.x - upperLeftPoint.x;
        this.boundingBox.BorderBottom = lowerRightPoint.y - upperLeftPoint.y;
        this.style = style;
    }

    public style: OutlineAndFillStyleEnum;
}
