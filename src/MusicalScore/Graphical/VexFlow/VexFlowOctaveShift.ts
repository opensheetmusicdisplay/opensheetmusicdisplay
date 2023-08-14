import Vex from "vexflow";
import VF = Vex.Flow;
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
    public startNote: VF.StemmableNote;
    /** Defines the note where the octave shift ends */
    public endNote: VF.StemmableNote;
    /** Top or bottom of the staffline */
    private position: VF.TextBracket.Positions;
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
                this.position = VF.TextBracket.Positions.TOP;
                this.supscript = "va";
                this.text = "8";
                break;
            case OctaveEnum.MA15:
                this.position = VF.TextBracket.Positions.TOP;
                this.supscript = "ma";
                this.text = "15";
                break;
            case OctaveEnum.VB8:
                this.position = VF.TextBracket.Positions.BOTTOM;
                this.supscript = "vb";
                this.text = "8";
                break;
            case OctaveEnum.MB15:
                this.position = VF.TextBracket.Positions.BOTTOM;
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
    public setStartNote(graphicalStaffEntry: GraphicalStaffEntry): boolean {
        for (const gve of graphicalStaffEntry.graphicalVoiceEntries) {
            const vve: VexFlowVoiceEntry = (gve as VexFlowVoiceEntry);
            if (vve?.vfStaveNote) {
                this.startNote = vve.vfStaveNote;
                return true;
            }
        }
        return false; // couldn't find a startNote
    }

    /**
     * Set an end note using a staff entry
     * @param graphicalStaffEntry the staff entry that holds the end note
     */
    public setEndNote(graphicalStaffEntry: GraphicalStaffEntry): boolean {
        // this is duplicate code from setStartNote, but if we make one general method, we add a lot of branching.
        for (const gve of graphicalStaffEntry.graphicalVoiceEntries) {
            const vve: VexFlowVoiceEntry = (gve as VexFlowVoiceEntry);
            if (vve?.vfStaveNote) {
                this.endNote = vve.vfStaveNote;
                this.endMeasure = graphicalStaffEntry.parentMeasure;
                if (this.endMeasure?.parentSourceMeasure.Rules.OctaveShiftOnWholeMeasureNoteUntilEndOfMeasure &&
                    vve.notes[0].sourceNote.isWholeMeasureNote()) {
                    // draw whole note octave shift until end of measure
                    //   Instead, we could try to fix the display of very short octaveshift brackets,
                    //   which seem to overlap text (-> VF.TextBracket VexFlowPatch?).
                    this.graphicalEndAtMeasureEnd = true;
                }
                return true;
            }
        }
        return false; // couldn't find an endNote
    }

    /**
     * Get the actual vexflow text bracket used for drawing
     */
    public getTextBracket(): VF.TextBracket {
        let stop: VF.Note = this.endNote;
        let stopObject: Object;
        const self: VexFlowOctaveShift = this;
        if (this.graphicalEndAtMeasureEnd) {
            // draw until end of measure (measure end barline):
            //   hack for Vexflow 1.2.93 (will need to be adjusted for Vexflow 4+):
            //   create a mock object with all the data Vexflow uses for the TextBracket
            //   (Vexflow theoretically expects a note here, from which it takes position and width)
            stopObject = {
                getAbsoluteX(): number {
                    return (self.endMeasure.PositionAndShape.AbsolutePosition.x + self.endMeasure.PositionAndShape.Size.width) * 10;
                },
                getGlyph(): Object {
                    return {
                        getWidth(): number {
                            return 0;
                        }
                    };
                }
            };
        }
        if (stopObject) {
            stop = stopObject as any;
        }
        const vfBracket: VF.TextBracket = new VF.TextBracket({
            position: this.position,
            start: this.startNote,
            stop: stop,
            superscript: this.supscript,
            text: this.text,
        });
        if (this.endsOnDifferentStaffLine) {
            // make bracket open-ended (--- instead of ---|) if not ending on current staffline
            (vfBracket as any).render_options.show_bracket = false;
        }
        return vfBracket;
    }

}
