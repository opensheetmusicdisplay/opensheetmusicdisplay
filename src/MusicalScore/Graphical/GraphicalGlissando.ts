import { PointF2D } from "../../Common";
import { Glissando } from "../VoiceData";
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
        } else {
            startX = endStaffEntry.parentMeasure.beginInstructionsWidth - 0.4;
            startY = this.Glissando.Direction === ColDirEnum.Down ? 0 : 4; // 0: top line of staff. 4: bottom line of (5-line) staff.
        }
        if (glissEndNote && endStaffEntry.parentMeasure.ParentStaffLine === this.StaffLine) {
            endX = glissEndNote.PositionAndShape.RelativePosition.x + glissEndNote.parentVoiceEntry.parentStaffEntry.PositionAndShape.RelativePosition.x
                + glissEndNote.parentVoiceEntry.parentStaffEntry.parentMeasure.PositionAndShape.RelativePosition.x
                - 0.5 - rules.GlissandoNoteOffset; // -0.5: width of notehead. glissEndNote.x seems to be center of notehead.
            if (startX > endX) { // e.g. when beginInstructionsWidth too big at start of staffline
                startX = endX - rules.GlissandoStafflineStartMinimumWidth;
            }
            //const glissEndVe: GraphicalVoiceEntry = glissEndNote.parentVoiceEntry;
            //endY = glissEndVe.PositionAndShape.RelativePosition.y + glissEndVe.PositionAndShape.BorderTop;
            endY = glissEndNote.PositionAndShape.AbsolutePosition.y;
        } else {
            endX = staffLine.PositionAndShape.Size.width;
        }

        const start: PointF2D = new PointF2D(startX, startY);
        const end: PointF2D = new PointF2D(endX, endY);
        const width: number = undefined; // TODO create EngravingRule?
        this.Line = new GraphicalLine(start, end, width);
    }
}
