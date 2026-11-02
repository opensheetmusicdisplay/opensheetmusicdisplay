import { Note } from "./Note";
import { Fraction } from "../../Common/DataObjects/Fraction";
import { VoiceEntry } from "./VoiceEntry";
import { SourceStaffEntry } from "./SourceStaffEntry";
import { Pitch } from "../../Common/DataObjects/Pitch";
import { SourceMeasure } from "./SourceMeasure";

/** One bend movement, measured in semitones rather than fret numbers. */
export interface TabBendSegment {
    bendalter: number;
    direction: string;
    preBend?: boolean;
}

export class TabNote extends Note {
    constructor(voiceEntry: VoiceEntry, parentStaffEntry: SourceStaffEntry, length: Fraction, pitch: Pitch, sourceMeasure: SourceMeasure,
                stringNumber: number, fretNumber: number, bendArray: TabBendSegment[]) {
        super(voiceEntry, parentStaffEntry, length, pitch, sourceMeasure);
        this.stringNumberTab = stringNumber;
        this.fretNumber = fretNumber;
        this.bendArray = bendArray;
    }

    public FretVisible: boolean = true;
    public FretParentheses: boolean = false;

    private stringNumberTab: number; // there can also be string numbers for e.g. violin in treble clef.
    private fretNumber: number;
    private bendArray: TabBendSegment[];

    /** Returns the string number the note should be played on. Note there can also be violin string numbers in treble clef. */
    public get StringNumberTab(): number {
        return this.stringNumberTab;
    }

    public get FretNumber(): number {
        return this.fretNumber;
    }

    public get BendArray(): TabBendSegment[] {
        return this.bendArray;
    }

    public hasTabEffects(): boolean {
        return this.bendArray?.length > 0;
        // || this.vibratoStroke // vibratoStroke is handled by wavy-line (difference to public OSMD)
    }

    // handled by wavy-line
    // public get VibratoStroke(): boolean {
    //     return this.vibratoStroke;
    // }
}
