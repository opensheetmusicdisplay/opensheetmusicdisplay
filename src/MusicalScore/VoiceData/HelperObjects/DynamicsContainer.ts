type ContinuousDynamicExpression = any;
type InstantaniousDynamicExpression = any;
type MultiExpression = any;

export class DynamicsContainer /*implements IComparable<DynamicsContainer>*/ {
    constructor(continuousDynamicExpression: ContinuousDynamicExpression, staffNumber: number) {
        this.ContinuousDynamicExpression = continuousDynamicExpression;
        this.StaffNumber = staffNumber;
    }
    constructor(instantaniousDynamicExpression: InstantaniousDynamicExpression, staffNumber: number) {
        this.InstantaniousDynamicExpression = instantaniousDynamicExpression;
        this.StaffNumber = staffNumber;
    }

    public ContinuousDynamicExpression: ContinuousDynamicExpression;
    public InstantaneousDynamicExpression: InstantaneousDynamicExpression;
    public StaffNumber: number;

    public parMultiExpression(): MultiExpression {
        if (this.ContinuousDynamicExpression !== undefined) {
            return this.ContinuousDynamicExpression.StartMultiExpression;
        }
        if (this.InstantaniousDynamicExpression !== undefined) {
            return this.InstantaniousDynamicExpression.ParentMultiExpression;
        }
        return undefined;
    }
    public CompareTo(other: DynamicsContainer): number {
        return this.parMultiExpression().AbsoluteTimestamp.CompareTo(other.parMultiExpression().AbsoluteTimestamp);
    }
}
