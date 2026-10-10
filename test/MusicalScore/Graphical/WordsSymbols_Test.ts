import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import Vex from "vexflow";
import { VexFlowInlineSymbol } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowInlineSymbol";

describe("Symbols in words directions", () => {
    it("prints symbols between words, keeps distinct tempo markings and omits only unknown symbols", async () => {
        const container: HTMLElement = TestUtils.getDivElement(document);
        container.style.width = "1300px";
        try {
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
            await osmd.load(TestUtils.getScore("test_words_symbols.musicxml"));
            osmd.render();
            const symbols: Element[] = Array.from(container.querySelectorAll(".vf-wordsymbol"));
            expect(symbols.map(symbol => symbol.getAttribute("data-symbol"))).to.have.members([
                "metNote8thUp", "metNote16thDown", "metAugmentationDot",
                "metNoteWhole", "metNoteHalfDown", "metNoteQuarterUp", "metNote8thDown"
            ]);
            for (const symbol of symbols) {
                const box: DOMRect = (symbol as SVGGraphicsElement).getBBox();
                expect(box.width, symbol.getAttribute("data-symbol")).to.be.greaterThan(0);
                expect(box.height, symbol.getAttribute("data-symbol")).to.be.greaterThan(0);
                const following: SVGGraphicsElement = symbol.nextElementSibling as SVGGraphicsElement;
                if (following?.querySelector("text")) {
                    expect(following.getBBox().x, "following words clear " + symbol.getAttribute("data-symbol"))
                        .to.be.at.least(box.x + box.width);
                }
            }
            const texts: string[] = Array.from(container.querySelectorAll("text")).map(text => text.textContent);
            expect(texts).to.include.members(["Fast (Straight", ")", "Hold (", "),", "then play (", ") Keep going", "cresc."]);
            expect(osmd.Sheet.SourceMeasures[0].TempoExpressions.slice(0, 2).map(expression =>
                expression.InstantaneousTempo.TempoInBpm), "inferred and explicit tempos are unchanged")
                .to.deep.equal([112, 160]);
        } finally {
            container.remove();
        }
    });

    it("uses the measured ink bounds for the basic note family on SVG and Canvas", () => {
        const names: string[] = ["metNoteWhole", ...["Half", "Quarter", "8th", "16th", "32nd", "64th", "128th"]
            .flatMap(duration => ["metNote" + duration + "Up", "metNote" + duration + "Down"]), "metAugmentationDot"];
        const container: HTMLElement = TestUtils.getDivElement(document);
        const canvas: HTMLCanvasElement = document.createElement("canvas");
        canvas.width = names.length * 40;
        canvas.height = 40;
        try {
            const svgContext: Vex.IRenderContext = new Vex.Flow.Renderer(container, Vex.Flow.Renderer.Backends.SVG).getContext();
            const canvasContext: Vex.IRenderContext = new Vex.Flow.Renderer(canvas, Vex.Flow.Renderer.Backends.CANVAS).getContext();
            const pixels: CanvasRenderingContext2D = canvas.getContext("2d");
            names.forEach((name, index) => {
                const x: number = 40 * index;
                const symbol: VexFlowInlineSymbol = VexFlowInlineSymbol.create(name);
                const group: SVGGraphicsElement = symbol.draw(svgContext, x, 0, 30, name) as SVGGraphicsElement;
                VexFlowInlineSymbol.create(name).draw(canvasContext, x, 0, 30, name);
                const box: DOMRect = group.getBBox();
                expect(box.width, name).to.be.greaterThan(0);
                expect(box.x, name + " left").to.be.at.least(x);
                expect(box.x + box.width, name + " right").to.be.at.most(x + symbol.Width * 30 + 0.01);
                expect(box.y, name + " top").to.be.at.least(0);
                expect(box.y + box.height, name + " bottom").to.be.at.most(30);
                const data: Uint8ClampedArray = pixels.getImageData(x, 0, 40, 40).data;
                expect(data.some((value, offset) => offset % 4 === 3 && value > 0), name + " Canvas ink").to.equal(true);
            });
        } finally {
            container.remove();
        }
    });
});
