import { MusicSheet } from "../MusicSheet";
import { PartListEntry } from "../MusicSource/PartListEntry";
import { Repetition } from "../MusicSource/Repetition";
import { Fraction } from "../../Common/DataObjects/fraction";
import { MusicPartManagerIterator } from "./MusicPartManagerIterator";
export declare class MusicPartManager {
    constructor(musicSheet: MusicSheet);
    private parts;
    private timestamps;
    private musicSheet;
    private sheetStart;
    private sheetEnd;
    reInit(): void;
    init(): void;
    getCurrentRepetitionTimestampTransform(curEnrolledTimestamp: Fraction): TimestampTransform;
    absoluteEnrolledToSheetTimestamp(timestamp: Fraction): Fraction;
    Parts: PartListEntry[];
    MusicSheet: MusicSheet;
    getIterator(start?: Fraction): MusicPartManagerIterator;
    setSelectionStart(beginning: Fraction): void;
    setSelectionRange(start: Fraction, end: Fraction): void;
    private calcMapping();
}
export declare class TimestampTransform {
    constructor(sourceTimestamp: Fraction, enrolledTimestamp: Fraction, repetition: Repetition, curRepetitionIteration: number);
    $from: Fraction;
    to: Fraction;
    nextBackJump: Fraction;
    nextForwardJump: Fraction;
    curRepetition: Repetition;
    curRepetitionIteration: number;
}
