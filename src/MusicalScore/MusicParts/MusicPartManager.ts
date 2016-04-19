export class MusicPartManager implements ISelectionListener {
    constructor(musicSheet: MusicSheet) {
        this.musicSheet = musicSheet;
    }
    private parts: List<PartListEntry>;
    private timestamps: List<TimestampTransform>;
    private musicSheet: MusicSheet;
    private sheetStart: Fraction;
    private sheetEnd: Fraction;
    public reInit(): void {
        this.init();
    }
    public init(): void {
        this.parts = new List<PartListEntry>(this.musicSheet.Repetitions.ToArray());
        this.sheetStart = this.musicSheet.SelectionStart = new Fraction(0, 1);
        this.sheetEnd = this.musicSheet.SelectionEnd = this.musicSheet.SheetEndTimestamp;
        this.calcMapping();
    }
    public getCurrentRepetitionTimestampTransform(curEnrolledTimestamp: Fraction): TimestampTransform {
        let curTransform: TimestampTransform = undefined;
        for (let i: number = this.timestamps.Count - 1; i >= 0; i--) {
            curTransform = this.timestamps[i];
            if (curEnrolledTimestamp >= curTransform.$from) {
                return curTransform;
            }
        }
        return this.timestamps[0];
    }
    public absoluteEnrolledToSheetTimestamp(timestamp: Fraction): Fraction {
        if (this.timestamps.Count === 0) {
            return timestamp;
        }
        let transform: TimestampTransform = this.getCurrentRepetitionTimestampTransform(timestamp);
        return timestamp + (transform.to - transform.$from);
    }
    public get Parts(): List<PartListEntry> {
        return this.parts;
    }
    public get MusicSheet(): MusicSheet {
        return this.musicSheet;
    }
    public getIterator(): MusicPartManagerIterator {
        return new MusicPartManagerIterator(this, this.musicSheet.SelectionStart, this.musicSheet.SelectionEnd);
    }
    public getIterator(start: Fraction): MusicPartManagerIterator {
        return new MusicPartManagerIterator(this, start, undefined);
    }
    public setSelectionStart(beginning: Fraction): void {
        this.musicSheet.SelectionStart = beginning;
        this.musicSheet.SelectionEnd = undefined;
    }
    public setSelectionRange(start: Fraction, end: Fraction): void {
        this.musicSheet.SelectionStart = start === undefined ? this.sheetStart : start;
        this.musicSheet.SelectionEnd = end === undefined ? this.sheetEnd : end;
    }
    private calcMapping(): void {
        this.timestamps = new List<TimestampTransform>();
        let iterator: MusicPartManagerIterator = this.getIterator();
        let currentRepetition: Repetition = iterator.CurrentRepetition;
        let curTimestampTransform: TimestampTransform = new TimestampTransform(
            new Fraction(iterator.CurrentEnrolledTimestamp),
            new Fraction(iterator.CurrentSourceTimestamp),
            undefined,
            0,
        );
        this.timestamps.Add(curTimestampTransform);
        while (!iterator.EndReached) {
            if (iterator.JumpOccurred || currentRepetition !== iterator.CurrentRepetition) {
                currentRepetition = iterator.CurrentRepetition;
                if (iterator.BackJumpOccurred) {
                    let jumpRep: Repetition = iterator.JumpResponsibleRepetition;
                    curTimestampTransform.nextBackJump = iterator.CurrentEnrolledTimestamp;
                    curTimestampTransform.curRepetition = jumpRep;
                    curTimestampTransform.curRepetitionIteration = iterator.CurrentJumpResponsibleRepetitionIterationBeforeJump;
                    for (let i: number = this.timestamps.Count - 2; i >= 0; i--) {
                        if (jumpRep.AbsoluteTimestamp > this.timestamps[i].to || this.timestamps[i].curRepetition !== undefined) {
                            break;
                        }
                        this.timestamps[i].nextBackJump = curTimestampTransform.nextBackJump;
                        this.timestamps[i].curRepetition = jumpRep;
                        this.timestamps[i].curRepetitionIteration = curTimestampTransform.curRepetitionIteration;
                    }
                }
                curTimestampTransform = new TimestampTransform(
                    new Fraction(iterator.CurrentEnrolledTimestamp),
                    new Fraction(iterator.CurrentSourceTimestamp),
                    undefined,
                    0,
                );
                this.timestamps.Add(curTimestampTransform);
            }
            iterator.moveToNext();
        }
    }
}

export module MusicPartManager {
    class TimestampTransform {
        constructor(sourceTimestamp: Fraction, enrolledTimestamp: Fraction, repetition: Repetition, curRepetitionIteration: number) {
            this.$from = sourceTimestamp;
            this.to = enrolledTimestamp;
            this.curRepetition = repetition;
            this.curRepetitionIteration = curRepetitionIteration;
            this.nextBackJump = undefined;
            this.nextForwardJump = undefined;
        }
        public $from: Fraction;
        public to: Fraction;
        public nextBackJump: Fraction;
        public nextForwardJump: Fraction;
        public curRepetition: Repetition;
        public curRepetitionIteration: number;
    }
}
