import { Note } from "./Note";
import { Beam } from "./Beam";
import { Fraction } from "../../Common/DataObjects/fraction";
import { Tuplet } from "./Tuplet";
export declare class Tie {
    constructor(note: Note);
    private start;
    private tieBeam;
    private beamStartTimestamp;
    private tieTuplet;
    private fractions;
    private noteHasBeenCreated;
    private baseNoteYPosition;
    Start: Note;
    TieBeam: Beam;
    BeamStartTimestamp: Fraction;
    TieTuplet: Tuplet;
    Fractions: Fraction[];
    NoteHasBeenCreated: boolean[];
    BaseNoteYPosition: number;
    initializeBoolList(): void;
    allGraphicalNotesHaveBeenCreated(): boolean;
}
