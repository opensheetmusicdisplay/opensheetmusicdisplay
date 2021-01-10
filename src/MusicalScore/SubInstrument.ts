import {Instrument} from "./Instrument";
import {MidiInstrument} from "./VoiceData/Instructions/ClefInstruction";
import log from "loglevel";

export class SubInstrument {

    constructor(parentInstrument: Instrument) {
        this.parentInstrument = parentInstrument;
        this.fixedKey = -1;
        this.name = this.parseMidiInstrument(this.parentInstrument.Name);
        this.midiInstrumentID = SubInstrument.midiInstrument[this.name];
        this.volume = 1.0;
    }

    private static midiInstrument: { [key: string]: MidiInstrument; } = {
        "alt": MidiInstrument.Synth_Voice,
        "alto": MidiInstrument.Synth_Voice,
        "banjo": MidiInstrument.Banjo,
        "bariton": MidiInstrument.Synth_Voice,
        "baritone": MidiInstrument.Synth_Voice,
        "bass": MidiInstrument.Synth_Voice,
        "blockflöte": MidiInstrument.Recorder,
        "brass": MidiInstrument.Trombone,
        "bratsche": MidiInstrument.Viola,
        "cello": MidiInstrument.Cello,
        "clarinet": MidiInstrument.Clarinet,
        "contrabass": MidiInstrument.Contrabass,
        "drums": MidiInstrument.Percussion,
        "flute": MidiInstrument.Flute,
        "flöte": MidiInstrument.Flute,
        "frenchhorn": MidiInstrument.French_Horn,
        "gitarre": MidiInstrument.Acoustic_Guitar_nylon,
        "guitar": MidiInstrument.Acoustic_Guitar_nylon,
        "harfe": MidiInstrument.Orchestral_Harp,
        "harp": MidiInstrument.Orchestral_Harp,
        "klarinette": MidiInstrument.Clarinet,
        "klavier": MidiInstrument.Acoustic_Grand_Piano,
        "kontrabass": MidiInstrument.Contrabass,
        "oboe": MidiInstrument.Oboe,
        "organ": MidiInstrument.Church_Organ,
        "orgel": MidiInstrument.Church_Organ,
        "orgue": MidiInstrument.Church_Organ,
        "percussion": MidiInstrument.Percussion,
        "piano": MidiInstrument.Acoustic_Grand_Piano,
        "piccolo": MidiInstrument.Piccolo,
        "posaune": MidiInstrument.Trombone,
        "recorder": MidiInstrument.Recorder,
        "sax": MidiInstrument.Tenor_Sax,
        "schlagwerk": MidiInstrument.Percussion,
        "schlagzeug": MidiInstrument.Percussion,
        "sopran": MidiInstrument.Synth_Voice,
        "steeldrum": MidiInstrument.Steel_Drums,
        "streicher": MidiInstrument.String_Ensemble_1,
        "strings": MidiInstrument.String_Ensemble_1,
        "tenor": MidiInstrument.Synth_Voice,
        "tpt": MidiInstrument.Trumpet,
        "trombone": MidiInstrument.Trombone,
        "trompete": MidiInstrument.Trumpet,
        "trumpet": MidiInstrument.Trumpet,
        "tuba": MidiInstrument.Tuba,
        "unnamed": MidiInstrument.Acoustic_Grand_Piano,
        "viola": MidiInstrument.Viola,
        "violin": MidiInstrument.Violin,
        "violon-c": MidiInstrument.Cello,
        "violon.": MidiInstrument.Violin,
        "voice": MidiInstrument.Synth_Voice,
        "woodblock": MidiInstrument.Woodblock
    };

    public idString: string;
    public midiInstrumentID: MidiInstrument;
    public volume: number;
    public pan: number;
    public fixedKey: number;
    public name: string;

    private parentInstrument: Instrument;

    public get ParentInstrument(): Instrument {
        return this.parentInstrument;
    }
    public static isPianoInstrument(instrument: MidiInstrument): boolean {
        return (instrument === MidiInstrument.Acoustic_Grand_Piano
          || instrument === MidiInstrument.Bright_Acoustic_Piano
          || instrument === MidiInstrument.Electric_Grand_Piano
          || instrument === MidiInstrument.Electric_Piano_1
          || instrument === MidiInstrument.Electric_Piano_2);
    }
    public setMidiInstrument(instrumentType: string): void {
        this.midiInstrumentID = SubInstrument.midiInstrument[this.parseMidiInstrument(instrumentType)];
    }

    private parseMidiInstrument(instrumentType: string): string {
        // FIXME: test this function
        try {
            // find the best match for the given instrumentType:
            if (instrumentType) {
                const tmpName: string = instrumentType.toLowerCase().trim();
                for (const key in SubInstrument.midiInstrument) {
                    if (tmpName.indexOf(key) !== -1) {
                        return key;
                    }
                }
            }
            // if the instrumentType didn't work, use the name:
            if (this.parentInstrument.Name) {
                const tmpName: string = this.parentInstrument.Name.toLowerCase().trim();
                for (const key in SubInstrument.midiInstrument) {
                    if (tmpName.indexOf(key) !== -1) {
                        return key;
                    }
                }
            }
        } catch (e) {
            log.error("Error parsing MIDI Instrument. Default to Grand Piano.");
        }
        return "unnamed";
    }

}
