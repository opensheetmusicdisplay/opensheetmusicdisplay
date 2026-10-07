import {Tie} from "../VoiceData/Tie";
import {GraphicalNote} from "./GraphicalNote";
import Vex from "vexflow";
import VF = Vex.Flow;

/**
 * The graphical counterpart of a [[Tie]].
 */
export class GraphicalTie {
    private tie: Tie;
    private startNote: GraphicalNote;
    private endNote: GraphicalNote;
    /** The Vexflow tie that draws this tie. For a tie across a system break, the part in the first system (see vfTies). */
    public vfTie: VF.StaveTie;
    /** The Vexflow ties that draw this tie: the tie, or for a tie across a system break, a part in each system, in order
     *  (see VexFlowMusicSheetCalculator.layoutGraphicalTie()). */
    public vfTies: VF.StaveTie[] = [];

    constructor(tie: Tie, start: GraphicalNote = undefined, end: GraphicalNote = undefined) {
        this.tie = tie;
        this.startNote = start;
        this.endNote = end;
    }

    /** The SVG group of the tie, given the SVG backend is used. For a tie across a system break, the part in the first system
     *  (see SVGElements). */
    public get SVGElement(): HTMLElement {
        return (this.vfTie as any)?.getAttribute("el");
    }

    /** The SVG groups of the tie, given the SVG backend is used: the tie's group, or for a tie across a system break,
     *  the group of the part in each system, in order. */
    public get SVGElements(): HTMLElement[] {
        const elements: HTMLElement[] = this.vfTies.map((vfTie: VF.StaveTie): HTMLElement => (vfTie as any).getAttribute("el"));
        return elements.filter((element: HTMLElement) => element); // none with the canvas backend
    }

    public get GetTie(): Tie {
        return this.tie;
    }
    public get StartNote(): GraphicalNote {
        return this.startNote;
    }
    public get Tie(): Tie {
        return this.tie;
    }
    public set StartNote(value: GraphicalNote) {
        this.startNote = value;
    }
    public get EndNote(): GraphicalNote {
        return this.endNote;
    }
    public set EndNote(value: GraphicalNote) {
        this.endNote = value;
    }

}
