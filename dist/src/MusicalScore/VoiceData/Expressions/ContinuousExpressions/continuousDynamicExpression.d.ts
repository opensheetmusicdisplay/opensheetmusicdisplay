import { PlacementEnum, AbstractExpression } from "../abstractExpression";
import { MultiExpression } from "../multiExpression";
import { Fraction } from "../../../../Common/DataObjects/fraction";
export declare class ContinuousDynamicExpression extends AbstractExpression {
    constructor(dynamicType: ContDynamicEnum, placement: PlacementEnum, staffNumber: number, label: string);
    private static listContinuousDynamicIncreasing;
    private static listContinuousDynamicDecreasing;
    private dynamicType;
    private startMultiExpression;
    private endMultiExpression;
    private startVolume;
    private endVolume;
    private placement;
    private staffNumber;
    private label;
    DynamicType: ContDynamicEnum;
    StartMultiExpression: MultiExpression;
    EndMultiExpression: MultiExpression;
    Placement: PlacementEnum;
    StartVolume: number;
    EndVolume: number;
    StaffNumber: number;
    Label: string;
    static isInputStringContinuousDynamic(inputString: string): boolean;
    getInterpolatedDynamic(currentAbsoluteTimestamp: Fraction): number;
    isWedge(): boolean;
    private setType();
}
export declare enum ContDynamicEnum {
    crescendo = 0,
    diminuendo = 1,
}
