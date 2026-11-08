import { expect } from "vitest";
import Vex from "vexflow";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowGraphicalNote } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { TestUtils } from "../../../Util/TestUtils";

describe("Initial TAB note, stem and flag colors", () => {
    let div: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(() => { div = TestUtils.getDivElement(document); div.style.width = "1100px"; });
    afterEach(() => { osmd?.clear(); div.remove(); });
    async function render(backend: "svg" | "canvas" = "svg"): Promise<void> {
        osmd = new OpenSheetMusicDisplay(div, {
            autoResize: false, backend, defaultColorNotehead: "#cc6600",
            defaultColorStem: "#008844", colorStemsLikeNoteheads: false,
        });
        osmd.EngravingRules.TabRhythmRendered = true;
        await osmd.load(TestUtils.getScore("test_tab_note_colors.musicxml").cloneNode(true) as Document);
        osmd.render();
    }
    function note(measure: number, entry: number, index: number = 0): VexFlowGraphicalNote {
        return osmd.GraphicSheet.MeasureList[measure][0].staffEntries[entry].graphicalVoiceEntries[0].notes[index] as VexFlowGraphicalNote;
    }
    function check(): void {
        expect(getComputedStyle(note(0, 0).getNoteheadSVGs()[0]).fill).to.equal("rgb(204, 102, 0)");
        const chord: VexFlowGraphicalNote[] = osmd.GraphicSheet.MeasureList[1][0].staffEntries[0].graphicalVoiceEntries[0].notes as VexFlowGraphicalNote[];
        const colors: string[] = chord[0].getNoteheadSVGs().map(fret => getComputedStyle(fret).fill);
        expect(colors).to.deep.equal(["rgb(255, 0, 0)", "rgb(204, 102, 0)"]);
        expect(getComputedStyle(note(1, 1).getStemSVG()).stroke).to.equal("rgb(0, 136, 68)");
        const flag: HTMLElement = note(1, 1).getFlagSVG();
        expect(flag).not.to.equal(null);
        expect(getComputedStyle(flag).fill).to.equal("rgb(0, 136, 68)");
        const hidden: HTMLElement = note(1, 3).getNoteheadSVGs()[0];
        expect(getComputedStyle(hidden).fill).to.equal("rgba(0, 0, 0, 0)");
        expect(Number(hidden.previousElementSibling.getAttribute("width"))).to.equal(0);
    }
    it("applies default and per-chord-member XML colors during native drawing", async () => {
        await render();
        check();
        osmd.render();
        check();
        div.style.width = "700px";
        osmd.render();
        check();
    });
    it("ignores source colors when coloring is disabled while keeping defaults and hidden notes", async () => {
        await render();
        osmd.EngravingRules.ColoringEnabled = false;
        osmd.render();
        for (const n of osmd.GraphicSheet.MeasureList[1][0].staffEntries[0].graphicalVoiceEntries[0].notes as VexFlowGraphicalNote[]) {
            expect(getComputedStyle(n.getNoteheadSVGs()[0]).fill).to.equal("rgb(204, 102, 0)");
        }
        expect(getComputedStyle(note(1, 3).getNoteheadSVGs()[0]).fill).to.equal("rgba(0, 0, 0, 0)");
    });
    it("supports the same colors in the canvas renderer", async () => {
        await render("canvas");
        const canvas: HTMLCanvasElement = div.querySelector("canvas");
        expect(canvas).not.to.equal(null);
        const pixels: Uint8ClampedArray = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
        for (const [red, green, blue] of [[204, 102, 0], [0, 136, 68], [255, 0, 0]]) {
            let count: number = 0;
            for (let i: number = 0; i < pixels.length; i += 4) {
                if (pixels[i] === red && pixels[i + 1] === green && pixels[i + 2] === blue && pixels[i + 3] > 0) { count++; }
            }
            expect(count).to.be.greaterThan(0);
        }
    });
    it("keeps flag color policy and runtime visibility independent of the fret color", async () => {
        await render();
        osmd.EngravingRules.ColorStemsLikeNoteheads = true;
        osmd.EngravingRules.ColorFlags = false;
        osmd.render();
        const n: VexFlowGraphicalNote = note(1, 1);
        expect(getComputedStyle(n.getStemSVG()).stroke).to.equal("rgb(204, 102, 0)");
        const flag: HTMLElement = n.getFlagSVG();
        expect(getComputedStyle(flag).fill).to.equal("rgb(0, 136, 68)");
        n.setColor("#0000ff");
        expect(getComputedStyle(flag).fill).to.equal("rgb(0, 0, 255)");
        n.setVisible(false);
        expect(getComputedStyle(flag).visibility).to.equal("hidden");
    });
    for (const mergeGroups of [true, false]) {
        it(`keeps stem and flag recoloring options independent with SVG group merging ${mergeGroups}`, async () => {
            await render();
            osmd.EngravingRules.SVGMergeSingleChildGroups = mergeGroups;
            osmd.render();
            const n: VexFlowGraphicalNote = note(1, 1);
            expect(n.getFlagSVG().tagName).to.equal(mergeGroups ? "path" : "g");
            expect(n.getModifierSVGs().some(element => element.classList.contains("vf-stem") ||
                element.classList.contains("vf-flag"))).to.equal(false);
            n.setColor("#0000ff", {applyToStem: false, applyToFlag: false});
            expect(getComputedStyle(n.getNoteheadSVGs()[0]).fill).to.equal("rgb(0, 0, 255)");
            expect(getComputedStyle(n.getStemSVG()).stroke).to.equal("rgb(0, 136, 68)");
            const flag: Element = mergeGroups ? n.getFlagSVG() : n.getFlagSVG().querySelector("path");
            expect(getComputedStyle(flag).fill).to.equal("rgb(0, 136, 68)");
            n.setColor("#ff0000", {applyToModifiers: false});
            expect(getComputedStyle(n.getStemSVG()).stroke).to.equal("rgb(255, 0, 0)");
            expect(getComputedStyle(flag).fill).to.equal("rgb(255, 0, 0)");
        });
    }
    it("preserves the caller's saved style around drawing a fret and flag", async () => {
        await render();
        const context: Vex.IRenderContext = osmd.Drawer.Backends[0].getContext();
        context.setFillStyle("#123456");
        context.save();
        context.setFillStyle("#ff00ff");
        (note(1, 1).vfnote[0] as Vex.Flow.TabNote).draw();
        context.restore();
        context.fillText("style probe", 0, 0);
        const probe: Element = Array.from(div.querySelectorAll("text")).find(text => text.textContent === "style probe");
        expect(getComputedStyle(probe).fill).to.equal("rgb(18, 52, 86)");
    });
    it("preserves independent grace-note colors with unmerged SVG groups", async () => {
        const score: Document = TestUtils.getScore("test_tab_note_colors.musicxml").cloneNode(true) as Document;
        const first: Element = score.querySelector("part > measure note");
        const grace: Element = first.cloneNode(true) as Element;
        grace.prepend(score.createElement("grace"));
        grace.querySelector("duration").remove();
        grace.querySelector("type").textContent = "eighth";
        grace.setAttribute("color", "#0000ff");
        first.before(grace);
        osmd = new OpenSheetMusicDisplay(div, {autoResize: false, defaultColorNotehead: "#cc6600"});
        osmd.EngravingRules.SVGMergeSingleChildGroups = false;
        osmd.EngravingRules.TabRhythmRendered = true;
        await osmd.load(score);
        osmd.render();
        const voices: any[] = osmd.GraphicSheet.MeasureList[0][0].staffEntries[0].graphicalVoiceEntries;
        const graceNote: VexFlowGraphicalNote = voices.find(voice => voice.parentVoiceEntry.IsGrace).notes[0];
        const mainNote: VexFlowGraphicalNote = voices.find(voice => !voice.parentVoiceEntry.IsGrace).notes[0];
        expect(getComputedStyle(graceNote.getNoteheadSVGs()[0]).fill).to.equal("rgb(0, 0, 255)");
        expect(getComputedStyle(mainNote.getNoteheadSVGs()[0]).fill).to.equal("rgb(204, 102, 0)");
        mainNote.setColor("#ff0000");
        expect(getComputedStyle(graceNote.getNoteheadSVGs()[0]).fill).to.equal("rgb(0, 0, 255)");
    });
});
