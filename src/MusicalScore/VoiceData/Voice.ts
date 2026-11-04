import {Instrument} from "../Instrument";
import {VoiceEntry} from "./VoiceEntry";

/**
 * A [[Voice]] contains all the [[VoiceEntry]]s in a voice in a [[StaffLine]].
 */
export class Voice {

    private voiceEntries: VoiceEntry[] = [];
    private parent: Instrument;
    private visible: boolean;
    private audible: boolean;
    private following: boolean;
    /**
     * The Id given in the MusicXMl file to distinguish the different voices. It is unique per instrument.
     */
    private voiceId: number;
    private volume: number = 1;

    constructor(parent: Instrument, voiceId: number) {
        this.parent = parent;
        this.visible = true;
        this.audible = true;
        this.following = true;
        this.voiceId = voiceId;
    }

    public get VoiceEntries(): VoiceEntry[] {
        return this.voiceEntries;
    }
    public get Parent(): Instrument {
        return this.parent;
    }
    /** Whether the voice is drawn. The notes of a hidden voice aren't drawn, and the cursor skips them. By default, the other voices
     *  are laid out as if it weren't there: their stems by pitch where they are alone now, the spacing from the visible notes only.
     *  Its lyrics are drawn under the visible notes that start at the same time on its staff, e.g. a hymn's lyrics, given with the
     *  soprano, under the alto. See EngravingRules.HiddenVoicesKeepLayout and RenderLyricsOfHiddenVoices.
     *  An instrument whose voices are all hidden is hidden (Instrument.Visible). A staff whose voices are all hidden is drawn empty,
     *  unless it's hidden too (Staff.Visible).
     *  osmd.render() applies a change without osmd.updateGraphic().
     */
    public get Visible(): boolean {
        return this.visible;
    }
    public set Visible(value: boolean) {
        this.visible = value;
    }
    /** Whether the voice is hidden (Visible false) in an instrument that is shown (Instrument.Visible, another voice visible):
     *  then its notes aren't drawn on the instrument's staves (see Note.isVisible()), and by default not laid out either.
     *  The voices of a hidden instrument aren't, as the instrument is left out as a whole.
     */
    public isHiddenInShownInstrument(): boolean {
        return !this.visible && this.parent?.Visible === true;
    }
    public get Audible(): boolean {
        return this.audible;
    }
    public set Audible(value: boolean) {
        this.audible = value;
    }
    public get Following(): boolean {
        return this.following;
    }
    public set Following(value: boolean) {
        this.following = value;
    }
    public get VoiceId(): number {
        return this.voiceId;
    }
    public get Volume(): number {
        return this.volume;
    }
    public set Volume(value: number) {
        this.volume = value;
    }

}
