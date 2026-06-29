
import { expect } from "chai";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";

interface MeasureWidthInfo {
    index: number;
    startX: number;
    endX: number;
    width: number;
    noteheadCount: number;
    graceCount: number;
    id: string;
}

function getMeasureWidths(svg: SVGElement): MeasureWidthInfo[] {
    const measures: MeasureWidthInfo[] = [];
    const measureGroups: NodeListOf<Element> =
        svg.querySelectorAll("[class*='vf-measure']");

    for (let i: number = 0; i < measureGroups.length; i++) {
        const mg: Element = measureGroups[i];
        const id: string = mg.getAttribute("id") || "";
        const staveG: Element | null = mg.querySelector("[class*='vf-stave']");
        if (!staveG) { continue; }

        const linePaths: NodeListOf<Element> =
            staveG.querySelectorAll("path");
        let minX: number = Infinity;
        let maxX: number = -Infinity;

        for (let j: number = 0; j < linePaths.length; j++) {
            const d: string = linePaths[j].getAttribute("d") || "";
            const match: RegExpMatchArray | null =
                d.match(/M([\d.]+)\s+[\d.]+\s*L([\d.]+)\s+[\d.]+/);
            if (match) {
                const sx: number = parseFloat(match[1]);
                const ex: number = parseFloat(match[2]);
                if (sx < minX) { minX = sx; }
                if (ex > maxX) { maxX = ex; }
            }
        }

        if (minX === Infinity || maxX === -Infinity) { continue; }

        const allContent: string = mg.innerHTML;
        // Count rendered noteheads (regular + grace)
        const noteheadCount: number =
            (allContent.match(/class=['"][^'"]*vf-notehead[^'"]*['"]/g) || []).length;
        const graceCount: number =
            (allContent.match(/class=['"][^'"]*vf-grace\S*head[^'"]*['"]/g) || []).length +
            (allContent.match(/class=['"][^'"]*vf-grace\S*stem[^'"]*['"]/g) || []).length +
            (allContent.match(/class=['"][^'"]*vf-grace\S*flag[^'"]*['"]/g) || []).length;

        measures.push({
            index: i,
            startX: minX,
            endX: maxX,
            width: maxX - minX,
            noteheadCount,
            graceCount,
            id,
        });
    }
    return measures;
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
        if (!svg) { throw new Error("No SVG element after render"); }
        return svg;
    });
}

describe("Grace Note Measure Width", () => {

    describe("OSMD_function_test_GraceNotes.xml", () => {
        let measures: MeasureWidthInfo[];

        before(function (): Promise<void> {
            this.timeout(20000);
            return renderToSVG("OSMD_function_test_GraceNotes.xml").then(
                (svg: SVGElement) => {
                    measures = getMeasureWidths(svg);
                }
            );
        });

        it("should have at least 4 measures", () => {
            expect(measures.length).to.be.at.least(4,
                "expected 4+ measures");
        });

        it("should not have excessively wide grace-note measures", () => {
            // M1 has grace notes, M2 has grace slashes, M3 has multiple grace notes.
            // M4 has invisible grace notes. Measure >600px is excessive.
            const wideMeasures: MeasureWidthInfo[] = measures.filter(
                (m: MeasureWidthInfo) => m.width > 600
            );
            expect(wideMeasures).to.deep.equal([],
                wideMeasures.length +
                " measures exceed 600px width:\n" +
                wideMeasures.map((m: MeasureWidthInfo) =>
                    `  M${m.id} width=${m.width.toFixed(1)}px`
                ).join("\n"));
            for (const m of measures) {
                if (m.width > 200) {
                    console.warn(
                        "MEASURE: M" + m.id + " width=" +
                        m.width.toFixed(1) + "px " +
                        "(reasonable target <200px for " +
                        m.noteheadCount + " noteheads)"
                    );
                }
            }
        });

        it("should not blow up with invisible grace notes", () => {
            // M4 has ~25 invisible grace notes. Each adds GraceNoteExtraSpacing=3.0
            // OSMD units (30px). Without proper accounting this balloons.
            // Max reasonable: ~60px per main note + grace overhead
            for (const m of measures) {
                if (m.width > 800) {
                    // record but don't fail — currently this is expected
                    console.warn(
                        "WIDE MEASURE: M" + m.id + " width=" +
                        m.width.toFixed(1) + "px " +
                        "(noteheads=" + m.noteheadCount +
                        " grace=" + m.graceCount + ")"
                    );
                }
            }
            // Current behavior: M4 is ~950px with invisible grace notes.
            // This is excessive but known. Track via console.warn.
            // When fixed, lower this threshold.
            const extremeMeasures: MeasureWidthInfo[] = measures.filter(
                (m: MeasureWidthInfo) => m.width > 1000
            );
            expect(extremeMeasures).to.deep.equal([],
                extremeMeasures.length +
                " measures exceed 1000px:\n" +
                extremeMeasures.map((m: MeasureWidthInfo) =>
                    `  M${m.id} width=${m.width.toFixed(1)}px`
                ).join("\n"));
        });
    });

    describe("OSMD_function_test_invisible_notes.musicxml", () => {
        let measures: MeasureWidthInfo[];

        before(function (): Promise<void> {
            this.timeout(20000);
            return renderToSVG(
                "OSMD_function_test_invisible_notes.musicxml"
            ).then((svg: SVGElement) => {
                measures = getMeasureWidths(svg);
            });
        });

        it("should have inline-grace measures not excessively wider than non-grace", () => {
            // M9 has an invisible note with a visible grace note.
            // Compare width to comparable non-grace measures.
            if (measures.length < 10) {
                expect(measures.length).to.be.at.least(10);
                return;
            }
            // M9 (index 8) = 4 quarter notes + invisible main note + visible grace
            // Compare to M7 (index 6) = 4 quarter notes, no grace notes
            const m7: MeasureWidthInfo = measures[6];
            const m9: MeasureWidthInfo = measures[8];
            // M9 should not be > 3x wider than M7 for one extra invisible note+grace
            const ratio: number = m9.width / m7.width;
            expect(ratio).to.be.lessThan(
                3.0,
                "M9 with grace (" + m9.width.toFixed(1) +
                "px) is " + ratio.toFixed(1) +
                "x wider than M7 without grace (" +
                m7.width.toFixed(1) + "px)"
            );
            if (ratio > 2.0) {
                console.warn(
                    "WIDE RATIO: M9/M7 = " + ratio.toFixed(1) +
                    " (M7=" + m7.width.toFixed(1) +
                    "px, M9=" + m9.width.toFixed(1) + "px)"
                );
            }
        });
    });

    describe("test_grace_slash.musicxml", () => {
        let measures: MeasureWidthInfo[];

        before(function (): Promise<void> {
            this.timeout(20000);
            return renderToSVG("test_grace_slash.musicxml").then(
                (svg: SVGElement) => {
                    measures = getMeasureWidths(svg);
                }
            );
        });

        it("single grace-slash measure should not exceed 600px", () => {
            expect(measures.length).to.be.at.least(1);
            const maxW: number = Math.max(
                ...measures.map((m: MeasureWidthInfo) => m.width)
            );
            expect(maxW).to.be.lessThan(
                600,
                "max measure width=" + maxW.toFixed(1) + "px"
            );
            // Grace-slash measure has 3 normal notes + grace slashes.
            // Reasonable target: <300px (currently ~565px, ~1.9x too wide).
            if (maxW > 300) {
                console.warn(
                    "WIDE: grace-slash measure " + maxW.toFixed(1) +
                    "px (target <300px)"
                );
            }
        });
    });

    describe("test_grace_note_fingerings_Ysaye_excerpt.musicxml", () => {
        let measures: MeasureWidthInfo[];

        before(function (): Promise<void> {
            this.timeout(20000);
            return renderToSVG(
                "test_grace_note_fingerings_Ysaye_excerpt.musicxml"
            ).then((svg: SVGElement) => {
                measures = getMeasureWidths(svg);
            });
        });

        it("measure with many 32nd notes + graces should not exceed 950px", () => {
            // The single measure has 3 grace notes + 11 beamed 32nds + 1 eighth.
            // Current: ~937px. Reasonable target: ~400px (3 grace + 12 normal notes).
            let totalWidth: number = 0;
            for (const m of measures) {
                totalWidth += m.width;
            }
            const maxW: number = Math.max(
                ...measures.map((m: MeasureWidthInfo) => m.width)
            );
            expect(maxW).to.be.lessThan(
                950,
                "max measure width=" + maxW.toFixed(1) +
                "px (total=" + totalWidth.toFixed(1) +
                "px across " + measures.length + " measures)"
            );
            if (maxW > 400) {
                console.warn(
                    "WIDE: Ysaye measure " + maxW.toFixed(1) +
                    "px (reasonable target <400px for " +
                    "3 grace + 12 regular notes)"
                );
            }
        });
    });
});
