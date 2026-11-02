import Vex from "vexflow";
import VF = Vex.Flow;
import { GraphicalOctaveShift } from "../GraphicalOctaveShift";
import { OctaveShift, OctaveEnum } from "../../VoiceData/Expressions/ContinuousExpressions/OctaveShift";
import { BoundingBox } from "../BoundingBox";
import { GraphicalStaffEntry } from "../GraphicalStaffEntry";
import { GraphicalVoiceEntry } from "../GraphicalVoiceEntry";
import { VexFlowVoiceEntry } from "./VexFlowVoiceEntry";
import log from "loglevel";

/**
 * The vexflow adaptation of a graphical shift.
 */
export class VexFlowOctaveShift extends GraphicalOctaveShift {

    /** Defines the note where the octave shift starts */
    public startNote: VF.StemmableNote;
    /** Source staff, independent of a cross-staff horizontal start anchor. */
    public startStave: VF.Stave;
    /** Defines the note where the octave shift ends */
    public endNote: VF.StemmableNote;
    /** Top or bottom of the staffline */
    private position: VF.TextBracket.Positions;
    /** Supscript is a smaller text after the regular text (e.g. va after 8) */
    private supscript: string;
    /** Main text element */
    private text: string;
    /** The stave text position the bracket is drawn at, in staff spaces like Vexflow's Stave options top_text_position (above)
     *  and bottom_text_position (below): set by the calculator from the skyline or bottom line, see getTextBracket().
     *  Undefined: the start stave's own. */
    public textPosition: number;

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
     * Set an end note using a staff entry.
     * @param graphicalStaffEntry the staff entry that holds the end note
     * @param maxVoiceEntryIndex when >= 0, only consider voice entries before this index
     *        (used when an octave shift stop falls between grace notes sharing the same staff entry)
     */
    public setEndNote(graphicalStaffEntry: GraphicalStaffEntry, maxVoiceEntryIndex: number = -1): boolean {
        const entries: GraphicalVoiceEntry[] = graphicalStaffEntry.graphicalVoiceEntries;
        const limit: number = maxVoiceEntryIndex >= 0 ? Math.min(maxVoiceEntryIndex, entries.length) : entries.length;
        // Search backwards to find the last covered VoiceEntry
        for (let i: number = limit - 1; i >= 0; i--) {
            const vve: VexFlowVoiceEntry = (entries[i] as VexFlowVoiceEntry);
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
        let start: VF.StemmableNote = this.startNote;
        if (this.startStave && this.startStave !== this.startNote.getStave()) {
            // TextBracket only reads these two methods from its start anchor.
            start = {
                // Another staff's stave may not have been positioned by the drawer yet.
                getAbsoluteX: (): number => this.startNote.getAbsoluteX() - this.startNote.getStave().getX() + this.startStave.getX(),
                getStave: (): VF.Stave => this.startStave
            } as any;
        }
        let stop: VF.Note = this.endNote;
        let stopObject: object;
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
                getGlyph(): object {
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
            start: start,
            stop: stop,
            superscript: this.supscript,
            text: this.text,
        });
        if (this.endsOnDifferentStaffLine) {
            // make bracket open-ended (--- instead of ---|) if not ending on current staffline
            (vfBracket as any).render_options.show_bracket = false;
        }
        if (this.textPosition !== undefined) {
            // Vexflow draws the bracket at a line counted from its stave's text position, which also places other marks of that
            //   stave: e.g. a trill mark, a fermata or a pedal mark, and a trill line. So the bracket isn't moved there by setting
            //   the stave's text position (which would move those marks into the bracket), but by its line.
            const staveOptions: any = start.getStave().options;
            const staveTextPosition: number = this.position === VF.TextBracket.Positions.TOP ?
                staveOptions.top_text_position : staveOptions.bottom_text_position;
            vfBracket.setLine((vfBracket as any).line + this.textPosition - staveTextPosition);
        }
        return vfBracket;
    }

}
