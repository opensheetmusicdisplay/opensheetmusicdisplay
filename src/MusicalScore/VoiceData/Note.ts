export class Note {
    constructor(voiceEntry: VoiceEntry, parentStaffEntry: SourceStaffEntry, length: Fraction, pitch: Pitch) {
        this.voiceEntry = voiceEntry;
        this.parentStaffEntry = parentStaffEntry;
        this.length = length;
        this.pitch = pitch;
        if (pitch != null)
            this.HalfTone = pitch.getHalfTone();
        else this.HalfTone = 0;
    }
    private voiceEntry: VoiceEntry;
    private parentStaffEntry: SourceStaffEntry;
    private length: Fraction;
    private pitch: Pitch;
    private beam: Beam;
    private tuplet: Tuplet;
    private tie: Tie;
    private slurs: List<Slur> = new List<Slur>();
    private graceNoteSlash: boolean = false;
    private playbackInstrumentId: string = null;
    public get GraceNoteSlash(): boolean {
        return this.graceNoteSlash;
    }
    public set GraceNoteSlash(value: boolean) {
        this.graceNoteSlash = value;
    }
    public get ParentVoiceEntry(): VoiceEntry {
        return this.voiceEntry;
    }
    public set ParentVoiceEntry(value: VoiceEntry) {
        this.voiceEntry = value;
    }
    public get ParentStaffEntry(): SourceStaffEntry {
        return this.parentStaffEntry;
    }
    public get ParentStaff(): Staff {
        return this.parentStaffEntry.ParentStaff;
    }
    public get Length(): Fraction {
        return this.length;
    }
    public set Length(value: Fraction) {
        this.length = value;
    }
    public get Pitch(): Pitch {
        return this.pitch;
    }
    public HalfTone: number;
    public get NoteBeam(): Beam {
        return this.beam;
    }
    public set NoteBeam(value: Beam) {
        this.beam = value;
    }
    public get NoteTuplet(): Tuplet {
        return this.tuplet;
    }
    public set NoteTuplet(value: Tuplet) {
        this.tuplet = value;
    }
    public get NoteTie(): Tie {
        return this.tie;
    }
    public set NoteTie(value: Tie) {
        this.tie = value;
    }
    public get NoteSlurs(): List<Slur> {
        return this.slurs;
    }
    public set NoteSlurs(value: List<Slur>) {
        this.slurs = value;
    }
    public State: NoteState;
    public get PlaybackInstrumentId(): string {
        return this.playbackInstrumentId;
    }
    public set PlaybackInstrumentId(value: string) {
        this.playbackInstrumentId = value;
    }
    public calculateNoteLengthWithoutTie(): Fraction {
        var withoutTieLength: Fraction = new Fraction(this.length);
        if (this.tie != null) {
            var tempLength: Fraction = new Fraction(this.length);
            for (var idx: number = 0, len = this.tie.Fractions.Count; idx < len; ++idx) {
                var fraction: Fraction = this.tie.Fractions[idx];
                tempLength.Sub(fraction);
            }
            withoutTieLength = tempLength;
        }
        return withoutTieLength;
    }
    public calculateNoteOriginalLength(): Fraction {
        return this.calculateNoteOriginalLength(new Fraction(this.length));
    }
    public calculateNoteOriginalLength(originalLength: Fraction): Fraction {
        if (this.tie != null)
            originalLength = this.calculateNoteLengthWithoutTie();
        if (this.tuplet != null)
            return this.length;
        if (originalLength.Numerator > 1) {
            var exp: number = <number>Math.Log(originalLength.Denominator, 2) - this.calculateNumberOfNeededDots(originalLength);
            originalLength.Denominator = <number>Math.Pow(2, exp);
            originalLength.Numerator = 1;
        }
        return originalLength;
    }
    public calculateNoteLengthWithDots(): Fraction {
        if (this.tie != null)
            return this.calculateNoteLengthWithoutTie();
        return this.length;
    }
    public calculateNumberOfNeededDots(): number {
        return this.calculateNumberOfNeededDots(this.length);
    }
    public calculateNumberOfNeededDots(fraction: Fraction): number {
        var number: number = 1;
        var product: number = 2;
        if (this.tuplet == null) {
            while (product < fraction.Numerator) {
                number++;
                product = <number>Math.Pow(2, number);
            }
        }
        return number - 1;
    }
    public ToString(): string {
        if (this.pitch != null)
            return this.Pitch.ToString() + ", length: " + this.Length.ToString();
        else return "rest note, length: " + this.Length.ToString();
    }
    public getAbsoluteTimestamp(): Fraction {
        var absolute: Fraction = new Fraction(this.voiceEntry.Timestamp);
        absolute += this.parentStaffEntry.VerticalContainerParent.ParentMeasure.AbsoluteTimestamp;
        return absolute;
    }
    public checkForDoubleSlur(slur: Slur): boolean {
        for (var idx: number = 0, len = this.slurs.Count; idx < len; ++idx) {
            var noteSlur: Slur = this.slurs[idx];
            if (noteSlur.StartNote != null && noteSlur.EndNote != null && slur.StartNote != null && slur.StartNote == noteSlur.StartNote && noteSlur.EndNote == this)
                return true;
        }
        return false;
    }
}
export module Note {
    export enum Appearance {
        Normal,

        Grace,

        Cue
    }
}