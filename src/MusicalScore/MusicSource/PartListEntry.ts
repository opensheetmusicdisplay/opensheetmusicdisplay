export class PartListEntry {
    constructor(musicSheet: MusicSheet) {
        this.musicSheet = musicSheet;
    }

    public AbsoluteTimestamp: Fraction;
    public StartIndex: number;
    public EndIndex: number;

    protected enrolledTimestamps: List<Fraction> = new List<Fraction>();
    protected visible: boolean = true;

    private musicSheet: MusicSheet;

    public get Visible(): boolean {
        return this.visible;
    }
    public set Visible(value: boolean) {
        this.visible = value;
    }
    public getFirstSourceMeasure(): SourceMeasure {
        return this.musicSheet.SourceMeasures[this.StartIndex];
    }
    public getLastSourceMeasure(): SourceMeasure {
        return this.musicSheet.SourceMeasures[this.EndIndex];
    }
}
