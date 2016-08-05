import {MusicSheet} from "../MusicSheet";
import {Fraction} from "../../Common/DataObjects/Fraction";
import {SourceMeasure} from "../VoiceData/SourceMeasure";

export abstract class PartListEntry {
    constructor(musicSheet: MusicSheet) {
        this.musicSheet = musicSheet;
    }

    public absoluteTimestamp: Fraction;
    public startIndex: number;
    public endIndex: number;

    protected enrolledTimestamps: Fraction[] = [];
    protected visible: boolean = true;
    protected musicSheet: MusicSheet;

    public get Visible(): boolean {
        return this.visible;
    }
    public set Visible(value: boolean) {
        this.visible = value;
    }
    public getFirstSourceMeasure(): SourceMeasure {
        return this.musicSheet.SourceMeasures[this.startIndex];
    }
    public getLastSourceMeasure(): SourceMeasure {
        return this.musicSheet.SourceMeasures[this.endIndex];
    }
}
