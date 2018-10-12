import {PlacementEnum, AbstractExpression} from "../AbstractExpression";
import {MultiExpression} from "../MultiExpression";
import {Fraction} from "../../../../Common/DataObjects/Fraction";

export class ContinuousDynamicExpression extends AbstractExpression {
    constructor(dynamicType: ContDynamicEnum, placement: PlacementEnum, staffNumber: number, label: string = "") {
        super(placement);
        this.dynamicType = dynamicType;
        this.label = label;
        this.staffNumber = staffNumber;
        this.startVolume = -1;
        this.endVolume = -1;
        if (label !== "") {
            this.setType();
        }
    }

    private static listContinuousDynamicIncreasing: string[] = ["crescendo", "cresc", "cresc.", "cres."];
    private static listContinuousDynamicDecreasing: string[] = ["decrescendo", "decresc", "decr.", "diminuendo", "dim.", "dim"];
    // private static listContinuousDynamicGeneral: string[] = ["subito","al niente","piu","meno"];
    private dynamicType: ContDynamicEnum;
    private startMultiExpression: MultiExpression;
    private endMultiExpression: MultiExpression;
    private startVolume: number;
    private endVolume: number;
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
        this.setType();
    }
    public static isInputStringContinuousDynamic(inputString: string): boolean {
        if (inputString === undefined) { return false; }
        return (
            ContinuousDynamicExpression.isStringInStringList(ContinuousDynamicExpression.listContinuousDynamicIncreasing, inputString)
            || ContinuousDynamicExpression.isStringInStringList(ContinuousDynamicExpression.listContinuousDynamicDecreasing, inputString)
        );
    }
    public getInterpolatedDynamic(currentAbsoluteTimestamp: Fraction): number {
        const continuousAbsoluteStartTimestamp: Fraction = this.StartMultiExpression.AbsoluteTimestamp;
        let continuousAbsoluteEndTimestamp: Fraction;
        if (this.EndMultiExpression !== undefined) {
            continuousAbsoluteEndTimestamp = this.EndMultiExpression.AbsoluteTimestamp;
        } else {
            continuousAbsoluteEndTimestamp = Fraction.plus(
                this.startMultiExpression.SourceMeasureParent.AbsoluteTimestamp, this.startMultiExpression.SourceMeasureParent.Duration
            );
        }
        if (currentAbsoluteTimestamp.lt(continuousAbsoluteStartTimestamp)) { return -1; }
        if (continuousAbsoluteEndTimestamp.lt(currentAbsoluteTimestamp)) { return -2; }
        const interpolationRatio: number =
            Fraction.minus(currentAbsoluteTimestamp, continuousAbsoluteStartTimestamp).RealValue
            / Fraction.minus(continuousAbsoluteEndTimestamp, continuousAbsoluteStartTimestamp).RealValue;
        const interpolatedVolume: number = Math.max(0.0, Math.min(99.9, this.startVolume + (this.endVolume - this.startVolume) * interpolationRatio));
        return interpolatedVolume;
    }
    public isWedge(): boolean {
        return this.label === undefined;
    }
    private setType(): void {
        if (ContinuousDynamicExpression.isStringInStringList(ContinuousDynamicExpression.listContinuousDynamicIncreasing, this.label)) {
            this.dynamicType = ContDynamicEnum.crescendo;
        } else if (ContinuousDynamicExpression.isStringInStringList(ContinuousDynamicExpression.listContinuousDynamicDecreasing, this.label)) {
            this.dynamicType = ContDynamicEnum.diminuendo;
        }
    }
}

export enum ContDynamicEnum {
    crescendo = 0,
    diminuendo = 1
}
