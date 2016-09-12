import {Voice} from "./Voice";
import {Instrument} from "../Instrument";

export class Staff {

    constructor(parentInstrument: Instrument, instrumentStaffId: number) {
        this.parentInstrument = parentInstrument;
        this.id = instrumentStaffId;
        this.audible = true;
        this.following = true;
    }

    public idInMusicSheet: number;
    public audible: boolean;
    public following: boolean;

    private parentInstrument: Instrument;
    private voices: Voice[] = [];
    private volume: number = 1;
    private id: number;

    public get ParentInstrument(): Instrument {
        return this.parentInstrument;
    }
    public set ParentInstrument(value: Instrument) {
        this.parentInstrument = value;
    }
    public get Voices(): Voice[] {
        return this.voices;
    }
    public get Id(): number {
        return this.id;
    }
    public get Volume(): number {
        return this.volume;
    }
    public set Volume(value: number) {
        this.volume = value;
    }

}
