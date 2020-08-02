import { NoteType, NoteTypeHandler } from "../../../src/MusicalScore/VoiceData";

/* tslint:disable:no-unused-expression */
describe("NoteType", () => {
    it("parses 32nd note correctly (sample value)", (done: MochaDone) => {
        chai.expect(NoteTypeHandler.StringToNoteType("32nd")).to.equal(NoteType._32nd);
        done();
    });

    it("parses all NoteType values from string correctly (in XML: <note><type>)", (done: MochaDone) => {
        const inputValues: string[] = NoteTypeHandler.NoteTypeXmlValues;
        for (let i: number = 0; i < inputValues.length; i++) {
            chai.expect(NoteTypeHandler.StringToNoteType(inputValues[i])).to.equal(i);
            // assumption: i corresponds to NoteType int value: 0 = UNDEFINED, 1 = _1024th, etc.
            // we could also iterate over the NoteType enum values, but that's a bit ugly in typescript.
        }
        done();
    });
});
