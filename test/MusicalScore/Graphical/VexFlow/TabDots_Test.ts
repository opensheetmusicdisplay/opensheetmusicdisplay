import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowGraphicalNote } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { GraphicalVoiceEntry } from "../../../../src/MusicalScore/Graphical/GraphicalVoiceEntry";
import { TestUtils } from "../../../Util/TestUtils";

describe("TAB rhythm and augmentation dots", () => {
    let div: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(() => { div = TestUtils.getDivElement(document); div.style.width = "1100px"; });
    afterEach(() => { osmd?.clear(); div.remove(); });

    function sample(): Document {
        return TestUtils.getScore("test_tab_rhythm_dots.musicxml").cloneNode(true) as Document;
    }
    async function render(rhythm: boolean = false, backend: "svg" | "canvas" = "svg", score: Document = sample()): Promise<void> {
        osmd?.clear();
        div.replaceChildren();
        osmd = new OpenSheetMusicDisplay(div, {autoResize: false, backend});
        osmd.EngravingRules.TabRhythmRendered = rhythm;
        await osmd.load(score);
        osmd.render();
    }
    function note(measure: number, staff: number, entry: number = 0): VexFlowGraphicalNote {
        return osmd.GraphicSheet.MeasureList[measure][staff].staffEntries[entry].graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote;
    }
    function stem(measure: number, staff: number, entry: number = 0): SVGGraphicsElement {
        const n: VexFlowGraphicalNote = note(measure, staff, entry);
        // Beamed stems are drawn with the beam, outside the note's group; the public OSMD getter finds those too.
        return n.getSVGGElement().querySelector<SVGGraphicsElement>(".vf-stem") ?? n.getStemSVG() as unknown as SVGGraphicsElement;
    }
    function dots(measure: number, staff: number): SVGPathElement[] {
        return Array.from(note(measure, staff).getSVGGElement().querySelectorAll<SVGPathElement>(".vf-tab-rhythm-dot path"));
    }
    function checkRhythm(): void {
        for (const staff of [0, 1]) {
            // One dot set per chord, including beamed notes; the logical duration keeps just its original augmentation.
            for (const [measure, count, length] of [[0, 1, 3 / 8], [1, 2, 7 / 16], [2, 1, 3 / 8], [3, 1, 3 / 16]]) {
                const paths: SVGPathElement[] = dots(measure, staff);
                expect(paths).to.have.length(count);
                const box: DOMRect = stem(measure, staff).getBBox();
                const fret: DOMRect = note(measure, staff).getSVGGElement().querySelector<SVGGraphicsElement>("text").getBBox();
                expect(staff === 0 ? box.y > fret.y + fret.height : box.y + box.height < fret.y).to.equal(true);
                const baseY: number = staff === 0 ? box.y : box.y + box.height;
                let lastX: number = box.x + box.width;
                for (const path of paths) {
                    const dot: DOMRect = path.getBBox();
                    expect(dot.y + dot.height / 2).to.be.closeTo(baseY, 2);
                    expect(dot.x).to.be.greaterThan(lastX);
                    expect(dot.x - box.x).to.be.lessThan(22);
                    lastX = dot.x + dot.width;
                }
                expect(note(measure, staff).sourceNote.Length.RealValue).to.equal(length);
            }
            const quarter: DOMRect = stem(0, staff).getBBox();
            const half: DOMRect = stem(0, staff, 2).getBBox();
            expect(half.height / quarter.height).to.be.closeTo(0.5, 0.05);
            expect(stem(4, staff)).to.equal(null);
            expect(dots(4, staff)).to.have.length(0);
            expect(note(4, staff).sourceNote.Length.RealValue).to.equal(1.5);
        }
        for (const staff of [2, 4]) {
            for (let measure: number = 0; measure < 5; measure++) {
                expect(stem(measure, staff)).to.equal(null);
                expect(dots(measure, staff)).to.have.length(0);
            }
        }
        for (const path of Array.from(div.querySelectorAll("svg path"))) {
            expect(path.getAttribute("d")).not.to.match(/NaN|Infinity/);
        }
    }

    it("keeps the default TAB rendering stemless and without rhythm dots", async () => {
        await render();
        expect(div.querySelectorAll(".vf-tab-rhythm-dot")).to.have.length(0);
        for (const staff of [0, 1, 2, 4]) {
            expect(stem(0, staff)).to.equal(null);
        }
    });

    it("draws TAB rhythm with short half stems, honoring directions, chords, beams and stemless/whole/grace notes", async () => {
        await render(true);
        checkRhythm();
        expect(div.querySelectorAll(".vf-tab-rhythm-dot path")).to.have.length(10);
        for (const staff of [0, 1]) {
            expect(note(3, staff).getBeamSVGs().length).to.be.greaterThan(0);
        }
        osmd.EngravingRules.TabBeamsRendered = false;
        osmd.updateGraphic();
        osmd.render();
        checkRhythm();
        expect(note(3, 0).getBeamSVGs()).to.have.length(0);
        // Without the XML stem directions, <stem>none</stem> still keeps the stemless TAB staves stemless.
        osmd.EngravingRules.SetWantedStemDirectionByXml = false;
        osmd.updateGraphic();
        osmd.render();
        expect(stem(0, 2)).to.equal(null);
        expect(stem(0, 4)).to.equal(null);

        const score: Document = sample();
        const main: Element = score.querySelector('part[id="P1"] measure note');
        const grace: Element = main.cloneNode(true) as Element;
        grace.querySelector("duration").remove();
        grace.querySelector("type").textContent = "eighth";
        grace.prepend(score.createElement("grace"));
        main.before(grace);
        await render(true, "svg", score);
        const entries: GraphicalVoiceEntry[] = osmd.GraphicSheet.MeasureList[0][0].staffEntries.flatMap(entry => entry.graphicalVoiceEntries);
        const graceEntry: GraphicalVoiceEntry = entries.find(entry => entry.parentVoiceEntry.IsGrace);
        const mainEntry: GraphicalVoiceEntry = entries.find(entry => !entry.parentVoiceEntry.IsGrace);
        const group: SVGGElement = (graceEntry.notes[0] as VexFlowGraphicalNote).getSVGGElement();
        expect(group.querySelector(".vf-stem")).to.equal(null);
        expect(group.querySelector(".vf-tab-rhythm-dot")).to.equal(null);
        expect((mainEntry.notes[0] as VexFlowGraphicalNote).getSVGGElement().querySelectorAll(".vf-tab-rhythm-dot")).to.have.length(1);
        await render(true, "canvas");
        expect(div.querySelector("canvas")).not.to.equal(null);
    });

    it("omits rhythm on source-hidden notes unless RenderHiddenNotes makes them visible", async () => {
        const score: Document = sample();
        score.querySelector('part[id="P1"] measure note').setAttribute("print-object", "no");
        await render(true, "svg", score);
        expect(dots(0, 0)).to.have.length(0);
        expect(stem(0, 0)).to.equal(null);
        osmd.EngravingRules.RenderHiddenNotes = true;
        osmd.updateGraphic();
        osmd.render();
        expect(dots(0, 0)).to.have.length(1);
        expect(stem(0, 0)).not.to.equal(null);
    });

    it("keeps dot layout on redraw/reflow and includes dots in note coloring and visibility", async () => {
        await render(true);
        const initial: (string | null)[] = dots(1, 0).map(path => path.getAttribute("d"));
        osmd.render();
        expect(dots(1, 0).map(path => path.getAttribute("d"))).to.deep.equal(initial);
        note(1, 0).setColor("#ff0000");
        expect(dots(1, 0).map(path => path.getAttribute("fill"))).to.deep.equal(["#ff0000", "#ff0000"]);
        note(1, 0).setVisible(false);
        expect(dots(1, 0).every(path => getComputedStyle(path).visibility === "hidden")).to.equal(true);
        note(1, 0).setVisible(true);
        expect(dots(1, 0).every(path => getComputedStyle(path).visibility !== "hidden")).to.equal(true);
        div.style.width = "700px";
        osmd.render();
        checkRhythm();
    });
});
