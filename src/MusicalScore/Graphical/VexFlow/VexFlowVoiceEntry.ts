import Vex from "vexflow";
import VF = Vex.Flow;
import { VoiceEntry } from "../../VoiceData/VoiceEntry";
import { GraphicalVoiceEntry } from "../GraphicalVoiceEntry";
import { GraphicalStaffEntry } from "../GraphicalStaffEntry";
import { unitInPixels } from "./VexFlowMusicSheetDrawer";
import { NoteEnum } from "../../../Common/DataObjects/Pitch";
import { Note } from "../../VoiceData/Note";
import { ColoringModes } from "../../../Common/Enums/ColoringModes";
import { GraphicalNote } from "../GraphicalNote";
import { EngravingRules } from "../EngravingRules";
import { NoteHeadShape } from "../../VoiceData/Notehead";

export class VexFlowVoiceEntry extends GraphicalVoiceEntry {
    private mVexFlowStaveNote: VF.StemmableNote;
    public vfGhostNotes: VF.GhostNote[]; // sometimes we need multiple ghost notes instead of just one note (vfStaveNote).

    constructor(parentVoiceEntry: VoiceEntry, parentStaffEntry: GraphicalStaffEntry, rules?: EngravingRules) {
        super(parentVoiceEntry, parentStaffEntry, rules);
    }

    public applyBordersFromVexflow(): void {
        const staveNote: any = (this.vfStaveNote as any);
        if (!staveNote.getNoteHeadBeginX) {
            return;
        }
        const boundingBox: any = staveNote.getBoundingBox();
        const modifierWidth: number = staveNote.getNoteHeadBeginX() - boundingBox.x;

        this.PositionAndShape.RelativePosition.y = boundingBox.y / unitInPixels;
        this.PositionAndShape.BorderTop = 0;
        this.PositionAndShape.BorderBottom = boundingBox.h / unitInPixels;
        const halfStavenoteWidth: number = (staveNote.width - ((staveNote as any).paddingRight ?? 0)) / 2;
        this.PositionAndShape.BorderLeft = -(modifierWidth + halfStavenoteWidth) / unitInPixels; // Left of our X origin is the modifier
        this.PositionAndShape.BorderRight = (boundingBox.w - modifierWidth) / unitInPixels; // Right of x origin is the note
    }

    public set vfStaveNote(value: VF.StemmableNote) {
        this.mVexFlowStaveNote = value;
    }

    public get vfStaveNote(): VF.StemmableNote {
        return this.mVexFlowStaveNote;
    }

    /** Apply custom noteheads from Note.CustomNoteheadVFCode. This should happen before color(). */
    public applyCustomNoteheads(): void {
        const vfStaveNote: any = (<VexFlowVoiceEntry>(this as any)).vfStaveNote;
        if (!vfStaveNote) {
            return;
        }
        for (let i: number = 0; i < this.notes.length; i++) {
            const note: Note = this.notes[i].sourceNote;
            if (vfStaveNote.note_heads) { // see VexFlowConverter, needs Vexflow PR
                if (note.CustomNoteheadVFCode) {
                    (vfStaveNote.note_heads[i] as any).glyph_code = note.CustomNoteheadVFCode;
                }
            }
        }
    }

    /** Whether the note is drawn although its own notehead is hidden (print-object="no"), because it shares the
     * notehead of a visible unison note in another voice and its stem is beamed. The stem emanates from the shared
     * notehead and has to reach the beam. E.g. Beethoven Moonlight Sonata 1st mvt. m.37, heads of the same shape
     * (test_unison_notehead_moonlight_sonata_measure37), and Debussy Arabesque no. 1 m.3, where the hidden eighth's
     * stem rises from a half note's head (test_unison_notehead_tuplet_arabesque_measure3). Vexflow lays the hidden
     * note's notehead out beside the visible one only next to a whole note (mergeableUnison in the VexFlowPatch
     * stavenote.js, see hiddenUnisonBaseHead in VexFlowMusicSheetCalculator.calculateMeasureXLayout()): there it has
     * to be drawn too, otherwise the beam ends on a bare stem with nothing under it.
     * The beam has to be drawn, i.e. join the note to other drawn notes (see inDrawnBeam). Hidden notes that only
     * write out a tremolo for playback, e.g. 16ths under a dotted half with tremolo strokes, are beamed among
     * themselves, and only the first of them shares the half's notehead: it was drawn as a lone 16th with flags
     * (test_unison_hidden_tremolo_playback_notes_actor_prelude_measure33). */
    private drawnAsSharedUnisonNote(note: Note): boolean {
        return this.inDrawnBeam && note.sharesNoteheadWithVisibleUnisonNote();
    }

    /** Whether the Vexflow note is part of a beam that is drawn. VexFlowMeasure.finalizeBeams() creates a Vexflow beam
     * only for two or more notes, and Vexflow sets StemmableNote.beam for each of them. */
    private get inDrawnBeam(): boolean {
        return Boolean((this.vfStaveNote as any)?.beam);
    }

    /** Whether the notehead of a hidden unison note (see drawnAsSharedUnisonNote) lands exactly on the head of the
     * visible note it shares, but with another shape, e.g. a filled eighth note head on an open half note head.
     * Vexflow leaves the two heads in one column on purpose where the hidden note is on the base line of its stave
     * note (see drawnAsSharedUnisonNote), and also where the visible note is another note of a chord: Vexflow only
     * compares the base line of each stave note, so it misses that unison. Drawing the hidden head there would fill
     * the visible open head, which then reads as a quarter note - e.g. Liszt's Liebestraum no. 3 m.42, an eighth
     * note run starting on the E3 of a dotted half E2-E3 chord (test_unison_notehead_over_chord_liebestraum_measure42).
     * Where the two heads have the same shape, the hidden one is inked over the visible one without changing it. */
    private overprintsSharedHeadOfOtherShape(noteIndex: number, sharedUnisonNote: Note): boolean {
        const vfStaveNote: any = this.vfStaveNote;
        const shared: GraphicalNote = this.rules.GNote(sharedUnisonNote);
        const sharedVfStaveNote: any = (shared?.parentVoiceEntry as VexFlowVoiceEntry)?.vfStaveNote;
        const head: any = vfStaveNote?.note_heads?.[noteIndex];
        const sharedHead: any = sharedVfStaveNote?.note_heads?.[shared.parentVoiceEntry.notes.indexOf(shared)];
        if (!head || !sharedHead) {
            return false;
        }
        const sameColumn: boolean = vfStaveNote.getXShift() === sharedVfStaveNote.getXShift() &&
            head.isDisplaced() === sharedHead.isDisplaced();
        return sameColumn && head.glyph_code !== sharedHead.glyph_code;
    }

    /** (Re-)color notes and stems by setting their Vexflow styles.
     * Could be made redundant by a Vexflow PR, but Vexflow needs more solid and permanent color methods/variables for that
     * See VexFlowConverter.StaveNote()
     */
    public color(): void {
        const defaultColorNotehead: string = this.rules.DefaultColorNotehead;
        const defaultColorRest: string = this.rules.DefaultColorRest;
        const defaultColorStem: string = this.rules.DefaultColorStem;
        const transparentColor: string = "#00000000"; // transparent color in vexflow
        let noteheadColor: string; // if null: no noteheadcolor to set (stays black)
        let sourceNoteNoteheadColor: string;

        const vfStaveNote: any = (<VexFlowVoiceEntry>(this as any)).vfStaveNote;
        for (let i: number = 0; i < this.notes.length; i++) {
            const note: GraphicalNote = this.notes[i];

            // notehead="none" asks for no notehead at all, so it always stays hidden. print-object="no" hides it
            // too, unless the note is drawn anyway because it shares a visible unison note's notehead: then it is
            // drawn whole, notehead included, exactly like its stem below (see drawnAsSharedUnisonNote).
            const sharedUnisonNote: Note = this.inDrawnBeam ? note.sourceNote.visibleUnisonNoteSharingNotehead() : undefined;
            const noteheadVisible: boolean = note.sourceNote.Notehead?.Shape !== NoteHeadShape.NONE &&
                (note.sourceNote.PrintObject ||
                 sharedUnisonNote !== undefined && !this.overprintsSharedHeadOfOtherShape(i, sharedUnisonNote));
            // A note drawn for its shared unison notehead takes that visible note's color: where Vexflow merges the
            // two heads into one column, its head is inked exactly over the visible one (in draw order after it,
            // if its voice comes later) and must not overprint a color set on that note - e.g. by an app
            // highlighting the notes under the cursor, which never sees the hidden note. Where the head is laid out
            // beside the visible one, it's colored like the head it stands in for.
            sourceNoteNoteheadColor = (sharedUnisonNote ?? note.sourceNote).NoteheadColor;
            noteheadColor = sourceNoteNoteheadColor;
            // Switch between XML colors and automatic coloring
            if (this.rules.ColoringMode === ColoringModes.AutoColoring ||
                this.rules.ColoringMode === ColoringModes.CustomColorSet) {
                if (note.sourceNote.isRest()) {
                    noteheadColor = this.rules.ColoringSetCurrent.getValue(-1);
                } else {
                    const fundamentalNote: NoteEnum = note.sourceNote.Pitch.FundamentalNote;
                    noteheadColor = this.rules.ColoringSetCurrent.getValue(fundamentalNote);
                }
            }
            if (!noteheadVisible) {
                noteheadColor = transparentColor; // transparent (see noteheadVisible above)
            } else if (!noteheadColor // revert transparency after PrintObject was set to false, then true again
                || noteheadColor === "#000000" // questionable, because you might want to set specific notes to black,
                                               // but unfortunately some programs export everything explicitly as black
                ) {
                noteheadColor = this.rules.DefaultColorNotehead;
            }

            // DEBUG runtime coloring test
            /*const testColor: string = "#FF0000";
            if (i === 2 && Math.random() < 0.1 && note.sourceNote.NoteheadColor !== testColor) {
                const measureNumber: number = note.parentVoiceEntry.parentStaffEntry.parentMeasure.MeasureNumber;
                noteheadColor = testColor;
                console.log("color changed to " + noteheadColor + " of this note:\n" + note.sourceNote.Pitch.ToString() +
                    ", in measure #" + measureNumber);
            }*/

            if (!sourceNoteNoteheadColor && this.rules.ColoringMode === ColoringModes.XML && noteheadVisible) {
                if (!note.sourceNote.isRest() && defaultColorNotehead) {
                    noteheadColor = defaultColorNotehead;
                } else if (note.sourceNote.isRest() && defaultColorRest) {
                    noteheadColor = defaultColorRest;
                }
            }
            if (noteheadColor && noteheadVisible) {
                note.sourceNote.NoteheadColorCurrentlyRendered = noteheadColor;
            } else if (!noteheadColor) {
                continue;
            }

            // color notebeam if all noteheads have same color and stem coloring enabled
            if (this.rules.ColoringEnabled && note.sourceNote.NoteBeam && this.rules.ColorBeams) {
                const beamNotes: Note[] = note.sourceNote.NoteBeam.Notes;
                let colorBeam: boolean = true;
                for (let j: number = 0; j < beamNotes.length; j++) {
                    if (beamNotes[j].NoteheadColorCurrentlyRendered !== noteheadColor) {
                        colorBeam = false;
                    }
                }
                if (colorBeam) {
                    if (vfStaveNote?.beam?.setStyle) {
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
                // set ledger line color. TODO coordinate this with VexFlowConverter.StaveNote(), where there's also still code for this, maybe unnecessarily.
                if ((vfStaveNote as any).setLedgerLineStyle) { // setLedgerLineStyle doesn't exist on TabNote or rest, would throw error.
                    if (noteheadColor === transparentColor) {
                        (vfStaveNote as any).setLedgerLineStyle(
                            { fillStyle: noteheadColor, strokeStyle: noteheadColor, lineWidth: this.rules.LedgerLineWidth });
                    } else {
                        (vfStaveNote as any).setLedgerLineStyle({
                            fillStyle: this.rules.LedgerLineColorDefault,
                            lineWidth: this.rules.LedgerLineWidth,
                            strokeStyle: this.rules.LedgerLineColorDefault
                        });
                        // we could give the color (style) as noteheadColor, but then we need to figure out which note has the ledger line.
                        // otherwise ledger lines get the color of the top note, see Function Test Color.
                    }
                }
            }
        }

        // color stems
        let stemColor: string = defaultColorStem; // reset to black/default when coloring was disabled. maybe needed elsewhere too
        let setVoiceEntryStemColor: boolean = false;
        if (this.rules.ColoringEnabled) {
            stemColor = this.parentVoiceEntry.StemColor; // TODO: once coloringSetCustom gets stem color, respect it
            if (!stemColor
                || stemColor === "#000000") { // see above, noteheadColor === "#000000"
                stemColor = defaultColorStem;
            }
            if (this.rules.ColorStemsLikeNoteheads && noteheadColor) {
                // condition could be even more fine-grained by only recoloring if there was no custom StemColor set. will be more complex though
                stemColor = noteheadColor;
                setVoiceEntryStemColor = true;
            }
        }
        let stemTransparent: boolean = true;
        for (const note of this.parentVoiceEntry.Notes) {
            if (note.PrintObject && note.Notehead?.Shape !== NoteHeadShape.NONE) {
                stemTransparent = false;
                break;
            }
            // The note's own notehead is hidden, but it's drawn anyway because it shares a visible unison note's
            // notehead and is beamed (see drawnAsSharedUnisonNote): its stem emanates from the shared notehead and
            // has to reach the beam, otherwise the beam appears to hang in the air over a missing stem.
            if (this.drawnAsSharedUnisonNote(note)) {
                stemTransparent = false;
                break;
            }
        }
        if (stemTransparent) {
            stemColor = transparentColor;
        }
        const stemStyle: Object = { fillStyle: stemColor, strokeStyle: stemColor };

        if (vfStaveNote && vfStaveNote.setStemStyle) {
            if (!stemTransparent && setVoiceEntryStemColor) {
                this.parentVoiceEntry.StemColor = stemColor; // this shouldn't be set by DefaultColorStem
            }
            vfStaveNote.setStemStyle(stemStyle);
            if (vfStaveNote.flag && vfStaveNote.setFlagStyle && this.rules.ColorFlags) {
                vfStaveNote.setFlagStyle(stemStyle);
            }
        }
    }
}
