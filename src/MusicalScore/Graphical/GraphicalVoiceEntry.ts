import { GraphicalObject } from "./GraphicalObject";
import { VoiceEntry } from "../VoiceData/VoiceEntry";
import { BoundingBox } from "./BoundingBox";
import { GraphicalNote } from "./GraphicalNote";
import { GraphicalStaffEntry } from "./GraphicalStaffEntry";
import { OctaveEnum } from "../VoiceData/Expressions/ContinuousExpressions/OctaveShift";
import { VexFlowVoiceEntry } from "./VexFlow/VexFlowVoiceEntry";
import { EngravingRules } from "./EngravingRules";
import { ColoringModes } from "./DrawingParameters";
import { NoteEnum } from "../../Common/DataObjects/Pitch";
import { Note } from "..";

/**
 * The graphical counterpart of a [[VoiceEntry]].
 */
export class GraphicalVoiceEntry extends GraphicalObject {
    constructor(parentVoiceEntry: VoiceEntry, parentStaffEntry: GraphicalStaffEntry) {
        super();
        this.parentVoiceEntry = parentVoiceEntry;
        this.parentStaffEntry = parentStaffEntry;
        this.PositionAndShape = new BoundingBox(this, parentStaffEntry ? parentStaffEntry.PositionAndShape : undefined, true);
        this.notes = [];
    }

    public parentVoiceEntry: VoiceEntry;
    public parentStaffEntry: GraphicalStaffEntry;
    public notes: GraphicalNote[];
    /** Contains octave shifts affecting this voice entry, caused by octave brackets. */
    public octaveShiftValue: OctaveEnum;

    /** Sort this entry's notes by pitch.
     * Notes need to be sorted for Vexflow StaveNote creation.
     * Note that Vexflow needs the reverse order, see VexFlowConverter.StaveNote().
     */
    public sort(): void {
        this.notes.sort((a, b) => {
            return b.sourceNote.Pitch.getHalfTone() - a.sourceNote.Pitch.getHalfTone();
        });
    }

    /** (Re-)color notes and stems by setting their Vexflow styles.
     * Could be made redundant by a Vexflow PR, but Vexflow needs more solid and permanent color methods/variables for that
     * See VexFlowConverter.StaveNote()
     */
    public color(): void {
        const defaultColorNotehead: string = EngravingRules.Rules.DefaultColorNotehead;
        const defaultColorRest: string = EngravingRules.Rules.DefaultColorRest;
        const defaultColorStem: string = EngravingRules.Rules.DefaultColorStem;
        const transparentColor: string = "#00000000"; // transparent color in vexflow
        let noteheadColor: string; // if null: no noteheadcolor to set (stays black)

        const vfStaveNote: any = (<VexFlowVoiceEntry>(this as any)).vfStaveNote;
        for (let i: number = 0; i < this.notes.length; i++) {
            const note: GraphicalNote = this.notes[i];

            noteheadColor = note.sourceNote.NoteheadColor;
            // Switch between XML colors and automatic coloring
            if (EngravingRules.Rules.ColoringMode === ColoringModes.AutoColoring ||
                EngravingRules.Rules.ColoringMode === ColoringModes.CustomColorSet) {
                if (note.sourceNote.isRest()) {
                    noteheadColor = EngravingRules.Rules.ColoringSetCurrent.getValue(-1);
                } else {
                    const fundamentalNote: NoteEnum = note.sourceNote.Pitch.FundamentalNote;
                    noteheadColor = EngravingRules.Rules.ColoringSetCurrent.getValue(fundamentalNote);
                }
            }
            if (!note.sourceNote.PrintObject) {
                noteheadColor = transparentColor; // transparent
            } else if (!noteheadColor) { // revert transparency after PrintObject was set to false, then true again
                noteheadColor = EngravingRules.Rules.DefaultColorNotehead;
            }

            // DEBUG runtime coloring test
            /*const testColor: string = "#FF0000";
            if (i === 2 && Math.random() < 0.1 && note.sourceNote.NoteheadColor !== testColor) {
                const measureNumber: number = note.parentVoiceEntry.parentStaffEntry.parentMeasure.MeasureNumber;
                noteheadColor = testColor;
                console.log("color changed to " + noteheadColor + " of this note:\n" + note.sourceNote.Pitch.ToString() +
                    ", in measure #" + measureNumber);
            }*/

            if (!noteheadColor) {
                if (!note.sourceNote.isRest() && defaultColorNotehead) {
                    noteheadColor = defaultColorNotehead;
                } else if (note.sourceNote.isRest() && defaultColorRest) {
                    noteheadColor = defaultColorRest;
                }
            }
            if (noteheadColor && note.sourceNote.PrintObject) {
                note.sourceNote.NoteheadColor = noteheadColor;
            } else if (!noteheadColor) {
                continue;
            }

            // color notebeam if all noteheads have same color and stem coloring enabled
            if (note.sourceNote.NoteBeam && EngravingRules.Rules.ColorStemsLikeNoteheads) {
                const beamNotes: Note[] = note.sourceNote.NoteBeam.Notes;
                let colorBeam: boolean = true;
                for (let j: number = 0; j < beamNotes.length; j++) {
                    if (beamNotes[j].NoteheadColor !== noteheadColor) {
                        colorBeam = false;
                    }
                }
                if (colorBeam) {
                    if (vfStaveNote.beam !== null && vfStaveNote.beam.setStyle) {
                        vfStaveNote.beam.setStyle({ fillStyle: noteheadColor, strokeStyle: noteheadColor});
                    }
                }
            }

            if (vfStaveNote) {
                if (vfStaveNote.note_heads) { // see VexFlowConverter, needs Vexflow PR
                    const notehead: any = vfStaveNote.note_heads[i];
                    if (notehead) {
                        notehead.setStyle({ fillStyle: noteheadColor, strokeStyle: noteheadColor });
                    }
                }
            }
        }

        // color stems
        let stemColor: string = this.parentVoiceEntry.StemColor; // TODO: once coloringSetCustom gets stem color, respect it
        if (!stemColor || EngravingRules.Rules.ColorStemsLikeNoteheads) {
            // condition could be even more fine-grained by only recoloring if there was no custom StemColor set. will be more complex though
            if (noteheadColor) {
                stemColor = noteheadColor;
            } else if (defaultColorStem) {
                stemColor = defaultColorStem;
            }
        }
        let stemTransparent: boolean = true;
        for (const note of this.parentVoiceEntry.Notes) {
            if (note.PrintObject) {
                stemTransparent = false;
                break;
            }
        }
        if (stemTransparent) {
            stemColor = transparentColor;
        }
        const stemStyle: Object = { fillStyle: stemColor, strokeStyle: stemColor };

        if (stemColor && vfStaveNote.setStemStyle) {
            if (!stemTransparent) {
                this.parentVoiceEntry.StemColor = stemColor;
            }
            vfStaveNote.setStemStyle(stemStyle);
            if (vfStaveNote.flag && vfStaveNote.setFlagStyle && EngravingRules.Rules.ColorFlags) {
                vfStaveNote.setFlagStyle(stemStyle);
            }
        }
    }
}
