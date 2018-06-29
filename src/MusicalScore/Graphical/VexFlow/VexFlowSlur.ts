import { Slur } from "../../VoiceData/Expressions/ContinuousExpressions/Slur";
import { GraphicalVoiceEntry } from "../GraphicalVoiceEntry";
import { GraphicalStaffEntry } from "../GraphicalStaffEntry";

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
    public voiceentrySlurStart: GraphicalVoiceEntry;
    public voiceentrySlurEnd: GraphicalVoiceEntry;
    public staffentrySlurStart: GraphicalStaffEntry;
    public staffentrySlurEnd: GraphicalStaffEntry;
}
