import { InstrumentalGroup } from "./InstrumentalGroup";
import { Label } from "./Label";
import { MusicSheet } from "./MusicSheet"
import { Voice } from "./VoiceData/Voice"
import { Staff } from "./VoiceData/Staff"
import { SubInstrument } from "./SubInstrument"

// FIXME
type IPhonicScoreInterface = any;
type MidiInstrument = any;
type InstrumentParameters = any;
type InstrumentParameterChangedDelegate = any;


export class Instrument extends InstrumentalGroup /*implements ISettableInstrument, IInstrument*/ {
    constructor(id: number, idString: string, phonicScoreInterface: IPhonicScoreInterface, musicSheet: MusicSheet, parent: InstrumentalGroup) {
        super(undefined, musicSheet, parent);
        this.phonicScoreInterface = phonicScoreInterface;
        this.id = id;
        this.idString = idString;
        this.nameLabel = new Label(idString);
    }

    public Transpose: number = 0;
    public Highlight: boolean;
    public InstrumentParameterChanged: InstrumentParameterChangedDelegate;

    private phonicScoreInterface: IPhonicScoreInterface;
    private voices: Voice[] = new Array();
    private staves: Staff[] = new Array();
    private nameLabel: Label;
    // private range: ToneRange;
    private idString: string;
    private id: number;
    private hasLyrics: boolean = false;
    private hasChordSymbols: boolean = false;
    private playbackTranspose: number;

    private lyricVersesNumbers: number[] = new Array();
    private subInstruments: SubInstrument[] = new Array();
    public get Voices(): Voice[] {
        return this.voices;
    }
    public get Staves(): Staff[] {
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
    public get LyricVersesNumbers(): number[] {
        return this.lyricVersesNumbers;
    }
    public set LyricVersesNumbers(value: number[]) {
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
        for (let idx: number = 0, len: number = this.subInstruments.length; idx < len; ++idx) {
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

    public get SubInstruments(): SubInstrument[] {
        return this.subInstruments;
    }
    public getSubInstrument(subInstrumentIdString: string): SubInstrument {
        for (let idx: number = 0, len: number = this.subInstruments.length; idx < len; ++idx) {
            let subInstrument: SubInstrument = this.subInstruments[idx];
            if (subInstrument.IdString === subInstrumentIdString) {
                return subInstrument;
            }
        }
        return undefined;
    }
    public get Visible(): boolean {
        if (this.voices.length > 0) {
            return this.Voices[0].Visible;
        } else {
            return false;
        }
    }
    public set Visible(value: boolean) {
        for (let idx: number = 0, len: number = this.Voices.length; idx < len; ++idx) {
            let v: Voice = this.Voices[idx];
            v.Visible = value;
        }
    }
    public get Audible(): boolean {
        let result: boolean = false;
        for (let idx: number = 0, len: number = this.Voices.length; idx < len; ++idx) {
            let v: Voice = this.Voices[idx];
            result = result || v.Audible;
        }
        return result;
    }
    public set Audible(value: boolean) {
        for (let idx: number = 0, len: number = this.Voices.length; idx < len; ++idx) {
            let v: Voice = this.Voices[idx];
            v.Audible = value;
        }
        for (let idx: number = 0, len: number = this.staves.length; idx < len; ++idx) {
            let staff: Staff = this.staves[idx];
            staff.Audible = value;
        }
    }
    public get Following(): boolean {
        let result: boolean = false;
        for (let idx: number = 0, len: number = this.Voices.length; idx < len; ++idx) {
            let v: Voice = this.Voices[idx];
            result = result || v.Following;
        }
        return result;
    }
    public set Following(value: boolean) {
        for (let idx: number = 0, len: number = this.Voices.length; idx < len; ++idx) {
            let v: Voice = this.Voices[idx];
            v.Following = value;
        }
        for (let idx: number = 0, len: number = this.staves.length; idx < len; ++idx) {
            let staff: Staff = this.staves[idx];
            staff.Following = value;
        }
    }
    public SetVoiceAudible(voiceId: number, audible: boolean): void {
        for (let idx: number = 0, len: number = this.Voices.length; idx < len; ++idx) {
            let v: Voice = this.Voices[idx];
            if (v.VoiceId === voiceId) {
                v.Audible = audible;
                break;
            }
        }
    }
    public SetVoiceFollowing(voiceId: number, following: boolean): void {
        for (let idx: number = 0, len: number = this.Voices.length; idx < len; ++idx) {
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
            for (let idx: number = 0, len: number = staff.Voices.length; idx < len; ++idx) {
                let v: Voice = staff.Voices[idx];
                v.Audible = true;
            }
        } else {
            for (let idx: number = 0, len: number = staff.Voices.length; idx < len; ++idx) {
                let voice: Voice = staff.Voices[idx];
                let isAudibleInOtherStaves: boolean = false;
                for (let idx2: number = 0, len2: number = this.Staves.length; idx2 < len2; ++idx2) {
                    let st: Staff = this.Staves[idx2];
                    if (st.Id === staffId || !st.Audible) { continue; }
                    for (let idx3: number = 0, len3: number = st.Voices.length; idx3 < len3; ++idx3) {
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
            for (let idx: number = 0, len: number = staff.Voices.length; idx < len; ++idx) {
                let v: Voice = staff.Voices[idx];
                v.Following = true;
            }
        } else {
            for (let idx: number = 0, len: number = staff.Voices.length; idx < len; ++idx) {
                let voice: Voice = staff.Voices[idx];
                let isFollowingInOtherStaves: boolean = false;
                for (let idx2: number = 0, len2: number = this.Staves.length; idx2 < len2; ++idx2) {
                    let st: Staff = this.Staves[idx2];
                    if (st.Id === staffId || !st.Following) { continue; }
                    for (let idx3: number = 0, len3: number = st.Voices.length; idx3 < len3; ++idx3) {
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
        for (let voice of this.Voices) {
            if (!voice.Visible) {
                return false;
            }
        }
        return true;
    }
    public createStaves(numberOfStaves: number): void {
        for (let i: number = 0; i < numberOfStaves; i++) {
            this.staves.push(new Staff(this, i + 1));
        }
    }
    public SetInstrumentParameter(parameter: InstrumentParameters, value: Object): void {
        this.phonicScoreInterface.RequestInstrumentParameter(this.Id, parameter, value);
    }

    public Dispose(): void {
        this.InstrumentParameterChanged = undefined;
    }
}
