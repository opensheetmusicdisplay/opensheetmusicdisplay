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
    public vfTie: VF.StaveTie;

    constructor(tie: Tie, start: GraphicalNote = undefined, end: GraphicalNote = undefined) {
        this.tie = tie;
        this.startNote = start;
        this.endNote = end;
    }

    public get SVGElement(): HTMLElement {
        return (this.vfTie as any).getAttribute("el");
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
