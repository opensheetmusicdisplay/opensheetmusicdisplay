import Vex from "vexflow";
import VF = Vex.Flow;
import { StemDirectionType, VoiceEntry } from "../../VoiceData/VoiceEntry";
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
    /** A grace note that no main note follows in its staff entry (e.g. the only note of its voice there), drawn as its own
     *  tickable of the voice. Unlike a grace note after its main note (VoiceEntry.GraceAfterMainNote), it keeps its timestamp. */
    public isStandAloneGrace: boolean = false;

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

        this.PositionAndShape.RelativePosition.y = boundingBox.y / unitInPixels; // the top of the note, e.g. the tip of an up-stem
        this.applyVerticalBordersFromVexflow(boundingBox);
        const halfStavenoteWidth: number = (staveNote.width - ((staveNote as any).paddingRight ?? 0)) / 2;
        this.PositionAndShape.BorderLeft = -(modifierWidth + halfStavenoteWidth) / unitInPixels; // Left of our X origin is the modifier
        this.PositionAndShape.BorderRight = (boundingBox.w - modifierWidth) / unitInPixels; // Right of x origin is the note
    }

    /** Sets the vertical borders of this voice entry to the bounding box of its Vexflow note, e.g. from the tip of an up-stem
     *  that a beam extended (see VexFlowMeasure.updateBeamedVoiceEntryBorders()) to the lowest note head. Keeps the position of
     *  the voice entry, which its notes are placed relative to (VexFlowMeasure.correctNotePositions()): the next render's
     *  calculateXPosition() puts the voice entry there again (applyBordersFromVexflow()) and calculates the bounding boxes with
     *  the notes still where this render placed them.
     *  @param staveTopY The y of the stave's top line where the note's bounding box was measured (0 in calculateXPosition()).
     */
    public applyVerticalBordersFromVexflow(boundingBox: any, staveTopY: number = 0): void {
        const top: number = (boundingBox.y - staveTopY) / unitInPixels - this.PositionAndShape.RelativePosition.y;
        this.PositionAndShape.BorderTop = top;
        this.PositionAndShape.BorderBottom = top + boundingBox.h / unitInPixels;
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

    /** Whether the note is hidden (print-object="no"), but drawn because of EngravingRules.RenderHiddenNotes: then it's drawn
     *  in EngravingRules.HiddenNotesColor, if set. */
    private static drawnAsHiddenNote(note: Note): boolean {
        return !note.PrintObject && note.isVisible();
    }

    /** Whether all notes of this voice entry are hidden notes drawn because of EngravingRules.RenderHiddenNotes: then what they
     *  share is drawn in EngravingRules.HiddenNotesColor too, if set: the stem with its flags, the ledger lines (see color())
     *  and a beam that only joins such voice entries (see VexFlowMeasure.finalizeBeams()). */
    public drawsOnlyHiddenNotes(): boolean {
        return this.parentVoiceEntry.Notes.every((note: Note): boolean => VexFlowVoiceEntry.drawnAsHiddenNote(note));
    }

    /** (Re-)color notes and stems by setting their Vexflow styles.
     * Could be made redundant by a Vexflow PR, but Vexflow needs more solid and permanent color methods/variables for that
     * See VexFlowConverter.StaveNote()
     * Also runs without EngravingRules.ColoringEnabled: it makes hidden notes (print-object="no") transparent, and draws the
     * other notes in the default colors, like notes without a color in the XML.
     * A beam takes the color of its stems, in VexFlowMeasure.finalizeBeams() (see EngravingRules.ColorBeams).
     */
    public color(): void {
        const defaultColorNotehead: string = this.rules.DefaultColorNotehead;
        const defaultColorRest: string = this.rules.DefaultColorRest;
        const defaultColorStem: string = this.rules.DefaultColorStem;
        // without coloring, the hidden notes drawn with RenderHiddenNotes also get the default colors
        const hiddenNotesColor: string = this.rules.ColoringEnabled ? this.rules.HiddenNotesColor : undefined;
        const transparentColor: string = "#00000000"; // transparent color in vexflow
        const coloringMode: ColoringModes = this.rules.ColoringEnabled ? this.rules.ColoringMode : ColoringModes.XML;
        let noteheadColor: string; // if null: no noteheadcolor to set (stays black)
        let sourceNoteNoteheadColor: string;

        const vfStaveNote: any = (<VexFlowVoiceEntry>(this as any)).vfStaveNote;
        for (let i: number = 0; i < this.notes.length; i++) {
            const note: GraphicalNote = this.notes[i];

            // notehead="none" asks for no notehead at all, so it always stays hidden. print-object="no" hides it
            // too, unless EngravingRules.RenderHiddenNotes draws hidden notes (see Note.isVisible()), or the note is
            // drawn anyway because it shares a visible unison note's notehead: then it is drawn whole, notehead
            // included, exactly like its stem below (see drawnAsSharedUnisonNote).
            const sharedUnisonNote: Note = this.inDrawnBeam ? note.sourceNote.visibleUnisonNoteSharingNotehead() : undefined;
            const noteheadVisible: boolean = note.sourceNote.Notehead?.Shape !== NoteHeadShape.NONE &&
                (note.sourceNote.isVisible() ||
                 sharedUnisonNote !== undefined && !this.overprintsSharedHeadOfOtherShape(i, sharedUnisonNote));
            // A note drawn for its shared unison notehead takes that visible note's color: where Vexflow merges the
            // two heads into one column, its head is inked exactly over the visible one (in draw order after it,
            // if its voice comes later) and must not overprint a color set on that note - e.g. by an app
            // highlighting the notes under the cursor, which never sees the hidden note. Where the head is laid out
            // beside the visible one, it's colored like the head it stands in for.
            sourceNoteNoteheadColor = this.rules.ColoringEnabled ? (sharedUnisonNote ?? note.sourceNote).NoteheadColor : undefined;
            noteheadColor = sourceNoteNoteheadColor;
            // Switch between XML colors and automatic coloring
            if (coloringMode === ColoringModes.AutoColoring ||
                coloringMode === ColoringModes.CustomColorSet) {
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

            if (!sourceNoteNoteheadColor && coloringMode === ColoringModes.XML && noteheadVisible) {
                if (!note.sourceNote.isRest() && defaultColorNotehead) {
                    noteheadColor = defaultColorNotehead;
                } else if (note.sourceNote.isRest() && defaultColorRest) {
                    noteheadColor = defaultColorRest;
                }
            }
            if (noteheadVisible && hiddenNotesColor && VexFlowVoiceEntry.drawnAsHiddenNote(note.sourceNote)) {
                noteheadColor = hiddenNotesColor; // tells the hidden notes drawn with RenderHiddenNotes apart from visible ones
            }
            if (noteheadColor && noteheadVisible) {
                note.sourceNote.NoteheadColorCurrentlyRendered = noteheadColor;
            } else if (!noteheadColor) {
                continue;
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

        // The stem with its flags and the ledger lines belong to all notes of the voice entry: in HiddenNotesColor if all of them
        //   are hidden notes drawn with RenderHiddenNotes.
        const onlyHiddenNotesDrawn: boolean = Boolean(hiddenNotesColor) && this.drawsOnlyHiddenNotes();
        if (onlyHiddenNotesDrawn && vfStaveNote?.setLedgerLineStyle) {
            vfStaveNote.setLedgerLineStyle({ fillStyle: hiddenNotesColor, strokeStyle: hiddenNotesColor, lineWidth: this.rules.LedgerLineWidth });
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
        if (onlyHiddenNotesDrawn) {
            stemColor = hiddenNotesColor;
            setVoiceEntryStemColor = false; // keep the voice entry's own stem color, for when the notes are drawn as visible ones
        }
        let stemTransparent: boolean = true;
        for (const note of this.parentVoiceEntry.Notes) {
            if (note.isVisible() && note.Notehead?.Shape !== NoteHeadShape.NONE) {
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
        // <stem>none</stem> is drawn as a transparent stem, given as its XML stem color (see VoiceGenerator): it stays hidden also
        //   without coloring, which ignores that color, and with ColorStemsLikeNoteheads.
        if (stemTransparent || this.parentVoiceEntry.StemDirectionXml === StemDirectionType.None) {
            stemColor = transparentColor;
        }
        const stemStyle: object = { fillStyle: stemColor, strokeStyle: stemColor };

        if (vfStaveNote && vfStaveNote.setStemStyle) {
            if (!stemTransparent && setVoiceEntryStemColor) {
                this.parentVoiceEntry.StemColor = stemColor; // this shouldn't be set by DefaultColorStem
            }
            vfStaveNote.setStemStyle(stemStyle);
            if (vfStaveNote.flag && vfStaveNote.setFlagStyle) {
                // in the color of the stem with ColorFlags, else in the default stem color, which also resets the color of an
                //   earlier render. Set explicitly: a flag without a style is drawn in the style around it, e.g. a grace note's
                //   flag in the notehead style of its main note. A transparent stem (a hidden note, <stem>none</stem>) hides
                //   its flag either way.
                const flagStyle: object = this.rules.ColorFlags || stemColor === transparentColor ? stemStyle :
                    { fillStyle: defaultColorStem, strokeStyle: defaultColorStem };
                vfStaveNote.setFlagStyle(flagStyle);
            }
        }
    }
}
