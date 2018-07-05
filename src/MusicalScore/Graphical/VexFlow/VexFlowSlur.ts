import Vex = require("vexflow");
import { Slur } from "../../VoiceData/Expressions/ContinuousExpressions/Slur";
import { GraphicalVoiceEntry } from "../GraphicalVoiceEntry";
import { VexFlowVoiceEntry } from "./VexFlowVoiceEntry";

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

    public voiceentrySlurStart: GraphicalVoiceEntry = undefined;
    public voiceentrySlurEnd: GraphicalVoiceEntry = undefined;

    public vfCurve: Vex.Flow.Curve;
    public createVexFlowCurve(): void {
        if (this.voiceentrySlurStart !== undefined && this.voiceentrySlurEnd !== undefined) {
            this.vfCurve = new Vex.Flow.Curve( (this.voiceentrySlurStart as VexFlowVoiceEntry).vfStaveNote,
                                               (this.voiceentrySlurEnd as VexFlowVoiceEntry).vfStaveNote, undefined);
        }
    }
}




