import { expect, vi } from "vitest";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowGraphicalNote } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { TestUtils } from "../../../Util/TestUtils";

describe("TAB fret font weight", () => {
    let div: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(() => { div = TestUtils.getDivElement(document); div.style.width = "1100px"; });
    afterEach(() => { vi.restoreAllMocks(); osmd?.clear(); div.remove(); });

    async function render(weight?: string, backend: "svg" | "canvas" = "svg", family?: string): Promise<void> {
        osmd = new OpenSheetMusicDisplay(div, {autoResize: false, backend});
        if (weight !== undefined) { osmd.EngravingRules.TabFretFontWeight = weight; }
        osmd.EngravingRules.VexFlowTextFontFamily = family;
        await osmd.load(TestUtils.getScore("test_tab_fret_font_weight.musicxml").cloneNode(true) as Document);
        osmd.render();
    }
    function notes(): VexFlowGraphicalNote[] {
        return osmd.GraphicSheet.MeasureList.flatMap(row => row.flatMap(measure => measure.staffEntries
            .flatMap(entry => entry.graphicalVoiceEntries.flatMap(voice => voice.notes)))) as VexFlowGraphicalNote[];
    }
    function frets(): SVGGraphicsElement[] {
        return [...new Set(notes().flatMap(note => note.getNoteheadSVGs()).filter(element => element.tagName === "text"))] as unknown as SVGGraphicsElement[];
    }
    function check(weight: string): void {
        const texts: SVGGraphicsElement[] = frets();
        expect(texts.length).to.be.greaterThan(8);
        expect(texts.map(text => text.textContent)).to.include.members(["7", "12", "(24)"]);
        for (const text of texts) {
            expect(getComputedStyle(text).fontWeight).to.equal(weight);
            const rect: Element = text.previousElementSibling;
            expect(rect.tagName).to.equal("rect");
            if (getComputedStyle(text).fill !== "rgba(0, 0, 0, 0)" && text.textContent !== "") {
                expect(Number(rect.getAttribute("width"))).to.be.closeTo(text.getBBox().width + 4, 0.05);
            } else {
                expect(Number(rect.getAttribute("width"))).to.equal(0);
            }
        }
    }

    it("keeps the normal default and the original main/grace sizes", async () => {
        await render();
        expect(osmd.EngravingRules.TabFretFontWeight).to.equal("normal");
        check("400");
        const grace: VexFlowGraphicalNote = notes().find(note => note.parentVoiceEntry.parentVoiceEntry.IsGrace);
        expect(getComputedStyle(grace.getNoteheadSVGs()[0]).fontSize).to.equal("10px");
        expect(getComputedStyle(frets()[0]).fontSize).to.equal("13.3333px");
    });

    it("draws and measures bold main, chord, parenthesized and grace frets in the existing font family", async () => {
        await render("bold", "svg", "Georgia, Times New Roman");
        check("700");
        for (const text of frets()) { expect(getComputedStyle(text).fontFamily).to.contain("Times New Roman"); }
        const grace: VexFlowGraphicalNote = notes().find(note => note.parentVoiceEntry.parentVoiceEntry.IsGrace);
        expect(getComputedStyle(grace.getNoteheadSVGs()[0]).fontSize).to.equal("10px");
    });

    it("supports a numeric CSS weight without changing fret sizes", async () => {
        await render("600");
        check("600");
        expect(getComputedStyle(frets()[0]).fontSize).to.equal("13.3333px");
    });

    it("treats normal and numeric 400 as the same default weight and layout", async () => {
        await render();
        const minimumWidths: () => number[] = () => osmd.GraphicSheet.MeasureList.map(row => row[0].minimumStaffEntriesWidth);
        const original: number[] = minimumWidths();
        for (const weight of ["400", "normal", " 400 ", " NORMAL "]) {
            osmd.EngravingRules.TabFretFontWeight = weight;
            osmd.updateGraphic();
            osmd.render();
            check("400");
            expect(minimumWidths()).to.deep.equal(original);
        }
    });

    it("uses the selected weight when calculating the measure's minimum layout width", async () => {
        await render("400");
        const regular: number = osmd.GraphicSheet.MeasureList[0][0].minimumStaffEntriesWidth;
        const measure: (text: string, font: string) => number =
            osmd.EngravingRules.TextMeasurer.computeTextWidthInCssFont.bind(osmd.EngravingRules.TextMeasurer);
        // Tabular digits can have equal advances in normal and bold fonts. Model a wider bold face through
        // the public measurer so this layout check is independent of which fonts the machine has installed.
        osmd.EngravingRules.TextMeasurer.computeTextWidthInCssFont = (text: string, font: string): number =>
            measure(text, font) + (font.startsWith("bold ") ? 12 : 0);
        osmd.EngravingRules.TabFretFontWeight = "bold";
        osmd.updateGraphic();
        osmd.render();
        expect(osmd.GraphicSheet.MeasureList[0][0].minimumStaffEntriesWidth).to.be.greaterThan(regular + 0.01);
    });

    it("keeps drawing weighted frets with a custom measurer that has no optional CSS-font method", async () => {
        await render("bold");
        osmd.EngravingRules.TextMeasurer.computeTextWidthInCssFont = undefined;
        osmd.updateGraphic();
        osmd.render();
        check("700");
    });

    it("reserves space for consecutive wide frets in a narrow measure", async () => {
        const score: Document = TestUtils.getScore("test_tab_fret_font_weight.musicxml").cloneNode(true) as Document;
        const measures: Element[] = Array.from(score.querySelectorAll("part > measure"));
        const measure: Element = measures[0];
        const fret: Element = measure.querySelector('notehead[parentheses="yes"]').parentElement.cloneNode(true) as Element;
        for (const note of Array.from(measure.querySelectorAll("note"))) { note.remove(); }
        for (const next of measures.slice(1)) { next.remove(); }
        measure.querySelector("divisions").textContent = "4";
        measure.querySelector("beats").textContent = "3";
        fret.querySelector("type").textContent = "16th";
        for (let i: number = 0; i < 12; i++) { measure.append(fret.cloneNode(true)); }
        div.style.width = "650px";
        osmd = new OpenSheetMusicDisplay(div, {autoResize: false});
        osmd.EngravingRules.TabFretFontWeight = "bold";
        await osmd.load(score);
        osmd.render();
        const texts: SVGGraphicsElement[] = frets();
        expect(texts).to.have.length(12);
        expect(texts.every(text => getComputedStyle(text).fontWeight === "700")).to.equal(true);
        for (let i: number = 1; i < texts.length; i++) {
            const previous: DOMRect = texts[i - 1].getBBox();
            expect(texts[i].getBBox().x - previous.x - previous.width).to.be.at.least(2);
        }
    });

    it("can reset the weight and reflow without changing labels or glyph-based X noteheads", async () => {
        await render();
        const control: () => string[] = () => Array.from(div.querySelectorAll("text"))
            .filter(text => ["Control text", "H", "Full"].includes(text.textContent))
            .map(text => [text.textContent, getComputedStyle(text).fontWeight, getComputedStyle(text).fontSize].join("|"));
        const original: string[] = control();
        expect(original).to.have.length(3);
        const x: () => SVGGraphicsElement = () => notes().flatMap(note => note.getNoteheadSVGs())
            .find(element => element.tagName === "path") as unknown as SVGGraphicsElement;
        const xSize: number[] = [x().getBBox().width, x().getBBox().height];
        for (const [weight, expected] of [["bold", "700"], ["normal", "400"], ["bold", "700"]]) {
            osmd.EngravingRules.TabFretFontWeight = weight;
            osmd.updateGraphic();
            osmd.render();
            check(expected);
            expect(control()).to.deep.equal(original);
            // Glyph paths round to two decimals, so a changed x position can slightly change their measured bounds.
            expect(x().getBBox().width).to.be.closeTo(xSize[0], 0.02);
            expect(x().getBBox().height).to.be.closeTo(xSize[1], 0.02);
        }
        div.style.width = "650px";
        osmd.Zoom = 1.25;
        osmd.render();
        check("700");
        for (const path of Array.from(div.querySelectorAll("path"))) { expect(path.getAttribute("d")).not.to.match(/NaN|Infinity/); }
    });

    it("uses the painted font for Canvas measurements and changes the rendered pixels", async () => {
        await render(undefined, "canvas");
        const image: () => Uint8ClampedArray = () => {
            const canvas: HTMLCanvasElement = div.querySelector("canvas");
            return canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
        };
        const normal: Uint8ClampedArray = image();
        const measured: string[] = [];
        const painted: string[] = [];
        const measureText: typeof CanvasRenderingContext2D.prototype.measureText = CanvasRenderingContext2D.prototype.measureText;
        const fillText: typeof CanvasRenderingContext2D.prototype.fillText = CanvasRenderingContext2D.prototype.fillText;
        vi.spyOn(CanvasRenderingContext2D.prototype, "measureText").mockImplementation(function(this: CanvasRenderingContext2D, text: string): TextMetrics {
            if (text === "(24)") { measured.push(this.font); }
            return measureText.call(this, text);
        });
        vi.spyOn(CanvasRenderingContext2D.prototype, "fillText").mockImplementation(function(this: CanvasRenderingContext2D, text: string,
                x: number, y: number, maxWidth?: number): void {
            if (text === "(24)") { painted.push(this.font); }
            if (maxWidth === undefined) { fillText.call(this, text, x, y); } else { fillText.call(this, text, x, y, maxWidth); }
        });
        osmd.EngravingRules.TabFretFontWeight = "bold";
        osmd.updateGraphic();
        osmd.render();
        expect(measured.length).to.be.greaterThan(0);
        expect(painted.length).to.be.greaterThan(0);
        expect(measured.every(font => font === painted[0] && font.includes("bold"))).to.equal(true);
        expect(image().some((value, index) => value !== normal[index])).to.equal(true);
    });
});
