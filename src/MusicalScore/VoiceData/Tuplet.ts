import {Note} from "./Note";
import {Fraction} from "../../Common/DataObjects/Fraction";

/**
 * Tuplets create irregular rhythms; e.g. triplets, quadruplets, quintuplets, etc.
 */
export class Tuplet {

    constructor(tupletLabelNumber: number) {
        this.tupletLabelNumber = tupletLabelNumber;
    }

    private tupletLabelNumber: number;
    private notes: Note[][] = [];
    private fractions: Fraction[] = [];

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

    /**
     * Return the index of the first List (notes[0], notes[1],...).
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
