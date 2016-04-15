export class PartListEntry {
    constructor(musicSheet: MusicSheet) {
        this.musicSheet = musicSheet;
    }
    protected enrolledTimestamps: List<Fraction> = new List<Fraction>();
    protected visible: boolean = true;
    private musicSheet: MusicSheet;
    public AbsoluteTimestamp: Fraction;
    public get Visible(): boolean {
        return this.visible;
    }
    public set Visible(value: boolean) {
        this.visible = value;
    }
    public StartIndex: number;
    public EndIndex: number;
    public getFirstSourceMeasure(): SourceMeasure {
        return this.musicSheet.SourceMeasures[this.StartIndex];
    }
    public getLastSourceMeasure(): SourceMeasure {
        return this.musicSheet.SourceMeasures[this.EndIndex];
    }
}