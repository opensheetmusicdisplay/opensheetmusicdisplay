import {Pitch} from "../../../Common/DataObjects/Pitch";
import {AbstractNotationInstruction} from "./AbstractNotationInstruction";
import {NoteEnum} from "../../../Common/DataObjects/Pitch";
import {AccidentalEnum} from "../../../Common/DataObjects/Pitch";
import {ArgumentOutOfRangeException} from "../../Exceptions";

/**
 * A [[ClefInstruction]] is the clef placed at the beginning of the stave, which indicates the pitch of the notes.
 */
export class ClefInstruction extends AbstractNotationInstruction {
    constructor(clefType: ClefEnum = ClefEnum.G, octaveOffset: number = 0, line: number = 2) {
        super(undefined); // FIXME? Missing SourceStaffEntry!
        this.line = line;
        this.clefType = clefType;
        this.octaveOffset = octaveOffset;
        this.calcParameters();
    }

    private clefType: ClefEnum = ClefEnum.G;
    private line: number = 2;
    private octaveOffset: number = 0;
    private clefPitch: Pitch;
    private referenceCyPosition: number;

    public static getDefaultClefFromMidiInstrument(instrument: MidiInstrument): ClefInstruction {
        switch (instrument) {
            case MidiInstrument.Acoustic_Grand_Piano:
                return new ClefInstruction(ClefEnum.F, 0, 4);
            case MidiInstrument.Electric_Bass_finger:
                return new ClefInstruction(ClefEnum.F, 0, 4);
            case MidiInstrument.Electric_Bass_pick:
                return new ClefInstruction(ClefEnum.F, 0, 4);
            case MidiInstrument.Fretless_Bass:
                return new ClefInstruction(ClefEnum.F, 0, 4);
            case MidiInstrument.Slap_Bass_1:
                return new ClefInstruction(ClefEnum.F, 0, 4);
            case MidiInstrument.Slap_Bass_2:
                return new ClefInstruction(ClefEnum.F, 0, 4);
            case MidiInstrument.Synth_Bass_1:
                return new ClefInstruction(ClefEnum.F, 0, 4);
            case MidiInstrument.Synth_Bass_2:
                return new ClefInstruction(ClefEnum.F, 0, 4);
            case MidiInstrument.Contrabass:
                return new ClefInstruction(ClefEnum.F, 0, 4);
            default:
                return new ClefInstruction(ClefEnum.G, 0, 2);
        }
    }

    public static getAllPossibleClefs(): ClefInstruction[] {
        const clefList: ClefInstruction[] = [];
        for (let i: number = 0; i <= 2; i++) {
            const clefInstructionG: ClefInstruction = new ClefInstruction(ClefEnum.G, i, 2);
            clefList.push(clefInstructionG);
        }
        for (let j: number = -2; j <= 0; j++) {
            const clefInstructionF: ClefInstruction = new ClefInstruction(ClefEnum.F, j, 4);
            clefList.push(clefInstructionF);
        }
        return clefList;
    }

    public static isSupportedClef(clef: ClefEnum): boolean {
        switch (clef) {
            case ClefEnum.G:
            case ClefEnum.F:
            case ClefEnum.C:
            case ClefEnum.percussion:
            case ClefEnum.TAB:
                return true;
            default:
                return false;
        }
    }

    public get ClefType(): ClefEnum {
        return this.clefType;
    }

    public set ClefType(value: ClefEnum) {
        this.clefType = value;
    }

    public get Line(): number {
        return this.line;
    }

    public set Line(value: number) {
        this.line = value;
    }

    public get OctaveOffset(): number {
        return this.octaveOffset;
    }

    public set OctaveOffset(value: number) {
        this.octaveOffset = value;
    }

    public get ClefPitch(): Pitch {
        return this.clefPitch;
    }

    public set ClefPitch(value: Pitch) {
        this.clefPitch = value;
    }

    public get ReferenceCyPosition(): number {
        return this.referenceCyPosition;
    }

    public set ReferenceCyPosition(value: number) {
        this.referenceCyPosition = value;
    }

    public Equals(other: ClefInstruction): boolean {
        if (this === other) {
            return true;
        }
        if (!this || !other) {
            return false;
        }
        return (this.clefPitch === other.clefPitch && this.Line === other.Line);
    }

    public NotEqual(clef2: ClefInstruction): boolean {
        return !this.Equals(clef2);
    }

    public ToString(): string {
        return "ClefType: " + this.clefType;
    }

    private calcParameters(): void {
        switch (this.clefType) {
            case ClefEnum.G:
                this.clefPitch = new Pitch(NoteEnum.G, 1 + this.octaveOffset, AccidentalEnum.NONE);
                this.referenceCyPosition = (5 - this.line) + 2;
                break;
            case ClefEnum.F:
                this.clefPitch = new Pitch(NoteEnum.F, 0 + this.octaveOffset, AccidentalEnum.NONE);
                this.referenceCyPosition = (5 - this.line) + 1.5;
                break;
            case ClefEnum.C:
                this.clefPitch = new Pitch(NoteEnum.C, 1 + this.octaveOffset, AccidentalEnum.NONE);
                this.referenceCyPosition = (5 - this.line);
                break;
            case ClefEnum.percussion:
                this.clefPitch = new Pitch(NoteEnum.C, 2, AccidentalEnum.NONE);
                this.referenceCyPosition = 2;
                break;
            case ClefEnum.TAB:
                this.clefPitch = new Pitch(NoteEnum.G, 0, AccidentalEnum.NONE);
                this.referenceCyPosition = 0;
                break;
            default:
                throw new ArgumentOutOfRangeException("clefType");
        }
    }
}

export enum ClefEnum {
    G = 0,
    F = 1,
    C = 2,
    percussion = 3,
    TAB = 4
}


export enum MidiInstrument {
    None = -1,
    Acoustic_Grand_Piano,
    Bright_Acoustic_Piano,
    Electric_Grand_Piano,
    Honky_tonk_Piano,
    Electric_Piano_1,
    Electric_Piano_2,
    Harpsichord,
    Clavinet,
    Celesta,
    Glockenspiel,
    Music_Box,
    Vibraphone,
    Marimba,
    Xylophone,
    Tubular_Bells,
    Dulcimer,
    Drawbar_Organ,
    Percussive_Organ,
    Rock_Organ,
    Church_Organ,
    Reed_Organ,
    Accordion,
    Harmonica,
    Tango_Accordion,
    Acoustic_Guitar_nylon,
    Acoustic_Guitar_steel,
    Electric_Guitar_jazz,
    Electric_Guitar_clean,
    Electric_Guitar_muted,
    Overdriven_Guitar,
    Distortion_Guitar,
    Guitar_harmonics,
    Acoustic_Bass,
    Electric_Bass_finger,
    Electric_Bass_pick,
    Fretless_Bass,
    Slap_Bass_1,
    Slap_Bass_2,
    Synth_Bass_1,
    Synth_Bass_2,
    Violin,
    Viola,
    Cello,
    Contrabass,
    Tremolo_Strings,
    Pizzicato_Strings,
    Orchestral_Harp,
    Timpani,
    String_Ensemble_1,
    String_Ensemble_2,
    Synth_Strings_1,
    Synth_Strings_2,
    Choir_Aahs,
    Voice_Oohs,
    Synth_Voice,
    Orchestra_Hit,
    Trumpet,
    Trombone,
    Tuba,
    Muted_Trumpet,
    French_Horn,
    Brass_Section,
    Synth_Brass_1,
    Synth_Brass_2,
    Soprano_Sax,
    Alto_Sax,
    Tenor_Sax,
    Baritone_Sax,
    Oboe,
    English_Horn,
    Bassoon,
    Clarinet,
    Piccolo,
    Flute,
    Recorder,
    Pan_Flute,
    Blown_Bottle,
    Shakuhachi,
    Whistle,
    Ocarina,
    Lead_1_square,
    Lead_2_sawtooth,
    Lead_3_calliope,
    Lead_4_chiff,
    Lead_5_charang,
    Lead_6_voice,
    Lead_7_fifths,
    Lead_8_bass_lead,
    Pad_1_new_age,
    Pad_2_warm,
    Pad_3_polysynth,
    Pad_4_choir,
    Pad_5_bowed,
    Pad_6_metallic,
    Pad_7_halo,
    Pad_8_sweep,
    FX_1_rain,
    FX_2_soundtrack,
    FX_3_crystal,
    FX_4_atmosphere,
    FX_5_brightness,
    FX_6_goblins,
    FX_7_echoes,
    FX_8_scifi,
    Sitar,
    Banjo,
    Shamisen,
    Koto,
    Kalimba,
    Bag_pipe,
    Fiddle,
    Shanai,
    Tinkle_Bell,
    Agogo,
    Steel_Drums,
    Woodblock,
    Taiko_Drum,
    Melodic_Tom,
    Synth_Drum,
    Reverse_Cymbal,
    Guitar_Fret_Noise,
    Breath_Noise,
    Seashore,
    Bird_Tweet,
    Telephone_Ring,
    Helicopter,
    Applause,
    Gunshot,
    Percussion = 128
}
