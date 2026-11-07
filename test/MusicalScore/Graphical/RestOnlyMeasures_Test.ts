import { expect } from "vitest";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";

/**
 * test_rest_only_measures_whole_measure_rest.musicxml: two staffs. The measures in between the cases have notes, so that
 * the rest measures don't form a multiple rest measure. Measures of staff 1 and 2 (q = quarter rests, w = whole-measure rest in the XML):
 *   1: q with chords C at beat 1 and G at beat 4, and notes      3: notes, and q
 *   5: q with "cresc." at the third rest, and q                  7: a fermata on a rest, and w
 *   9: rests with a given vertical position, and w               11: two voices of rests, and w
 *   13: a triplet of rests and a half rest, and w                15: rests that are not printed, and w
 *   17: six quarter rests in each staff (6/4)                    19: half rest and half note, and q
 *   21: three quarter rests, and notes (the rests don't fill the measure)
 *   23-26: four measures of q in both staffs
 */
describe("Rest-only measures drawn as one whole-measure rest (drawRestOnlyMeasuresAsWholeMeasureRest)", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(() => {
        container = TestUtils.getDivElement(document);
        container.style.width = "1300px";
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    async function render(drawAsWholeMeasureRest: boolean): Promise<void> {
        osmd.setOptions({ drawRestOnlyMeasuresAsWholeMeasureRest: drawAsWholeMeasureRest });
        await osmd.load(TestUtils.getScore("test_rest_only_measures_whole_measure_rest.musicxml"));
        osmd.render();
    }

    /** Per measure (1-22) the number of notes and rests drawn in each staff (a measure group is osmd-m<measure index>-<staff index>). */
    function drawnNoteCounts(): number[][] {
        return osmd.Sheet.SourceMeasures.slice(0, 22).map((_, index) => [0, 1].map(staff =>
            container.querySelector(`#osmd-m${index}-${staff}`).querySelectorAll(".vf-stavenote").length));
    }

    it("draws rests as written by default, and rest-only measures as whole-measure rests when set", async () => {
        await render(false);
        expect(drawnNoteCounts(), "as written").to.deep.equal([
            [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 1], [4, 4], [4, 1], [4, 4],
            [4, 1], [4, 4], [4, 1], [4, 4], [4, 1], [4, 4], [6, 6], [4, 4], [2, 4], [4, 4], [3, 4], [4, 4]]);
        await render(true);
        expect(drawnNoteCounts(), "rest-only measures as whole-measure rests").to.deep.equal([
            [1, 4], [4, 4], [4, 1], [4, 4], [1, 1], [4, 4], // measures 1, 3, 5: replaced in the staffs of rests only
            [4, 1], [4, 4], [4, 1], [4, 4], [4, 1], [4, 4], [4, 1], [4, 4], [4, 1], [4, 4], // 7-15: fermata, position, voices, tuplet, hidden
            [1, 1], [4, 4], [2, 1], [4, 4], // 17: 6/4, 19: a rest and a note in staff 1
            [3, 4], [4, 4]]); // 21: rests that don't fill the measure
    });

    it("keeps the chord symbols and the text of the measure at their times, and the music's timing unchanged", async () => {
        await render(true);
        expect(container.textContent, "the direction at a replaced rest").to.contain("cresc.");
        const chordXs: number[] = [];
        for (const entry of osmd.GraphicSheet.MeasureList[0][0].staffEntries as GraphicalStaffEntry[]) {
            for (const chord of entry.graphicalChordContainers) {
                chordXs.push(chord.PositionAndShape.AbsolutePosition.x);
            }
        }
        expect(chordXs, "chord symbols C and G").to.have.length(2);
        expect(chordXs[1], "G is right of C").to.be.greaterThan(chordXs[0]);
        // like on a whole-measure rest of the XML, the first chord symbol is at the start of the measure, left of the centered rest
        const restX: number = osmd.GraphicSheet.MeasureList[0][0].staffEntries[0].graphicalVoiceEntries[0].notes[0]
            .PositionAndShape.AbsolutePosition.x;
        expect(chordXs[0], "C left of the rest").to.be.lessThan(restX - 1);
        // drawing only: the source measure keeps its staff entries at each beat
        expect(osmd.Sheet.SourceMeasures[0].VerticalSourceStaffEntryContainers.filter(c => c), "source staff entries").to.have.length(4);
    });

    it("keeps a multiple rest measure of consecutive rest measures, and steps the cursor as when drawn as written", async () => {
        const cursorXs: number[][] = [];
        for (const drawAsWholeMeasureRest of [false, true]) {
            await render(drawAsWholeMeasureRest);
            expect(osmd.Sheet.SourceMeasures[22].multipleRestMeasures, "measures 23-25").to.equal(3);
            osmd.cursor.show();
            const xs: number[] = [];
            while (!osmd.cursor.iterator.EndReached) {
                xs.push(parseFloat(osmd.cursor.cursorElement.style.left));
                osmd.cursor.next();
            }
            cursorXs.push(xs);
        }
        expect(cursorXs[1], "cursor steps").to.have.length(cursorXs[0].length);
        expect(cursorXs[1].every(x => Number.isFinite(x)), "cursor positions").to.equal(true);
    });
});
