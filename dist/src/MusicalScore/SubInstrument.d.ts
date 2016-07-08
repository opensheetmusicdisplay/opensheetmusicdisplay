import { Instrument } from "./Instrument";
import { MidiInstrument } from "./VoiceData/Instructions/ClefInstruction";
export declare class SubInstrument {
    constructor(parentInstrument: Instrument);
    private static midiInstrument;
    idString: string;
    midiInstrumentID: MidiInstrument;
    volume: number;
    pan: number;
    fixedKey: number;
    name: string;
    private parentInstrument;
    ParentInstrument: Instrument;
    static isPianoInstrument(instrument: MidiInstrument): boolean;
    setMidiInstrument(instrumentType: string): void;
    private parseMidiInstrument(instrumentType);
}
