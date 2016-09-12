import {Fraction} from "../../../Common/DataObjects/Fraction";
import {SourceMeasure} from "../SourceMeasure";
import {InstantaniousTempoExpression} from "./InstantaniousTempoExpression";
import {PlacementEnum} from "./AbstractExpression";
import {FontStyles} from "../../../Common/Enums/FontStyles";
import {AbstractTempoExpression} from "./AbstractTempoExpression";
import {ContinuousTempoExpression} from "./ContinuousExpressions/ContinuousTempoExpression";

export class MultiTempoExpression /*implements IComparable<MultiTempoExpression>*/ {

    constructor(sourceMeasure: SourceMeasure, timestamp: Fraction) {
        this.sourceMeasure = sourceMeasure;
        this.timestamp = timestamp;
    }

    private timestamp: Fraction;
    private sourceMeasure: SourceMeasure;
    private instantaneousTempo: InstantaniousTempoExpression;
    private continuousTempo: ContinuousTempoExpression;
    private expressions: TempoExpressionEntry[] = [];
    private combinedExpressionsText: string;

    public get Timestamp(): Fraction {
        return this.timestamp;
    }
    public get AbsoluteTimestamp(): Fraction {
        return Fraction.plus(this.sourceMeasure.AbsoluteTimestamp, this.timestamp);
    }
    public get SourceMeasureParent(): SourceMeasure {
        return this.sourceMeasure;
    }
    public set SourceMeasureParent(value: SourceMeasure) {
        this.sourceMeasure = value;
    }
    public get InstantaniousTempo(): InstantaniousTempoExpression {
        return this.instantaneousTempo;
    }
    public get ContinuousTempo(): ContinuousTempoExpression {
        return this.continuousTempo;
    }
    public get EntriesList(): TempoExpressionEntry[] {
        return this.expressions;
    }
    public get CombinedExpressionsText(): string {
        return this.combinedExpressionsText;
    }
    public set CombinedExpressionsText(value: string) {
        this.combinedExpressionsText = value;
    }
    public getPlacementOfFirstEntry(): PlacementEnum {
        let placement: PlacementEnum = PlacementEnum.Above;
        if (this.expressions.length > 0) {
            if (this.expressions[0].expression instanceof InstantaniousTempoExpression) {
                placement = (<InstantaniousTempoExpression>(this.expressions[0].expression)).Placement;
            } else if (this.expressions[0].expression instanceof ContinuousTempoExpression) {
                placement = (<ContinuousTempoExpression>(this.expressions[0].expression)).Placement;
            }
        }
        return placement;
    }
    public getFontstyleOfFirstEntry(): FontStyles {
        let fontStyle: FontStyles = FontStyles.Regular;
        if (this.expressions[0].expression instanceof InstantaniousTempoExpression) {
            fontStyle = FontStyles.Bold;
        } else if (this.expressions[0].expression instanceof ContinuousTempoExpression) {
            fontStyle = FontStyles.Italic;
        }
        return fontStyle;
    }
    //public getFirstEntry(graphicalLabel: GraphicalLabel): AbstractGraphicalExpression {
    //    let indexOfFirstNotInstDynExpr: number = 0;
    //    if (this.expressions.length > 0) {
    //        if (this.expressions[indexOfFirstNotInstDynExpr].expression instanceof InstantaniousTempoExpression)
    //            return new GraphicalInstantaniousTempoExpression(
    // <InstantaniousTempoExpression>(this.expressions[indexOfFirstNotInstDynExpr].expression), graphicalLabel);
    //        else if (this.expressions[indexOfFirstNotInstDynExpr].expression instanceof ContinuousTempoExpression)
    //            return new GraphicalContinuousTempoExpression(
    // <ContinuousTempoExpression>(this.expressions[indexOfFirstNotInstDynExpr].expression), graphicalLabel);
    //        else return undefined;
    //    }
    //    return undefined;
    //}
    public addExpression(abstractTempoExpression: AbstractTempoExpression, prefix: string): void {
        if (abstractTempoExpression instanceof InstantaniousTempoExpression) {
            this.instantaneousTempo = <InstantaniousTempoExpression>abstractTempoExpression;
        } else if (abstractTempoExpression instanceof ContinuousTempoExpression) {
            this.continuousTempo = <ContinuousTempoExpression>abstractTempoExpression;
        }
        let tempoExpressionEntry: TempoExpressionEntry = new TempoExpressionEntry();
        tempoExpressionEntry.prefix = prefix;
        tempoExpressionEntry.expression = abstractTempoExpression;
        tempoExpressionEntry.label = abstractTempoExpression.Label;
        this.expressions.push(tempoExpressionEntry);
    }
    public CompareTo(other: MultiTempoExpression): number {
        if (this.SourceMeasureParent.MeasureNumber > other.SourceMeasureParent.MeasureNumber) {
            return 1;
        } else if (this.SourceMeasureParent.MeasureNumber < other.SourceMeasureParent.MeasureNumber) {
            return -1;
        } else {
            if (this.Timestamp.RealValue > other.Timestamp.RealValue) { return 1; }
            if (this.Timestamp.RealValue < other.Timestamp.RealValue) {
                return -1;
            } else {
                return 0;
            }
        }
    }
}

export class TempoExpressionEntry {
    public prefix: string;
    public expression: AbstractTempoExpression;
    public label: string;
}
