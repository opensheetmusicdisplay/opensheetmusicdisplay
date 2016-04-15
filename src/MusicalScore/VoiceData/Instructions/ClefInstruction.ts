import {Pitch} from "../../../Common/DataObjects/pitch";

export class ClefInstruction extends AbstractNotationInstruction {
    constructor(clefType: ClefEnum, octaveOffset: number, line: number) {
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
    public OperatorEquals(clef2: ClefInstruction): boolean {
        var clef1 = this;
        if (ReferenceEquals(clef1, clef2)) {
            return true;
        }
        if ((<Object>clef1 == null) || (<Object>clef2 == null)) {
            return false;
        }
        return (clef1.ClefPitch == clef2.ClefPitch && clef1.Line == clef2.Line);
    }

    public OperatorNotEqual(clef2: ClefInstruction): boolean {
        var clef1 = this;
        return !(clef1 == clef2);
    }

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
    public static getAllPossibleClefs(): List<ClefInstruction> {
        var clefList: List<ClefInstruction> = new List<ClefInstruction>();
        for (var i: number = 0; i <= 2; i++) {
            var clefInstructionG: ClefInstruction = new ClefInstruction(ClefEnum.G, i, 2);
            clefList.Add(clefInstructionG);
        }
        for (var i: number = -2; i <= 0; i++) {
            var clefInstructionF: ClefInstruction = new ClefInstruction(ClefEnum.F, i, 4);
            clefList.Add(clefInstructionF);
        }
        return clefList;
    }
    public static isSupportedClef(clef: ClefEnum): boolean {
        switch (clef) {
            case ClefEnum.G:
            case ClefEnum.F:
            case ClefEnum.C:
            case ClefEnum.percussion:
                return true;
            default:
                return false;
        }
    }
    public ToString(): string {
        return "ClefType: " + this.clefType.ToString();
    }
    private calcParameters(): void {
        switch (this.clefType) {
            case ClefEnum.G:
                this.clefPitch = new Pitch(NoteEnum.G, <number>(1 + this.octaveOffset), AccidentalEnum.NONE);
                this.referenceCyPosition = (5 - this.line) + 2;
                break;
            case ClefEnum.F:
                this.clefPitch = new Pitch(NoteEnum.F, <number>(0 + this.octaveOffset), AccidentalEnum.NONE);
                this.referenceCyPosition = (5 - this.line) + 1.5f;
                break;
            case ClefEnum.C:
                this.clefPitch = new Pitch(NoteEnum.C, <number>(1 + this.octaveOffset), AccidentalEnum.NONE);
                this.referenceCyPosition = (5 - this.line);
                break;
            case ClefEnum.percussion:
                this.clefPitch = new Pitch(NoteEnum.C, 2, AccidentalEnum.NONE);
                this.referenceCyPosition = 2;
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