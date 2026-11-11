import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowVoiceEntry } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { GraphicalVoiceEntry } from "../../../../src/MusicalScore/Graphical/GraphicalVoiceEntry";
import { TestUtils } from "../../../Util/TestUtils";

/**
 * A dotted quarter whose head is notehead="none", stem up, on the half note of the other voice, stem down
 * (test_notehead_none_dot.musicxml m1), and the same note with print-object="no" (m2). notehead="none" leaves out the
 * head only: the note's dot is drawn, after the shared head. Vexflow draws the dots of a head in that head's style, so
 * they were transparent with the head. A print-object="no" note keeps its dot hidden.
 */
describe("Notehead none on the head of another voice", () => {
    const transparent: string = "#00000000";
    let osmd: OpenSheetMusicDisplay;

    beforeAll(async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "800px";
        osmd = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        await osmd.load(TestUtils.getScore("test_notehead_none_dot.musicxml"));
        osmd.render();
    });

    const vfNote: (measure: number, voice: number) => any = (measure: number, voice: number): any =>
        (osmd.GraphicSheet.MeasureList[measure][0].staffEntries[0].graphicalVoiceEntries.find(
            (gve: GraphicalVoiceEntry) => gve.parentVoiceEntry.ParentVoice.VoiceId === voice) as VexFlowVoiceEntry).vfStaveNote;
    /** The fill of the paths Vexflow drew for the note's augmentation dots. */
    const dotFills: (measure: number, voice: number) => string[] = (measure: number, voice: number): string[] => {
        const group: Element = document.getElementById("vf-" + vfNote(measure, voice).getAttribute("id"));
        return Array.from(group.querySelectorAll(".vf-modifiers path")).map((path: Element) => path.getAttribute("fill"));
    };

    it("draws the dot of a notehead-none note, not its head", () => {
        const note: any = vfNote(0, 1);
        expect(note.dots).to.equal(1);
        expect(note.note_heads[0].getStyle().fillStyle, "head").to.equal(transparent);
        const dots: string[] = dotFills(0, 1);
        expect(dots).to.have.length(1);
        expect(dots[0], "dot").to.not.equal(transparent);
    });

    it("puts the dot after the shared head", () => {
        const headless: any = vfNote(0, 1);
        const half: any = vfNote(0, 2);
        expect(headless.getXShift()).to.equal(0);
        expect(half.getXShift()).to.equal(0);
        const group: Element = document.getElementById("vf-" + headless.getAttribute("id"));
        const dot: SVGGraphicsElement = group.querySelector(".vf-modifiers path") as SVGGraphicsElement;
        expect(dot.getBBox().x).to.be.greaterThan(half.getNoteHeadEndX());
    });

    it("keeps the dot of a print-object=\"no\" note hidden", () => {
        const dots: string[] = dotFills(1, 1);
        expect(dots).to.have.length(1);
        expect(dots[0]).to.equal(transparent);
    });
});
