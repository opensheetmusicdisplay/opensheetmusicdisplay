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
     * Does what init() does again. Call it after changing how often a repetition is played (Repetition.UserNumberOfRepetitions,
     * e.g. with MusicSheet.setRepetitionNewUserNumberOfRepetitions()), so that the mapping between enrolled and sheet timestamps
     * follows the new order of the measures.
     */
    public reInit(): void {
        this.init();
    }

    /**
     * Main initialize method for MusicPartManager, called by MusicSheetReader when it has read a sheet:
     * copies the sheet's repetitions into Parts, sets the selection to the whole sheet (MusicSheet.SelectionStart and SelectionEnd,
     * which the cursor sets to the measures it draws when it's reset), and calculates the mapping between enrolled and sheet
     * timestamps (see absoluteEnrolledToSheetTimestamp()) by iterating through the sheet.
     */
    public init(): void {
        this.parts = this.musicSheet.Repetitions.slice(); // slice=arrayCopy
        this.sheetStart = this.musicSheet.SelectionStart = new Fraction(0, 1);
        this.sheetEnd = this.musicSheet.SelectionEnd = this.musicSheet.SheetEndTimestamp;
        this.calcMapping();
    }
    /**
     * Returns the transform for the part of the enrolled time line that an enrolled timestamp is in. A part starts at each jump of
     * the playback, e.g. back to the start of a repeat or forward over an ending, and where a repetition starts.
     * In the part, the sheet timestamp is the enrolled timestamp + (to - $from).
     * @param curEnrolledTimestamp An enrolled timestamp, e.g. MusicPartManagerIterator.CurrentEnrolledTimestamp.
     */
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
    /**
     * Returns the sheet timestamp of an enrolled timestamp. The enrolled timestamp is the time on the time line with the
     * repetitions played out (like MusicPartManagerIterator.CurrentEnrolledTimestamp), the sheet timestamp the position in the
     * sheet (like CurrentSourceTimestamp): in the second pass of a repeat, the sheet timestamp is earlier by the length of the
     * first pass.
     * @param timestamp An enrolled timestamp.
     */
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
            return new MusicPartManagerIterator(this.musicSheet, this.musicSheet.SelectionStart, this.musicSheet.SelectionEnd);
        }
        return new MusicPartManagerIterator(this.musicSheet, start, undefined);
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
                    // note: must use the local timestamps array here - this.timestamps is only assigned
                    //   at the end of this method, so it is undefined during the first init()
                    //   (which crashed init() for any sheet with a backwards repetition jump)
                    for (let i: number = timestamps.length - 2; i >= 0; i--) {
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


/**
 * The start of a part of the enrolled time line (see MusicPartManager.getCurrentRepetitionTimestampTransform()):
 * $from is the enrolled timestamp where the part starts, to the sheet timestamp there.
 */
export class TimestampTransform {
    constructor(enrolledTimestamp: Fraction, sheetTimestamp: Fraction, repetition: Repetition, curRepetitionIteration: number) {
        this.$from = enrolledTimestamp;
        this.to = sheetTimestamp;
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
