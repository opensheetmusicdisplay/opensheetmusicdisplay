export class Tie {
    constructor(note: Note) {
        this.start = note;
    }
    private start: Note;
    private tieBeam: Beam;
    private beamStartTimestamp: Fraction;
    private tieTuplet: Tuplet;
    private tieEndingSlur: Slur;
    private tieStartingSlur: Slur;
    private fractions: List<Fraction> = new List<Fraction>();
    private noteHasBeenCreated: List<boolean> = new List<boolean>();
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
    public get TieEndingSlur(): Slur {
        return this.tieEndingSlur;
    }
    public set TieEndingSlur(value: Slur) {
        this.tieEndingSlur = value;
    }
    public get TieStartingSlur(): Slur {
        return this.tieStartingSlur;
    }
    public set TieStartingSlur(value: Slur) {
        this.tieStartingSlur = value;
    }
    public get Fractions(): List<Fraction> {
        return this.fractions;
    }
    public set Fractions(value: List<Fraction>) {
        this.fractions = value;
    }
    public get NoteHasBeenCreated(): List<boolean> {
        return this.noteHasBeenCreated;
    }
    public set NoteHasBeenCreated(value: List<boolean>) {
        this.noteHasBeenCreated = value;
    }
    public get BaseNoteYPosition(): number {
        return this.baseNoteYPosition;
    }
    public set BaseNoteYPosition(value: number) {
        this.baseNoteYPosition = value;
    }
    public initializeBoolList(): void {
        this.noteHasBeenCreated.Clear();
        for (var idx: number = 0, len = this.fractions.Count; idx < len; ++idx) {
            var fraction: Fraction = this.fractions[idx];
            this.noteHasBeenCreated.Add(false);
        }
    }
    public allGraphicalNotesHaveBeenCreated(): boolean {
        for (var idx: number = 0, len = this.noteHasBeenCreated.Count; idx < len; ++idx) {
            var b: boolean = this.noteHasBeenCreated[idx];
            if (!b)
                return false;
        }
        return true;
    }
}