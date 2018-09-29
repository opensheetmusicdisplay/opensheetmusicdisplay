import { GraphicalObject } from "./GraphicalObject";
import { StaffLine } from "./StaffLine";
import { BoundingBox } from "./BoundingBox";
// import * as log from "loglevel";
import { VexFlowInstantaneousDynamicExpression } from "./VexFlow/VexFlowInstantaneousDynamicExpression";
import { VexFlowContinuousDynamicExpression } from "./VexFlow/VexFlowContinuousDynamicExpression";
import { AbstractGraphicalExpression } from "./AbstractGraphicalExpression";
import { PointF2D } from "../../Common/DataObjects/PointF2D";

export class AlignmentManager extends GraphicalObject {

    constructor(staffline: StaffLine) {
        super();
        this.PositionAndShape = new BoundingBox(this, staffline.PositionAndShape);
        this.PositionAndShape.BorderLeft = staffline.PositionAndShape.BorderLeft;
        this.PositionAndShape.BorderRight = 20;
        this.PositionAndShape.BorderTop = 0;
        this.PositionAndShape.BorderBottom = 10;
    }

    public alignExpressions(): void {
        return;
        const staffLine: StaffLine = (this.PositionAndShape.Parent.DataObject as StaffLine);
        for (let aeIdx: number = 0; aeIdx < staffLine.AbstractExpressions.length - 1; aeIdx++) {
            const currentExpression: AbstractGraphicalExpression = staffLine.AbstractExpressions[aeIdx];
            const nextExpression: AbstractGraphicalExpression = staffLine.AbstractExpressions[aeIdx + 1];
            if (currentExpression.Placement === nextExpression.Placement) {
                if ((currentExpression instanceof VexFlowInstantaneousDynamicExpression && nextExpression instanceof VexFlowContinuousDynamicExpression)) {
                    const curCenter: PointF2D = this.getCenter(currentExpression.PositionAndShape);
                    const nextCenter: PointF2D = this.getCenter(nextExpression.PositionAndShape);
                    const diffY: number = Math.abs(curCenter.y - nextCenter.y);
                    if (curCenter.y < nextCenter.y) {
                        nextExpression.PositionAndShape.RelativePosition.y += diffY;
                    } else {
                        currentExpression.PositionAndShape.RelativePosition.y += diffY;
                    }
                    const overlap: PointF2D = this.getOverlap(currentExpression.PositionAndShape, nextExpression.PositionAndShape);
                    currentExpression.PositionAndShape.RelativePosition.x -= overlap.x;
                }
            }
        }
    }

    /**
     * Get the center of a bounding box
     * @param boundingBox Bounding box to check
     */
    private getCenter(boundingBox: BoundingBox): PointF2D {
        return new PointF2D(boundingBox.BorderMarginRight - boundingBox.BorderMarginLeft,
                            boundingBox.BorderMarginBottom - boundingBox.BorderMarginTop);
    }

    // /**
    //  * Get distance between to bounding boxes
    //  * @param a First bounding box
    //  * @param b Second bounding box
    //  */
    // private getDistance(a: BoundingBox, b: BoundingBox): PointF2D {
    //     const rightBorderA: number = a.AbsolutePosition.x + a.BorderMarginRight;
    //     const leftBorderB: number = b.AbsolutePosition.x + b.BorderMarginLeft;
    //     const bottomBorderA: number = a.AbsolutePosition.y + a.BorderMarginBottom;
    //     const topBorderB: number = b.AbsolutePosition.y + b.BorderMarginTop;
    //     return new PointF2D(leftBorderB - rightBorderA,
    //                         topBorderB - bottomBorderA);
    // }

    /**
     * Get overlap of two bounding boxes. A 0.0 indicates no overlap
     * @param a First bounding box
     * @param b Second bounding box
     */
    private getOverlap(a: BoundingBox, b: BoundingBox): PointF2D {
        // do overlap?
        if (a.BorderMarginLeft > b.BorderMarginRight || b.BorderMarginLeft > a.BorderMarginRight) {
            return new PointF2D();
        }
        if (a.BorderMarginBottom < b.BorderMarginTop || b.BorderMarginBottom < a.BorderMarginTop) {
            return new PointF2D();
        }
        return new PointF2D(a.BorderMarginRight - b.BorderMarginLeft,
                            a.BorderMarginBottom - b.BorderMarginTop);
    }
}
