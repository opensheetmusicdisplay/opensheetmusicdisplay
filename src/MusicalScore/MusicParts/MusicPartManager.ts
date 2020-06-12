import { MusicSheet } from "../MusicSheet";
import { PartListEntry } from "../MusicSource/PartListEntry";
import { Repetition } from "../MusicSource/Repetition";
import { Fraction } from "../../Common/DataObjects/Fraction";
import { MusicPartManagerIterator } from "./MusicPartManagerIterator";

export class MusicPartManager /*implements ISelectionListener*/ {
    constructor(musicSheet: MusicSheet) {
        this.musicSheet = musicSheet;
    }
    private parts: PartListEntry[];
    private timestamps: TimestampTransform[];
    private musicSheet: MusicSheet;
    private sheetStart: Fraction;
    private sheetEnd: Fraction;

    /**
     * This method is called from CoreContainer when the user changes a Repetitions's userNumberOfRepetitions.
     */
    public reInit(): void {
        this.init();
    }

    /**
     * Main initialize method for MusicPartManager.
     */
    public init(): void {
        this.parts = this.musicSheet.Repetitions.slice(); // slice=arrayCopy
        this.sheetStart = this.musicSheet.SelectionStart = new Fraction(0, 1);
        this.sheetEnd = this.musicSheet.SelectionEnd = this.musicSheet.SheetEndTimestamp;
        this.calcMapping();
    }
    public getCurrentRepetitionTimestampTransform(curEnrolledTimestamp: Fraction): TimestampTransform {
        let curTransform: TimestampTransform = undefined;
        for (let i: number = this.timestamps.length - 1; i >= 0; i--) {
            curTransform = this.timestamps[i];
            if (curEnrolledTimestamp.gte(curTransform.$from)) {
                return curTransform;
            }
        }
        return this.timestamps[0];
    }
    public absoluteEnrolledToSheetTimestamp(timestamp: Fraction): Fraction {
        if (this.timestamps.length === 0) {
            return timestamp;
        }
        const transform: TimestampTransform = this.getCurrentRepetitionTimestampTransform(timestamp);
        return Fraction.plus(timestamp, Fraction.minus(transform.to, transform.$from)); // FIXME
    }
    public get Parts(): PartListEntry[] {
        return this.parts;
    }
    public get MusicSheet(): MusicSheet {
        return this.musicSheet;
    }
    public getIterator(start?: Fraction): MusicPartManagerIterator {
        if (!start) {
          return new MusicPartManagerIterator(this, this.musicSheet.SelectionStart, this.musicSheet.SelectionEnd);
        }
        return new MusicPartManagerIterator(this, start, undefined);
    }
    public setSelectionStart(beginning: Fraction): void {
        this.musicSheet.SelectionStart = beginning;
        this.musicSheet.SelectionEnd = undefined;
    }
    public setSelectionRange(start: Fraction, end: Fraction): void {
        this.musicSheet.SelectionStart = start ?? this.sheetStart;
        this.musicSheet.SelectionEnd = end ?? this.sheetEnd;
    }
    private calcMapping(): void {
        const timestamps: TimestampTransform[] = [];
        const iterator: MusicPartManagerIterator = this.getIterator();
        let currentRepetition: Repetition = iterator.CurrentRepetition;
        let curTimestampTransform: TimestampTransform = new TimestampTransform(
            iterator.CurrentEnrolledTimestamp.clone(),
            iterator.CurrentSourceTimestamp.clone(),
            undefined,
            0
        );
        timestamps.push(curTimestampTransform);
        while (!iterator.EndReached) {
            if (iterator.JumpOccurred || currentRepetition !== iterator.CurrentRepetition) {
                currentRepetition = iterator.CurrentRepetition;
                // if we are still in the same repetition but in a different repetition run, we remember
                // that we have to jump backwards at this position
                if (iterator.backJumpOccurred) {
                    const jumpRep: Repetition = iterator.JumpResponsibleRepetition;
                    curTimestampTransform.nextBackJump = iterator.CurrentEnrolledTimestamp;
                    curTimestampTransform.curRepetition = jumpRep;
                    curTimestampTransform.curRepetitionIteration = iterator.CurrentJumpResponsibleRepetitionIterationBeforeJump;
                    for (let i: number = this.timestamps.length - 2; i >= 0; i--) {
                        if (timestamps[i].to.lt(jumpRep.AbsoluteTimestamp) || timestamps[i].curRepetition) {
                            break;
                        }
                        timestamps[i].nextBackJump = curTimestampTransform.nextBackJump;
                        timestamps[i].curRepetition = jumpRep;
                        timestamps[i].curRepetitionIteration = curTimestampTransform.curRepetitionIteration;
                    }
                }
                curTimestampTransform = new TimestampTransform(
                    iterator.CurrentEnrolledTimestamp.clone(),
                    iterator.CurrentSourceTimestamp.clone(),
                    undefined,
                    0
                );
                timestamps.push(curTimestampTransform);
            }
            iterator.moveToNext();
        }
        this.timestamps = timestamps;
    }
}


export class TimestampTransform {
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
