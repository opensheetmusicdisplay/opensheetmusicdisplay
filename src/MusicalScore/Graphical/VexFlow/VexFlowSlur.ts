import Vex = require("vexflow");
import { Slur } from "../../VoiceData/Expressions/ContinuousExpressions/Slur";

export interface ICurveOptions {
    spacing: number;
    thickness: number;
    x_shift: number;
    y_shift: number;
    position: CurvePositionEnum;
    position_end: CurvePositionEnum;
    invert: boolean;
    cps: [{ x: number, y: number }, { x: number, y: number }];
}

export enum CurvePositionEnum {
    NEAR_HEAD = 1,
    NEAR_TOP = 2,
}

export class VexFlowSlur {

    constructor(parentslur: Slur) {
        this.parentSlur = parentslur;
    }

    /**
     * Copy constructor: generate a VexFlowSlur from an existing one
     */
    public static createFromVexflowSlur(vfSlur: VexFlowSlur): VexFlowSlur {
        return new VexFlowSlur(vfSlur.parentSlur);
    }

    public get vfSlur(): Slur {
        return this.parentSlur;
    }

    private parentSlur: Slur;

    public vfStartNote: Vex.Flow.StemmableNote = undefined;
    public vfEndNote: Vex.Flow.StemmableNote = undefined;

    public vfCurve: Vex.Flow.Curve;

    public curve_Options(): ICurveOptions {
        return {
            cps: [{ x: 0, y: 10 }, { x: 0, y: 10 }],
            invert: false,
            position: CurvePositionEnum.NEAR_TOP,
            position_end: CurvePositionEnum.NEAR_TOP,
            spacing: 2,
            thickness: 2,
            x_shift: 0,
            y_shift: 10
        };
    }

    // public createVexFlowCurve(): void {
    //     if (this.voiceentrySlurStart !== undefined || this.voiceentrySlurEnd !== undefined) {
    //         this.vfCurve = new Vex.Flow.Curve( (this.voiceentrySlurStart as VexFlowVoiceEntry).vfStaveNote,
    //                                            (this.voiceentrySlurEnd as VexFlowVoiceEntry).vfStaveNote,
    //                                            this.curve_Options()
    //                                         );
    //     }
    // }
    public createVexFlowCurve(): void {
            this.vfCurve = new Vex.Flow.Curve( this.vfStartNote,
                                               this.vfEndNote,
                                               undefined//this.curve_Options()
                                            );
    }
}




