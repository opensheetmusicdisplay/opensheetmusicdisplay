import { expect } from "vitest";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalContinuousDynamicExpression } from "../../../src/MusicalScore/Graphical/GraphicalContinuousDynamicExpression";
import { GraphicalLine } from "../../../src/MusicalScore/Graphical/GraphicalLine";
import { MusicSystem } from "../../../src/MusicalScore/Graphical/MusicSystem";

/**
 * A wedge that the drawing range (drawFromMeasureNumber, drawUpToMeasureNumber) cuts off is drawn like a wedge going on before or
 * after a system break: from the start of the first measure drawn, and to the end of the last one, open there. It wasn't drawn at
 * all before (and a cut-off end logged "Not enough lines for SkyBottomLine calculation").
 */
describe("Wedges cut off by the drawing range", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = "800px";
        document.body.appendChild(container);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    /** The parts of wedges in each system: the x of their start and end, and their opening there (how far the lower line is from
     *  the upper one, 0 at the point of a wedge), rounded. */
    function wedgePartsOfSystems(): string[][] {
        return osmd.GraphicSheet.MusicPages[0].MusicSystems.map((system: MusicSystem): string[] =>
            system.StaffLines[0].AbstractExpressions
                .filter(expression => expression instanceof GraphicalContinuousDynamicExpression)
                .map((wedge: GraphicalContinuousDynamicExpression): string => {
                    if (wedge.Lines.length < 2) {
                        return "without lines";
                    }
                    const [upper, lower]: GraphicalLine[] = wedge.Lines;
                    return [upper.Start.x, upper.End.x, lower.Start.y - upper.Start.y, lower.End.y - upper.End.y]
                        .map((value: number): string => value.toFixed(3)).join(" ");
                }));
    }

    it("draws the parts of a wedge in the systems drawn as render() of the whole sheet draws them there", async () => {
        const messages: string[] = TestUtils.catchLogs();
        for (const sample of ["test_wedge_multiline_crescendo.musicxml", "test_wedge_multiline_decrescendo.musicxml"]) {
            // A wedge from measure 1 to 4, each measure in a system of its own. Without part names, and with the last system
            //   stretched too, the systems are all as wide: a measure's system is the same in each drawing range.
            osmd.setOptions({ newSystemFromXML: true, drawPartNames: false, drawFromMeasureNumber: 1, drawUpToMeasureNumber: Number.MAX_SAFE_INTEGER });
            osmd.EngravingRules.StretchLastSystemLine = true;
            await osmd.load(TestUtils.getScore(sample));
            osmd.render();
            const partsOfMeasures: string[][] = wedgePartsOfSystems();
            expect(partsOfMeasures.map((parts: string[]): number => parts.length), `${sample}: a part in each system`).to.deep.equal([1, 1, 1, 1]);
            // cut off: the end; the start; both, in 2 systems; both, in 1 system; the end in the wedge's first system; the start in its last
            for (const [from, upTo] of [[1, 2], [2, 4], [2, 3], [3, 3], [1, 1], [4, 4]]) {
                osmd.setOptions({ drawFromMeasureNumber: from, drawUpToMeasureNumber: upTo });
                osmd.render();
                expect(wedgePartsOfSystems(), `${sample}, measures ${from} to ${upTo}`).to.deep.equal(partsOfMeasures.slice(from - 1, upTo));
            }
        }
        expect(messages, "nothing logged, e.g. for a wedge without lines").to.deep.equal([]);
    });
});
