import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowGraphicalNote } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { TestUtils } from "../../../Util/TestUtils";

describe("TAB slides on different chord strings", () => {
    let div: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(() => { div = TestUtils.getDivElement(document); div.style.width = "1000px"; });
    afterEach(() => { osmd?.clear(); div.remove(); });

    async function render(systemBreak: boolean): Promise<void> {
        const duration: number = systemBreak ? 4 : 2;
        const chord: (stop: boolean) => string = stop => [
            {string: 2, fret: stop ? 14 : 12, step: stop ? "C" : "B", octave: stop ? 5 : 4, alter: stop ? 1 : 0},
            {string: 3, fret: stop ? 16 : 14, step: stop ? "B" : "A", octave: 4, alter: 0},
        ].map((position, index) => `<note>${index === 1 ? "<chord/>" : ""}<pitch><step>${position.step}</step>
            ${position.alter ? "<alter>1</alter>" : ""}<octave>${position.octave}</octave></pitch><duration>${duration}</duration>
            <type>${systemBreak ? "whole" : "half"}</type><notations><slide type="${stop ? "stop" : "start"}" number="${index + 1}"/>
            <technical><string>${position.string}</string><fret>${position.fret}</fret></technical></notations></note>`).join("");
        osmd = new OpenSheetMusicDisplay(div, {autoResize: false, backend: "svg", newSystemFromXML: true});
        await osmd.load(`<?xml version="1.0"?><score-partwise version="4.0">
            <part-list><score-part id="P1"><part-name>Guitar</part-name></score-part></part-list>
            <part id="P1"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>
            <clef><sign>TAB</sign><line>5</line></clef><staff-details><staff-lines>6</staff-lines></staff-details></attributes>
            ${chord(false)}${systemBreak ? '</measure><measure number="2"><print new-system="yes"/>' : ""}
            ${chord(true)}</measure></part></score-partwise>`);
        osmd.render();
    }

    function checkAnchors(systemBreak: boolean): void {
        const lines: SVGGraphicsElement[] = Array.from(div.querySelectorAll(".vf-glissando path")) as SVGGraphicsElement[];
        expect(lines).to.have.length(systemBreak ? 4 : 2);
        const actual: number[] = lines.map(line => { const box: DOMRect = line.getBBox(); return box.y + box.height / 2; }).sort((a, b) => a - b);
        const expected: number[] = [];
        for (const measure of systemBreak ? [0, 1] : [0]) {
            const note: VexFlowGraphicalNote = osmd.GraphicSheet.MeasureList[measure][0]
                .staffEntries[0].graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote;
            expected.push(...note.getNoteheadSVGs().map(fret => {
                const box: DOMRect = (fret as unknown as SVGGraphicsElement).getBBox();
                return box.y + box.height / 2;
            }));
        }
        expected.sort((a, b) => a - b);
        expect(expected).to.have.length(actual.length);
        for (let i: number = 0; i < actual.length; i++) {
            expect(actual[i], "slide beside its marked string").to.be.closeTo(expected[i], 2);
        }
        for (const line of lines) { expect(line.getAttribute("d")).not.to.match(/NaN|Infinity/); }
    }

    it("draws two distinct slides at their chord strings and keeps them there on redraw", async () => {
        await render(false);
        checkAnchors(false);
        osmd.render();
        checkAnchors(false);
    });

    it("uses the marked strings at both sides of a system break", async () => {
        await render(true);
        checkAnchors(true);
        expect(Array.from(div.querySelectorAll(".vf-glissando text")).map(text => text.textContent)).to.deep.equal(["sl.", "sl."]);
    });
});
