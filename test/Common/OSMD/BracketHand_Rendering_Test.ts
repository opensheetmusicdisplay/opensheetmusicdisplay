
import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../Util/TestUtils";

interface BracketLineInfo {
    x: number;
    y1: number;
    y2: number;
    isVertical: boolean;
}

function parseBracketPath(pathEl: Element): BracketLineInfo | undefined {
    const d: string = pathEl.getAttribute("d") || "";
    const match: RegExpMatchArray | null =
        d.match(/M([\d.]+)\s+([\d.]+)L([\d.]+)\s+([\d.]+)/);
    if (!match) {
        return undefined;
    }
    const x1: number = parseFloat(match[1]);
    const y1: number = parseFloat(match[2]);
    const x2: number = parseFloat(match[3]);
    const y2: number = parseFloat(match[4]);
    const eps: number = 0.001;
    return {
        x: x1,
        y1,
        y2,
        isVertical: Math.abs(x2 - x1) < eps,
    };
}

function renderToSVG(scorePath: string): Promise<SVGElement> {
    const container: HTMLElement = TestUtils.getDivElement(document);
    container.style.width = "1200px";
    container.style.height = "1600px";
    const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(
        container, { autoResize: false, backend: "svg", drawTitle: false }
    );
    const scoreDoc: Document = TestUtils.getScore(scorePath);
    return osmd.load(scoreDoc).then(() => {
        osmd.render();
        const svg: SVGElement | null = container.querySelector("svg");
        if (!svg) {
            throw new Error("No SVG element after render");
        }
        return svg;
    });
}

describe("Bracket Hand Rendering", () => {
    let bracketPairs: BracketLineInfo[][];

    beforeAll(function (): Promise<void> {
        return renderToSVG("bracket-hand.musicxml").then(
            (svg: SVGElement) => {
                const lines: NodeListOf<Element> =
                    svg.querySelectorAll(".vf-line > path, .vf-line path");
                const allLines: BracketLineInfo[] = [];
                for (let i: number = 0; i < lines.length; i++) {
                    const info: BracketLineInfo | undefined =
                        parseBracketPath(lines[i]);
                    if (info) {
                        allLines.push(info);
                    }
                }
                bracketPairs = [];
                for (let i: number = 0; i + 1 < allLines.length; i += 2) {
                    bracketPairs.push([allLines[i], allLines[i + 1]]);
                }
            }
        );
    });

    it("should render brackets", () => {
        expect(bracketPairs.length).to.be.greaterThan(0,
            "no bracket lines found");
    });

    it("should have at least 3 brackets (measures 2,3,4)", () => {
        expect(bracketPairs.length).to.be.at.least(3);
    });

    it("all brackets should have vertical and horizontal components", () => {
        for (let i: number = 0; i < bracketPairs.length; i++) {
            const [v, h] = bracketPairs[i];
            expect(v.isVertical).to.equal(true,
                `bracket[${i}] first line should be vertical`);
            expect(h.isVertical).to.equal(false,
                `bracket[${i}] second line should be horizontal`);
        }
    });

    it("vertical line should span the note range (20px for single, 40px for chord)", () => {
        for (let i: number = 0; i < bracketPairs.length; i++) {
            const [v] = bracketPairs[i];
            const span: number = Math.abs(v.y2 - v.y1);
            // Single-note brackets span ~20px, chord brackets span ~40px
            expect(span).to.be.at.least(15,
                `bracket[${i}] vertical span too small: ${span}`);
            expect(span).to.be.at.most(50,
                `bracket[${i}] vertical span too large: ${span}`);
        }
    });
});
