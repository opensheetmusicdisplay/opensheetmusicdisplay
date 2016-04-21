import {Instrument} from "../Instrument";
import {VoiceEntry} from "./VoiceEntry";

export class Voice {
    constructor(parent: Instrument, voiceId: number) {
        this.parent = parent;
        this.visible = true;
        this.audible = true;
        this.following = true;
        this.voiceId = voiceId;
    }
    private voiceEntries: VoiceEntry[] = new Array();
    private parent: Instrument;
    private visible: boolean;
    private audible: boolean;
    private following: boolean;
    private voiceId: number;
    private volume: number = 1;
    public get VoiceEntries(): VoiceEntry[] {
        return this.voiceEntries;
    }
    public get Parent(): Instrument {
        return this.parent;
    }
    public get Visible(): boolean {
        return this.visible;
    }
    public set Visible(value: boolean) {
        this.visible = value;
    }
    public get Audible(): boolean {
        return this.audible;
    }
    public set Audible(value: boolean) {
        this.audible = value;
    }
    public get Following(): boolean {
        return this.following;
    }
    public set Following(value: boolean) {
        this.following = value;
    }
    public get VoiceId(): number {
        return this.voiceId;
    }
    public get Volume(): number {
        return this.volume;
    }
    public set Volume(value: number) {
        this.volume = value;
    }
}
