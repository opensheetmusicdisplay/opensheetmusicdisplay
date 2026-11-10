import { expect } from "vitest";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { Note } from "../../../src/MusicalScore/VoiceData/Note";
import { Slur } from "../../../src/MusicalScore/VoiceData/Expressions/ContinuousExpressions/Slur";
import { GraphicalSlur } from "../../../src/MusicalScore/Graphical/GraphicalSlur";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";

/**
 * test_slurs_standard_and_tab_staff.musicxml is a guitar part whose standard and tab staff both write each slur with
 * number 1: from the last note of measure 2 to the first note of measure 3 (same pitch), and within measure 3. In
 * measure 1, only the tab staff has a slur, so a stop that looked at the other staff's open slurs first would end the
 * tab staff's slur instead of its own.
 * The open slurs used to be kept by number for the whole part, so the tab staff's start in measure 2 replaced the
 * standard staff's, and the standard staff's stop in measure 3 ended it: one slur from the tab to the standard staff,
 * and none in either staff.
 */
describe("Slurs of a standard and a tab staff with the same number", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_slurs_standard_and_tab_staff.musicxml"));
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    it("reads each staff's slurs, each from a note of the staff to another note of the same staff", () => {
        const slurs: Set<Slur> = new Set();
        for (const voice of osmd.Sheet.Instruments[0].Voices) {
            for (const note of voice.VoiceEntries.flatMap(voiceEntry => voiceEntry.Notes) as Note[]) {
                note.NoteSlurs.forEach(slur => slurs.add(slur));
            }
        }
        const slursPerStaff: number[] = [0, 0];
        for (const slur of slurs) {
            const startStaff: number = slur.StartNote.ParentStaffEntry.ParentStaff.idInMusicSheet;
            const endStaff: number = slur.EndNote.ParentStaffEntry.ParentStaff.idInMusicSheet;
            expect(endStaff, `slur from measure ${slur.StartNote.SourceMeasure.MeasureNumber} on staff ${startStaff}`)
                .to.equal(startStaff);
            slursPerStaff[startStaff]++;
        }
        expect(slursPerStaff, "slurs of the standard and the tab staff").to.deep.equal([2, 3]);
        const measuresOfSlurs: string[] = [...slurs].map(slur =>
            `${slur.StartNote.SourceMeasure.MeasureNumber}-${slur.EndNote.SourceMeasure.MeasureNumber}`).sort();
        expect(measuresOfSlurs, "the tab staff's slur in measure 1, and across the barline and within measure 3 in both staves")
            .to.deep.equal(["1-1", "2-3", "2-3", "3-3", "3-3"]);
    });

    it("draws no slur across the two staves", () => {
        osmd.render();
        const staffLines: StaffLine[] = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines;
        const graphicalSlurs: GraphicalSlur[] = staffLines.flatMap(staffLine => staffLine.GraphicalSlurs);
        expect(graphicalSlurs.some(gSlur => gSlur.slur.isCrossed()), "a slur drawn from one staff to the other").to.equal(false);
    });
});
