import {ContinuousDynamicExpression} from "../Expressions/ContinuousExpressions/continuousDynamicExpression";
import {InstantaniousDynamicExpression} from "../Expressions/instantaniousDynamicExpression";
import {MultiExpression} from "../Expressions/multiExpression";

export class DynamicsContainer /*implements IComparable<DynamicsContainer>*/ {
    constructor(continuousDynamicExpression: ContinuousDynamicExpression, staffNumber: number) {
        this.ContinuousDynamicExpression = continuousDynamicExpression;
        this.StaffNumber = staffNumber;
    }
    constructor(instantaniousDynamicExpression: InstantaniousDynamicExpression, staffNumber: number) {
        this.InstantaneousDynamicExpression = instantaniousDynamicExpression;
        this.StaffNumber = staffNumber;
    }

    public ContinuousDynamicExpression: ContinuousDynamicExpression;
    public InstantaneousDynamicExpression: InstantaniousDynamicExpression;
    public StaffNumber: number;

    public parMultiExpression(): MultiExpression {
        if (this.ContinuousDynamicExpression !== undefined) {
            return this.ContinuousDynamicExpression.StartMultiExpression;
        }
        if (this.InstantaneousDynamicExpression !== undefined) {
            return this.InstantaneousDynamicExpression.ParentMultiExpression;
        }
        return undefined;
    }
    public CompareTo(other: DynamicsContainer): number {
        return this.parMultiExpression().AbsoluteTimestamp.CompareTo(other.parMultiExpression().AbsoluteTimestamp);
    }
}
