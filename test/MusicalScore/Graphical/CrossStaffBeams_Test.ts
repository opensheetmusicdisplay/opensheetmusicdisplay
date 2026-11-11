import { expect } from "vitest";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalMeasure } from "../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { AbstractGraphicalExpression } from "../../../src/MusicalScore/Graphical/AbstractGraphicalExpression";
import { BoundingBox } from "../../../src/MusicalScore/Graphical/BoundingBox";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { unitInPixels } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";

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

    // A beam between the staves goes below the upper staff's notes, where its room is reserved, so that what is placed below the
    //   upper staff goes below the beam: here the pp of Mandoline m.2, under the beam of the right hand's chord (stem down) and the
    //   left hand's chord (stem up). Elsewhere, with nothing placed between the staves, the beam stays midway between them.
    // Before fix: the room was reserved half below the upper staff and half above the lower one, and the beam drawn midway, so
    //   the pp, placed below the upper staff's half, was on the beam.
    it("keeps what is placed between the staves off the beam", async () => {
        const container: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("Debussy_Mandoline.xml"));
        osmd.render();
        const staffLines: StaffLine[] = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines;
        const expressions: AbstractGraphicalExpression[] = staffLines.flatMap(staffLine => staffLine.AbstractExpressions);
        // between the piano's staves (the last two of the system)
        const upperPianoStaff: BoundingBox = staffLines[staffLines.length - 2].PositionAndShape;
        const lowerPianoStaff: BoundingBox = staffLines[staffLines.length - 1].PositionAndShape;
        const pp: BoundingBox = expressions.find(expression => expression.Label?.Label.text === "pp")?.Label.PositionAndShape;
        expect(pp !== undefined, "the pp of m.2").to.equal(true);
        const [left, right] = [pp.AbsolutePosition.x + pp.BorderLeft, pp.AbsolutePosition.x + pp.BorderRight];
        const top: number = pp.AbsolutePosition.y + pp.BorderTop;
        // the drawn beams over the pp's width, in units
        const beams: DOMRect[] = (Array.from(container.querySelectorAll("path.vf-beam, .vf-beam path")) as SVGGraphicsElement[])
            .map(element => element.getBBox())
            .filter(box => box.x / unitInPixels < right && (box.x + box.width) / unitInPixels > left &&
                box.y / unitInPixels > upperPianoStaff.AbsolutePosition.y && box.y / unitInPixels < lowerPianoStaff.AbsolutePosition.y);
        expect(beams.length, "beams over the pp").to.be.greaterThan(0);
        for (const beam of beams) {
            const beamBottom: number = (beam.y + beam.height) / unitInPixels;
            expect(beamBottom, "the beam is above the pp").to.be.at.most(top);
        }
    });
});
