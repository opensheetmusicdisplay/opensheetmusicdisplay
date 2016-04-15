export class MappingSourceMusicPart implements IComparable, IComparable<MappingSourceMusicPart>
{
    constructor(sourceMusicPart: SourceMusicPart, startTimestamp: Fraction) {
        this(sourceMusicPart, null, startTimestamp, -1, false);

    }
    constructor(sourceMusicPart: SourceMusicPart, parentPartListEntry: Repetition, startTimestamp: Fraction, repetitionRun: number, isEnding: boolean) {
        this.sourceMusicPart = sourceMusicPart;
        this.parentPartListEntry = parentPartListEntry;
        this.startTimestamp = new Fraction(startTimestamp);
        this.repetitionRun = repetitionRun;
        this.parentRepetition = __as__<Repetition>(parentPartListEntry, Repetition);
        this.isEnding = isEnding;
    }
    private sourceMusicPart: SourceMusicPart;
    private parentRepetition: Repetition;
    private parentPartListEntry: PartListEntry;
    private startTimestamp: Fraction;
    private repetitionRun: number = -1;
    private isEnding: boolean;
    public get IsRepetition(): boolean {
        return this.parentRepetition != null;
    }
    public get IsEnding(): boolean {
        return this.isEnding;
    }
    public get IsLastRepetitionRun(): boolean {
        return this.IsRepetition && (this.repetitionRun + 1 == this.parentRepetition.UserNumberOfRepetitions);
    }
    public get RepetitionRun(): number {
        return this.repetitionRun;
    }
    public get ParentPartListEntry(): PartListEntry {
        return this.parentPartListEntry;
    }
    public get SourceMusicPart(): SourceMusicPart {
        return this.sourceMusicPart;
    }
    public get StartTimestamp(): Fraction {
        return this.startTimestamp;
    }
    public CompareTo(obj: Object): number {
        var comp: MappingSourceMusicPart = __as__<MappingSourceMusicPart>(obj, MappingSourceMusicPart);
        if (comp != null)
            return this.startTimestamp.CompareTo(comp.startTimestamp);
        else return 1;
    }
    public CompareTo(other: MappingSourceMusicPart): number {
        return this.CompareTo(<Object>other);
    }
}