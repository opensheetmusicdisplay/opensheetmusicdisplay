import { MusicSheet } from "../MusicSheet"
import { PartListEntry } from "../MusicSource/PartListEntry"
import { Repetition } from "../MusicSource/Repetition"
import { Fraction } from "../../Common/DataObjects/fraction"
import { MusicPartManagerIterator } from "./MusicPartManagerIterator"

type TimestampTransform = any;

export class MusicPartManager /*implements ISelectionListener*/ {
    constructor(musicSheet: MusicSheet) {
        this.musicSheet = musicSheet;
    }
    private parts: PartListEntry[];
    private timestamps: TimestampTransform[];
    private musicSheet: MusicSheet;
    private sheetStart: Fraction;
    private sheetEnd: Fraction;
    public reInit(): void {
        this.init();
    }
    public init(): void {
        this.parts = this.musicSheet.Repetitions.slice();
        this.sheetStart = this.musicSheet.SelectionStart = new Fraction(0, 1);
        this.sheetEnd = this.musicSheet.SelectionEnd = this.musicSheet.SheetEndTimestamp;
        this.calcMapping();
    }
    public getCurrentRepetitionTimestampTransform(curEnrolledTimestamp: Fraction): TimestampTransform {
        let curTransform: TimestampTransform = undefined;
        for (let i: number = this.timestamps.length - 1; i >= 0; i--) {
            curTransform = this.timestamps[i];
            if (curEnrolledTimestamp >= curTransform.$from) {
                return curTransform;
            }
        }
        return this.timestamps[0];
    }
    public absoluteEnrolledToSheetTimestamp(timestamp: Fraction): Fraction {
        if (this.timestamps.length === 0) {
            return timestamp;
        }
        let transform: TimestampTransform = this.getCurrentRepetitionTimestampTransform(timestamp);
        return Fraction.plus(timestamp, <any>(transform.to - transform.$from)); // FIXME
    }
    public get Parts(): PartListEntry[] {
        return this.parts;
    }
    public get MusicSheet(): MusicSheet {
        return this.musicSheet;
    }
    public getIterator(start?: Fraction): MusicPartManagerIterator {
        if (start === undefined) {
          return new MusicPartManagerIterator(this, this.musicSheet.SelectionStart, this.musicSheet.SelectionEnd);
        }
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
        this.timestamps = new Array();
        let iterator: MusicPartManagerIterator = this.getIterator();
        let currentRepetition: Repetition = iterator.CurrentRepetition;
        let curTimestampTransform: TimestampTransform = new TimestampTransform(
            new Fraction(iterator.CurrentEnrolledTimestamp),
            new Fraction(iterator.CurrentSourceTimestamp),
            undefined,
            0,
        );
        this.timestamps.push(curTimestampTransform);
        while (!iterator.EndReached) {
            if (iterator.JumpOccurred || currentRepetition !== iterator.CurrentRepetition) {
                currentRepetition = iterator.CurrentRepetition;
                if (iterator.BackJumpOccurred) {
                    let jumpRep: Repetition = iterator.JumpResponsibleRepetition;
                    curTimestampTransform.nextBackJump = iterator.CurrentEnrolledTimestamp;
                    curTimestampTransform.curRepetition = jumpRep;
                    curTimestampTransform.curRepetitionIteration = iterator.CurrentJumpResponsibleRepetitionIterationBeforeJump;
                    for (let i: number = this.timestamps.length - 2; i >= 0; i--) {
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
                this.timestamps.push(curTimestampTransform);
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
