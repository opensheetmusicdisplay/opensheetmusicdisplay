import { SourceMeasure } from "../SourceMeasure";
import { Fraction } from "../../../Common/DataObjects/fraction";
import { InstantaniousDynamicExpression } from "./instantaniousDynamicExpression";
import { ContinuousDynamicExpression } from "./ContinuousExpressions/continuousDynamicExpression";
import { OctaveShift } from "./ContinuousExpressions/octaveShift";
import { MoodExpression } from "./moodExpression";
import { UnknownExpression } from "./unknownExpression";
import { AbstractExpression } from "./abstractExpression";
import { PlacementEnum } from "./abstractExpression";
export declare class MultiExpression {
    constructor(sourceMeasure: SourceMeasure, timestamp: Fraction);
    private sourceMeasure;
    private staffNumber;
    private timestamp;
    private instantaniousDynamic;
    private endingContinuousDynamic;
    private startingContinuousDynamic;
    private unknownList;
    private moodList;
    private expressions;
    private combinedExpressionsText;
    private octaveShiftStart;
    private octaveShiftEnd;
    SourceMeasureParent: SourceMeasure;
    StaffNumber: number;
    Timestamp: Fraction;
    AbsoluteTimestamp: Fraction;
    InstantaniousDynamic: InstantaniousDynamicExpression;
    EndingContinuousDynamic: ContinuousDynamicExpression;
    StartingContinuousDynamic: ContinuousDynamicExpression;
    MoodList: MoodExpression[];
    UnknownList: UnknownExpression[];
    EntriesList: MultiExpressionEntry[];
    OctaveShiftStart: OctaveShift;
    OctaveShiftEnd: OctaveShift;
    CombinedExpressionsText: string;
    getPlacementOfFirstEntry(): PlacementEnum;
    addExpression(abstractExpression: AbstractExpression, prefix: string): void;
    CompareTo(other: MultiExpression): number;
    private addExpressionToEntryList(expression, prefix);
    private removeExpressionFromEntryList(expression);
}
export declare class MultiExpressionEntry {
    prefix: string;
    expression: AbstractExpression;
    label: string;
}
