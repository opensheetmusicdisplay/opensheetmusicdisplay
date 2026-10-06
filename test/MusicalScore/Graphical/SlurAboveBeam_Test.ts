import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalSlur } from "../../../src/MusicalScore/Graphical/GraphicalSlur";
import { GraphicalNote } from "../../../src/MusicalScore/Graphical/GraphicalNote";
import { VexFlowGraphicalNote } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { GraphicalStaffEntry } from "../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { PlacementEnum } from "../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";
import { unitInPixels } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";

/**
 * A slur on the stem side of beamed notes starts and ends at the stem tips, i.e. at the beam, not on the stems under it.
 * The slur takes its start and end from the bounding boxes of the notes' voice entries, which Vexflow gave them before
 * the beam extended the stems: the slur started and ended on the stems, crossed the beam and what was placed above it,
 * e.g. the fingerings of the notes under the slur.
 * test_slur_above_beamed_stem_up_fingering_traumerei_measure3: Schumann's Träumerei m.3, a slur placed above stem-up eighths,
 * from the G4 to the D5 of the group.
 */
describe("Slur above a beamed group of stem-up notes", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;
    beforeEach(async () => {
        container = TestUtils.getDivElement(document);
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        await osmd.load(TestUtils.getScore("test_slur_above_beamed_stem_up_fingering_traumerei_measure3.musicxml"));
    });

    /** The y of the tip of the note's stem as drawn in the SVG, i.e. where the beam is, relative to its staff line like a slur's points. */
    function drawnStemTipY(note: GraphicalNote, staffLine: StaffLine): number {
        const stem: SVGGraphicsElement = (note as VexFlowGraphicalNote).getStemSVG() as unknown as SVGGraphicsElement;
        return stem.getBBox().y / unitInPixels - staffLine.PositionAndShape.AbsolutePosition.y;
    }

    for (const geometricSkyline of [true, false]) {
        const skyline: string = geometricSkyline ? "geometric skyline" : "raster skyline";
        it(`starts and ends the slur above the beam, on every render (${skyline})`, () => {
            osmd.EngravingRules.UseGeometricSkyBottomLineCalculation = geometricSkyline;
            let firstRenderBoxes: number[];
            for (const render of ["first render", "re-render"]) {
                osmd.render();
                const staffLine: StaffLine = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
                // the bounding boxes of the staff entries, which span the voice entries, are the same on every render
                const boxes: number[] = staffLine.Measures[0].staffEntries.flatMap((staffEntry: GraphicalStaffEntry): number[] =>
                    [staffEntry.PositionAndShape.BorderTop, staffEntry.PositionAndShape.BorderBottom]);
                firstRenderBoxes ??= boxes;
                expect(boxes, `${render}: staff entry boxes`).to.deep.equal(firstRenderBoxes);
                const slurs: GraphicalSlur[] = staffLine.GraphicalSlurs;
                expect(slurs.length, render).to.equal(1);
                const slur: GraphicalSlur = slurs[0];
                expect(slur.placement, render).to.equal(PlacementEnum.Above);
                const startNote: GraphicalNote = slur.staffEntries[0].findGraphicalNoteFromNote(slur.slur.StartNote);
                const endNote: GraphicalNote = slur.staffEntries[slur.staffEntries.length - 1].findGraphicalNoteFromNote(slur.slur.EndNote);
                // (negative y is up. Before the fix, the slur started 2.3 units under the beam, on the G4's stem.)
                expect(slur.bezierStartPt.y, `${render}: start of the slur above the beam`).to.be.below(drawnStemTipY(startNote, staffLine));
                expect(slur.bezierEndPt.y, `${render}: end of the slur above the beam`).to.be.below(drawnStemTipY(endNote, staffLine));
            }
        });
    }
});
