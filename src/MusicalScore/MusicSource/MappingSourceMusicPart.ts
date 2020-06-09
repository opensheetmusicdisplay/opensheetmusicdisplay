import {SourceMusicPart} from "./SourceMusicPart";
import {Fraction} from "../../Common/DataObjects/Fraction";
import {Repetition} from "./Repetition";
import {PartListEntry} from "./PartListEntry";

export class MappingSourceMusicPart /* implements IComparable, IComparable<MappingSourceMusicPart>*/ {
    constructor(
        sourceMusicPart: SourceMusicPart, startTimestamp: Fraction, parentPartListEntry?: Repetition,
        repetitionRun: number = -1, isEnding: boolean = false
    ) {
        this.sourceMusicPart = sourceMusicPart;
        this.parentPartListEntry = parentPartListEntry;
        this.startTimestamp = startTimestamp.clone();
        this.repetitionRun = repetitionRun;
        this.parentRepetition = parentPartListEntry;
        this.isEnding = isEnding;
    }

    private sourceMusicPart: SourceMusicPart;
    private parentRepetition: Repetition;
    private parentPartListEntry: PartListEntry;
    private startTimestamp: Fraction;
    private repetitionRun: number = -1;
    private isEnding: boolean;

    public get IsRepetition(): boolean {
        return this.parentRepetition !== undefined;
    }
    public get IsEnding(): boolean {
        return this.isEnding;
    }
    public get IsLastRepetitionRun(): boolean {
        return this.IsRepetition && (this.repetitionRun + 1 === this.parentRepetition.UserNumberOfRepetitions);
    }
    public get RepetitionRun(): number {
        return this.repetitionRun;
    }
    public get ParentPartListEntry(): PartListEntry {
        return this.parentPartListEntry;
    }
    public get SourceMusicPart(): SourceMusicPart {
        return this.sourceMusicPart;
    }
    public get StartTimestamp(): Fraction {
        return this.startTimestamp;
    }
    public CompareTo(comp: MappingSourceMusicPart): number {
        //let comp: MappingSourceMusicPart = <MappingSourceMusicPart>(obj, MappingSourceMusicPart);
        if (comp) {
            return this.startTimestamp.CompareTo(comp.startTimestamp);
        } else { return 1; }
    }
    //public CompareTo(other: MappingSourceMusicPart): number {
    //    return this.CompareTo(<Object>other);
    //}
}
