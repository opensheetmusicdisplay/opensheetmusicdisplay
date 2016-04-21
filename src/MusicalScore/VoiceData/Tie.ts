import {Note} from "./Note";
import {Beam} from "./Beam";
import {Fraction} from "../../Common/DataObjects/fraction";
import {Tuplet} from "./Tuplet";

export class Tie {
    constructor(note: Note) {
        this.start = note;
    }
    private start: Note;
    private tieBeam: Beam;
    private beamStartTimestamp: Fraction;
    private tieTuplet: Tuplet;
    private fractions: Fraction[] = [];
    private noteHasBeenCreated: boolean[] = [];
    private baseNoteYPosition: number;
    public get Start(): Note {
        return this.start;
    }
    public set Start(value: Note) {
        this.start = value;
    }
    public get TieBeam(): Beam {
        return this.tieBeam;
    }
    public set TieBeam(value: Beam) {
        this.tieBeam = value;
    }
    public get BeamStartTimestamp(): Fraction {
        return this.beamStartTimestamp;
    }
    public set BeamStartTimestamp(value: Fraction) {
        this.beamStartTimestamp = value;
    }
    public get TieTuplet(): Tuplet {
        return this.tieTuplet;
    }
    public set TieTuplet(value: Tuplet) {
        this.tieTuplet = value;
    }
    public get Fractions(): Fraction[] {
        return this.fractions;
    }
    public set Fractions(value: Fraction[]) {
        this.fractions = value;
    }
    public get NoteHasBeenCreated(): boolean[] {
        return this.noteHasBeenCreated;
    }
    public set NoteHasBeenCreated(value: boolean[]) {
        this.noteHasBeenCreated = value;
    }
    public get BaseNoteYPosition(): number {
        return this.baseNoteYPosition;
    }
    public set BaseNoteYPosition(value: number) {
        this.baseNoteYPosition = value;
    }
    public initializeBoolList(): void {
        this.noteHasBeenCreated = [];
        for (let idx: number = 0, len: number = this.fractions.length; idx < len; ++idx) {
            // let fraction: Fraction = this.fractions[idx];
            this.noteHasBeenCreated.push(false);
        }
    }
    public allGraphicalNotesHaveBeenCreated(): boolean {
        for (let idx: number = 0, len: number = this.noteHasBeenCreated.length; idx < len; ++idx) {
            if (!this.noteHasBeenCreated[idx]) { return false; }
        }
        return true;
    }
}
