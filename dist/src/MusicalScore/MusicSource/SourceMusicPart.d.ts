import { PartListEntry } from "./PartListEntry";
import { Repetition } from "./Repetition";
import { Fraction } from "../../Common/DataObjects/fraction";
import { MusicSheet } from "../MusicSheet";
export declare class SourceMusicPart extends PartListEntry {
    constructor(musicSheet: MusicSheet, startIndex?: number, endIndex?: number);
    protected parentRepetition: Repetition;
    MeasuresCount: number;
    StartIndex: number;
    EndIndex: number;
    ParentRepetition: Repetition;
    AbsoluteTimestamp: Fraction;
    setStartIndex(startIndex: number): void;
    setEndIndex(index: number): void;
}
