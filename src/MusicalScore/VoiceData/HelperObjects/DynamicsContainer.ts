import {ContinuousDynamicExpression} from "../Expressions/ContinuousExpressions/ContinuousDynamicExpression";
import {InstantaniousDynamicExpression} from "../Expressions/InstantaniousDynamicExpression";
import {MultiExpression} from "../Expressions/MultiExpression";

export class DynamicsContainer /*implements IComparable<DynamicsContainer>*/ {
    constructor(dynamicExpression: ContinuousDynamicExpression|InstantaniousDynamicExpression, staffNumber: number) {
        if (dynamicExpression instanceof ContinuousDynamicExpression) {
            this.continuousDynamicExpression = dynamicExpression;
        } else if (dynamicExpression instanceof InstantaniousDynamicExpression) {
            this.instantaneousDynamicExpression = dynamicExpression;
        }
        this.staffNumber = staffNumber;
    }

    public continuousDynamicExpression: ContinuousDynamicExpression;
    public instantaneousDynamicExpression: InstantaniousDynamicExpression;
    public staffNumber: number;

    public parMultiExpression(): MultiExpression {
        if (this.continuousDynamicExpression !== undefined) {
            return this.continuousDynamicExpression.StartMultiExpression;
        }
        if (this.instantaneousDynamicExpression !== undefined) {
            return this.instantaneousDynamicExpression.ParentMultiExpression;
        }
        return undefined;
    }
    public CompareTo(other: DynamicsContainer): number {
        return this.parMultiExpression().AbsoluteTimestamp.CompareTo(other.parMultiExpression().AbsoluteTimestamp);
    }
}
