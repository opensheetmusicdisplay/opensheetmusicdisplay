import { ContinuousDynamicExpression } from "../Expressions/ContinuousExpressions/continuousDynamicExpression";
import { InstantaniousDynamicExpression } from "../Expressions/instantaniousDynamicExpression";
import { MultiExpression } from "../Expressions/multiExpression";
export declare class DynamicsContainer {
    constructor(dynamicExpression: ContinuousDynamicExpression | InstantaniousDynamicExpression, staffNumber: number);
    continuousDynamicExpression: ContinuousDynamicExpression;
    instantaneousDynamicExpression: InstantaniousDynamicExpression;
    staffNumber: number;
    parMultiExpression(): MultiExpression;
    CompareTo(other: DynamicsContainer): number;
}
