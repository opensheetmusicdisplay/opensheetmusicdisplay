import {PlacementEnum, AbstractExpression} from "../abstractExpression";
import {MultiExpression} from "../multiExpression";
import {Fraction} from "../../../../Common/DataObjects/fraction";
export class ContinuousDynamicExpression extends AbstractExpression {
    constructor(placement: PlacementEnum, staffNumber: number, label: string) {
        this.label = label;
        this.placement = placement;
        this.staffNumber = staffNumber;
        this.startVolume = -1;
        this.endVolume = -1;
        this.setType();
    }
    constructor(dynamicType: ContDynamicEnum, placement: PlacementEnum, staffNumber: number) {
        this.dynamicType = dynamicType;
        this.label = null;
        this.placement = placement;
        this.staffNumber = staffNumber;
        this.startVolume = -1;
        this.endVolume = -1;
    }
    private static listContinuousDynamicIncreasing: Array<string> = __init(new Array<string>(), { "crescendo","cresc","cresc.","cres." });
    private static listContinuousDynamicDecreasing: Array<string> = __init(new Array<string>(), { "decrescendo","decresc","decr.","diminuendo","dim.","dim" });
    private static listContinuousDynamicGeneral: Array<string> = __init(new Array<string>(), { "subito","al niente","piu","meno" });
    private dynamicType: ContDynamicEnum;
    private startMultiExpression: MultiExpression;
    private endMultiExpression: MultiExpression;
    private startVolume: number;
    private endVolume: number;
    private placement: PlacementEnum;
    private staffNumber: number;
    private label: string;
    public get DynamicType(): ContDynamicEnum {
        return this.dynamicType;
    }
    public set DynamicType(value: ContDynamicEnum) {
        this.dynamicType = value;
    }
    public get StartMultiExpression(): MultiExpression {
        return this.startMultiExpression;
    }
    public set StartMultiExpression(value: MultiExpression) {
        this.startMultiExpression = value;
    }
    public get EndMultiExpression(): MultiExpression {
        return this.endMultiExpression;
    }
    public set EndMultiExpression(value: MultiExpression) {
        this.endMultiExpression = value;
    }
    public get Placement(): PlacementEnum {
        return this.placement;
    }
    public set Placement(value: PlacementEnum) {
        this.placement = value;
    }
    public get StartVolume(): number {
        return this.startVolume;
    }
    public set StartVolume(value: number) {
        this.startVolume = value;
    }
    public get EndVolume(): number {
        return this.endVolume;
    }
    public set EndVolume(value: number) {
        this.endVolume = value;
    }
    public get StaffNumber(): number {
        return this.staffNumber;
    }
    public set StaffNumber(value: number) {
        this.staffNumber = value;
    }
    public get Label(): string {
        return this.label;
    }
    public set Label(value: string) {
        this.label = value;
    }
    public static isInputStringContinuousDynamic(inputString: string): boolean {
        if (inputString == null)
            return false;
        if (isStringInStringList(ContinuousDynamicExpression.listContinuousDynamicIncreasing, inputString))
            return true;
        if (isStringInStringList(ContinuousDynamicExpression.listContinuousDynamicDecreasing, inputString))
            return true;
        return false;
    }
    public getInterpolatedDynamic(currentAbsoluteTimestamp: Fraction): number {
        var continuousAbsoluteStartTimestamp: Fraction = this.StartMultiExpression.AbsoluteTimestamp;
        var continuousAbsoluteEndTimestamp: Fraction;
        if (this.EndMultiExpression != null)
            continuousAbsoluteEndTimestamp = this.EndMultiExpression.AbsoluteTimestamp;
        else {
            continuousAbsoluteEndTimestamp = this.startMultiExpression.SourceMeasureParent.AbsoluteTimestamp + this.startMultiExpression.SourceMeasureParent.Duration;
        }
        if (currentAbsoluteTimestamp < continuousAbsoluteStartTimestamp)
            return -1;
        if (currentAbsoluteTimestamp > continuousAbsoluteEndTimestamp)
            return -2;
        var interpolationRatio: number = (currentAbsoluteTimestamp - continuousAbsoluteStartTimestamp).RealValue / (continuousAbsoluteEndTimestamp - continuousAbsoluteStartTimestamp).RealValue;
        var interpolatedVolume: number = Math.Max(0.0f, Math.Min(99.9f, this.startVolume + (this.endVolume - this.startVolume) * interpolationRatio));
        return <number>interpolatedVolume;
    }
    public isWedge(): boolean {
        if (this.label != null)
            return false;
        return true;
    }
    private setType(): void {
        if (isStringInStringList(ContinuousDynamicExpression.listContinuousDynamicIncreasing, this.label))
            this.dynamicType = ContDynamicEnum.crescendo;
        else if (isStringInStringList(ContinuousDynamicExpression.listContinuousDynamicDecreasing, this.label))
            this.dynamicType = ContDynamicEnum.diminuendo;
    }
}
export enum ContDynamicEnum {
    crescendo = 0,

    diminuendo = 1
}