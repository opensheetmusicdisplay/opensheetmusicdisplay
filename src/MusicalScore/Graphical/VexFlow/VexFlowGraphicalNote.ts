import Vex from "vexflow";
import VF = Vex.Flow;
import {ColoringOptions, GraphicalNote, VisibilityOptions} from "../GraphicalNote";
import {Note} from "../../VoiceData/Note";
import {ClefInstruction} from "../../VoiceData/Instructions/ClefInstruction";
import {VexFlowConverter} from "./VexFlowConverter";
import {AccidentalEnum, Pitch} from "../../../Common/DataObjects/Pitch";
import {Fraction} from "../../../Common/DataObjects/Fraction";
import {OctaveEnum, OctaveShift} from "../../VoiceData/Expressions/ContinuousExpressions/OctaveShift";
import { GraphicalVoiceEntry } from "../GraphicalVoiceEntry";
import { KeyInstruction } from "../../VoiceData/Instructions/KeyInstruction";
import { EngravingRules } from "../EngravingRules";
import { VexFlowMultiRestMeasure } from "./VexFlowMultiRestMeasure";

/**
 * The VexFlow version of a [[GraphicalNote]].
 */
export class VexFlowGraphicalNote extends GraphicalNote {
    constructor(note: Note, parent: GraphicalVoiceEntry, activeClef: ClefInstruction,
                octaveShift: OctaveEnum = OctaveEnum.NONE, rules: EngravingRules,
                graphicalNoteLength: Fraction = undefined) {
        super(note, parent, rules, graphicalNoteLength);
        this.clef = activeClef;
        this.octaveShift = octaveShift;
        if (note.Pitch) {
            // TODO: Maybe shift to Transpose function when available
            const drawPitch: Pitch = note.isRest() ? note.Pitch : OctaveShift.getPitchFromOctaveShift(note.Pitch, octaveShift);
            this.vfpitch = VexFlowConverter.pitch(drawPitch, note.isRest(), this.clef, this.sourceNote.Notehead);
            this.vfpitch[1] = undefined;
        }
    }

    public octaveShift: OctaveEnum;
    // The pitch of this note as given by VexFlowConverter.pitch
    public vfpitch: [string, string, ClefInstruction];
    // The corresponding VexFlow StaveNote (plus its index in the chord)
    public vfnote: [VF.StemmableNote, number];
    public vfnoteIndex: number;
    // The current clef
    private clef: ClefInstruction;

    /**
     * Update the pitch of this note. Necessary in order to display accidentals correctly.
     * This is called by VexFlowGraphicalSymbolFactory.addGraphicalAccidental.
     * @param pitch
     */
    public setAccidental(pitch: Pitch): void {
        // if (this.vfnote) {
        //     let pitchAcc: AccidentalEnum = pitch.Accidental;
        //     const acc: string = Pitch.accidentalVexflow(pitch.Accidental);
        //     if (acc) {
        //         alert(acc);
        //         this.vfnote[0].addAccidental(this.vfnote[1], new VF.Accidental(acc));
        //     }
        // } else {
        // revert octave shift, as the placement of the note is independent of octave brackets
        const drawPitch: Pitch = this.drawPitch(pitch);
        // recalculate the pitch, and this time don't ignore the accidental:
        this.vfpitch = VexFlowConverter.pitch(drawPitch, this.sourceNote.isRest(), this.clef, this.sourceNote.Notehead);
        // sharp-sharp and double-sharp are both DOUBLESHARP, natural-sharp is a SHARP and natural-flat a FLAT:
        //   only AccidentalXml tells them apart, and drawPitch doesn't keep it.
        //   VexFlowConverter.StaveNote() draws each of them as two accidentals, like "###".
        if ((pitch.Accidental === AccidentalEnum.DOUBLESHARP && pitch.AccidentalXml === "sharp-sharp") ||
            (pitch.Accidental === AccidentalEnum.SHARP && pitch.AccidentalXml === "natural-sharp") ||
            (pitch.Accidental === AccidentalEnum.FLAT && pitch.AccidentalXml === "natural-flat")) {
            this.vfpitch[1] = pitch.AccidentalXml;
        }
        this.DrawnAccidental = drawPitch.Accidental;
        //}
    }

    public drawPitch(pitch: Pitch): Pitch {
        return OctaveShift.getPitchFromOctaveShift(pitch, this.octaveShift);
    }

    public Transpose(keyInstruction: KeyInstruction, activeClef: ClefInstruction, halfTones: number, octaveEnum: OctaveEnum): Pitch {
        const tranposedPitch: Pitch = super.Transpose(keyInstruction, activeClef, halfTones, octaveEnum);
        const drawPitch: Pitch = OctaveShift.getPitchFromOctaveShift(tranposedPitch, this.octaveShift);
        this.vfpitch = VexFlowConverter.pitch(drawPitch, this.sourceNote.isRest(), this.clef, this.sourceNote.Notehead);
        this.vfpitch[1] = undefined;
        return drawPitch;
    }

    /**
     * Set the VexFlow StaveNote corresponding to this GraphicalNote, together with its index in the chord.
     * @param note
     * @param index
     */
    public setIndex(note: VF.StemmableNote, index: number): void {
        this.vfnote = [note, index];
        this.vfnoteIndex = index;
    }

    public notehead(vfNote: VF.StemmableNote = undefined): {line: number} {
        let vfnote: any = vfNote;
        if (!vfnote) {
            vfnote = (this.vfnote[0] as any);
        }
        const noteheads: any = vfnote.note_heads;
        if (noteheads && noteheads.length > this.vfnoteIndex && noteheads[this.vfnoteIndex]) {
            return vfnote.note_heads[this.vfnoteIndex];
        } else {
            return { line: 0 };
        }
    }

    /**
     * Gets the clef for this note
     */
    public Clef(): ClefInstruction {
        return this.clef;
    }

    /**
     * Gets the id of the SVGGElement containing this note, given the SVGRenderer is used.
     * This is for low-level rendering hacks and should be used with caution.
     */
    public getSVGId(): string {
        if (!this.vfnote) {
            return undefined; // e.g. MultiRestMeasure
        }
        return this.vfnote[0].getAttribute("id");
    }

    /** Toggle visibility of the note, making it and its stem and beams invisible for `false`.
     * By default, this will also hide the note's slurs, ties and glissandi, e.g. slides (see visibilityOptions).
     * (This only works with the default SVG backend, not with the Canvas backend/renderer)
     * To get a GraphicalNote from a Note, use osmd.EngravingRules.GNote(note).
     */
    public setVisible(visible: boolean, visibilityOptions: VisibilityOptions = {}): void {
        const applyToBeams: boolean = visibilityOptions.applyToBeams ?? true; // default option if not given
        const applyToGlissandi: boolean = visibilityOptions.applyToGlissandi ?? true;
        const applyToLedgerLines: boolean = visibilityOptions.applyToLedgerLines ?? true;
        const applyToNotehead: boolean = visibilityOptions.applyToNotehead ?? true;
        const applyToSlurs: boolean = visibilityOptions.applyToSlurs ?? true;
        const applyToStem: boolean = visibilityOptions.applyToStem ?? true;
        const applyToTies: boolean = visibilityOptions.applyToTies ?? true;

        const visibilityAttribute: string = "visibility";
        const visibilityString: string = visible ? "visible" : "hidden";
        if (applyToNotehead) {
            // so that it also matches undefined (option not set).
            this.getSVGGElement()?.setAttribute(visibilityAttribute, visibilityString);
        }
        // instead of setAttribute, remove() also works, but isn't reversible.
        if (applyToStem) {
            this.getStemSVG()?.setAttribute(visibilityAttribute, visibilityString);
        }
        if (applyToBeams) {
            for (const beamSVG of this.getBeamSVGs()) {
                beamSVG?.setAttribute(visibilityAttribute, visibilityString);
            }
        }
        if (applyToLedgerLines) {
            for (const ledgerSVG of this.getLedgerLineSVGs()) {
                ledgerSVG?.setAttribute(visibilityAttribute, visibilityString);
            }
        }
        if (applyToTies) {
            for (const tie of this.getTieSVGs()) {
                tie?.setAttribute(visibilityAttribute, visibilityString);
            }
        }
        if (applyToSlurs) {
            for (const slur of this.getSlurSVGs()) {
                slur?.setAttribute(visibilityAttribute, visibilityString);
            }
        }
        if (applyToGlissandi) {
            for (const glissando of this.getGlissandoSVGs()) {
                glissando?.setAttribute(visibilityAttribute, visibilityString);
            }
        }

        // usage example:
        // let voice = osmd.Sheet.Instruments[0].Voices[0];
        // for (const ve of voice.VoiceEntries) {
        //     for (const note of ve.Notes) {
        //         const gNote = osmd.EngravingRules.GNote(note);
        //         gNote?.setVisible(false);
        //     }
        // }
        // this works similarly without SVG, but with needing to render again (thus not preferable):
        // let voice = osmd.Sheet.Instruments[0].Voices[0];
        // for (const ve of voice.VoiceEntries) {
        //     for (const note of ve.Notes) {
        //         note.PrintObject = false;
        //     }
        // }
        // osmd.render();
        // this currently also still leaves ledger lines visible.
    }

    /**
     * Gets the SVGGElement containing this note, given the SVGRenderer is used.
     * This is for low-level rendering hacks and should be used with caution.
     */
    public getSVGGElement(): SVGGElement {
        if (!this.vfnote) {
            return undefined; // e.g. MultiRestMeasure
        }
        return this.vfnote[0].getAttribute("el");
    }

    /** Gets the SVG path element of the note's stem. */
    public getStemSVG(): HTMLElement {
        const groupOrPath: HTMLElement = document.getElementById("vf-" + this.getSVGId() + "-stem");
        // whether we get the group node or path node depends on whether the note has a beam, for some reason (TODO)
        if (groupOrPath?.children.length > 0) {
            return groupOrPath.children[0] as HTMLElement;
            // We want to return the same type of node every time, not a path node if no beam and a group node if it has a beam.
        }
        return groupOrPath;
        // more correct, but Vex.Prefix() is not in the definitions:
        //return document.getElementById((Vex as any).Prefix(this.getSVGId() + "-stem"));
    }

    /** Gets the SVG path elements of the beams starting on this note. */
    public getBeamSVGs(): HTMLElement[] {
        const beamSVGs: HTMLElement[] = [];
        for (let i: number = 0;; i++) {
            const newSVG: HTMLElement = document.getElementById(`vf-${this.getSVGId()}-beam${i}`);
            if (!newSVG) {
                break;
            }
            beamSVGs.push(newSVG);
        }
        return beamSVGs;
    }

    /** Gets the SVG path elements of the note's ledger lines. */
    public getLedgerLineSVGs(): HTMLElement[] {
        const ledgerSVGs: HTMLElement[] = [];
        const idString: string = `vf-${this.getSVGId()}ledgers`;
        const groupSVG: HTMLElement = document.getElementById(idString);
        if (!groupSVG) {
            return [];
        }
        for (const child of groupSVG.childNodes) {
            ledgerSVGs.push(child as HTMLElement);
        }
        return ledgerSVGs;
    }

    /** Gets the SVG path elements of the note's tie curves. */
    public getTieSVGs(): HTMLElement[] {
        const tieSVGs: HTMLElement[] = [];
        const ties: NodeListOf<HTMLElement> = document.querySelectorAll(`[id='vf-${this.getSVGId()}-tie']`);
        // TODO multiple ties have the same id sometimes, DOM elements are not supposed to have the same id, this is invalid HTML. But it works.
        for (const tie of ties) {
            tieSVGs.push(tie);
        }
        return tieSVGs;
    }

    /** Gets the SVG path elements of the note's slur curve. */
    public getSlurSVGs(): HTMLElement[] {
        const slurSVGs: HTMLElement[] = [];
        const slurs: NodeListOf<HTMLElement> = document.querySelectorAll(`[id='vf-${this.getSVGId()}-slur']`);
        // TODO multiple slurs have the same id sometimes, DOM elements are not supposed to have the same id, this is invalid HTML. But it works.
        for (const slur of slurs) {
            slurSVGs.push(slur);
        }
        return slurSVGs;
    }

    /** Gets the SVG groups of the glissandi and slides starting at this note: each with the line, and in a TAB staff the label "sl.".
     *  A glissando across a system break has a group in each system (see VexFlowMusicSheetDrawer.drawGlissando()). */
    public getGlissandoSVGs(): HTMLElement[] {
        const glissandoSVGs: HTMLElement[] = [];
        const glissandi: NodeListOf<HTMLElement> = document.querySelectorAll(`[id='vf-${this.getSVGId()}-glissando']`);
        // like the slurs, the two groups of a glissando across a system break have the same id.
        for (const glissando of glissandi) {
            glissandoSVGs.push(glissando);
        }
        return glissandoSVGs;
    }

    /** Gets the SVG elements of the note heads, e.g. the paths of a chord's heads, or the fret numbers of a TAB note (and its chord). */
    public getNoteheadSVGs(): HTMLElement[] {
        if (this.isTabNote) {
            return this.getTabNoteSVGs().frets;
        }
        const vfNote: HTMLElement = this.getVFNoteSVG();
        const noteheads: HTMLElement[] = [];
        if (vfNote?.children?.length) {
            for (const noteChild of vfNote.children) {
                if (noteChild.classList.contains("vf-notehead")) {
                    noteheads.push(noteChild as HTMLElement);
                }
            }
        }
        return noteheads;
    }

    public getFlagSVG(): HTMLElement {
        const vfNote: HTMLElement = this.getVFNoteSVG();
        if (vfNote?.children?.length) {
            for (const noteChild of vfNote.children) {
                if (noteChild.classList.contains("vf-flag")) {
                    return noteChild as HTMLElement;
                }
            }
        }
        return undefined;
    }

    public getVFNoteSVG(): HTMLElement {
        if (this.parentVoiceEntry.parentStaffEntry.parentMeasure.isMultiRestMeasure()) {
            return this.parentVoiceEntry.parentStaffEntry.parentMeasure.multiRestElement;
        }
        const note: SVGGElement = this.getSVGGElement();
        if (!note) {
            return undefined;
        }
        for (const noteChild of note.children) {
            if (noteChild.classList.contains("vf-note")) {
                return noteChild as HTMLElement;
            }
        }
        return undefined;
    }

    /** Gets the SVG elements of the note's modifiers: the groups of a stave note's modifiers (e.g. accidentals),
     *  or the shapes of a TAB note's modifiers (e.g. a bend's curve, arrow and label). */
    public getModifierSVGs(): HTMLElement[] {
        if (this.isTabNote) {
            return this.getTabNoteSVGs().modifiers;
        }
        const stavenote: SVGGElement = this.getSVGGElement();
        const modifierSVGs: HTMLElement[] = [];
        if (!stavenote?.children) {
            return modifierSVGs;
        }
        if (stavenote.children.length) {
            for (const noteChild of stavenote.children) {
                if (noteChild.classList.contains("vf-modifiers")) {
                    modifierSVGs.push(noteChild as HTMLElement);
                }
            }
        }
        return modifierSVGs;
    }

    /** Whether the note is drawn in a TAB staff, as a fret number (a Vexflow TabNote, or a GraceTabNote for a grace note). */
    private get isTabNote(): boolean {
        return this.vfnote?.[0] instanceof VF.TabNote;
    }

    /**
     * Gets the SVG elements a TAB note is drawn with (see TabNote.draw() in the VexFlowPatch): first a background rect and a
     * fret number (a text, or a path for an x notehead) for each position of its chord, then its modifiers, e.g. a bend.
     * A grace note is drawn with its main note, in its own group, which is skipped.
     */
    private getTabNoteSVGs(): { frets: HTMLElement[], modifiers: HTMLElement[] } {
        const children: HTMLElement[] = Array.from(this.getSVGGElement()?.children ?? []) as HTMLElement[];
        const positionCount: number = (this.vfnote[0] as any).positions?.length ?? 0;
        const frets: HTMLElement[] = [];
        for (let i: number = 0; i < positionCount; i++) {
            if (children[2 * i]?.tagName === "rect" && children[2 * i + 1]) {
                frets.push(children[2 * i + 1]);
            }
        }
        const modifiers: HTMLElement[] = children.slice(2 * positionCount).filter((child: HTMLElement) => child.tagName !== "g");
        return { frets, modifiers };
    }

    /** Colors the paths of a group, e.g. of a note head, or a single shape, e.g. of a TAB note or a glissando: its fill,
     *  or its stroke if it's only a line, like the curve of a bend or the line of a slide. */
    private static colorShapes(element: Element, color: string): void {
        if (element.children.length > 0) {
            for (const path of element.children) {
                path.setAttribute("fill", color);
            }
        } else if (element.getAttribute("fill") === "none") {
            element.setAttribute("stroke", color);
        } else {
            element.setAttribute("fill", color);
        }
    }

    /** Change the color of a note (without re-rendering). See ColoringOptions for options like applyToBeams etc.
     * For a TAB note, the note heads are its fret numbers, and its modifiers e.g. bends.
     * This requires the SVG backend (default, instead of canvas backend).
     */
    public setColor(color: string, coloringOptions: ColoringOptions = {}): void {
        const applyToBeams: boolean = coloringOptions.applyToBeams ?? false; // default if option not given
        const applyToFlag: boolean = coloringOptions.applyToFlag ?? true;
        const applyToGlissandi: boolean = coloringOptions.applyToGlissandi ?? false;
        const applyToLedgerLines: boolean = coloringOptions.applyToLedgerLines ?? false;
        const applyToLyrics: boolean = coloringOptions.applyToLyrics ?? false;
        const applyToModifiers: boolean = coloringOptions.applyToModifiers ?? true;
        const applyToNoteheads: boolean = coloringOptions.applyToNoteheads ?? true;
        const applyToSlurs: boolean = coloringOptions.applyToSlurs ?? false;
        const applyToStem: boolean = coloringOptions.applyToStem ?? true;
        const applyToTies: boolean = coloringOptions.applyToTies ?? false;
        const applyToMultiRestMeasure: boolean = coloringOptions.applyToMultiRestMeasure ?? true;
        const applyToMultiRestMeasureNumber: boolean = coloringOptions.applyToMultiRestMeasureNumber ?? true;
        const applyToMultiRestMeasureRestBar: boolean = coloringOptions.applyToMultiRestMeasureRestBar ?? true;

        if (applyToBeams) {
            const beams: HTMLElement[] = this.getBeamSVGs();
            for (const beam of beams) {
                for (const beamPath of beam.children) {
                    beamPath.setAttribute("fill", color);
                }
            }
        }

        if (applyToFlag) {
            const flag: HTMLElement = this.getFlagSVG();
            if (flag) {
                for (const flagPath of flag.children) {
                    flagPath.setAttribute("fill", color);
                }
            }
        }

        if (applyToGlissandi) {
            for (const glissando of this.getGlissandoSVGs()) {
                // each shape of the group: the lines need their stroke colored, the label "sl." in a TAB staff its fill.
                //   (the line in a standard staff is in a group of its own, see SvgVexFlowBackend.renderLine())
                for (const shape of glissando.querySelectorAll("path, text")) {
                    VexFlowGraphicalNote.colorShapes(shape, color);
                }
            }
        }

        if (applyToLedgerLines) {
            const ledgerLines: HTMLElement[] = this.getLedgerLineSVGs();
            for (const line of ledgerLines) {
                line.setAttribute("stroke", color);
            }
        }

        if (applyToLyrics) {
            const lyricsNodes: HTMLElement[] = this.getLyricsSVGs();
            for (const lyricsNode of lyricsNodes) {
                for (const textNode of lyricsNode.children) {
                    textNode.setAttribute("stroke", color);
                    textNode.setAttribute("fill", color);
                }
            }
        }

        if (applyToMultiRestMeasure) {
            if (this.parentVoiceEntry.parentStaffEntry.parentMeasure instanceof VexFlowMultiRestMeasure) {
                const measure: VexFlowMultiRestMeasure = this.parentVoiceEntry.parentStaffEntry.parentMeasure as VexFlowMultiRestMeasure;
                const svgElement: SVGGElement = measure.multiRestElementSVG;
                if (svgElement?.children?.length) {
                    for (const child of svgElement.children) { // wide bar, and number above
                        if (child.children?.length) { // vf-timesignature (multi-rest number)
                            if (applyToMultiRestMeasureNumber) {
                                for (const subChild of child.children) {
                                    subChild.setAttribute("fill", color);
                                }
                            }
                        } else {
                            if (applyToMultiRestMeasureRestBar) {
                                child.setAttribute("fill", color);
                            }
                        }
                    }
                }
            }
        }

        if (applyToModifiers) { // e.g. accidentals
            const modifiers: HTMLElement[] = this.getModifierSVGs();
            for (const modifier of modifiers) {
                VexFlowGraphicalNote.colorShapes(modifier, color);
            }
        }

        if (applyToNoteheads) {
            const noteheads: HTMLElement[] = this.getNoteheadSVGs();
            for (const notehead of noteheads) {
                VexFlowGraphicalNote.colorShapes(notehead, color);
            }
        }

        if (applyToSlurs) {
            const slurs: HTMLElement[] = this.getSlurSVGs();
            for (const slur of slurs) {
                for (const path of slur.children) {
                    path.setAttribute("fill", color);
                }
            }
        }

        if (applyToStem) {
            const stem: HTMLElement = this.getStemSVG();
            if (stem) {
                stem.setAttribute("stroke", color);
            }
        }

        if (applyToTies) {
            const ties: HTMLElement[] = this.getTieSVGs();
            for (const tie of ties) {
                for (const path of tie.children) {
                    path.setAttribute("fill", color);
                }
            }
        }
    }
}
