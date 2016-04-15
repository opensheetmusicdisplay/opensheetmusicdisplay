export class Tuplet {
    constructor(tupletLabelNumber: number) {
        this.tupletLabelNumber = tupletLabelNumber;
    }
    private tupletLabelNumber: number;
    private notes: List<List<Note>> = new List<List<Note>>();
    private fractions: List<Fraction> = new List<Fraction>();
    public get TupletLabelNumber(): number {
        return this.tupletLabelNumber;
    }
    public set TupletLabelNumber(value: number) {
        this.tupletLabelNumber = value;
    }
    public get Notes(): List<List<Note>> {
        return this.notes;
    }
    public set Notes(value: List<List<Note>>) {
        this.notes = value;
    }
    public get Fractions(): List<Fraction> {
        return this.fractions;
    }
    public set Fractions(value: List<Fraction>) {
        this.fractions = value;
    }
    public getNoteIndex(note: Note): number {
        var index: number = 0;
        for (var i: number = 0; i < this.notes.Count; i++)
            for (var j: number = 0; j < this.notes[i].Count; j++)
                if (note == this.notes[i][j])
                    index = i;
        return index;
    }
}