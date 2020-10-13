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
    EIGTH,
    QUARTER,
    HALF,
    WHOLE,
    BREVE,
    LONG,
    MAXIMA
}

export class NoteTypeHandler {
    // tslint:disable-next-line: variable-name
    public static NoteTypeXmlValues: string[] = ["", "1024th", "512th", "256th", "128th", "64th", "32nd", "16th",
        "eigth", "quarter", "half", "whole", "breve", "long", "maxima"];
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
}
