import { Instrument } from "../Instrument";
import { VoiceEntry } from "./VoiceEntry";
export declare class Voice {
    private voiceEntries;
    private parent;
    private visible;
    private audible;
    private following;
    private voiceId;
    private volume;
    constructor(parent: Instrument, voiceId: number);
    VoiceEntries: VoiceEntry[];
    Parent: Instrument;
    Visible: boolean;
    Audible: boolean;
    Following: boolean;
    VoiceId: number;
    Volume: number;
}
