import { StaffLine } from "../StaffLine";
import { BoundingBox } from "../BoundingBox";
import { VexFlowContinuousDynamicExpression } from "./VexFlowContinuousDynamicExpression";
import { AbstractGraphicalExpression } from "../AbstractGraphicalExpression";
import { PointF2D } from "../../../Common/DataObjects/PointF2D";
import { EngravingRules } from "../EngravingRules";
import { GraphicalContinuousDynamicExpression } from "../GraphicalContinuousDynamicExpression";
// import { GraphicalContinuousDynamicExpression } from "../GraphicalContinuousDynamicExpression";
// import { SkyBottomLineCalculator } from "../SkyBottomLineCalculator";

export class AlignmentManager {
    private parentStaffline: StaffLine;
    private rules: EngravingRules;

    constructor(staffline: StaffLine) {
        this.parentStaffline = staffline;
        this.rules = this.parentStaffline.ParentMusicSystem.rules;
    }

    public alignDynamicExpressions(): void {
        // Find close expressions along the staffline. Group them into tuples
        const groups: AbstractGraphicalExpression[][] = [];
        let tmpList: AbstractGraphicalExpression[] = new Array<AbstractGraphicalExpression>();
        for (let aeIdx: number = 0; aeIdx < this.parentStaffline.AbstractExpressions.length - 1; aeIdx++) {
            const currentExpression: AbstractGraphicalExpression = this.parentStaffline.AbstractExpressions[aeIdx];
            const nextExpression: AbstractGraphicalExpression = this.parentStaffline.AbstractExpressions[aeIdx + 1];

            // TODO this shifts dynamics in An die Ferne Geliebte, showing that there's something wrong with the RelativePositions etc with wedges
            // if (currentExpression instanceof GraphicalContinuousDynamicExpression) {
            //     currentExpression.calcPsi();
            // }
            // if (nextExpression instanceof GraphicalContinuousDynamicExpression) {
            //     nextExpression.calcPsi();
            // }

            if (currentExpression.Placement === nextExpression.Placement) {
                const dist: PointF2D = this.getDistance(currentExpression.PositionAndShape, nextExpression.PositionAndShape);
                if (dist.x < this.rules.DynamicExpressionMaxDistance) {
                    // Prevent last found expression to be added twice. e.g. p<f as three close expressions
                    if (tmpList.indexOf(currentExpression) === -1) {
                        tmpList.push(currentExpression);
                    }
                    tmpList.push(nextExpression);
                } else {
                    groups.push(tmpList);
                    tmpList = new Array<AbstractGraphicalExpression>();
                }
            }
        }
        // If expressions are colliding at end, we need to add them too
        groups.push(tmpList);

        for (const aes of groups) {
            // only align if there are wedges
            //   fixes placement in Clementi Op. 36 No. 1 Pt 2
            let hasWedges: boolean = false;
            for (const ae of aes) {
                if (ae instanceof GraphicalContinuousDynamicExpression && !(ae as GraphicalContinuousDynamicExpression).IsVerbal) {
                    hasWedges = true;
                    break;
                }
            }
            if (!hasWedges) {
                continue;
            }

            if (aes.length > 0) {
                // Get the median y position and shift all group members to that position
                const centerYs: number[] = aes.map(expr => expr.PositionAndShape.Center.y);
                // TODO this may not give the right position for wedges (GraphicalContinuousDynamic, !isVerbal())
                const yIdeal: number = Math.max(...centerYs);
                // for (const ae of aes) { // debug
                //     if (ae.PositionAndShape.Center.y > 6) {
                //         // dynamic positioned at edge of skybottomline
                //         console.log(`max expression in measure ${ae.SourceExpression.parentMeasure.MeasureNumber}: `);
                //         console.dir(aes);
                //     }
                // }
                for (let exprIdx: number = 0; exprIdx < aes.length; exprIdx++) {
                    const expr: AbstractGraphicalExpression = aes[exprIdx];
                    const centerOffset: number = centerYs[exprIdx] - yIdeal;
                    console.log(`center offset: ${centerOffset}`);
                    // TODO centerOffset is way too big sometimes, like 7.0 in An die Ferne Geliebte (measure 10, dim.)
                    const centerOffsetUsed: number = Math.min(this.rules.DynamicExpressionMaxAlignOffset,
                                                              Math.abs(centerOffset)) * Math.sign(centerOffset);
                    // FIXME: Expressions should not behave differently.
                    if (expr instanceof VexFlowContinuousDynamicExpression) {
                        console.log("shift VexFlowContinuousDynamicExpression");
                        (expr as VexFlowContinuousDynamicExpression).shiftYPosition(-centerOffsetUsed);
                        (expr as VexFlowContinuousDynamicExpression).calcPsi();
                    } else {
                        // TODO: The 0.8 are because the letters are a bit to far done
                        expr.PositionAndShape.RelativePosition.y -= centerOffsetUsed * 0.8;
                        // note: verbal GraphicalContinuousDynamicExpressions have a label, nonverbal ones don't.
                        // take care to update and take the right bounding box for skyline.
                        expr.PositionAndShape.calculateBoundingBox();
                    }

                    // console.dir(expr);
                    // const skycalculator: SkyBottomLineCalculator = this.parentStaffline.SkyBottomLineCalculator;
                    // const bottomline: number[] = this.parentStaffline.BottomLine; // TODO assigned as reference? or need to use directly?
                    // const leftx: number = skycalculator.getLeftIndexForPointX(expr.PositionAndShape.RelativePosition.x, bottomline.length);
                    // const rightx: number = skycalculator.getRightIndexForPointX(
                    //     expr.PositionAndShape.RelativePosition.x + expr.PositionAndShape.Size.width, bottomline.length);
                    // console.log(`measure ${expr.SourceExpression.parentMeasure?.MeasureNumber},
                    //     staffline.bottomline[leftx]: ${this.parentStaffline.BottomLine[leftx]}`);

                    // bottomline[leftx] = Math.max(bottomline[leftx], expr.PositionAndShape.RelativePosition.y + expr.PositionAndShape.BorderBottom);
                    // this.parentStaffline.BottomLine[leftx] = Math.max(
                    //     this.parentStaffline.BottomLine[leftx],
                    //     expr.PositionAndShape.BorderMarginTop + expr.PositionAndShape.RelativePosition.y);
                        // see GraphicalContinuousDynamicExpression.updateSkyBottomLine()

                    // console.log(`measure ${expr.SourceExpression.parentMeasure?.MeasureNumber},
                    //     staffline.bottomline[leftx]: ${this.parentStaffline.BottomLine[leftx]}`);
                    // this.parentStaffline.BottomLine[rightx] = Math.max(
                    //     this.parentStaffline.BottomLine[rightx],
                    //     expr.PositionAndShape.BorderMarginTop + expr.PositionAndShape.RelativePosition.y);

                    // Squeeze wedges
                    // TODO update skyline?
                    if ((expr as VexFlowContinuousDynamicExpression).squeeze) {
                        const nextExpression: AbstractGraphicalExpression = exprIdx < aes.length - 1 ? aes[exprIdx + 1] : undefined;
                        const prevExpression: AbstractGraphicalExpression = exprIdx > 0 ? aes[exprIdx - 1] : undefined;
                        if (nextExpression) {
                            const overlapRight: PointF2D = this.getOverlap(expr.PositionAndShape, nextExpression.PositionAndShape);
                            (expr as VexFlowContinuousDynamicExpression).squeeze(-(overlapRight.x + this.rules.DynamicExpressionSpacer));
                        }
                        if (prevExpression) {
                            const overlapLeft: PointF2D = this.getOverlap(prevExpression.PositionAndShape, expr.PositionAndShape);
                            (expr as VexFlowContinuousDynamicExpression).squeeze(overlapLeft.x + this.rules.DynamicExpressionSpacer);
                        }
                    }
                }
            }
        }
    }

    /**
     * Get distance between two bounding boxes
     * @param a First bounding box
     * @param b Second bounding box
     */
    private getDistance(a: BoundingBox, b: BoundingBox): PointF2D {
        const rightBorderA: number = a.RelativePosition.x + a.BorderMarginRight;
        const leftBorderB: number = b.RelativePosition.x + b.BorderMarginLeft;
        const bottomBorderA: number = a.RelativePosition.y + a.BorderMarginBottom;
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
