import { expect } from "vitest";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";

/**
 * Beams across staves (EngravingRules.RenderCrossStaffBeams): one beam with the notes of both staves of a piano.
 */
describe("Cross-staff beams", () => {
    /** The minimum width of each measure (see MusicSheetCalculator.calculateMeasureXLayout()), rendered with or without
     *  beams across staves. */
    async function measureWidths(sampleName: string, crossStaffBeams: boolean): Promise<number[]> {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(TestUtils.getDivElement(document));
        osmd.EngravingRules.RenderCrossStaffBeams = crossStaffBeams; // before load(), which calculates the layout too
        await osmd.load(TestUtils.getScore(sampleName));
        osmd.render();
        return osmd.GraphicSheet.MeasureList.map((measures: GraphicalMeasure[]) =>
            measures.find((measure: GraphicalMeasure) => measure)?.minimumStaffEntriesWidth);
    }

    // The measure of a beam's last staff creates the beam across staves, as it is created after the measures of the other staves,
    //   when the Vexflow notes of all staves exist, and before the widths are calculated.
    // Before fix: the measure of the beam's first note created it, so for a beam starting in the upper staff (here the first one),
    //   the upper staff's measure couldn't, the lower staff's measure left its notes to it, and the widths were calculated with the
    //   lower staff's notes unbeamed, with flags: e.g. Gounod's Meditation m.20-26 were wider. Each staff has two notes of each beam
    //   here, so no note has a flag with or without beams across staves (unlike e.g. Mandoline m.2, a single chord of a beam in its
    //   staff, which loses its flag), and the width is the same.
    it("doesn't change the measure widths where no flag changes", async () => {
        const sampleName: string = "test_beam_cross_staff_starting_in_upper_staff.musicxml";
        const without: number[] = await measureWidths(sampleName, false);
        const withBeams: number[] = await measureWidths(sampleName, true);
        expect(withBeams.length, "measures").to.equal(without.length);
        for (let i: number = 0; i < without.length; i++) {
            expect(withBeams[i], `minimum width of measure index ${i}`).to.be.closeTo(without[i], 0.001);
        }
    });
});
