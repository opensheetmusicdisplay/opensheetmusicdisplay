import {MultiExpression} from "../MultiExpression";

export class OctaveShift {
    constructor(type: string, octave: number) {
        this.setOctaveShiftValue(type, octave);
    }

    private octaveValue: OctaveEnum;
    private staffNumber: number;
    private startMultiExpression: MultiExpression;
    private endMultiExpression: MultiExpression;

    public get Type(): OctaveEnum {
        return this.octaveValue;
    }
    public set Type(value: OctaveEnum) {
        this.octaveValue = value;
    }
    public get StaffNumber(): number {
        return this.staffNumber;
    }
    public set StaffNumber(value: number) {
        this.staffNumber = value;
    }
    public get ParentStartMultiExpression(): MultiExpression {
        return this.startMultiExpression;
    }
    public set ParentStartMultiExpression(value: MultiExpression) {
        this.startMultiExpression = value;
    }
    public get ParentEndMultiExpression(): MultiExpression {
        return this.endMultiExpression;
    }
    public set ParentEndMultiExpression(value: MultiExpression) {
        this.endMultiExpression = value;
    }

    private setOctaveShiftValue(type: string, octave: number): void {
        if (octave === 1 && type === "down") {
            this.octaveValue = OctaveEnum.VA8;
        } else if (octave === 1 && type === "up") {
            this.octaveValue = OctaveEnum.VB8;
        } else if (octave === 2 && type === "down") {
            this.octaveValue = OctaveEnum.MA15;
        } else if (octave === 2 && type === "up") {
            this.octaveValue = OctaveEnum.MB15;
        } else {
            this.octaveValue = OctaveEnum.NONE;
        }
    }
}

export enum OctaveEnum {
    VA8,
    VB8,
    MA15,
    MB15,
    NONE
}
