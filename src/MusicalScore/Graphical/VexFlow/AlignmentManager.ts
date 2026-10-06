import { StaffLine } from "../StaffLine";
import { BoundingBox } from "../BoundingBox";
import { VexFlowContinuousDynamicExpression } from "./VexFlowContinuousDynamicExpression";
import { AbstractGraphicalExpression } from "../AbstractGraphicalExpression";
import { PointF2D } from "../../../Common/DataObjects/PointF2D";
import { EngravingRules } from "../EngravingRules";
import { PlacementEnum } from "../../VoiceData/Expressions/AbstractExpression";
import { GraphicalContinuousDynamicExpression } from "../GraphicalContinuousDynamicExpression";

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

            const currentExpressionPlacement: PlacementEnum = currentExpression?.SourceExpression?.Placement;
            const nextExpressionPlacement: PlacementEnum = nextExpression?.SourceExpression?.Placement;

            // TODO this shifts dynamics in An die Ferne Geliebte, showing that there's something wrong with the RelativePositions etc with wedges
            // if (currentExpression instanceof GraphicalContinuousDynamicExpression) {
            //     currentExpression.calcPsi();
            // }
            // if (nextExpression instanceof GraphicalContinuousDynamicExpression) {
            //     nextExpression.calcPsi();
            // }

            if (currentExpressionPlacement === nextExpressionPlacement) {
                // if ((currentExpression as any).label?.label?.text?.startsWith("dim") ||
                //     (nextExpression as any).label?.label?.text?.startsWith("dim")) {
                //         console.log("here");
                //     }
                const dist: PointF2D = this.getDistance(currentExpression.PositionAndShape, nextExpression.PositionAndShape);
                if (Math.abs(dist.x) < this.rules.DynamicExpressionMaxDistance && !this.textsOverlap(currentExpression, nextExpression)) {
                    // Prevent last found expression to be added twice. e.g. p<f as three close expressions
                    if (tmpList.indexOf(currentExpression) === -1) {
                        tmpList.push(currentExpression);
                    }
                    tmpList.push(nextExpression);
                } else {
                    groups.push(tmpList);
                    tmpList = new Array<AbstractGraphicalExpression>();
                }
            } else {
                // A group only has expressions of one placement, see yIdeal below.
                //   Otherwise e.g. two close expressions above the staff and the next two below it formed one group.
                groups.push(tmpList);
                tmpList = new Array<AbstractGraphicalExpression>();
            }
        }
        // If expressions are colliding at end, we need to add them too
        groups.push(tmpList);

        for (const aes of groups) {
            if (aes.length > 0) {
                // Shift all group members to the y position of the member farthest from the staff:
                //   the highest one above the staff, the lowest one below it.
                //   Each one was placed at the sky/bottom line, so moving away from the staff keeps it clear of the notes,
                //   while moving towards the staff (e.g. to the lowest one above it) put expressions onto the notes.
                const centerYs: number[] = aes.map(expr => expr.PositionAndShape.Center.y);
                // TODO this may not give the right position for wedges (GraphicalContinuousDynamic, !isVerbal())
                const isAbove: boolean = aes[0].SourceExpression?.Placement === PlacementEnum.Above;
                const yIdeal: number = isAbove ? Math.min(...centerYs) : Math.max(...centerYs);
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
                    // FIXME: Expressions should not behave differently.
                    // TODO: The 0.8 are because the letters are a bit too far done
                    const shift: number = this.limitShift(expr, expr instanceof VexFlowContinuousDynamicExpression ? -centerOffset : -centerOffset * 0.8, aes);
                    if (expr instanceof VexFlowContinuousDynamicExpression) {
                        (expr as VexFlowContinuousDynamicExpression).shiftYPosition(shift);
                        (expr as VexFlowContinuousDynamicExpression).calcPsi();
                    } else {
                        expr.PositionAndShape.RelativePosition.y += shift;
                        // note: verbal GraphicalContinuousDynamicExpressions have a label, nonverbal ones don't.
                        // take care to update and take the right bounding box for skyline.
                        expr.PositionAndShape.calculateBoundingBox();
                    }
                    // Squeeze wedges
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
     * Whether two expressions that aren't wedges overlap horizontally, comparing their text without the margins.
     * Aligning them would draw one on the other, e.g. "p cresc." from one direction: "cresc." starts at the p's center and
     * is placed below it. A wedge is squeezed away from its neighbors in the group instead, see alignDynamicExpressions().
     * @param a First expression
     * @param b Second expression
     */
    private textsOverlap(a: AbstractGraphicalExpression, b: AbstractGraphicalExpression): boolean {
        if (this.isWedge(a) || this.isWedge(b)) {
            return false;
        }
        // the borders of an instantaneous or verbal dynamic's box are its label's borders (at (0, 0) in the box)
        const boxA: BoundingBox = a.PositionAndShape;
        const boxB: BoundingBox = b.PositionAndShape;
        return boxA.RelativePosition.x + boxA.BorderLeft < boxB.RelativePosition.x + boxB.BorderRight &&
            boxB.RelativePosition.x + boxB.BorderLeft < boxA.RelativePosition.x + boxA.BorderRight;
    }

    /**
     * Limits the shift of a group member away from the staff, so that it stops at an expression placed further out at the same
     * x that isn't in the group, e.g. at the "dim." placed above the ff of "ff dim." when the ff moves up to an expression before it.
     * @param expression The group member
     * @param shiftY The shift towards the group's y position (negative: up)
     * @param group The members of the group, which move together
     */
    private limitShift(expression: AbstractGraphicalExpression, shiftY: number, group: AbstractGraphicalExpression[]): number {
        const box: BoundingBox = expression.PositionAndShape;
        const left: number = box.RelativePosition.x + box.BorderMarginLeft;
        const right: number = box.RelativePosition.x + box.BorderMarginRight;
        let limitedShift: number = shiftY;
        for (const other of this.parentStaffline.AbstractExpressions) {
            const otherBox: BoundingBox = other.PositionAndShape;
            if (group.includes(other) ||
                otherBox.RelativePosition.x + otherBox.BorderMarginRight <= left || otherBox.RelativePosition.x + otherBox.BorderMarginLeft >= right) {
                continue;
            }
            // the space between the member and the other expression, if the other one is in the direction of the shift
            if (shiftY < 0) {
                const space: number = box.RelativePosition.y + box.BorderMarginTop - (otherBox.RelativePosition.y + otherBox.BorderMarginBottom);
                if (space >= 0) {
                    limitedShift = Math.max(limitedShift, -space);
                }
            } else if (shiftY > 0) {
                const space: number = otherBox.RelativePosition.y + otherBox.BorderMarginTop - (box.RelativePosition.y + box.BorderMarginBottom);
                if (space >= 0) {
                    limitedShift = Math.min(limitedShift, space);
                }
            }
        }
        return limitedShift;
    }

    /** Whether the expression is a crescendo or decrescendo wedge (a continuous dynamic without text). */
    private isWedge(expression: AbstractGraphicalExpression): boolean {
        return expression instanceof GraphicalContinuousDynamicExpression && !expression.IsVerbal;
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
                            // note: this is a distance vector, not absolute distance, otherwise we need Math.abs
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
