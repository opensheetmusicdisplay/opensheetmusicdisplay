import { Fraction } from "../../Common/DataObjects/Fraction";
import { ITextTranslation } from "../Interfaces/ITextTranslation";
import { MusicSheetReadingException } from "../Exceptions";

export enum NoteType {
    // xml note types, e.g. given as <note><type>quarter, see:
    //https://usermanuals.musicxml.com/MusicXML/Content/ST-MusicXML-note-type-value.htm

    UNDEFINED, // e.g. not given in XML
    _1024th, // enum member cannot start with a number
    _512th,
    _256th,
    _128th,
    _64th,
    _32nd,
    _16th,
    /** Misspelled name of EIGHTH (same value), kept for compatibility. */
    EIGTH,
    EIGHTH = EIGTH, // same value, so QUARTER etc. keep their values (= their index in NoteTypeHandler.NoteTypeXmlValues)
    QUARTER,
    HALF,
    WHOLE,
    BREVE,
    LONG,
    MAXIMA
}

export class NoteTypeHandler {
    public static NoteTypeXmlValues: string[] = ["", "1024th", "512th", "256th", "128th", "64th", "32nd", "16th",
        "eighth", "quarter", "half", "whole", "breve", "long", "maxima"];
    // alternative to array: use switch/case


    public static NoteTypeToString(noteType: NoteType): string {
        return this.NoteTypeXmlValues[noteType];
        // assumes that the enum values are ordered from 0 to x, like NoteTypeXmlValues array members
        // see NoteType_Test.ts
    }

    public static StringToNoteType(noteType: string): NoteType {
        const indexInArray: number = this.NoteTypeXmlValues.indexOf(noteType);
        return indexInArray !== -1 ? indexInArray : NoteType.UNDEFINED;
    }

        /**
         *
         * @param type
         * @returns {Fraction} - a Note's Duration from a given type (type must be valid).
         */
    public static getNoteDurationFromType(type: string): Fraction {
        switch (type) {
            case "1024th":
                return new Fraction(1, 1024);
            case "512th":
                return new Fraction(1, 512);
            case "256th":
                return new Fraction(1, 256);
            case "128th":
                return new Fraction(1, 128);
            case "64th":
                return new Fraction(1, 64);
            case "32th":
            case "32nd":
                return new Fraction(1, 32);
            case "16th":
                return new Fraction(1, 16);
            case "eighth":
                return new Fraction(1, 8);
            case "quarter":
                return new Fraction(1, 4);
            case "half":
                return new Fraction(1, 2);
            case "whole":
                return new Fraction(1, 1);
            case "breve":
                return new Fraction(2, 1);
            case "long":
                return new Fraction(4, 1);
            case "maxima":
                return new Fraction(8, 1);
            default: {
                const errorMsg: string = ITextTranslation.translateText(
                "ReaderErrorMessages/NoteDurationError", "Invalid note duration."
                );
                throw new MusicSheetReadingException(errorMsg);
            }
        }
    }

    /** How many quarter notes a metronome beat unit lasts, used to convert a metronome mark's
     *  per-minute value (which is relative to its beat unit) into quarter notes per minute for
     *  playback. E.g. "half" -> 2, "quarter" -> 1, "eighth" -> 0.5. A dot adds half of the beat unit's length and each
     *  further dot half of what the dot before it adds, e.g. 1.5 for a dotted quarter and 1.75 for a double-dotted one.
     *  Falls back to a quarter note (with its dots) for an unknown/missing beat unit so
     *  playback tempo stays sane. */
    public static beatUnitInQuarters(beatUnit: string, dots: number = 0): number {
        // the dots add 1/2 + 1/4 + ... of the length, 1 - 1/2^dots in all
        const dotFactor: number = 2 - Math.pow(0.5, dots);
        let beatUnitDuration: Fraction;
        try {
            beatUnitDuration = NoteTypeHandler.getNoteDurationFromType(beatUnit);
        } catch {
            return dotFactor;
        }
        // a quarter note is 1/4, so the factor relative to a quarter is duration / (1/4) = RealValue * 4
        return beatUnitDuration.RealValue * 4 * dotFactor;
    }
}
