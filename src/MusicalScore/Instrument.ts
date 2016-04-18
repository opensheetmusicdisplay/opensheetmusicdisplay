export class Instrument extends InstrumentalGroup implements ISettableInstrument, IInstrument {
    constructor(id: number, idString: string, phonicScoreInterface: IPhonicScoreInterface, musicSheet: MusicSheet, parent: InstrumentalGroup) {
        super(musicSheet, parent);
        this.phonicScoreInterface = phonicScoreInterface;
        this.id = id;
        this.idString = idString;
        this.nameLabel = new Label(idString);
    }

    public Transpose: number = 0;
    public Highlight: boolean;
    public InstrumentParameterChanged: InstrumentParameterChangedDelegate;

    private phonicScoreInterface: IPhonicScoreInterface;
    private voices: List<Voice> = new List<Voice>();
    private staves: List<Staff> = new List<Staff>();
    private nameLabel: Label;
    // private range: ToneRange;
    private idString: string;
    private id: number;
    private hasLyrics: boolean = false;
    private hasChordSymbols: boolean = false;
    // private playback

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
        for (let idx: number = 0, len: number = this.subInstruments.Count; idx < len; ++idx) {
            let subInstrument: SubInstrument = this.subInstruments[idx];
            subInstrument.Volume = value;
        }
    }
    public get PlaybackTranspose(): number {
        return this.playbackTranspose;
    }
    public set PlaybackTranspose(value: number) {
        this.playbackTranspose = value;
    }

    public get SubInstruments(): List<SubInstrument> {
        return this.subInstruments;
    }
    public getSubInstrument(subInstrumentIdString: string): SubInstrument {
        for (let idx: number = 0, len: number = this.subInstruments.Count; idx < len; ++idx) {
            let subInstrument: SubInstrument = this.subInstruments[idx];
            if (subInstrument.IdString === subInstrumentIdString) {
                return subInstrument;
            }
        }
        return undefined;
    }
    public get Visible(): boolean {
        if (this.voices.Count > 0) {
            return this.Voices[0].Visible;
        } else {
            return false;
        }
    }
    public set Visible(value: boolean) {
        for (let idx: number = 0, len: number = this.Voices.Count; idx < len; ++idx) {
            let v: Voice = this.Voices[idx];
            v.Visible = value;
        }
    }
    public get Audible(): boolean {
        let result: boolean = false;
        for (let idx: number = 0, len: number = this.Voices.Count; idx < len; ++idx) {
            let v: Voice = this.Voices[idx];
            result = result || v.Audible;
        }
        return result;
    }
    public set Audible(value: boolean) {
        for (let idx: number = 0, len: number = this.Voices.Count; idx < len; ++idx) {
            let v: Voice = this.Voices[idx];
            v.Audible = value;
        }
        for (let idx: number = 0, len: number = this.staves.Count; idx < len; ++idx) {
            let staff: Staff = this.staves[idx];
            staff.Audible = value;
        }
    }
    public get Following(): boolean {
        let result: boolean = false;
        for (let idx: number = 0, len: number = this.Voices.Count; idx < len; ++idx) {
            let v: Voice = this.Voices[idx];
            result = result || v.Following;
        }
        return result;
    }
    public set Following(value: boolean) {
        for (let idx: number = 0, len: number = this.Voices.Count; idx < len; ++idx) {
            let v: Voice = this.Voices[idx];
            v.Following = value;
        }
        for (let idx: number = 0, len: number = this.staves.Count; idx < len; ++idx) {
            let staff: Staff = this.staves[idx];
            staff.Following = value;
        }
    }
    public SetVoiceAudible(voiceId: number, audible: boolean): void {
        for (let idx: number = 0, len: number = this.Voices.Count; idx < len; ++idx) {
            let v: Voice = this.Voices[idx];
            if (v.VoiceId === voiceId) {
                v.Audible = audible;
                break;
            }
        }
    }
    public SetVoiceFollowing(voiceId: number, following: boolean): void {
        for (let idx: number = 0, len: number = this.Voices.Count; idx < len; ++idx) {
            let v: Voice = this.Voices[idx];
            if (v.VoiceId === voiceId) {
                v.Following = following;
                break;
            }
        }
    }
    public SetStaffAudible(staffId: number, audible: boolean): void {
        let staff: Staff = this.staves[staffId - 1];
        staff.Audible = audible;
        if (audible) {
            for (let idx: number = 0, len: number = staff.Voices.Count; idx < len; ++idx) {
                let v: Voice = staff.Voices[idx];
                v.Audible = true;
            }
        } else {
            for (let idx: number = 0, len: number = staff.Voices.Count; idx < len; ++idx) {
                let voice: Voice = staff.Voices[idx];
                let isAudibleInOtherStaves: boolean = false;
                for (let idx2: number = 0, len2: number = this.Staves.Count; idx2 < len2; ++idx2) {
                    let st: Staff = this.Staves[idx2];
                    if (st.Id === staffId || !st.Audible) { continue; }
                    for (let idx3: number = 0, len3: number = st.Voices.Count; idx3 < len3; ++idx3) {
                        let v: Voice = st.Voices[idx3];
                        if (v === voice) {
                            isAudibleInOtherStaves = true;
                        }
                    }
                }
                if (!isAudibleInOtherStaves) {
                    voice.Audible = false;
                }
            }
        }
    }
    public SetStaffFollow(staffId: number, follow: boolean): void {
        let staff: Staff = this.staves[staffId - 1];
        staff.Following = follow;
        if (follow) {
            for (let idx: number = 0, len: number = staff.Voices.Count; idx < len; ++idx) {
                let v: Voice = staff.Voices[idx];
                v.Following = true;
            }
        } else {
            for (let idx: number = 0, len: number = staff.Voices.Count; idx < len; ++idx) {
                let voice: Voice = staff.Voices[idx];
                let isFollowingInOtherStaves: boolean = false;
                for (let idx2: number = 0, len2: number = this.Staves.Count; idx2 < len2; ++idx2) {
                    let st: Staff = this.Staves[idx2];
                    if (st.Id === staffId || !st.Following) { continue; }
                    for (let idx3: number = 0, len3: number = st.Voices.Count; idx3 < len3; ++idx3) {
                        let v: Voice = st.Voices[idx3];
                        if (v === voice) {
                            isFollowingInOtherStaves = true;
                        }
                    }
                }
                if (!isFollowingInOtherStaves) {
                    voice.Following = false;
                }
            }
        }
    }
    public areAllVoiceVisible(): boolean {
        let counter: number = 0;
        for (let idx: number = 0, len: number = this.Voices.Count; idx < len; ++idx) {
            let voice: Voice = this.Voices[idx];
            if (voice.Visible) {
                counter++;
            }
        }
        if (counter === this.voices.Count) {
            return true;
        }
        return false;
    }
    public createStaves(numberOfStaves: number): void {
        for (let i: number = 0; i < numberOfStaves; i++) {
            let staff: Staff = new Staff(this, i + 1);
            this.staves.Add(staff);
        }
    }
    public SetInstrumentParameter(parameter: InstrumentParameters, value: Object): void {
        this.phonicScoreInterface.RequestInstrumentParameter(this.Id, parameter, value);
    }

    public Dispose(): void {
        this.InstrumentParameterChanged = undefined;
    }
}
