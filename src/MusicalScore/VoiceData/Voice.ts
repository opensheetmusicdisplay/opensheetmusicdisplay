import {Instrument} from "../Instrument";
import {VoiceEntry} from "./VoiceEntry";

/**
 * A [[Voice]] contains all the [[VoiceEntry]]s in a voice in a [[StaffLine]].
 */
export class Voice {

    private voiceEntries: VoiceEntry[] = [];
    private parent: Instrument;
    private visible: boolean;
    private audible: boolean;
    private following: boolean;
    private solo: boolean;
    /**
     * The Id given in the MusicXMl file to distinguish the different voices. It is unique per instrument.
     */
    private voiceId: number;
    private volume: number = 1;
    private uniqueVoiceId: string;

    constructor(parent: Instrument, voiceId: number) {
        this.parent = parent;
        this.visible = true;
        this.audible = true;
        this.following = true;
        this.voiceId = voiceId;

        // This is used for using the Voice as a key in a dictionary:
        this.uniqueVoiceId = "I:" + this.parent.Id + " V: " + this.voiceId;
    }

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
    public get Solo(): boolean {
        return this.solo;
    }
    public set Solo(value: boolean) {
        this.solo = value;
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

    /**
     * This is needed for using the Voice as a key in a dictionary,
     * where a unique identifier is expected.
     */
    public toString(): string {
        return this.uniqueVoiceId;
    }
}
