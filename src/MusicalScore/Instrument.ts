export class Instrument extends InstrumentalGroup implements ISettableInstrument, IInstrument {
    constructor(id: number, idString: string, phonicScoreInterface: IPhonicScoreInterface, musicSheet: MusicSheet, parent: InstrumentalGroup) {
        super(musicSheet, parent);
        this.phonicScoreInterface = phonicScoreInterface;
        this.id = id;
        this.idString = idString;
        this.nameLabel = new Label(idString);
    }
    private phonicScoreInterface: IPhonicScoreInterface;
    private voices: List<Voice> = new List<Voice>();
    private staves: List<Staff> = new List<Staff>();
    private nameLabel: Label;
    private range: ToneRange;
    private idString: string;
    private id: number;
    private hasLyrics: boolean = false;
    private hasChordSymbols: boolean = false;
    private playbackTranspose: number = 0;
    private lyricVersesNumbers: List<number> = new List<number>();
    private subInstruments: List<SubInstrument> = new List<SubInstrument>();
    public get Voices(): List<Voice> {
        return this.voices;
    }
    public get Staves(): List<Staff> {
        return this.staves;
    }
    public get NameLabel(): Label {
        return this.nameLabel;
    }
    public get HasLyrics(): boolean {
        return this.hasLyrics;
    }
    public set HasLyrics(value: boolean) {
        this.hasLyrics = value;
    }
    public get HasChordSymbols(): boolean {
        return this.hasChordSymbols;
    }
    public set HasChordSymbols(value: boolean) {
        this.hasChordSymbols = value;
    }
    public get LyricVersesNumbers(): List<number> {
        return this.lyricVersesNumbers;
    }
    public set LyricVersesNumbers(value: List<number>) {
        this.lyricVersesNumbers = value;
    }
    public get Name(): string {
        return this.nameLabel.Text;
    }
    public set Name(value: string) {
        this.nameLabel.Text = value;
    }
    public set PhonicScoreInterface(value: IPhonicScoreInterface) {
        this.phonicScoreInterface = value;
    }
    public get IdString(): string {
        return this.idString;
    }
    public get Id(): number {
        return this.id;
    }
    public get MidiInstrumentId(): MidiInstrument {
        return this.subInstruments[0].MidiInstrumentId;
    }
    public set MidiInstrumentId(value: MidiInstrument) {
        this.subInstruments[0].MidiInstrumentId = value;
    }
    public get Volume(): number {
        return this.subInstruments[0].Volume;
    }
    public set Volume(value: number) {
        for (var idx: number = 0, len = this.subInstruments.Count; idx < len; ++idx) {
            var subInstrument: SubInstrument = this.subInstruments[idx];
            subInstrument.Volume = value;
        }
    }
    public get PlaybackTranspose(): number {
        return this.playbackTranspose;
    }
    public set PlaybackTranspose(value: number) {
        this.playbackTranspose = value;
    }
    public Highlight: boolean;
    public get SubInstruments(): List<SubInstrument> {
        return this.subInstruments;
    }
    public getSubInstrument(subInstrumentIdString: string): SubInstrument {
        for (var idx: number = 0, len = this.subInstruments.Count; idx < len; ++idx) {
            var subInstrument: SubInstrument = this.subInstruments[idx];
            if (subInstrument.IdString == subInstrumentIdString) {
                return subInstrument;
            }
        }
        return null;
    }
    public get Visible(): boolean {
        if (this.voices.Count > 0)
            return this.Voices[0].Visible;
        else return false;
    }
    public set Visible(value: boolean) {
        for (var idx: number = 0, len = this.Voices.Count; idx < len; ++idx) {
            var v: Voice = this.Voices[idx];
            v.Visible = value;
        }
    }
    public get Audible(): boolean {
        var result: boolean = false;
        for (var idx: number = 0, len = this.Voices.Count; idx < len; ++idx) {
            var v: Voice = this.Voices[idx];
            result = result || v.Audible;
        }
        return result;
    }
    public set Audible(value: boolean) {
        for (var idx: number = 0, len = this.Voices.Count; idx < len; ++idx) {
            var v: Voice = this.Voices[idx];
            v.Audible = value;
        }
        for (var idx: number = 0, len = this.staves.Count; idx < len; ++idx) {
            var staff: Staff = this.staves[idx];
            staff.Audible = value;
        }
    }
    public get Following(): boolean {
        var result: boolean = false;
        for (var idx: number = 0, len = this.Voices.Count; idx < len; ++idx) {
            var v: Voice = this.Voices[idx];
            result = result || v.Following;
        }
        return result;
    }
    public set Following(value: boolean) {
        for (var idx: number = 0, len = this.Voices.Count; idx < len; ++idx) {
            var v: Voice = this.Voices[idx];
            v.Following = value;
        }
        for (var idx: number = 0, len = this.staves.Count; idx < len; ++idx) {
            var staff: Staff = this.staves[idx];
            staff.Following = value;
        }
    }
    public SetVoiceAudible(voiceId: number, audible: boolean): void {
        for (var idx: number = 0, len = this.Voices.Count; idx < len; ++idx) {
            var v: Voice = this.Voices[idx];
            if (v.VoiceId == voiceId) {
                v.Audible = audible;
                break;
            }
        }
    }
    public SetVoiceFollowing(voiceId: number, following: boolean): void {
        for (var idx: number = 0, len = this.Voices.Count; idx < len; ++idx) {
            var v: Voice = this.Voices[idx];
            if (v.VoiceId == voiceId) {
                v.Following = following;
                break;
            }
        }
    }
    public SetStaffAudible(staffId: number, audible: boolean): void {
        var staff: Staff = this.staves[staffId - 1];
        staff.Audible = audible;
        if (audible) {
            for (var idx: number = 0, len = staff.Voices.Count; idx < len; ++idx) {
                var v: Voice = staff.Voices[idx];
                v.Audible = true;
            }
        }
        else {
            for (var idx: number = 0, len = staff.Voices.Count; idx < len; ++idx) {
                var voice: Voice = staff.Voices[idx];
                var isAudibleInOtherStaves: boolean = false;
                for (var idx2: number = 0, len2 = this.Staves.Count; idx2 < len2; ++idx2) {
                    var st: Staff = this.Staves[idx2];
                    if (st.Id == staffId || !st.Audible)
                        continue;
                    for (var idx3: number = 0, len3 = st.Voices.Count; idx3 < len3; ++idx3) {
                        var v: Voice = st.Voices[idx3];
                        if (v == voice)
                            isAudibleInOtherStaves = true;
                    }
                }
                if (!isAudibleInOtherStaves)
                    voice.Audible = false;
            }
        }
    }
    public SetStaffFollow(staffId: number, follow: boolean): void {
        var staff: Staff = this.staves[staffId - 1];
        staff.Following = follow;
        if (follow) {
            for (var idx: number = 0, len = staff.Voices.Count; idx < len; ++idx) {
                var v: Voice = staff.Voices[idx];
                v.Following = true;
            }
        }
        else {
            for (var idx: number = 0, len = staff.Voices.Count; idx < len; ++idx) {
                var voice: Voice = staff.Voices[idx];
                var isFollowingInOtherStaves: boolean = false;
                for (var idx2: number = 0, len2 = this.Staves.Count; idx2 < len2; ++idx2) {
                    var st: Staff = this.Staves[idx2];
                    if (st.Id == staffId || !st.Following)
                        continue;
                    for (var idx3: number = 0, len3 = st.Voices.Count; idx3 < len3; ++idx3) {
                        var v: Voice = st.Voices[idx3];
                        if (v == voice)
                            isFollowingInOtherStaves = true;
                    }
                }
                if (!isFollowingInOtherStaves)
                    voice.Following = false;
            }
        }
    }
    public areAllVoiceVisible(): boolean {
        var counter: number = 0;
        for (var idx: number = 0, len = this.Voices.Count; idx < len; ++idx) {
            var voice: Voice = this.Voices[idx];
            if (voice.Visible)
                counter++;
        }
        if (counter == this.voices.Count)
            return true;
        return false;
    }
    public createStaves(numberOfStaves: number): void {
        for (var i: number = 0; i < numberOfStaves; i++) {
            var staff: Staff = new Staff(this, i + 1);
            this.staves.Add(staff);
        }
    }
    public SetInstrumentParameter(parameter: InstrumentParameters, value: Object): void {
        this.phonicScoreInterface.RequestInstrumentParameter(this.Id, parameter, value);
    }
    public InstrumentParameterChanged: InstrumentParameterChangedDelegate;
    public Dispose(): void {
        this.InstrumentParameterChanged = null;
    }
}