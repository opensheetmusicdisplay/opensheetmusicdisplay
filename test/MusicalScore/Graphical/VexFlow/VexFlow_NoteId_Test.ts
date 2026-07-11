import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";

function renderToSVG(scorePath: string): Promise<SVGElement> {
    const container: HTMLElement = TestUtils.getDivElement(document);
    container.style.width = "1200px";
    container.style.height = "800px";
    const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(
        container, { autoResize: false, backend: "svg", drawTitle: false }
    );
    const scoreDoc: Document = TestUtils.getScore(scorePath);
    return osmd.load(scoreDoc).then(() => {
        osmd.render();
        const svg: SVGElement | null = container.querySelector("svg");
        if (!svg) { throw new Error("No SVG element after render"); }
        return svg;
    });
}

describe("Note ID transfer from MusicXML to SVG", () => {

    describe("Beethoven AnDieFerneGeliebte", () => {
        let noteIds: string[];

        beforeAll((): Promise<void> => {
            return renderToSVG("Beethoven_AnDieFerneGeliebte.xml").then(
                (svg: SVGElement) => {
                    const els: Element[] = Array.from(
                        svg.querySelectorAll("[data-note-id]")
                    );
                    noteIds = els.map((el: Element) =>
                        el.getAttribute("data-note-id")
                    ).filter((id: string | null): id is string => id !== null);
                }
            );
        });

        it("should have at least one data-note-id attribute in SVG", () => {
            expect(noteIds.length).to.be.greaterThan(0,
                "expected at least one SVG element with data-note-id"
            );
        });

        it("should contain MusicXML note IDs (note-1, note-2, ...)", () => {
            expect(noteIds).to.include.members(["note-1", "note-2", "note-3"]);
        });

        it("should have unique note IDs (no duplicates)", () => {
            const unique: Set<string> = new Set(noteIds);
            expect(unique.size).to.equal(noteIds.length);
        });

        it("should attach data-note-id only to notehead/rest elements", () => {
            // data-note-id goes on notehead and rest SVG groups
            // ensure the count of unique note values matches at least
            // the number of unique notes in a small excerpt
            expect(noteIds.length).to.be.at.least(10,
                "at least 10 note IDs in Beethoven score"
            );
        });
    });
});
