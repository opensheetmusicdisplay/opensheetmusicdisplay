import { expect } from "vitest";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { GraphicalNote } from "../../../src/MusicalScore/Graphical/GraphicalNote";
import { Note } from "../../../src/MusicalScore/VoiceData/Note";

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

    /** For each case (odd measures 1-21), the number of notes and rests drawn in each staff. */
    function drawnNoteCounts(): number[][] {
        return Array.from({ length: 11 }, (_, index) => [0, 1].map(staff =>
            container.querySelector(`#osmd-m${index * 2}-${staff}`).querySelectorAll(".vf-stavenote").length));
    }

    function cursorSteps(drawAsWholeMeasureRest: boolean): number[] {
        expect(osmd.Sheet.SourceMeasures[22].multipleRestMeasures, "measures 23-25").to.equal(3);
        osmd.cursor.show();
        const xs: number[] = [];
        let firstMeasureRestSteps: number = 0;
        const drawnRest: GraphicalNote = osmd.GraphicSheet.MeasureList[0][0].staffEntries[0].graphicalVoiceEntries[0].notes[0];
        while (!osmd.cursor.iterator.EndReached) {
            xs.push(parseFloat(osmd.cursor.cursorElement.style.left));
            if (drawAsWholeMeasureRest && osmd.cursor.iterator.CurrentMeasureIndex === 0 && osmd.cursor.NotesUnderCursor().length > 0) {
                const notes: Note[] = osmd.cursor.NotesUnderCursor();
                const graphicalNotes: GraphicalNote[] = osmd.cursor.GNotesUnderCursor();
                expect(graphicalNotes, "graphical notes at each first-measure cursor step").to.have.length(notes.length);
                expect(graphicalNotes.every(note => note !== undefined), "no replaced rest is undefined").to.equal(true);
                const restIndex: number = notes.findIndex(note => note.isRest());
                if (restIndex >= 0) {
                    expect(graphicalNotes[restIndex], "the drawn rest represents each source rest").to.equal(drawnRest);
                    firstMeasureRestSteps++;
                }
            }
            osmd.cursor.next();
        }
        if (drawAsWholeMeasureRest) {
            expect(firstMeasureRestSteps, "first measure's four rests").to.equal(4);
        }
        return xs;
    }

    it("draws rests as written by default, and replaces eligible rests without changing their source timing", async () => {
        await osmd.load(TestUtils.getScore("test_rest_only_measures_whole_measure_rest.musicxml"));
        osmd.render();
        expect(drawnNoteCounts(), "as written").to.deep.equal([
            [4, 4], [4, 4], [4, 4], [4, 1], [4, 1], [4, 1], [4, 1], [4, 1], [6, 6], [2, 4], [3, 4]]);
        const originalCursorXs: number[] = cursorSteps(false);
        osmd.setOptions({ drawRestOnlyMeasuresAsWholeMeasureRest: true });
        osmd.updateGraphic();
        osmd.render();
        expect(drawnNoteCounts(), "rest-only measures as whole-measure rests").to.deep.equal([
            [1, 4], [4, 1], [1, 1], // measures 1, 3, 5: replaced in the staffs of rests only
            [4, 1], [4, 1], [4, 1], [4, 1], [4, 1], // 7-15: fermata, position, voices, tuplet, hidden
            [1, 1], [2, 1], // 17: 6/4, 19: a rest and a note in staff 1
            [3, 4]]); // 21: rests that don't fill the measure
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
        expect(osmd.Sheet.SourceMeasures[0].VerticalSourceStaffEntryContainers.map(c => c.Timestamp.RealValue), "source entry times")
            .to.deep.equal([0, 0.25, 0.5, 0.75]);
        const replacedCursorXs: number[] = cursorSteps(true);
        expect(replacedCursorXs, "cursor steps").to.have.length(originalCursorXs.length);
        expect(replacedCursorXs.every(x => Number.isFinite(x)), "cursor positions").to.equal(true);
        osmd.setOptions({ drawRestOnlyMeasuresAsWholeMeasureRest: false });
        osmd.updateGraphic();
        osmd.render();
        expect(drawnNoteCounts()[0], "switching back draws the rests as written").to.deep.equal([4, 4]);
        const sourceRests: Note[] = osmd.Sheet.SourceMeasures[0].VerticalSourceStaffEntryContainers
            .map(entry => entry.StaffEntries[0].VoiceEntries[0].Notes[0]);
        expect(sourceRests.map(note => osmd.EngravingRules.GNote(note).sourceNote === note), "rest mappings after switching back")
            .to.deep.equal([true, true, true, true]);
    });

    it("positions the cursor at a replaced rest like at the same whole-measure rest in the XML", async () => {
        const restNote: (whole: boolean) => string = (whole: boolean): string => whole ?
            "<note><rest measure=\"yes\"/><duration>4</duration></note>" :
            "<note><rest/><duration>1</duration><type>quarter</type></note>".repeat(4);
        const offsetFromRest: number[] = [];
        for (const whole of [false, true]) {
            const xml: string = `<?xml version="1.0"?><score-partwise version="4.0">
                <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
                <part id="P1"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats>
                <beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
                ${restNote(whole)}</measure></part></score-partwise>`;
            osmd.setOptions({ drawRestOnlyMeasuresAsWholeMeasureRest: true });
            await osmd.load(xml);
            osmd.render();
            osmd.cursor.show();
            expect(osmd.cursor.NotesUnderCursor().map(note => note.isRest()), "cursor at the rest").to.deep.equal([true]);
            const rest: Element = container.querySelector(".vf-stavenote");
            expect(rest, "drawn rest").not.to.equal(null);
            offsetFromRest.push(parseFloat(osmd.cursor.cursorElement.style.left) -
                (rest.getBoundingClientRect().left - container.getBoundingClientRect().left));
        }
        expect(offsetFromRest[0], "cursor offset from the drawn rest").to.be.closeTo(offsetFromRest[1], 0.1);
    });
});
