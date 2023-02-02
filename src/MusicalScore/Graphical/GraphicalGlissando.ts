import { PointF2D } from "../../Common/DataObjects/PointF2D";
import { Glissando } from "../VoiceData/Glissando";
import { ColDirEnum } from "./BoundingBox";
import { EngravingRules } from "./EngravingRules";
import { GraphicalLine } from "./GraphicalLine";
import { GraphicalNote } from "./GraphicalNote";
import { GraphicalStaffEntry } from "./GraphicalStaffEntry";
import { StaffLine } from "./StaffLine";

export class GraphicalGlissando {
    public Glissando: Glissando;
    public Line: GraphicalLine;
    public staffEntries: GraphicalStaffEntry[];
    public StaffLine: StaffLine;
    public Width: number;
    public Color: string; // default: undefined = black. vexflow format (e.g. #12345600, 00 is alpha)

    constructor(glissando: Glissando) {
        this.Glissando = glissando;
        this.staffEntries = [];
    }

    public calculateLine(rules: EngravingRules): void {
        const startStaffEntry: GraphicalStaffEntry = this.staffEntries[0];
        const endStaffEntry: GraphicalStaffEntry = this.staffEntries[this.staffEntries.length - 1];

        // where the line (not the graphicalObject) starts and ends (could belong to another StaffLine)
        const glissStartNote: GraphicalNote = startStaffEntry.findGraphicalNoteFromNote(this.Glissando.StartNote);
        // if (!slurStartNote && this.graceStart) {
        //     slurStartNote = startStaffEntry.findGraphicalNoteFromGraceNote(this.Glissando.StartNote);
        // }
        // if (!slurStartNote) {
        //     slurStartNote = startStaffEntry.findEndTieGraphicalNoteFromNoteWithStartingSlur(this.Glissando.StartNote, this.slur);
        // }
        const glissEndNote: GraphicalNote = endStaffEntry.findGraphicalNoteFromNote(this.Glissando.EndNote);
        // if (!slurEndNote && this.graceEnd) {
        //     slurEndNote = endStaffEntry.findGraphicalNoteFromGraceNote(this.Glissando.EndNote);
        // }

        if (!glissStartNote && !glissEndNote) {
            return; // otherwise causes error. TODO investigate, shouldn't happen. (M4_G_L19)
        }

        const staffLine: StaffLine = startStaffEntry.parentMeasure.ParentStaffLine;

        let startX: number;
        let endX: number;
        let startY: number;
        let endY: number;
        if (glissStartNote && startStaffEntry.parentMeasure.ParentStaffLine === this.StaffLine) {
            // must be relative to StaffLine
            startX = glissStartNote.PositionAndShape.RelativePosition.x + glissStartNote.parentVoiceEntry.parentStaffEntry.PositionAndShape.RelativePosition.x
                    + glissStartNote.parentVoiceEntry.parentStaffEntry.parentMeasure.PositionAndShape.RelativePosition.x
                    + rules.GlissandoNoteOffset;
            //const glissStartVE: GraphicalVoiceEntry = glissStartNote.parentVoiceEntry;
            //startY = glissStartVE.PositionAndShape.RelativePosition.y + glissStartVE.PositionAndShape.BorderTop / 2;
            // startY = glissStartNote.PositionAndShape.RelativePosition.y - glissStartNote.PositionAndShape.Size.height / 2;
            startY = glissStartNote.PositionAndShape.AbsolutePosition.y;
            // unfortunately we need to take the AbsolutePosition, as the RelativePosition is imprecise (to the notehead). Maybe that could be fixed.
        } else {
            startX = endStaffEntry.parentMeasure.beginInstructionsWidth - 0.4;
            // startY: above/below note
            const sign: number = this.Glissando.Direction === ColDirEnum.Down ? -1 : 1;
            startY = glissEndNote.PositionAndShape.AbsolutePosition.y + sign * rules.GlissandoStafflineStartYDistanceToNote;
            // default: one line above/below end note. could also be 0.5 lines like for tab slide
        }
        if (glissEndNote && endStaffEntry.parentMeasure.ParentStaffLine === this.StaffLine) {
            endX = glissEndNote.PositionAndShape.RelativePosition.x + glissEndNote.parentVoiceEntry.parentStaffEntry.PositionAndShape.RelativePosition.x
                + glissEndNote.parentVoiceEntry.parentStaffEntry.parentMeasure.PositionAndShape.RelativePosition.x
                - 0.5 - rules.GlissandoNoteOffset; // -0.5: width of notehead. glissEndNote.x seems to be center of notehead.
            if (startX > endX) { // e.g. when beginInstructionsWidth too big at start of staffline, bigger than note startX
                startX = endX - rules.GlissandoStafflineStartMinimumWidth;
            }
            //const glissEndVe: GraphicalVoiceEntry = glissEndNote.parentVoiceEntry;
            //endY = glissEndVe.PositionAndShape.RelativePosition.y + glissEndVe.PositionAndShape.BorderTop;
            endY = glissEndNote.PositionAndShape.AbsolutePosition.y;
        } else {
            if (staffLine.Measures.last().parentSourceMeasure.HasEndLine) {
                return;
                // TODO inquire how this can happen: start of glissando at end of last measure. maybe faulty xml? or about slur/slide indices?
            }
            endX = staffLine.PositionAndShape.Size.width;
            if (endX - startX > rules.GlissandoStafflineEndOffset) {
                startX = endX - rules.GlissandoStafflineEndOffset;
            } // else: don't try to set a potentially bigger offset for a note very close to the staffline end
            // endY: above/below note
            const sign: number = this.Glissando.Direction === ColDirEnum.Down ? 1 : -1;
            endY = glissStartNote.PositionAndShape.AbsolutePosition.y + sign * rules.GlissandoStafflineStartYDistanceToNote;
        }

        const start: PointF2D = new PointF2D(startX, startY);
        const end: PointF2D = new PointF2D(endX, endY);
        if (this.Width === undefined) {
            this.Width = rules.GlissandoDefaultWidth;
        }
        this.Line = new GraphicalLine(start, end, this.Width);
    }
}
