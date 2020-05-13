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
}
