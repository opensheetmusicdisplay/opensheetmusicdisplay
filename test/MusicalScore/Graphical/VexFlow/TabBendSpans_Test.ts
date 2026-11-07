import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { VexFlowGraphicalNote } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { TestUtils } from "../../../Util/TestUtils";

describe("MuseScore tablature bend spans", () => {
    let div: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(async () => {
        div = TestUtils.getDivElement(document);
        div.style.width = "1200px";
        osmd = new OpenSheetMusicDisplay(div, {autoResize: false, backend: "svg"});
        await osmd.load(TestUtils.getScore("test_tabs_bend_spans_musescore.musicxml").cloneNode(true) as Document);
        osmd.render();
    });
    afterEach(() => { osmd.clear(); div.remove(); });

    function notes(measure: number): VexFlowGraphicalNote[] {
        return osmd.GraphicSheet.MeasureList[measure][0].staffEntries.flatMap(entry =>
            entry.graphicalVoiceEntries.flatMap(voice => voice.notes)) as VexFlowGraphicalNote[];
    }

    function curves(note: VexFlowGraphicalNote): SVGPathElement[] {
        return note.getModifierSVGs().filter(element => element.tagName === "path" && element.getAttribute("fill") === "none") as unknown as SVGPathElement[];
    }

    function label(note: VexFlowGraphicalNote): SVGTextElement {
        return note.getModifierSVGs().find(element => element.tagName === "text" && element.textContent === "1/2") as unknown as SVGTextElement;
    }

    function peak(note: VexFlowGraphicalNote): number {
        const curve: SVGPathElement = curves(note)[0];
        return curve.getPointAtLength(curve.getTotalLength()).x;
    }

    it("anchors all six examples to hidden endpoints, with and without parentheses", () => {
        for (let measure: number = 0; measure < 6; measure++) {
            const entries: VexFlowGraphicalNote[] = notes(measure);
            const starts: number[] = measure === 5 ? [0, 2] : [0];
            for (const index of starts) {
                const target: number = Number(entries[index + 1].getSVGGElement().querySelector("text").getAttribute("x"));
                expect(peak(entries[index]), `bend endpoint in measure ${measure + 1}`).to.be.closeTo(target, 0.5);
                const text: SVGTextElement = label(entries[index]);
                const box: DOMRect = text.getBBox();
                // The text's ink bounds can overhang its x origin (e.g. Arial in Firefox on macOS).
                // Bend centers the label using its measured width and text origin, not its glyph side bearing.
                expect(Number(text.getAttribute("x")) + box.width / 2, "label over endpoint").to.be.closeTo(target, 1);
                expect(text.getAttribute("fill") ?? "#000000", "black bend label").to.equal("#000000");
            }
            if (measure === 1 || measure === 2) {
                expect(curves(entries[0])).to.have.length(2);
                expect(curves(entries[1])).to.have.length(0);
                const release: SVGPathElement = curves(entries[0])[1];
                const end: DOMPoint = release.getPointAtLength(release.getTotalLength());
                const fret: DOMRect = entries[2].getSVGGElement().querySelector("text").getBBox();
                expect(end.x).to.be.lessThan(fret.x);
                expect(end.x).to.be.greaterThan(fret.x - 15);
            }
        }
    });

    it("preserves span coordinates on redraw and exposes all shapes to note colouring", () => {
        const initial: string[] = curves(notes(2)[0]).map(curve => curve.getAttribute("d"));
        osmd.render();
        const note: VexFlowGraphicalNote = notes(2)[0];
        expect(curves(note).map(curve => curve.getAttribute("d"))).to.deep.equal(initial);
        note.setColor("#ff0000");
        for (const element of note.getModifierSVGs()) {
            expect(element.getAttribute(element.getAttribute("fill") === "none" ? "stroke" : "fill")).to.equal("#ff0000");
        }
        div.style.width = "800px";
        osmd.render();
        const resized: VexFlowGraphicalNote[] = notes(2);
        const endpoint: number = Number(resized[1].getSVGGElement().querySelector("text").getAttribute("x"));
        expect(peak(resized[0])).to.be.closeTo(endpoint, 0.5);
        expect(curves(resized[0]).map(curve => curve.getAttribute("d"))).not.to.deep.equal(initial);
        for (const path of Array.from(div.querySelectorAll("path"))) {
            expect(path.getAttribute("d")).not.to.match(/NaN|Infinity/);
        }
    });
    it("retains ordinary bends for visible, mismatched, chord, rest, grace and cross-measure endpoints", async () => {
        const changes: ((document: Document, target: Element) => void)[] = [
            (document, target): void => {
                target.querySelector("notations").removeAttribute("print-object");
                const head: Element = document.createElement("notehead");
                head.setAttribute("parentheses", "yes");
                head.textContent = "normal";
                target.insertBefore(head, target.querySelector("notations"));
            },
            (_document, target): void => { target.setAttribute("print-object", "no"); },
            (document, target): void => {
                const forward: Element = document.createElement("forward");
                const duration: Element = document.createElement("duration");
                duration.textContent = "1";
                forward.appendChild(duration);
                target.before(forward);
                target.querySelector("duration").textContent = "1";
                target.querySelector("type").textContent = "quarter";
            },
            (_document, target): void => { target.querySelector("fret").textContent = "3"; },
            (_document, target): void => { target.querySelector("string").textContent = "3"; },
            (_document, target): void => { target.querySelector("step").textContent = "G"; },
            (document, target): void => {
                const chord: Element = target.cloneNode(true) as Element;
                chord.insertBefore(document.createElement("chord"), chord.firstChild);
                target.after(chord);
            },
            (document, target): void => {
                target.replaceChild(document.createElement("rest"), target.querySelector("pitch"));
                target.querySelector("notations").remove();
            },
            (document, target): void => {
                target.insertBefore(document.createElement("grace"), target.firstChild);
                target.querySelector("duration").remove();
            },
            (document, target): void => {
                const measure: Element = document.createElement("measure");
                measure.setAttribute("number", "1b");
                measure.setAttribute("implicit", "yes");
                target.parentElement.after(measure);
                measure.appendChild(target);
            },
        ];
        for (const change of changes) {
            const document: Document = TestUtils.getScore("test_tabs_bend_spans_musescore.musicxml").cloneNode(true) as Document;
            change(document, document.querySelector("part > measure > note:nth-of-type(2)"));
            await osmd.load(document);
            osmd.render();
            const note: VexFlowGraphicalNote = notes(0)[0];
            const fretX: number = Number(note.getSVGGElement().querySelector("text").getAttribute("x"));
            expect(peak(note) - fretX, "normal short bend").to.be.lessThan(50);
        }
        const hiddenEnd: Document = TestUtils.getScore("test_tabs_bend_spans_musescore.musicxml").cloneNode(true) as Document;
        hiddenEnd.querySelectorAll("part > measure")[1].querySelectorAll("note")[2].setAttribute("print-object", "no");
        await osmd.load(hiddenEnd);
        expect(() => osmd.render()).not.to.throw();
        expect(curves(notes(1)[0]), "bend still reaches the peak").to.have.length(1);
        expect(curves(notes(1)[1]), "release is retained when it cannot be combined").to.have.length(1);
    });

    it("draws the same score with the canvas backend", async () => {
        osmd.clear();
        osmd = new OpenSheetMusicDisplay(div, {autoResize: false, backend: "canvas"});
        await osmd.load(TestUtils.getScore("test_tabs_bend_spans_musescore.musicxml").cloneNode(true) as Document);
        expect(() => osmd.render()).not.to.throw();
        expect(div.querySelector("canvas")).not.to.equal(null);
        expect(osmd.GraphicSheet.MeasureList).to.have.length(6);
    });
});
