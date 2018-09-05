import {SourceMeasure} from "../SourceMeasure";
import {Fraction} from "../../../Common/DataObjects/Fraction";
import {InstantaneousDynamicExpression} from "./InstantaneousDynamicExpression";
import {ContinuousDynamicExpression} from "./ContinuousExpressions/ContinuousDynamicExpression";
import {OctaveShift} from "./ContinuousExpressions/OctaveShift";
import {MoodExpression} from "./MoodExpression";
import {UnknownExpression} from "./UnknownExpression";
import {AbstractExpression} from "./AbstractExpression";
import {PlacementEnum} from "./AbstractExpression";

export class MultiExpression /*implements IComparable<MultiExpression>*/ {

    constructor(sourceMeasure: SourceMeasure, timestamp: Fraction) {
        this.sourceMeasure = sourceMeasure;
        this.timestamp = timestamp;
    }

    private sourceMeasure: SourceMeasure;
    private staffNumber: number;
    private timestamp: Fraction;
    private instantaneousDynamic: InstantaneousDynamicExpression;
    private endingContinuousDynamic: ContinuousDynamicExpression;
    private startingContinuousDynamic: ContinuousDynamicExpression;
    private unknownList: UnknownExpression[] = [];
    private moodList: MoodExpression[] = [];
    private expressions: MultiExpressionEntry[] = [];
    private combinedExpressionsText: string;
    private octaveShiftStart: OctaveShift;
    private octaveShiftEnd: OctaveShift;

    public get SourceMeasureParent(): SourceMeasure {
        return this.sourceMeasure;
    }
    public set SourceMeasureParent(value: SourceMeasure) {
        this.sourceMeasure = value;
    }
    public get StaffNumber(): number {
        return this.staffNumber;
    }
    public set StaffNumber(value: number) {
        this.staffNumber = value;
    }
    public get Timestamp(): Fraction {
        return this.timestamp;
    }
    public set Timestamp(value: Fraction) {
        this.timestamp = value;
    }
    public get AbsoluteTimestamp(): Fraction {
        return Fraction.plus(this.timestamp, this.sourceMeasure.AbsoluteTimestamp);
    }
    public get InstantaneousDynamic(): InstantaneousDynamicExpression {
        return this.instantaneousDynamic;
    }
    public set InstantaneousDynamic(value: InstantaneousDynamicExpression) {
        this.instantaneousDynamic = value;
    }
    public get EndingContinuousDynamic(): ContinuousDynamicExpression {
        return this.endingContinuousDynamic;
    }
    public set EndingContinuousDynamic(value: ContinuousDynamicExpression) {
        this.endingContinuousDynamic = value;
    }
    public get StartingContinuousDynamic(): ContinuousDynamicExpression {
        return this.startingContinuousDynamic;
    }
    public set StartingContinuousDynamic(value: ContinuousDynamicExpression) {
        this.startingContinuousDynamic = value;
    }
    public get MoodList():  MoodExpression[] {
        return this.moodList;
    }
    public get UnknownList():  UnknownExpression[] {
        return this.unknownList;
    }
    public get EntriesList():  MultiExpressionEntry[] {
        return this.expressions;
    }
    public get OctaveShiftStart(): OctaveShift {
        return this.octaveShiftStart;
    }
    public set OctaveShiftStart(value: OctaveShift) {
        this.octaveShiftStart = value;
    }
    public get OctaveShiftEnd(): OctaveShift {
        return this.octaveShiftEnd;
    }
    public set OctaveShiftEnd(value: OctaveShift) {
        this.octaveShiftEnd = value;
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
            if (this.expressions[0].expression instanceof InstantaneousDynamicExpression) {
                placement = (<InstantaneousDynamicExpression>(this.expressions[0].expression)).Placement;
            } else if (this.expressions[0].expression instanceof ContinuousDynamicExpression) {
                placement = (<ContinuousDynamicExpression>(this.expressions[0].expression)).Placement;
            } else if (this.expressions[0].expression instanceof MoodExpression) {
                placement = (<MoodExpression>(this.expressions[0].expression)).Placement;
            } else if (this.expressions[0].expression instanceof UnknownExpression) {
                placement = (<UnknownExpression>(this.expressions[0].expression)).Placement;
            }
        }
        return placement;
    }
    // (*)
    //public getFontstyleOfFirstEntry(): PSFontStyles {
    //    let fontStyle: PSFontStyles = PSFontStyles.Regular;
    //    if (this.expressions.length > 0) {
    //        if (this.expressions[0].expression instanceof ContinuousDynamicExpression)
    //            fontStyle = PSFontStyles.Italic;
    //        else if (this.expressions[0].expression instanceof MoodExpression)
    //            fontStyle = PSFontStyles.Italic;
    //        else if (this.expressions[0].expression instanceof UnknownExpression)
    //            fontStyle = PSFontStyles.Regular;
    //    }
    //    return fontStyle;
    //}
    //public getFirstEntry(staffLine: StaffLine, graphLabel: GraphicalLabel): AbstractGraphicalExpression {
    //    let indexOfFirstNotInstDynExpr: number = 0;
    //    if (this.expressions[0].expression instanceof InstantaneousDynamicExpression)
    //        indexOfFirstNotInstDynExpr = 1;
    //    if (this.expressions.length > 0) {
    //        if (this.expressions[indexOfFirstNotInstDynExpr].expression instanceof ContinuousDynamicExpression)
    //            return new GraphicalContinuousDynamicExpression(
    // <ContinuousDynamicExpression>(this.expressions[indexOfFirstNotInstDynExpr].expression), graphLabel);
    //        else if (this.expressions[indexOfFirstNotInstDynExpr].expression instanceof MoodExpression)
    //            return new GraphicalMoodExpression(<MoodExpression>(this.expressions[indexOfFirstNotInstDynExpr].expression), graphLabel);
    //        else if (this.expressions[indexOfFirstNotInstDynExpr].expression instanceof UnknownExpression)
    //            return new GraphicalUnknownExpression(<UnknownExpression>(this.expressions[indexOfFirstNotInstDynExpr].expression), graphLabel);
    //        else return undefined;
    //    }
    //    else return undefined;
    //}
    public addExpression(abstractExpression: AbstractExpression, prefix: string): void {
        if (abstractExpression instanceof InstantaneousDynamicExpression) {
            if (this.instantaneousDynamic !== undefined) {
                this.removeExpressionFromEntryList(this.InstantaneousDynamic);
            }
            this.instantaneousDynamic = <InstantaneousDynamicExpression>abstractExpression;
            this.instantaneousDynamic.ParentMultiExpression = this;
        } else if (abstractExpression instanceof ContinuousDynamicExpression) {
            this.startingContinuousDynamic = <ContinuousDynamicExpression>abstractExpression;
        } else if (abstractExpression instanceof MoodExpression) {
            this.moodList.push(<MoodExpression>abstractExpression);
        } else if (abstractExpression instanceof UnknownExpression) {
            this.unknownList.push(<UnknownExpression>abstractExpression);
        }
        this.addExpressionToEntryList(abstractExpression, prefix);
    }
    public CompareTo(other: MultiExpression): number {
        if (this.SourceMeasureParent.MeasureNumber > other.SourceMeasureParent.MeasureNumber) {
            return 1;
        }
        if (this.SourceMeasureParent.MeasureNumber < other.SourceMeasureParent.MeasureNumber) {
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
    private addExpressionToEntryList(expression: AbstractExpression, prefix: string): void {
        const multiExpressionEntry: MultiExpressionEntry = new MultiExpressionEntry();
        multiExpressionEntry.prefix = prefix;
        multiExpressionEntry.expression = expression;
        if (expression instanceof ContinuousDynamicExpression) {
            multiExpressionEntry.label = (<ContinuousDynamicExpression>(expression)).Label;
        } else if (expression instanceof MoodExpression) {
            multiExpressionEntry.label = (<MoodExpression>(expression)).Label;
        } else if (expression instanceof UnknownExpression) {
            multiExpressionEntry.label = (<UnknownExpression>(expression)).Label;
        } else {
            multiExpressionEntry.label = "";
        }
        this.expressions.push(multiExpressionEntry);
    }
    private removeExpressionFromEntryList(expression: AbstractExpression): void {
        for (let idx: number = 0, len: number = this.expressions.length; idx < len; ++idx) {
            const entry: MultiExpressionEntry = this.expressions[idx];
            if (entry.expression === expression) {
                this.expressions.splice(idx, 1);
                break;
            }
        }
    }

}

export class MultiExpressionEntry {
    public prefix: string;
    public expression: AbstractExpression;
    public label: string;
}
