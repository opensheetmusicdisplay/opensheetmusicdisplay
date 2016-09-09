import {Voice} from "./Voice";
import {Instrument} from "../Instrument";

export class LinkedVoice extends Voice {

    constructor(parent: Instrument, voiceId: number, master: Voice) {
        super(parent, voiceId);
        this.master = master;
    }

    private master: Voice;
    public get Master(): Voice {
        return this.master;
    }

}
