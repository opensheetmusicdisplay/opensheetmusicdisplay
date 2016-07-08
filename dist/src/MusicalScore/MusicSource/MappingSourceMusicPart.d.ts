import { SourceMusicPart } from "./SourceMusicPart";
import { Fraction } from "../../Common/DataObjects/fraction";
import { Repetition } from "./Repetition";
import { PartListEntry } from "./PartListEntry";
export declare class MappingSourceMusicPart {
    constructor(sourceMusicPart: SourceMusicPart, startTimestamp: Fraction, parentPartListEntry?: Repetition, repetitionRun?: number, isEnding?: boolean);
    private sourceMusicPart;
    private parentRepetition;
    private parentPartListEntry;
    private startTimestamp;
    private repetitionRun;
    private isEnding;
    IsRepetition: boolean;
    IsEnding: boolean;
    IsLastRepetitionRun: boolean;
    RepetitionRun: number;
    ParentPartListEntry: PartListEntry;
    SourceMusicPart: SourceMusicPart;
    StartTimestamp: Fraction;
    CompareTo(comp: MappingSourceMusicPart): number;
}
