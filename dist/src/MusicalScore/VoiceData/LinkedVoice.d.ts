import { Voice } from "./Voice";
import { Instrument } from "../Instrument";
export declare class LinkedVoice extends Voice {
    constructor(parent: Instrument, voiceId: number, master: Voice);
    private master;
    Master: Voice;
}
