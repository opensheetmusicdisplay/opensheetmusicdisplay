import { GraphicalStaffEntry } from "../GraphicalStaffEntry";
import { VexFlowMeasure } from "./VexFlowMeasure";
import { SourceStaffEntry } from "../../VoiceData/SourceStaffEntry";
import { GraphicalNote } from "../GraphicalNote";
export declare class VexFlowStaffEntry extends GraphicalStaffEntry {
    constructor(measure: VexFlowMeasure, sourceStaffEntry: SourceStaffEntry, staffEntryParent: VexFlowStaffEntry);
    graphicalNotes: {
        [voiceID: number]: GraphicalNote[];
    };
    vfNotes: {
        [voiceID: number]: Vex.Flow.StaveNote;
    };
    /**
     *
     * @returns {number} the x-position (in units) of this Staff Entry
     */
    getX(): number;
}
