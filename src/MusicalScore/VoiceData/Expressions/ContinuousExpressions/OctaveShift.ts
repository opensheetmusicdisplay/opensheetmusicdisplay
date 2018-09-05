import {MultiExpression} from "../MultiExpression";
import { Pitch } from "../../../../Common/DataObjects/Pitch";

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

    /**
     * Convert a source (XML) pitch of a note to the pitch needed to draw. E.g. 8va would draw +1 octave so we reduce by 1
     * @param pitch Original pitch
     * @param octaveShiftValue octave shift
     * @returns New pitch with corrected octave shift
     */
    public static getPitchFromOctaveShift(pitch: Pitch, octaveShiftValue: OctaveEnum): Pitch {
        let result: number = pitch.Octave;
        switch (octaveShiftValue) {
            case OctaveEnum.VA8:
                result -= 1;
                break;
            case OctaveEnum.VB8:
                result += 1;
                break;
            case OctaveEnum.MA15:
                result -= 2;
                break;
            case OctaveEnum.MB15:
                result += 2;
                break;
            case OctaveEnum.NONE:
            default:
                result += 0;
        }
        return new Pitch(pitch.FundamentalNote, result, pitch.Accidental);
    }
}

export enum OctaveEnum {
    VA8,
    VB8,
    MA15,
    MB15,
    NONE
}
