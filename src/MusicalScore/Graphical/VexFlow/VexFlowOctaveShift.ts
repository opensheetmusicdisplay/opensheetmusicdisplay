import Vex from "vexflow";
import { GraphicalOctaveShift } from "../GraphicalOctaveShift";
import { OctaveShift, OctaveEnum } from "../../VoiceData/Expressions/ContinuousExpressions/OctaveShift";
import { BoundingBox } from "../BoundingBox";
import { GraphicalStaffEntry } from "../GraphicalStaffEntry";
import { VexFlowVoiceEntry } from "./VexFlowVoiceEntry";
import log from "loglevel";

/**
 * The vexflow adaptation of a graphical shift.
 */
export class VexFlowOctaveShift extends GraphicalOctaveShift {

    /** Defines the note where the octave shift starts */
    private startNote: Vex.Flow.StemmableNote;
    /** Defines the note where the octave shift ends */
    private endNote: Vex.Flow.StemmableNote;
    /** Top or bottom of the staffline */
    private position: Vex.Flow.TextBracket.Positions;
    /** Supscript is a smaller text after the regular text (e.g. va after 8) */
    private supscript: string;
    /** Main text element */
    private text: string;

    /**
     * Create a new vexflow ocatve shift
     * @param octaveShift the object read by the ExpressionReader
     * @param parent the bounding box of the parent
     */
    constructor(octaveShift: OctaveShift, parent: BoundingBox) {
        super(octaveShift, parent);
        switch (octaveShift.Type) {
            case OctaveEnum.VA8:
                this.position = Vex.Flow.TextBracket.Positions.TOP;
                this.supscript = "va";
                this.text = "8";
                break;
            case OctaveEnum.MA15:
                this.position = Vex.Flow.TextBracket.Positions.TOP;
                this.supscript = "ma";
                this.text = "15";
                break;
            case OctaveEnum.VB8:
                this.position = Vex.Flow.TextBracket.Positions.BOTTOM;
                this.supscript = "vb";
                this.text = "8";
                break;
            case OctaveEnum.MB15:
                this.position = Vex.Flow.TextBracket.Positions.BOTTOM;
                this.supscript = "mb";
                this.text = "15";
                break;
            default:
                log.error("Unknown or NONE octaveshift. This should not be called!");
                break;
        }
    }

    /**
     * Set a start note using a staff entry
     * @param graphicalStaffEntry the staff entry that holds the start note
     */
    public setStartNote(graphicalStaffEntry: GraphicalStaffEntry): void {
        this.startNote = (graphicalStaffEntry.graphicalVoiceEntries[0] as VexFlowVoiceEntry).vfStaveNote;
    }

    /**
     * Set an end note using a staff entry
     * @param graphicalStaffEntry the staff entry that holds the end note
     */
    public setEndNote(graphicalStaffEntry: GraphicalStaffEntry): void {
        this.endNote = (graphicalStaffEntry.graphicalVoiceEntries[0] as VexFlowVoiceEntry).vfStaveNote;
    }

    public getStartNote(): Vex.Flow.StemmableNote {
        return this.startNote;
    }

    public getEndNote(): Vex.Flow.StemmableNote {
        return this.endNote;
    }

    /**
     * Get the actual vexflow text bracket used for drawing
     */
    public getTextBracket(): Vex.Flow.TextBracket {
        return new Vex.Flow.TextBracket({
            position: this.position,
            start: this.startNote,
            stop: this.endNote,
            superscript: this.supscript,
            text: this.text,
        });
    }

}
