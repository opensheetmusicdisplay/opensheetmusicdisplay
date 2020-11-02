import { Note } from "./Note";
import { Fraction } from "../../Common/DataObjects/Fraction";
import { VoiceEntry } from "./VoiceEntry";
import { SourceStaffEntry } from "./SourceStaffEntry";
import { Pitch } from "../../Common/DataObjects/Pitch";
import { SourceMeasure } from "./SourceMeasure";

export class TabNote extends Note {
    constructor(voiceEntry: VoiceEntry, parentStaffEntry: SourceStaffEntry, length: Fraction, pitch: Pitch, sourceMeasure: SourceMeasure,
                stringNumber: number, fretNumber: number, bendArray: { bendalter: number, direction: string }[],
                vibratoStroke: boolean) {
        super(voiceEntry, parentStaffEntry, length, pitch, sourceMeasure);
        this.stringNumber = stringNumber;
        this.fretNumber = fretNumber;
        this.bendArray = bendArray;
        this.vibratoStroke = vibratoStroke;
    }

    private stringNumber: number;
    private fretNumber: number;
    private bendArray: { bendalter: number, direction: string }[];
    private vibratoStroke: boolean;

    public get StringNumber(): number {
        return this.stringNumber;
    }

    public get FretNumber(): number {
        return this.fretNumber;
    }

    public get BendArray(): { bendalter: number, direction: string }[] {
        return this.bendArray;
    }

    public get VibratoStroke(): boolean {
        return this.vibratoStroke;
    }
}
