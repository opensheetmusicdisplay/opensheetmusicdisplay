import { expect } from "vitest";
import Vex from "vexflow";
import VF = Vex.Flow;
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowGraphicalNote } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { TestUtils } from "../../../Util/TestUtils";

type RhythmTabNote = VF.TabNote & {getModifiers(): VF.Modifier[], beam?: VF.Beam, render_options: {draw_stem: boolean}};

describe("TAB rhythm and augmentation dots", () => {
    let div: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(() => { div = TestUtils.getDivElement(document); div.style.width = "1100px"; });
    afterEach(() => { osmd?.clear(); div.remove(); });

    async function render(rhythm: boolean = false, backend: "svg" | "canvas" = "svg", beams: boolean = true,
                          score?: Document): Promise<void> {
        osmd = new OpenSheetMusicDisplay(div, {autoResize: false, backend});
        expect(osmd.EngravingRules.TabRhythmRendered).to.equal(false);
        osmd.EngravingRules.TabRhythmRendered = rhythm;
        osmd.EngravingRules.TabBeamsRendered = beams;
        // This is the MusicXML exported from the original native MuseScore reference next to it.
        await osmd.load(score ?? TestUtils.getScore("tab-rhythm-dots/tab-rhythm-reference.musicxml").cloneNode(true) as Document);
        osmd.render();
    }

    function note(measure: number, staff: number, entry: number = 0): VexFlowGraphicalNote {
        return osmd.GraphicSheet.MeasureList[measure][staff].staffEntries[entry].graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote;
    }
    function tab(measure: number, staff: number, entry: number = 0): RhythmTabNote {
        return note(measure, staff, entry).vfnote[0] as RhythmTabNote;
    }
    function dotPaths(measure: number, staff: number): SVGPathElement[] {
        return Array.from(note(measure, staff).getSVGGElement().querySelectorAll<SVGPathElement>(".vf-tab-rhythm-dot path"));
    }
    function checkDots(): void {
        // One set of dots per chord, including beamed notes; not one per fret.
        for (const staff of [0, 1]) {
            for (const [measure, dots, length] of [[0, 1, 3 / 8], [1, 2, 7 / 16], [2, 1, 3 / 8], [3, 1, 3 / 16]]) {
                const paths: SVGPathElement[] = dotPaths(measure, staff);
                expect(paths).to.have.length(dots);
                const vf: VF.TabNote = tab(measure, staff);
                expect(vf.getStemDirection()).to.equal(staff === 0 ? VF.Stem.DOWN : VF.Stem.UP);
                // The dot sits beside the base of the rhythm stem, outside the fret staff.
                const baseY: number = vf.getStemExtents().baseY;
                const stave: VF.Stave = vf.getStave();
                expect(staff === 0 ? baseY > stave.getYForLine(5) : baseY < stave.getYForLine(0)).to.equal(true);
                let lastX: number = vf.getStemX();
                for (const path of paths) {
                    const box: DOMRect = path.getBBox();
                    expect(box.y + box.height / 2).to.be.closeTo(baseY, 0.1);
                    expect(box.x).to.be.greaterThan(lastX);
                    expect(box.x - vf.getStemX()).to.be.lessThan(22);
                    lastX = box.x;
                }
                // Adding a glyph must not add a second augmentation to the logical duration.
                expect(note(measure, staff).sourceNote.Length.RealValue).to.equal(length);
                expect(vf.getTicks().value()).to.equal(length * VF.RESOLUTION);
            }
            // MuseScore leaves whole notes stemless and without TAB rhythm dots.
            expect(dotPaths(4, staff)).to.have.length(0);
            expect(tab(4, staff).render_options.draw_stem).not.to.equal(true);
            expect(note(4, staff).sourceNote.Length.RealValue).to.equal(1.5);
        }
        for (const staff of [2, 4]) {
            for (let measure: number = 0; measure < 5; measure++) {
                expect(dotPaths(measure, staff)).to.have.length(0);
                expect(tab(measure, staff).render_options.draw_stem).not.to.equal(true);
            }
        }
        for (const path of Array.from(div.querySelectorAll("svg path"))) {
            expect(path.getAttribute("d")).not.to.match(/NaN|Infinity/);
        }
    }

    it("keeps the default TAB rendering stemless and adds no dot modifiers or spacing", async () => {
        await render();
        expect(div.querySelectorAll(".vf-tab-rhythm-dot")).to.have.length(0);
        for (const staff of [0, 1, 2, 4]) {
            expect(tab(0, staff).getModifiers().filter(modifier => modifier.getCategory() === "dots")).to.have.length(0);
            expect(tab(0, staff).render_options.draw_stem).not.to.equal(true);
        }
    });

    it("places dots by up/down rhythm stems and beams, honoring explicit stemless TAB", async () => {
        await render(true);
        checkDots();
        expect(div.querySelectorAll(".vf-tab-rhythm-dot path")).to.have.length(10);
        for (const staff of [0, 1]) {
            expect(tab(3, staff).beam).to.be.instanceOf(VF.Beam);
        }
    });

    it("supports disabling beams and falls back to up stems when XML omits a direction", async () => {
        const score: Document = TestUtils.getScore("tab-rhythm-dots/tab-rhythm-reference.musicxml").cloneNode(true) as Document;
        score.querySelector('part[id="P2"] measure note stem').remove();
        await render(true, "svg", false, score);
        checkDots();
        expect(tab(3, 0).beam).to.equal(null);
        expect(tab(3, 1).beam).to.equal(null);
        osmd.EngravingRules.SetWantedStemDirectionByXml = false;
        osmd.updateGraphic();
        osmd.render();
        expect(tab(0, 0).getStemDirection()).to.equal(VF.Stem.UP);
        expect(tab(0, 2).render_options.draw_stem).not.to.equal(true);
        expect(tab(0, 4).render_options.draw_stem).not.to.equal(true);
    });

    it("retains layout on redraw and resize, and includes dots in note coloring and visibility", async () => {
        await render(true);
        const initial: (string | null)[] = dotPaths(1, 0).map(path => path.getAttribute("d"));
        osmd.render();
        expect(dotPaths(1, 0).map(path => path.getAttribute("d"))).to.deep.equal(initial);
        note(1, 0).setColor("#ff0000");
        expect(dotPaths(1, 0).map(path => path.getAttribute("fill"))).to.deep.equal(["#ff0000", "#ff0000"]);
        note(1, 0).setVisible(false);
        expect(dotPaths(1, 0).every(path => getComputedStyle(path).visibility === "hidden")).to.equal(true);
        note(1, 0).setVisible(true);
        expect(dotPaths(1, 0).every(path => getComputedStyle(path).visibility !== "hidden")).to.equal(true);
        div.style.width = "700px";
        osmd.render();
        checkDots();
    });

    it("renders the same dot modifiers with the canvas backend", async () => {
        await render(true, "canvas");
        expect(div.querySelector("canvas")).not.to.equal(null);
        expect(tab(1, 0).getModifiers().filter(modifier => modifier.getCategory() === "dots")).to.have.length(2);
        expect(tab(1, 0).getTicks().value()).to.equal(7 / 16 * VF.RESOLUTION);
    });
});
