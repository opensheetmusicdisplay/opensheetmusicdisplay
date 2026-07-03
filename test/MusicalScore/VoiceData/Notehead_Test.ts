import { expect } from "vitest";
import { Notehead, NoteHeadShape } from "../../../src/MusicalScore/VoiceData/Notehead";

describe("Notehead", () => {
    it("parses 'none' notehead shape correctly", () => {
        expect(Notehead.ShapeTypeXmlToShape("none")).to.equal(NoteHeadShape.NONE);
    });

    it("parses 'normal' notehead shape correctly", () => {
        expect(Notehead.ShapeTypeXmlToShape("normal")).to.equal(NoteHeadShape.NORMAL);
    });

    it("parses 'x' notehead shape correctly", () => {
        expect(Notehead.ShapeTypeXmlToShape("x")).to.equal(NoteHeadShape.X);
    });

    it("parses 'diamond' notehead shape correctly", () => {
        expect(Notehead.ShapeTypeXmlToShape("diamond")).to.equal(NoteHeadShape.DIAMOND);
    });

    it("parses 'slash' notehead shape correctly", () => {
        expect(Notehead.ShapeTypeXmlToShape("slash")).to.equal(NoteHeadShape.SLASH);
    });

    it("parses 'triangle' notehead shape correctly", () => {
        expect(Notehead.ShapeTypeXmlToShape("triangle")).to.equal(NoteHeadShape.TRIANGLE);
    });

    it("parses 'inverted triangle' notehead shape correctly", () => {
        expect(Notehead.ShapeTypeXmlToShape("inverted triangle")).to.equal(NoteHeadShape.TRIANGLE_INVERTED);
    });

    it("parses 'square' notehead shape correctly", () => {
        expect(Notehead.ShapeTypeXmlToShape("square")).to.equal(NoteHeadShape.SQUARE);
    });

    it("parses 'rectangle' notehead shape correctly", () => {
        expect(Notehead.ShapeTypeXmlToShape("rectangle")).to.equal(NoteHeadShape.RECTANGLE);
    });

    it("parses 'circle-x' notehead shape correctly", () => {
        expect(Notehead.ShapeTypeXmlToShape("circle-x")).to.equal(NoteHeadShape.CIRCLEX);
    });

    it("handles case insensitivity for notehead shapes", () => {
        expect(Notehead.ShapeTypeXmlToShape("NONE")).to.equal(NoteHeadShape.NONE);
        expect(Notehead.ShapeTypeXmlToShape("NoNe")).to.equal(NoteHeadShape.NONE);
        expect(Notehead.ShapeTypeXmlToShape("NORMAL")).to.equal(NoteHeadShape.NORMAL);
    });

    it("defaults to NORMAL for unknown notehead shapes", () => {
        expect(Notehead.ShapeTypeXmlToShape("unknown")).to.equal(NoteHeadShape.NORMAL);
        expect(Notehead.ShapeTypeXmlToShape("invalid")).to.equal(NoteHeadShape.NORMAL);
    });
});
