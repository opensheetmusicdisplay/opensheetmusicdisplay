export class SubInstrument {
    constructor(parentInstrument: Instrument) {
        this.parentInstrument = parentInstrument;
        this.FixedKey = -1;
        this.MidiInstrumentId = parseMidiInstrument(this.parentInstrument.Name);
        this.Name = this.MidiInstrumentId.ToString();
        this.Volume = 1f;
    }
    private static midiInstrument: Dictionary<string, MidiInstrument> = __init(new Dictionary<string, MidiInstrument>(), { { "cello",MidiInstrument.Cello },
        { "violon-c",MidiInstrument.Cello },
        { "contrabass",MidiInstrument.Contrabass },
        { "kontrabass",MidiInstrument.Contrabass },
        { "clarinet",MidiInstrument.Clarinet },
        { "klarinette",MidiInstrument.Clarinet },
        { "flute",MidiInstrument.Flute },
        { "flöte",MidiInstrument.Flute },
        { "frenchhorn",MidiInstrument.French_Horn },
        { "guitar",MidiInstrument.Acoustic_Guitar_nylon },
        { "gitarre",MidiInstrument.Acoustic_Guitar_nylon },
        { "harp",MidiInstrument.Orchestral_Harp },
        { "harfe",MidiInstrument.Orchestral_Harp },
        { "oboe",MidiInstrument.Oboe },
        { "organ",MidiInstrument.Church_Organ },
        { "orgue",MidiInstrument.Church_Organ },
        { "orgel",MidiInstrument.Church_Organ },
        { "piano",MidiInstrument.Acoustic_Grand_Piano },
        { "klavier",MidiInstrument.Acoustic_Grand_Piano },
        { "piccolo",MidiInstrument.Piccolo },
        { "strings",MidiInstrument.String_Ensemble_1 },
        { "streicher",MidiInstrument.String_Ensemble_1 },
        { "steeldrum",MidiInstrument.Steel_Drums },
        { "trombone",MidiInstrument.Trombone },
        { "posaune",MidiInstrument.Trombone },
        { "brass",MidiInstrument.Trombone },
        { "trumpet",MidiInstrument.Trumpet },
        { "trompete",MidiInstrument.Trumpet },
        { "tpt",MidiInstrument.Trumpet },
        { "tuba",MidiInstrument.Tuba },
        { "sax",MidiInstrument.Tenor_Sax },
        { "viola",MidiInstrument.Viola },
        { "bratsche",MidiInstrument.Viola },
        { "violin",MidiInstrument.Violin },
        { "violon.",MidiInstrument.Violin },
        { "woodblock",MidiInstrument.Woodblock },
        { "alt",MidiInstrument.Synth_Voice },
        { "alto",MidiInstrument.Synth_Voice },
        { "tenor",MidiInstrument.Synth_Voice },
        { "bariton",MidiInstrument.Synth_Voice },
        { "baritone",MidiInstrument.Synth_Voice },
        { "bass",MidiInstrument.Synth_Voice },
        { "sopran",MidiInstrument.Synth_Voice },
        { "voice",MidiInstrument.Synth_Voice },
        { "recorder",MidiInstrument.Recorder },
        { "blockflöte",MidiInstrument.Recorder },
        { "banjo",MidiInstrument.Banjo },
        { "drums",MidiInstrument.Percussion },
        { "percussion",MidiInstrument.Percussion },
        { "schlagzeug",MidiInstrument.Percussion },
        { "schlagwerk",MidiInstrument.Percussion },
        { "unnamed",MidiInstrument.Acoustic_Grand_Piano } });
 public IdString: string;
 public MidiInstrumentId: MidiInstrument;
 public Volume: number;
 public Pan: number;
 public FixedKey: number;
 public Name: string;
private parentInstrument: Instrument;
public get ParentInstrument(): Instrument
{
    return this.parentInstrument;
}
public static isPianoInstrument(instrument:MidiInstrument): boolean
{
    if (instrument == MidiInstrument.Acoustic_Grand_Piano || instrument == MidiInstrument.Bright_Acoustic_Piano || instrument == MidiInstrument.Electric_Grand_Piano || instrument == MidiInstrument.Electric_Piano_1 || instrument == MidiInstrument.Electric_Piano_2)
        return true;
    return false;
}
public setMidiInstrument(instrumentType:string): void
    {
        this.MidiInstrumentId = this.parseMidiInstrument(instrumentType);
    }
private parseMidiInstrument(instrumentType:string): MidiInstrument
{
    try {
        if (!string.IsNullOrEmpty(instrumentType)) {
            var tmpName: string = instrumentType.ToLower().Trim();
            var midiInstrumentArr: KeyValuePair<string, MidiInstrument>[] = SubInstrument.midiInstrument.ToArray();
            for (var idx: number = 0, len = midiInstrumentArr.length; idx < len; ++idx) {
                var keyValuePair: KeyValuePair<string, MidiInstrument> = midiInstrumentArr[idx];
                if (tmpName.Contains(keyValuePair.Key))
                    return keyValuePair.Value;
            }
        }
        if (!string.IsNullOrEmpty(this.parentInstrument.Name)) {
            var tmpName: string = this.parentInstrument.Name.ToLower().Trim();
            var midiInstrumentArr: KeyValuePair<string, MidiInstrument>[] = SubInstrument.midiInstrument.ToArray();
            for (var idx: number = 0, len = midiInstrumentArr.length; idx < len; ++idx) {
                var keyValuePair: KeyValuePair<string, MidiInstrument> = midiInstrumentArr[idx];
                if (tmpName.Contains(keyValuePair.Key))
                    return keyValuePair.Value;
            }
        }
        return MidiInstrument.Acoustic_Grand_Piano;
    }
    catch (e) {
        return MidiInstrument.Acoustic_Grand_Piano;
    }

} 
                }