import {Note} from "./Note";
import {Fraction} from "../../Common/DataObjects/Fraction";

/**
 * Tuplets create irregular rhythms; e.g. triplets, quadruplets, quintuplets, etc.
 */
export class Tuplet {

    constructor(tupletLabelNumber: number, bracket: boolean = false) {
        this.tupletLabelNumber = tupletLabelNumber;
        this.bracket = bracket;
    }

    private tupletLabelNumber: number;
    private notes: Note[][] = [];
    private fractions: Fraction[] = [];
    /** Whether this tuplet has a bracket. (e.g. showing |--3--| or just 3 for a triplet) */
    private bracket: boolean;

    public get TupletLabelNumber(): number {
        return this.tupletLabelNumber;
    }

    public set TupletLabelNumber(value: number) {
        this.tupletLabelNumber = value;
    }

    public get Notes(): Note[][] {
        return this.notes;
    }

    public set Notes(value: Note[][]) {
        this.notes = value;
    }

    public get Fractions(): Fraction[] {
        return this.fractions;
    }

    public set Fractions(value: Fraction[]) {
        this.fractions = value;
    }

    public get Bracket(): boolean {
        return this.bracket;
    }

    public set Bracket(value: boolean) {
        this.bracket = value;
    }

    /**
     * Returns the index of the given Note in the Tuplet List (notes[0], notes[1],...).
     * @param note
     * @returns {number}
     */
    public getNoteIndex(note: Note): number {
        for (let i: number = this.notes.length - 1; i >= 0; i--) {
            for (let j: number = 0; j < this.notes[i].length; j++) {
                if (note === this.notes[i][j]) {
                    return i;
                }
            }
        }
        return 0;
    }

}
