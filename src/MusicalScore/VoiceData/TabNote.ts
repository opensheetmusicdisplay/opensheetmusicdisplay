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
}

export class TabNote extends Note {
    constructor(voiceEntry: VoiceEntry, parentStaffEntry: SourceStaffEntry, length: Fraction, pitch: Pitch, sourceMeasure: SourceMeasure,
                stringNumber: number, fretNumber: number, bendArray: TabBendSegment[]) {
        super(voiceEntry, parentStaffEntry, length, pitch, sourceMeasure);
        this.stringNumberTab = stringNumber;
        this.fretNumber = fretNumber;
        this.bendArray = bendArray;
    }

    /** Whether the fret number is drawn: false when the `<notations>` with string and fret have print-object="no",
     *  e.g. for the end note of a bend from MuseScore (see VoiceGenerator). */
    public FretVisible: boolean = true;
    /** Whether the fret number is drawn in parentheses, from `<notehead parentheses="yes">`. */
    public FretParentheses: boolean = false;

    private stringNumberTab: number; // there can also be string numbers for e.g. violin in treble clef.
    private fretNumber: number;
    private bendArray: TabBendSegment[];

    /** Returns the string number the note should be played on. Note there can also be violin string numbers in treble clef. */
    public get StringNumberTab(): number {
        return this.stringNumberTab;
    }

    /** The fret number given in the XML. A transposed sheet draws {@link DisplayedFretNumber}. */
    public get FretNumber(): number {
        return this.fretNumber;
    }

    /** The fret of the transposed note, undefined if the sheet isn't transposed (like Note.TransposedPitch), see TabFretTransposer. */
    public TransposedFretNumber: number;
    /** The string of the transposed note, undefined if the sheet isn't transposed. It's the XML's string (StringNumberTab)
     *  unless the transposed note doesn't fit on that string, see TabFretTransposer. */
    public TransposedStringNumberTab: number;

    /** The fret number that is drawn: the transposed one if the sheet is transposed, otherwise the XML's. */
    public get DisplayedFretNumber(): number {
        return this.TransposedFretNumber ?? this.fretNumber;
    }

    /** The string the fret number is drawn on: the transposed note's if the sheet is transposed, otherwise the XML's. */
    public get DisplayedStringNumberTab(): number {
        return this.TransposedStringNumberTab ?? this.stringNumberTab;
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
