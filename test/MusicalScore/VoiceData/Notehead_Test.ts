/* eslint-disable @typescript-eslint/no-unused-expressions */
import { Notehead, NoteHeadShape } from "../../../src/MusicalScore/VoiceData/Notehead";

describe("Notehead", () => {
    it("parses 'none' notehead shape correctly", (done: Mocha.Done) => {
        chai.expect(Notehead.ShapeTypeXmlToShape("none")).to.equal(NoteHeadShape.NONE);
        done();
    });

    it("parses 'normal' notehead shape correctly", (done: Mocha.Done) => {
        chai.expect(Notehead.ShapeTypeXmlToShape("normal")).to.equal(NoteHeadShape.NORMAL);
        done();
    });

    it("parses 'x' notehead shape correctly", (done: Mocha.Done) => {
        chai.expect(Notehead.ShapeTypeXmlToShape("x")).to.equal(NoteHeadShape.X);
        done();
    });

    it("parses 'diamond' notehead shape correctly", (done: Mocha.Done) => {
        chai.expect(Notehead.ShapeTypeXmlToShape("diamond")).to.equal(NoteHeadShape.DIAMOND);
        done();
    });

    it("parses 'slash' notehead shape correctly", (done: Mocha.Done) => {
        chai.expect(Notehead.ShapeTypeXmlToShape("slash")).to.equal(NoteHeadShape.SLASH);
        done();
    });

    it("parses 'triangle' notehead shape correctly", (done: Mocha.Done) => {
        chai.expect(Notehead.ShapeTypeXmlToShape("triangle")).to.equal(NoteHeadShape.TRIANGLE);
        done();
    });

    it("parses 'inverted triangle' notehead shape correctly", (done: Mocha.Done) => {
        chai.expect(Notehead.ShapeTypeXmlToShape("inverted triangle")).to.equal(NoteHeadShape.TRIANGLE_INVERTED);
        done();
    });

    it("parses 'square' notehead shape correctly", (done: Mocha.Done) => {
        chai.expect(Notehead.ShapeTypeXmlToShape("square")).to.equal(NoteHeadShape.SQUARE);
        done();
    });

    it("parses 'rectangle' notehead shape correctly", (done: Mocha.Done) => {
        chai.expect(Notehead.ShapeTypeXmlToShape("rectangle")).to.equal(NoteHeadShape.RECTANGLE);
        done();
    });

    it("parses 'circle-x' notehead shape correctly", (done: Mocha.Done) => {
        chai.expect(Notehead.ShapeTypeXmlToShape("circle-x")).to.equal(NoteHeadShape.CIRCLEX);
        done();
    });

    it("handles case insensitivity for notehead shapes", (done: Mocha.Done) => {
        chai.expect(Notehead.ShapeTypeXmlToShape("NONE")).to.equal(NoteHeadShape.NONE);
        chai.expect(Notehead.ShapeTypeXmlToShape("NoNe")).to.equal(NoteHeadShape.NONE);
        chai.expect(Notehead.ShapeTypeXmlToShape("NORMAL")).to.equal(NoteHeadShape.NORMAL);
        done();
    });

    it("defaults to NORMAL for unknown notehead shapes", (done: Mocha.Done) => {
        chai.expect(Notehead.ShapeTypeXmlToShape("unknown")).to.equal(NoteHeadShape.NORMAL);
        chai.expect(Notehead.ShapeTypeXmlToShape("invalid")).to.equal(NoteHeadShape.NORMAL);
        done();
    });

    it("maps supported chant SMuFL noteheads to VexFlow glyph codes", (done: Mocha.Done) => {
        chai.expect(Notehead.SmuflNoteheadToVexFlowCode("chantPunctum")).to.equal("ue990");
        chai.expect(Notehead.SmuflNoteheadToVexFlowCode("chantVirga")).to.equal("ue994");
        chai.expect(Notehead.SmuflNoteheadToVexFlowCode("chantQuilisma")).to.equal("ue99b");
        chai.expect(Notehead.SmuflNoteheadToVexFlowCode("chantOriscusAscending")).to.equal("ue99c");
        chai.expect(Notehead.SmuflNoteheadToVexFlowCode("chantStropha")).to.equal("ue9a4");
        done();
    });

    it("maps chant SMuFL noteheads case-insensitively", (done: Mocha.Done) => {
        chai.expect(Notehead.SmuflNoteheadToVexFlowCode("CHANTPUNCTUM")).to.equal("ue990");
        chai.expect(Notehead.SmuflNoteheadToVexFlowCode("chantvirga")).to.equal("ue994");
        chai.expect(Notehead.SmuflNoteheadToVexFlowCode("cHaNtQuIlIsMa")).to.equal("ue99b");
        chai.expect(Notehead.SmuflNoteheadToVexFlowCode("CHANTORISCUSASCENDING")).to.equal("ue99c");
        chai.expect(Notehead.SmuflNoteheadToVexFlowCode("chantstropha")).to.equal("ue9a4");
        done();
    });

    it("returns undefined for unknown or missing chant SMuFL names", (done: Mocha.Done) => {
        chai.expect(Notehead.SmuflNoteheadToVexFlowCode("chantUnknown")).to.be.undefined;
        chai.expect(Notehead.SmuflNoteheadToVexFlowCode("")).to.be.undefined;
        chai.expect(Notehead.SmuflNoteheadToVexFlowCode(undefined)).to.be.undefined;
        done();
    });
});
