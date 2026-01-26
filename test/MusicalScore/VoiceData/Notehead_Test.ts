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
});
