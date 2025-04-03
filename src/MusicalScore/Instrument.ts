import { InstrumentalGroup } from "./InstrumentalGroup";
import { Label } from "./Label";
import { MusicSheet } from "./MusicSheet";
import { Voice } from "./VoiceData/Voice";
import { Staff } from "./VoiceData/Staff";
import { SubInstrument } from "./SubInstrument";
import { MidiInstrument } from "./VoiceData/Instructions/ClefInstruction";

export class Instrument extends InstrumentalGroup {

    constructor(id: number, idString: string, musicSheet: MusicSheet, parent: InstrumentalGroup) {
        super(undefined, musicSheet, parent);
        this.id = id;
        this.idString = idString;
        this.nameLabel = new Label(idString);
    }

    /** Transposition halftones for this instrument only.
     *  This is additive to osmd.Sheet.Transpose (MusicSheet).
     *  osmd.TransposeCaculator needs to be defined/created for this to take effect. (just set it with new TransposeCalculator())
     * You need to call osmd.updateGraphic() before the next render() (assuming this is set after load()).
     */
    public Transpose: number = 0;
    public highlight: boolean;

    private voices: Voice[] = [];
    private staves: Staff[] = [];
    private nameLabel: Label;
    private idString: string;
    private id: number;
    private hasLyrics: boolean = false;
    private hasChordSymbols: boolean = false;
    private playbackTranspose: number;

    private lyricVersesNumbers: string[] = [];
    private subInstruments: SubInstrument[] = [];
    private partAbbreviation: string;

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
    public get LyricVersesNumbers(): string[] {
        return this.lyricVersesNumbers;
    }
    public set LyricVersesNumbers(value: string[]) {
        this.lyricVersesNumbers = value;
    }
    public get Name(): string {
        return this.nameLabel.text;
    }
    public set Name(value: string) {
        this.nameLabel.text = value;
    }
    public get IdString(): string {
        return this.idString;
    }
    public get Id(): number {
        return this.id;
    }
    public get MidiInstrumentId(): MidiInstrument {
        return this.subInstruments[0].midiInstrumentID;
    }
    public set MidiInstrumentId(value: MidiInstrument) {
        this.subInstruments[0].midiInstrumentID = value;
    }
    public get Volume(): number {
        return this.subInstruments[0].volume;
    }
    public set Volume(value: number) {
        for (let idx: number = 0, len: number = this.subInstruments.length; idx < len; ++idx) {
            const subInstrument: SubInstrument = this.subInstruments[idx];
            subInstrument.volume = value;
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
            const subInstrument: SubInstrument = this.subInstruments[idx];
            if (subInstrument.idString === subInstrumentIdString) {
                return subInstrument;
            }
        }
        return undefined;
    }
    public get PartAbbreviation(): string {
        return this.partAbbreviation;
    }
    public set PartAbbreviation(value: string) {
        this.partAbbreviation = value;
    }

    public get Visible(): boolean {
        if (this.voices.length > 0) {
            return this.Voices[0].Visible;
        } else {
            return false;
        }
    }
    /** Checks that Instrument.Visible and at least one staff visible. */
    public isVisible(): boolean {
        if (!this.Visible) {
            return false;
        }
        for (const staff of this.Staves) {
            if (staff.Visible) {
                return true; // at least one staff visible
            }
        }
        return false;
    }
    public set Visible(value: boolean) {
        for (let idx: number = 0, len: number = this.Voices.length; idx < len; ++idx) {
            const v: Voice = this.Voices[idx];
            v.Visible = value;
        }
    }
    public get Audible(): boolean {
        let result: boolean = false;
        for (let idx: number = 0, len: number = this.Voices.length; idx < len; ++idx) {
            const v: Voice = this.Voices[idx];
            result = result || v.Audible;
        }
        return result;
    }
    public set Audible(value: boolean) {
        for (let idx: number = 0, len: number = this.Voices.length; idx < len; ++idx) {
            const v: Voice = this.Voices[idx];
            v.Audible = value;
        }
        for (let idx: number = 0, len: number = this.staves.length; idx < len; ++idx) {
            const staff: Staff = this.staves[idx];
            staff.audible = value;
        }
    }
    public get Following(): boolean {
        let result: boolean = false;
        for (let idx: number = 0, len: number = this.Voices.length; idx < len; ++idx) {
            const v: Voice = this.Voices[idx];
            result = result || v.Following;
        }
        return result;
    }
    public set Following(value: boolean) {
        for (let idx: number = 0, len: number = this.Voices.length; idx < len; ++idx) {
            const v: Voice = this.Voices[idx];
            v.Following = value;
        }
        for (let idx: number = 0, len: number = this.staves.length; idx < len; ++idx) {
            const staff: Staff = this.staves[idx];
            staff.following = value;
        }
    }
    public SetVoiceAudible(voiceId: number, audible: boolean): void {
        for (let idx: number = 0, len: number = this.Voices.length; idx < len; ++idx) {
            const v: Voice = this.Voices[idx];
            if (v.VoiceId === voiceId) {
                v.Audible = audible;
                break;
            }
        }
    }
    public SetVoiceFollowing(voiceId: number, following: boolean): void {
        for (let idx: number = 0, len: number = this.Voices.length; idx < len; ++idx) {
            const v: Voice = this.Voices[idx];
            if (v.VoiceId === voiceId) {
                v.Following = following;
                break;
            }
        }
    }
    public SetStaffAudible(staffId: number, audible: boolean): void {
        const staff: Staff = this.staves[staffId - 1];
        staff.audible = audible;
        // hack for now:
        // activate all voices needed so that the staff notes will be played
        if (audible) {
            for (let idx: number = 0, len: number = staff.Voices.length; idx < len; ++idx) {
                const v: Voice = staff.Voices[idx];
                v.Audible = true;
            }
        } else {
            for (let idx: number = 0, len: number = staff.Voices.length; idx < len; ++idx) {
                const voice: Voice = staff.Voices[idx];
                let isAudibleInOtherStaves: boolean = false;
                for (let idx2: number = 0, len2: number = this.Staves.length; idx2 < len2; ++idx2) {
                    const st: Staff = this.Staves[idx2];
                    if (st.Id === staffId || !st.audible) { continue; }
                    for (let idx3: number = 0, len3: number = st.Voices.length; idx3 < len3; ++idx3) {
                        const v: Voice = st.Voices[idx3];
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
        const staff: Staff = this.staves[staffId - 1];
        staff.following = follow;
        if (follow) {
            for (let idx: number = 0, len: number = staff.Voices.length; idx < len; ++idx) {
                const v: Voice = staff.Voices[idx];
                v.Following = true;
            }
        } else {
            for (let idx: number = 0, len: number = staff.Voices.length; idx < len; ++idx) {
                const voice: Voice = staff.Voices[idx];
                let isFollowingInOtherStaves: boolean = false;
                for (let idx2: number = 0, len2: number = this.Staves.length; idx2 < len2; ++idx2) {
                    const st: Staff = this.Staves[idx2];
                    if (st.Id === staffId || !st.following) { continue; }
                    for (let idx3: number = 0, len3: number = st.Voices.length; idx3 < len3; ++idx3) {
                        const v: Voice = st.Voices[idx3];
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
        for (const voice of this.Voices) {
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

    // necessary to be unique for MusicSystem.labels Dictionary
    public toString(): string {
        return `${this.Name} , id: ${this.id}, idstring: ${this.idString}`;
    }
}
