import {Instrument} from "./Instrument";
import {MidiInstrument} from "./VoiceData/Instructions/ClefInstruction";

export class SubInstrument {
    constructor(parentInstrument: Instrument) {
        this.parentInstrument = parentInstrument;
        this.fixedKey = -1;
        this.name = this.parseMidiInstrument(this.parentInstrument.Name);
        this.midiInstrumentID = SubInstrument.midiInstrument[this.name];
        this.volume = 1.0;
    }
    private static midiInstrument: { [key: string]: MidiInstrument; } = {
        "cello": MidiInstrument.Cello,
        "violon-c": MidiInstrument.Cello,
        "contrabass": MidiInstrument.Contrabass,
        "kontrabass": MidiInstrument.Contrabass,
        "clarinet": MidiInstrument.Clarinet,
        "klarinette": MidiInstrument.Clarinet,
        "flute": MidiInstrument.Flute,
        "fl�te": MidiInstrument.Flute,
        "frenchhorn": MidiInstrument.French_Horn,
        "guitar": MidiInstrument.Acoustic_Guitar_nylon,
        "gitarre": MidiInstrument.Acoustic_Guitar_nylon,
        "harp": MidiInstrument.Orchestral_Harp,
        "harfe": MidiInstrument.Orchestral_Harp,
        "oboe": MidiInstrument.Oboe,
        "organ": MidiInstrument.Church_Organ,
        "orgue": MidiInstrument.Church_Organ,
        "orgel": MidiInstrument.Church_Organ,
        "piano": MidiInstrument.Acoustic_Grand_Piano,
        "klavier": MidiInstrument.Acoustic_Grand_Piano,
        "piccolo": MidiInstrument.Piccolo,
        "strings": MidiInstrument.String_Ensemble_1,
        "streicher": MidiInstrument.String_Ensemble_1,
        "steeldrum": MidiInstrument.Steel_Drums,
        "trombone": MidiInstrument.Trombone,
        "posaune": MidiInstrument.Trombone,
        "brass": MidiInstrument.Trombone,
        "trumpet": MidiInstrument.Trumpet,
        "trompete": MidiInstrument.Trumpet,
        "tpt": MidiInstrument.Trumpet,
        "tuba": MidiInstrument.Tuba,
        "sax": MidiInstrument.Tenor_Sax,
        "viola": MidiInstrument.Viola,
        "bratsche": MidiInstrument.Viola,
        "violin": MidiInstrument.Violin,
        "violon.": MidiInstrument.Violin,
        "woodblock": MidiInstrument.Woodblock,
        "alt": MidiInstrument.Synth_Voice,
        "alto": MidiInstrument.Synth_Voice,
        "tenor": MidiInstrument.Synth_Voice,
        "bariton": MidiInstrument.Synth_Voice,
        "baritone": MidiInstrument.Synth_Voice,
        "bass": MidiInstrument.Synth_Voice,
        "sopran": MidiInstrument.Synth_Voice,
        "voice": MidiInstrument.Synth_Voice,
        "recorder": MidiInstrument.Recorder,
        "blockfl�te": MidiInstrument.Recorder,
        "banjo": MidiInstrument.Banjo,
        "drums": MidiInstrument.Percussion,
        "percussion": MidiInstrument.Percussion,
        "schlagzeug": MidiInstrument.Percussion,
        "schlagwerk": MidiInstrument.Percussion,
        "unnamed": MidiInstrument.Acoustic_Grand_Piano,
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
            if (instrumentType) {
                let tmpName: string = instrumentType.toLowerCase().trim();
                for (let key in SubInstrument.midiInstrument) {
                    if (tmpName.indexOf(key) !== -1) {
                        return key;
                    }
                }
            }
            if (this.parentInstrument.Name) {
                let tmpName: string = this.parentInstrument.Name.toLowerCase().trim();
                for (let key in SubInstrument.midiInstrument) {
                    if (tmpName.indexOf(key) !== -1) {
                        return key;
                    }
                }
            }
        } catch (e) {
            console.log("Error parsing MIDI Instrument. Default to Grand Piano."); // FIXME
        }
        return "unnamed";
    }
}
