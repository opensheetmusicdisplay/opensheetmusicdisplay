import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { Fraction } from "../../../src/Common/DataObjects/Fraction";
import { MusicSystem } from "../../../src/MusicalScore/Graphical/MusicSystem";

/**
 * Tests that the cursor is always positioned at a sensible x position:
 *  1. The timestamp->x mapping (GraphicalMusicSheet.calculateXPositionFromTimestamp) must never
 *     move backwards within a music system for increasing timestamps. It used to, when a staff
 *     entry whose x position doesn't reflect its timestamp was taken as an interpolation anchor -
 *     e.g. staff entries only carrying a chord symbol (MusicXML harmony) are never positioned by
 *     the layout and stay at the measure's left border (samples of issues #791, #1688, #1689).
 *  2. Stepping the cursor (cursor.next()) must never place it far off-canvas. It used to on
 *     positions where every staff entry carries garbage coordinates (never-formatted tablature
 *     rests, x ~ 70000 units in the tab sample below).
 */
describe("Cursor reliable position", () => {
    /** Samples whose timestamp->x mapping used to move backwards because of chord-symbol-only
     *  (note-less, never positioned) staff entries above/next to centered whole rests. */
    const chordSymbolSamples: string[] = [
        "test_chord_whole_rest_overlap.musicxml",
        "test_chord_whole_rest_double_chord.musicxml",
        "test_chord_symbols_overlap_narrow_measure_1688.musicxml",
        "test_chord_symbols_repetition_instructions_overlap_1689.musicxml",
    ];

    let container: HTMLElement;
    beforeEach(() => {
        // attach a wide container so the layout resembles a real desktop viewport
        // (an unattached div has width 0, which breaks every measure into its own tiny system)
        container = document.createElement("div");
        container.style.width = "1300px";
        document.body.appendChild(container);
    });
    afterEach(() => {
        container.remove();
    });

    async function loadAndRender(osmd: OpenSheetMusicDisplay, sampleFilename: string): Promise<void> {
        const score: Document = TestUtils.getScore(sampleFilename);
        await osmd.load(score);
        osmd.render();
    }

    /** Page-major render order index for each MusicSystem, to distinguish a same-system backwards
     *  move (a violation) from the legitimate x reset when entering the next system. */
    function buildSystemOrder(osmd: OpenSheetMusicDisplay): Map<MusicSystem, number> {
        const order: Map<MusicSystem, number> = new Map<MusicSystem, number>();
        let index: number = 0;
        for (const page of osmd.GraphicSheet.MusicPages) {
            for (const system of page.MusicSystems) {
                order.set(system, index++);
            }
        }
        return order;
    }

    for (const sampleFilename of chordSymbolSamples) {
        it(`${sampleFilename}: timestamp->x mapping never moves backwards within a system`, async () => {
            const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
            await loadAndRender(osmd, sampleFilename);
            const systemOrder: Map<MusicSystem, number> = buildSystemOrder(osmd);

            // sweep the sheet-timestamp domain in 1/32s (repetitions don't exist in this domain)
            const sheetEnd: number = osmd.Sheet.SheetEndTimestamp.RealValue;
            let prevX: number = undefined;
            let prevSystemIndex: number = undefined;
            for (let ts32: number = 0; ts32 < sheetEnd * 32; ts32++) {
                const timestamp: Fraction = new Fraction(ts32, 32);
                // destructured (no tuple annotation) so this compiles against both the public and the
                //   osmd-extended return type of calculateXPositionFromTimestamp (2- vs 3-tuple)
                const [x, system] = osmd.GraphicSheet.calculateXPositionFromTimestamp(timestamp);
                const systemIndex: number = systemOrder.get(system);
                if (systemIndex === undefined) {
                    continue;
                }
                if (prevX !== undefined && systemIndex === prevSystemIndex) {
                    expect(x, `x position at sheet timestamp ${ts32}/32 must not move backwards`)
                        .to.be.at.least(prevX - 0.05); // small epsilon for float noise
                }
                prevX = x;
                prevSystemIndex = systemIndex;
            }
        }).timeout(10000);
    }

    it("tablature sample: stepping the cursor never places it off-canvas", async () => {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        // this sample has tablature rests that are never formatted and carry garbage coordinates
        // (x ~ 70000 units); the cursor used to jump ~700000px off-canvas when stepping onto them
        await loadAndRender(osmd, "test_tab_dont_switch_to_classical_from_clefinstruction.musicxml");
        osmd.cursor.reset();
        osmd.cursor.show();
        let steps: number = 0;
        const maxSteps: number = 1000;
        while (!osmd.cursor.iterator.EndReached && steps < maxSteps) {
            const leftPx: number = Number.parseFloat(osmd.cursor.cursorElement.style.left);
            expect(leftPx, `cursor left position stays within the page at step ${steps}`)
                .to.be.below(container.offsetWidth + 50);
            expect(leftPx, `cursor left position isn't far left of the page at step ${steps}`)
                .to.be.above(-50);
            osmd.cursor.next();
            steps++;
        }
        expect(steps, "the cursor stepped through the whole sample").to.be.greaterThan(4).and.to.be.lessThan(maxSteps);
    }).timeout(10000);
});
