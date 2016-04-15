export class VerticalSourceStaffEntryContainer {
    constructor(parentMeasure: SourceMeasure, timestamp: Fraction, size: number) {
        this.timestamp = timestamp;
        this.size = size;
        this.initialize();
        this.parentMeasure = parentMeasure;
    }
    private timestamp: Fraction;
    private size: number;
    private staffEntries: List<SourceStaffEntry> = new List<SourceStaffEntry>();
    private comments: List<Comment> = new List<Comment>();
    private parentMeasure: SourceMeasure;
    public get Timestamp(): Fraction {
        return this.timestamp;
    }
    public set Timestamp(value: Fraction) {
        this.timestamp = value;
    }
    public get StaffEntries(): List<SourceStaffEntry> {
        return this.staffEntries;
    }
    public set StaffEntries(value: List<SourceStaffEntry>) {
        this.staffEntries = value;
    }
    public get Comments(): List<Comment> {
        return this.comments;
    }
    public set Comments(value: List<Comment>) {
        this.comments = value;
    }
    public get ParentMeasure(): SourceMeasure {
        return this.parentMeasure;
    }
    public set ParentMeasure(value: SourceMeasure) {
        this.parentMeasure = value;
    }
    public getAbsoluteTimestamp(): Fraction {
        return new Fraction(this.timestamp + this.parentMeasure.AbsoluteTimestamp);
    }
    private initialize(): void {
        for (var i: number = 0; i < this.size; i++)
            this.staffEntries.Add(null);
    }
    public $get$(index: number): SourceStaffEntry {
        return this.staffEntries[index];
    }
    public $set$(index: number, value: SourceStaffEntry): void {
        this.staffEntries[index] = value;
    }
}