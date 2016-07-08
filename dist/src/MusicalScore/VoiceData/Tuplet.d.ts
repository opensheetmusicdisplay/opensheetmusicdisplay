import { Note } from "./Note";
import { Fraction } from "../../Common/DataObjects/fraction";
export declare class Tuplet {
    constructor(tupletLabelNumber: number);
    private tupletLabelNumber;
    private notes;
    private fractions;
    TupletLabelNumber: number;
    Notes: Note[][];
    Fractions: Fraction[];
    getNoteIndex(note: Note): number;
}
