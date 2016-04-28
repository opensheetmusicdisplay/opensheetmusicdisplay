import {PlacementEnum, AbstractExpression} from "../abstractExpression";
import {MultiExpression} from "../multiExpression";
import {Fraction} from "../../../../Common/DataObjects/fraction";

export class ContinuousDynamicExpression extends AbstractExpression {
    //constructor(placement: PlacementEnum, staffNumber: number, label: string) {
    //    this.label = label;
    //    this.placement = placement;
    //    this.staffNumber = staffNumber;
    //    this.startVolume = -1;
    //    this.endVolume = -1;
    //    this.setType();
    //}
    constructor(dynamicType: ContDynamicEnum, placement: PlacementEnum, staffNumber: number, label: string) {
        super();
        this.dynamicType = dynamicType;
        this.label = label;
        this.placement = placement;
        this.staffNumber = staffNumber;
        this.startVolume = -1;
        this.endVolume = -1;
    }
    private static listContinuousDynamicIncreasing: string[] = ["crescendo", "cresc", "cresc.", "cres."];
    private static listContinuousDynamicDecreasing: string[] = ["decrescendo", "decresc", "decr.", "diminuendo", "dim.", "dim"];
    // private static listContinuousDynamicGeneral: string[] = ["subito","al niente","piu","meno"];
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
        if (ContinuousDynamicExpression.listContinuousDynamicIncreasing.indexOf(inputString) !== -1)
            return true;
        if (ContinuousDynamicExpression.listContinuousDynamicDecreasing.indexOf(inputString) !== -1)
            return true;
        return false;
    }
    public getInterpolatedDynamic(currentAbsoluteTimestamp: Fraction): number {
        var continuousAbsoluteStartTimestamp: Fraction = this.StartMultiExpression.AbsoluteTimestamp;
        var continuousAbsoluteEndTimestamp: Fraction;
        if (this.EndMultiExpression != null)
            continuousAbsoluteEndTimestamp = this.EndMultiExpression.AbsoluteTimestamp;
        else {
            continuousAbsoluteEndTimestamp = Fraction.plus(this.startMultiExpression.SourceMeasureParent.AbsoluteTimestamp, this.startMultiExpression.SourceMeasureParent.Duration);
        }
        if (currentAbsoluteTimestamp < continuousAbsoluteStartTimestamp)
            return -1;
        if (currentAbsoluteTimestamp > continuousAbsoluteEndTimestamp)
            return -2;
        var interpolationRatio: number = Fraction.minus(currentAbsoluteTimestamp, continuousAbsoluteStartTimestamp).RealValue / Fraction.minus(continuousAbsoluteEndTimestamp, continuousAbsoluteStartTimestamp).RealValue;
        var interpolatedVolume: number = Math.max(0.0, Math.min(99.9, this.startVolume + (this.endVolume - this.startVolume) * interpolationRatio));
        return <number>interpolatedVolume;
    }
    public isWedge(): boolean {
        return this.label === undefined;
    }
    private setType(): void {
        if (ContinuousDynamicExpression.listContinuousDynamicIncreasing.indexOf(this.label) !== -1)
            this.dynamicType = ContDynamicEnum.crescendo;
        else if (ContinuousDynamicExpression.listContinuousDynamicDecreasing.indexOf(this.label) !== -1)
            this.dynamicType = ContDynamicEnum.diminuendo;
    }
}

export enum ContDynamicEnum {
    crescendo = 0,
    diminuendo = 1
}
