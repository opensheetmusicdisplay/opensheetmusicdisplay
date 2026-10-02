import { expect } from "chai";
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { GraphicalMeasure } from "../../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { VexFlowGraphicalNote } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TabNote } from "../../../../src/MusicalScore/VoiceData/TabNote";
import { TestUtils } from "../../../Util/TestUtils";

describe("VexFlow GraphicalNote", () => {
    it("Can get SVG elements for note, stem and beam", (done: Mocha.Done) => {
        //const url: string = "base/test/data/test_rest_positioning_8th_quarter.musicxml"; // doesn't work, works for Mozart Clarinet Quintet
        const score: Document = TestUtils.getScore("test_beam_svg_double.musicxml");
        // sample should start with a beamed 8th note, and be simple.
        const div: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        // we need this way of creating the score to get the SVG elements, doesn't work with creating MusicSheet by hand
        osmd.load(score).then(
            (_: {}) => {
                 osmd.render();
                 const gm: GraphicalMeasure = osmd.GraphicSheet.findGraphicalMeasure(0, 0);
                 const note1: VexFlowGraphicalNote = (gm.staffEntries[0].graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote);
                 const noteSVG: SVGGElement = note1.getSVGGElement();
                 expect(noteSVG).to.not.be.null;
                 expect(noteSVG).to.not.be.undefined;
                 // const noteSVGId: string = "vf-" + firstNote.getSVGId();
                 // const noteSVG: HTMLElement = document.getElementById(noteSVGId);
                 //const stemSVGId: string = noteSVGId + "-stem";
                 //const stemSVG: HTMLElement = document.getElementById(stemSVGId);
                 const stemSVG: HTMLElement = note1.getStemSVG();
                 expect(stemSVG).to.not.be.null;
                 expect(stemSVG).to.not.be.undefined;
                 // const beamSVGId: string = noteSVGId + "-beam";
                 // const beamSVG: HTMLElement = document.getElementById(beamSVGId);
                 const beamSVGs: HTMLElement[] = note1.getBeamSVGs();
                 expect(beamSVGs.length).to.equal(1); // 8th beam start. (16th beam starts on note2)
                 expect(beamSVGs[0]).to.not.be.null;
                 expect(beamSVGs[0]).to.not.be.undefined;
                 const note2: VexFlowGraphicalNote = (gm.staffEntries[1].graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote);
                 expect(note2.getBeamSVGs().length).to.equal(1); // start of 16th beam
                 const note3: VexFlowGraphicalNote = (gm.staffEntries[2].graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote);
                 expect(note3.getBeamSVGs().length).to.equal(0); // end of 16th beam
                 const note4: VexFlowGraphicalNote = (gm.staffEntries[3].graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote);
                 expect(note4.getBeamSVGs().length).to.equal(2); // 16th beams start
                 done();
            },
            done
        );
     });

    it("Can get the SVG element of a TAB note, e.g. to hide it", async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        await osmd.load(TestUtils.getScore("test_tab_grace_note_simple.musicxml")); // TAB only: a quarter, a grace note, a half note
        osmd.render();
        const notes: VexFlowGraphicalNote[] = osmd.GraphicSheet.MeasureList.flatMap(verticalMeasures => verticalMeasures[0].staffEntries)
            .flatMap(staffEntry => staffEntry.graphicalVoiceEntries).map(voiceEntry => voiceEntry.notes[0] as VexFlowGraphicalNote)
            .filter(note => !note.sourceNote.isRest());
        expect(notes.length).to.equal(3);
        for (const note of notes) {
            expect(note.getSVGGElement()?.id, `SVG element of ${note.sourceNote.Pitch.ToStringShort(3)}`).to.equal("vf-" + note.getSVGId());
        }
        notes[0].setVisible(false);
        expect(notes[0].getSVGGElement().getAttribute("visibility")).to.equal("hidden");
        div.remove();
    });

    it("Can color a TAB note: its fret number and its bend", async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        await osmd.load(TestUtils.getScore("test_tabs_bend_and_release.musicxml")); // TAB only, one note with bends
        osmd.render();
        const notes: VexFlowGraphicalNote[] = osmd.GraphicSheet.MeasureList.flatMap(verticalMeasures => verticalMeasures[0].staffEntries)
            .flatMap(staffEntry => staffEntry.graphicalVoiceEntries).map(voiceEntry => voiceEntry.notes[0] as VexFlowGraphicalNote)
            .filter(note => !note.sourceNote.isRest());
        const bentNote: VexFlowGraphicalNote = notes.find(note => (note.sourceNote as TabNote).BendArray?.length > 0);
        const otherNote: VexFlowGraphicalNote = notes.find(note => note !== bentNote);
        expect(Boolean(bentNote && otherNote), "a note with a bend, and another note").to.equal(true);

        bentNote.setColor("#ff0000");
        const fret: Element = bentNote.getSVGGElement().querySelector(":scope > text");
        expect(bentNote.getNoteheadSVGs()[0] === fret, "the fret number is the note head").to.equal(true);
        expect(fret.getAttribute("fill")).to.equal("#ff0000");
        expect(bentNote.getSVGGElement().querySelector(":scope > rect").getAttribute("fill"), "background of the fret number").to.equal("white");
        const bend: Element[] = bentNote.getModifierSVGs();
        const curves: Element[] = bend.filter(shape => shape.getAttribute("fill") === "none");
        expect(curves.length, "bend curves").to.be.greaterThan(0);
        expect(curves.every(curve => curve.getAttribute("stroke") === "#ff0000"), "curves stroked in the color").to.equal(true);
        expect(bend.filter(shape => shape.getAttribute("fill") !== "none").every(shape => shape.getAttribute("fill") === "#ff0000"),
            "labels and arrows filled with the color").to.equal(true);
        expect(otherNote.getNoteheadSVGs()[0].getAttribute("fill"), "another note").to.equal("#000000");
        div.remove();
    });

    /** The notes of a measure in a staff, one per staff entry (the slides sample has one voice and no chords). */
    function measureNotes(osmd: OpenSheetMusicDisplay, measureIndex: number, staffIndex: number): VexFlowGraphicalNote[] {
        return osmd.GraphicSheet.MeasureList[measureIndex][staffIndex].staffEntries
            .map(staffEntry => staffEntry.graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote);
    }
    const isHidden: (element: Element) => boolean = (element: Element) => element.getAttribute("visibility") === "hidden";
    const staves: [number, string][] = [[0, "standard staff"], [1, "TAB staff"]];

    // A guitar part with a standard and a TAB staff, with the same slides. Measure 3 starts with a slide from E to F#.
    it("Hides the slides starting at a note with setVisible(), in a standard and a TAB staff", async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        await osmd.load(TestUtils.getScore("test_slides_standard_and_tab_staff.musicxml"));
        osmd.render();
        for (const [staffIndex, staff] of staves) {
            const [slideStart, slideEnd] = measureNotes(osmd, 2, staffIndex);
            const slides: HTMLElement[] = slideStart.getGlissandoSVGs();
            expect(slides.length, `${staff}: the slide of measure 3`).to.equal(1);
            expect(slides[0].textContent, `${staff}: the line, and the label in TAB`).to.equal(staffIndex === 1 ? "sl." : "");
            expect(slideEnd.getGlissandoSVGs().length, `${staff}: the slide belongs to its start note`).to.equal(0);

            slideEnd.setVisible(false);
            expect(isHidden(slides[0]), `${staff}: hiding the end note keeps the slide, like a tie or slur`).to.equal(false);
            slideStart.setVisible(false, { applyToGlissandi: false });
            expect(isHidden(slides[0]), `${staff}: applyToGlissandi: false`).to.equal(false);
            slideStart.setVisible(false);
            expect(isHidden(slides[0]), `${staff}: hidden with its start note`).to.equal(true);
            slideStart.setVisible(true);
            expect(isHidden(slides[0]), `${staff}: shown again`).to.equal(false);
        }
        div.remove();
    });

    // The same sample with one measure per system: the slide from the last note of measure 1 is drawn in two parts.
    it("Hides both parts of a slide across a system break with its start note", async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        await osmd.load(TestUtils.getScore("test_slides_standard_and_tab_staff.musicxml"));
        osmd.EngravingRules.RenderXMeasuresPerLineAkaSystem = 1;
        osmd.render();
        for (const [staffIndex, staff] of staves) {
            const slideStart: VexFlowGraphicalNote = measureNotes(osmd, 0, staffIndex)[3];
            const parts: HTMLElement[] = slideStart.getGlissandoSVGs();
            expect(parts.length, `${staff}: a part in each system`).to.equal(2);
            expect(parts[0].closest(".staffline") === parts[1].closest(".staffline"), `${staff}: parts in the same system`).to.equal(false);
            slideStart.setVisible(false);
            expect(parts.every(isHidden), `${staff}: both parts hidden`).to.equal(true);
        }
        div.remove();
    });
});
