import { GraphicalObject } from "./GraphicalObject";
import { StaffLine } from "./StaffLine";
import { BoundingBox } from "./BoundingBox";
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
        const staffLine: StaffLine = (this.PositionAndShape.Parent.DataObject as StaffLine);
        // Find close expressions along the staffline. Group them into tuples
        const groups: AbstractGraphicalExpression[][] = [];
        const tmpList: AbstractGraphicalExpression[] = [];
        for (let aeIdx: number = 0; aeIdx < staffLine.AbstractExpressions.length - 1; aeIdx++) {
            const currentExpression: AbstractGraphicalExpression = staffLine.AbstractExpressions[aeIdx];
            const nextExpression: AbstractGraphicalExpression = staffLine.AbstractExpressions[aeIdx + 1];
            if (currentExpression.Placement === nextExpression.Placement) {
                const dist: PointF2D = this.getDistance(currentExpression.PositionAndShape, nextExpression.PositionAndShape);
                if (dist.x < 2) {
                    // Prevent last found expression to be added twice. e.g. p<f as three close expressions
                    if (tmpList.indexOf(currentExpression) === -1) {
                        tmpList.push(currentExpression);
                    }
                    tmpList.push(nextExpression);
                } else {
                    groups.push(tmpList.slice(0));
                    tmpList.clear();
                }
            }
        }
        // If expressions are colliding at end, we need to add them too
        groups.push(tmpList.slice(0));
        tmpList.clear();

        for (const aes of groups) {
            if (aes.length > 0) {
                // Get the median y position and shift all group members to that position
                const centerY: number[] = aes.map(expr => this.getCenter(expr.PositionAndShape).y);
                const yIdeal: number = Math.max(...centerY); //centerY.reduce((a, b) => a + b, 0) / centerY.length;
                for (let exprIdx: number = 0; exprIdx < aes.length; exprIdx++) {
                    const expr: AbstractGraphicalExpression = aes[exprIdx];
                    const centerOffset: number = centerY[exprIdx] - yIdeal;
                    // FIXME: Expressions should not behave differently.
                    if (expr instanceof VexFlowContinuousDynamicExpression) {
                        (expr as VexFlowContinuousDynamicExpression).shiftYPosition(-centerOffset);
                    } else {
                        expr.PositionAndShape.RelativePosition.y -= centerOffset;
                    }
                    expr.PositionAndShape.calculateBoundingBox();
                    // Squeeze wedges
                    if (exprIdx < aes.length - 1) {
                        const nextExpression: AbstractGraphicalExpression = aes[exprIdx + 1];
                        const overlap: PointF2D = this.getOverlap(expr.PositionAndShape, nextExpression.PositionAndShape);
                        if (expr instanceof VexFlowInstantaneousDynamicExpression &&
                            nextExpression instanceof VexFlowContinuousDynamicExpression) {
                            (nextExpression as VexFlowContinuousDynamicExpression).squeeze(overlap.x + 0.2);
                            (nextExpression as VexFlowContinuousDynamicExpression).calcPsi();
                        } else if (expr instanceof VexFlowContinuousDynamicExpression &&
                                   nextExpression instanceof VexFlowInstantaneousDynamicExpression) {
                            (expr as VexFlowContinuousDynamicExpression).squeeze(-(overlap.x + 0.2));
                            (expr as VexFlowContinuousDynamicExpression).calcPsi();
                        }
                    }
                }
            }
        }
    }

    /**
     * Get the center of a bounding box
     * @param boundingBox Bounding box to check
     */
    private getCenter(boundingBox: BoundingBox): PointF2D {
        return new PointF2D(boundingBox.RelativePosition.x + (boundingBox.BorderMarginRight + boundingBox.BorderMarginLeft),
                            boundingBox.RelativePosition.y + (boundingBox.BorderMarginBottom + boundingBox.BorderMarginTop));
    }

    /**
     * Get distance between to bounding boxes
     * @param a First bounding box
     * @param b Second bounding box
     */
    private getDistance(a: BoundingBox, b: BoundingBox): PointF2D {
        const rightBorderA: number = a.RelativePosition.x + a.BorderMarginRight;
        const leftBorderB: number = b.RelativePosition.x + b.BorderMarginLeft;
        const bottomBorderA: number = b.RelativePosition.y + a.BorderMarginBottom;
        const topBorderB: number = b.RelativePosition.y + b.BorderMarginTop;
        return new PointF2D(leftBorderB - rightBorderA,
                            topBorderB - bottomBorderA);
    }

    /**
     * Get overlap of two bounding boxes
     * @param a First bounding box
     * @param b Second bounding box
     */
    private getOverlap(a: BoundingBox, b: BoundingBox): PointF2D {
        return new PointF2D((a.RelativePosition.x + a.BorderMarginRight) - (b.RelativePosition.x + b.BorderMarginLeft),
                            (a.RelativePosition.y + a.BorderMarginBottom) - (b.RelativePosition.y + b.BorderMarginTop));
    }
}
