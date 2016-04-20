import {PartListEntry} from "./PartListEntry";
import {Repetition} from "./Repetition";
import {Fraction} from "../../Common/DataObjects/fraction";
import {MusicSheet} from "../MusicSheet";

export class SourceMusicPart extends PartListEntry {
    constructor(musicSheet: MusicSheet, startIndex?: number, endIndex?: number) {
        super(musicSheet);
        this.musicSheet2 = musicSheet;
        this.startIndex = startIndex;
        this.endIndex = endIndex;
    }
    protected musicSheet2: MusicSheet;
    protected parentRepetition: Repetition;
    private startIndex: number;
    private endIndex: number;
    public get MeasuresCount(): number {
        return this.endIndex - this.startIndex + 1;
    }
    public get StartIndex(): number {
        return this.startIndex;
    }
    public get EndIndex(): number {
        return this.endIndex;
    }
    public get ParentRepetition(): Repetition {
        return this.parentRepetition;
    }
    public set ParentRepetition(value: Repetition) {
        this.parentRepetition = value;
    }
    public get AbsoluteTimestamp(): Fraction {
        return Fraction.CreateFractionFromFraction(this.musicSheet2.SourceMeasures[this.startIndex].AbsoluteTimestamp);
    }
    public setStartIndex(startIndex: number): void {
        this.startIndex = startIndex;
    }
    public setEndIndex(index: number): void {
        this.endIndex = index;
    }
}
