import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
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

    async function load(configureRules?: (osmd: OpenSheetMusicDisplay) => void): Promise<OpenSheetMusicDisplay> {
        currentDisplay?.clear();
        container.replaceChildren();
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        currentDisplay = osmd;
        osmd.setOptions({ fingeringPosition: "left" });
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
    }

    it("draws the fingering and string number of each leading, trailing, and stand-alone grace chord once", async () => {
        const osmd: OpenSheetMusicDisplay = await load();
        osmd.render();
        for (const [value, description] of [["1", "fingering 1"], ["2", "fingering 2"], ["I", "string number I"], ["II", "string number II"]]) {
            expectVisibleCount(value, 3, description);
        }
    });

    it("honors independent fingering and string-number visibility for grace and ordinary notes", async () => {
        const withoutFingerings: OpenSheetMusicDisplay = await load(display => {
            display.EngravingRules.RenderFingerings = false;
        });
        withoutFingerings.render();
        expectVisibleCount("1", 0, "hidden fingerings");
        expectVisibleCount("2", 0, "hidden fingerings");
        expectVisibleCount("I", 3, "string numbers remain visible");
        expectVisibleCount("II", 3, "string numbers remain visible");
        expectVisibleCount("III", 2, "ordinary-note string numbers remain visible");
        expectVisibleCount("IV", 1, "ordinary-note string numbers remain visible");

        const graceEntries: GraphicalVoiceEntry[] = withoutFingerings.GraphicSheet.MeasureList
            .flatMap(measures => measures[0].staffEntries)
            .flatMap(entry => entry.graphicalVoiceEntries)
            .filter(entry => entry.parentVoiceEntry.IsGrace);
        expect(graceEntries.length, "the three grace chords are laid out").to.equal(3);
        for (const entry of graceEntries) {
            const stringNumbers: SVGTextElement[] = Array.from(
                (entry.notes[0] as VexFlowGraphicalNote).getSVGGElement().querySelectorAll("text"))
                .filter(text => text.textContent === "I" || text.textContent === "II");
            expect(stringNumbers.length, "two string numbers on each grace chord").to.equal(2);
            const graceX: number = (entry as VexFlowVoiceEntry).vfStaveNote.getAbsoluteX();
            for (const text of stringNumbers) {
                expect(text.getBBox().x, "string number is right of its grace chord without fingerings")
                    .to.be.greaterThan(graceX);
            }
        }

        const withoutStrings: OpenSheetMusicDisplay = await load(display => {
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
