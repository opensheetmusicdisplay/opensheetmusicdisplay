import { expect } from "chai";
import { NoteType, NoteTypeHandler } from "../../../src/MusicalScore/VoiceData/NoteType";
import { MusicSheetReader } from "../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import { MusicSheet } from "../../../src/MusicalScore/MusicSheet";
import { IXmlElement } from "../../../src/Common/FileIO/Xml";

describe("NoteType", () => {
    it("parses 32nd note correctly (sample value)", (done: Mocha.Done) => {
        expect(NoteTypeHandler.StringToNoteType("32nd")).to.equal(NoteType._32nd);
        done();
    });

    // assumption of NoteTypeToString(): the enum values are the indexes of their strings in NoteTypeXmlValues.
    //   Comparing the strings with the enum members (not just with their own indexes) also catches a misspelled string,
    //   like "eigth", which made StringToNoteType("eighth") return UNDEFINED.
    it("converts each NoteType to its MusicXML type string (in XML: <note><type>) and back", (done: Mocha.Done) => {
        const xmlTypes: [NoteType, string][] = [
            [NoteType.UNDEFINED, ""], [NoteType._1024th, "1024th"], [NoteType._512th, "512th"], [NoteType._256th, "256th"],
            [NoteType._128th, "128th"], [NoteType._64th, "64th"], [NoteType._32nd, "32nd"], [NoteType._16th, "16th"],
            [NoteType.EIGHTH, "eighth"], [NoteType.QUARTER, "quarter"], [NoteType.HALF, "half"], [NoteType.WHOLE, "whole"],
            [NoteType.BREVE, "breve"], [NoteType.LONG, "long"], [NoteType.MAXIMA, "maxima"],
        ];
        expect(NoteTypeHandler.NoteTypeXmlValues.length, "number of type strings").to.equal(xmlTypes.length);
        for (const [noteType, xmlType] of xmlTypes) {
            expect(NoteTypeHandler.NoteTypeToString(noteType), `NoteTypeToString(${noteType})`).to.equal(xmlType);
            expect(NoteTypeHandler.StringToNoteType(xmlType), `StringToNoteType("${xmlType}")`).to.equal(noteType);
        }
        expect(NoteType.EIGTH, "the misspelled EIGTH, kept for compatibility").to.equal(NoteType.EIGHTH);
        done();
    });

    // Note.NoteTypeXml is the notated type, also where the length differs from it (dotted, tuplet),
    //   e.g. the Braille plugin takes the note value from it.
    it("reads the type of eighth notes into Note.NoteTypeXml, also of dotted and triplet eighths", (done: Mocha.Done) => {
        const triplet: string = "<time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>";
        const xml: string = `<?xml version="1.0" encoding="UTF-8"?>
            <score-partwise version="4.0">
                <part-list><score-part id="P1"><part-name>Flute</part-name></score-part></part-list>
                <part id="P1"><measure number="1">
                    <attributes><divisions>12</divisions><time><beats>4</beats><beat-type>4</beat-type></time>
                        <clef><sign>G</sign><line>2</line></clef></attributes>
                    <note><pitch><step>C</step><octave>5</octave></pitch><duration>6</duration><type>eighth</type></note>
                    <note><pitch><step>D</step><octave>5</octave></pitch><duration>6</duration><type>eighth</type></note>
                    <note><pitch><step>E</step><octave>5</octave></pitch><duration>9</duration><type>eighth</type><dot/></note>
                    <note><pitch><step>F</step><octave>5</octave></pitch><duration>3</duration><type>16th</type></note>
                    <note><pitch><step>G</step><octave>5</octave></pitch><duration>4</duration><type>eighth</type>${triplet}
                        <notations><tuplet type="start"/></notations></note>
                    <note><pitch><step>A</step><octave>5</octave></pitch><duration>4</duration><type>eighth</type>${triplet}</note>
                    <note><pitch><step>B</step><octave>5</octave></pitch><duration>4</duration><type>eighth</type>${triplet}
                        <notations><tuplet type="stop"/></notations></note>
                    <note><pitch><step>C</step><octave>6</octave></pitch><duration>12</duration><type>quarter</type></note>
                </measure></part>
            </score-partwise>`;
        const doc: Document = new DOMParser().parseFromString(xml, "text/xml");
        const sheet: MusicSheet = new MusicSheetReader().createMusicSheet(new IXmlElement(doc.getElementsByTagName("score-partwise")[0]), "eighths");
        const noteTypes: NoteType[] = sheet.Instruments[0].Voices[0].VoiceEntries.map(voiceEntry => voiceEntry.Notes[0].NoteTypeXml);
        expect(noteTypes).to.deep.equal([NoteType.EIGHTH, NoteType.EIGHTH, NoteType.EIGHTH, NoteType._16th,
                                         NoteType.EIGHTH, NoteType.EIGHTH, NoteType.EIGHTH, NoteType.QUARTER]);
        done();
    });
});
