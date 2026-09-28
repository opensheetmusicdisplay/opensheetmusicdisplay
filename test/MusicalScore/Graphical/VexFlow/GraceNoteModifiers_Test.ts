import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMeasure } from "../../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { GraphicalVoiceEntry } from "../../../../src/MusicalScore/Graphical/GraphicalVoiceEntry";
import { VexFlowVoiceEntry } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { VexFlowGraphicalNote } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { TestUtils } from "../../../Util/TestUtils";

describe("Grace note modifiers", () => {
    const sampleFilename: string = "test_grace_note_modifiers_once.musicxml";
    let container: HTMLElement;
    let currentDisplay: OpenSheetMusicDisplay;

    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = "1300px";
        document.body.appendChild(container);
    });
    afterEach(() => {
        currentDisplay?.clear();
        currentDisplay = undefined;
        container.remove();
    });

    async function load(fingeringPosition: "left" | "right" = "left",
                        configureRules?: (osmd: OpenSheetMusicDisplay) => void): Promise<OpenSheetMusicDisplay> {
        currentDisplay?.clear();
        container.replaceChildren();
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        currentDisplay = osmd;
        osmd.setOptions({ fingeringPosition });
        configureRules?.(osmd);
        await osmd.load(TestUtils.getScore(sampleFilename));
        return osmd;
    }

    function visibleTexts(): SVGTextElement[] {
        return Array.from(container.querySelectorAll("svg text"));
    }

    function texts(value: string): SVGTextElement[] {
        return visibleTexts().filter((element: SVGTextElement) => element.textContent === value);
    }

    function expectVisibleCount(value: string, count: number, description: string): void {
        const elements: SVGTextElement[] = texts(value);
        expect(elements.length, description).to.equal(count);
        const positions: string[] = elements.map((element: SVGTextElement) => {
            const box: DOMRect = element.getBBox();
            expect(Number.isFinite(box.x) && Number.isFinite(box.y), `${description}: finite position`).to.equal(true);
            return `${Math.round(box.x)},${Math.round(box.y)}`;
        });
        expect(new Set(positions).size, `${description}: distinct visible positions`).to.equal(count);
    }

    function graceNoteXs(osmd: OpenSheetMusicDisplay): number[] {
        return osmd.GraphicSheet.MeasureList.map((measures: GraphicalMeasure[]) => measures[0])
            .flatMap((measure: GraphicalMeasure) => measure.staffEntries)
            .flatMap(staffEntry => staffEntry.graphicalVoiceEntries)
            .filter((entry: GraphicalVoiceEntry) => entry.parentVoiceEntry.IsGrace)
            .map((entry: GraphicalVoiceEntry) => (entry as VexFlowVoiceEntry).vfStaveNote.getAbsoluteX());
    }

    function expectFingeringsOnSide(osmd: OpenSheetMusicDisplay, side: "left" | "right"): void {
        const graceXs: number[] = graceNoteXs(osmd);
        expect(graceXs.length, "the three grace chords are laid out").to.equal(3);
        const fingerings: SVGTextElement[] = ["1", "2"].flatMap((value: string) => texts(value));
        expect(fingerings.length, "two fingerings on each grace chord").to.equal(6);
        for (const fingering of fingerings) {
            const box: DOMRect = fingering.getBBox();
            const graceX: number = graceXs.reduce((nearest: number, x: number) =>
                Math.abs(x - box.x) < Math.abs(nearest - box.x) ? x : nearest);
            if (side === "left") {
                // SVG text boxes extend slightly past the glyph anchor in Firefox.
                expect(box.x + box.width, "left fingering is left of its grace chord").to.be.at.most(graceX + 2);
            } else {
                expect(box.x, "right fingering is right of its grace chord").to.be.greaterThan(graceX);
            }
        }
    }

    it("draws the fingering and string number of each leading, trailing, and stand-alone grace chord once", async () => {
        const osmd: OpenSheetMusicDisplay = await load();
        osmd.render();
        for (const [value, description] of [["1", "fingering 1"], ["2", "fingering 2"], ["I", "string number I"], ["II", "string number II"]]) {
            expectVisibleCount(value, 3, description);
        }
        expectFingeringsOnSide(osmd, "left");
        osmd.render();
        for (const [value, description] of [["1", "rerendered fingering 1"], ["2", "rerendered fingering 2"],
            ["I", "rerendered string number I"], ["II", "rerendered string number II"]]) {
            expectVisibleCount(value, 3, description);
        }
    });

    it("keeps the configured right fingering position for grace chords", async () => {
        const osmd: OpenSheetMusicDisplay = await load("right");
        osmd.render();
        expectFingeringsOnSide(osmd, "right");
    });

    it("honors independent fingering and string-number visibility for grace and ordinary notes", async () => {
        const withoutFingerings: OpenSheetMusicDisplay = await load("left", display => {
            display.EngravingRules.RenderFingerings = false;
        });
        withoutFingerings.render();
        expectVisibleCount("1", 0, "hidden fingerings");
        expectVisibleCount("2", 0, "hidden fingerings");
        expectVisibleCount("I", 3, "string numbers remain visible");
        expectVisibleCount("II", 3, "string numbers remain visible");
        expectVisibleCount("III", 2, "ordinary-note string numbers remain visible");
        expectVisibleCount("IV", 1, "ordinary-note string numbers remain visible");

        const withoutStrings: OpenSheetMusicDisplay = await load("left", display => {
            display.EngravingRules.RenderStringNumbersClassical = false;
        });
        withoutStrings.render();
        expectVisibleCount("1", 3, "fingerings remain visible");
        expectVisibleCount("2", 3, "fingerings remain visible");
        const ordinaryEntries: GraphicalVoiceEntry[] = withoutStrings.GraphicSheet.MeasureList
            .flatMap(measures => measures[0].staffEntries)
            .flatMap(entry => entry.graphicalVoiceEntries)
            .filter(entry => !entry.parentVoiceEntry.IsGrace);
        const ordinaryFingerings: string[][] = ordinaryEntries.map(entry =>
            Array.from((entry.notes[0] as VexFlowGraphicalNote).getSVGGElement().querySelectorAll("text"))
                .map(text => text.textContent).filter(text => text === "3" || text === "4").sort());
        expect(ordinaryFingerings, "hiding strings preserves ordinary-note fingerings")
            .to.deep.equal([["3", "4"], ["3"]]);
        expectVisibleCount("I", 0, "hidden string numbers");
        expectVisibleCount("II", 0, "hidden string numbers");
        expectVisibleCount("III", 0, "hidden ordinary-note string numbers");
        expectVisibleCount("IV", 0, "hidden ordinary-note string numbers");
    });
});
