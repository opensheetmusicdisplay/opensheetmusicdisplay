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
    public InstantaniousDynamicExpression: InstantaniousDynamicExpression;
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
        let thisTimestamp: number = this.parMultiExpression().AbsoluteTimestamp.RealValue;
        let otherTimestamp: number = other.parMultiExpression().AbsoluteTimestamp.RealValue;
        if (thisTimestamp > otherTimestamp) { return 1; }
        if (thisTimestamp < otherTimestamp) { return -1; }
        return 0;
    }
}
