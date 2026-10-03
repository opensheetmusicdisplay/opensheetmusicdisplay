import { expect } from "chai";
import { IXmlElement } from "../../../src/Common/FileIO/Xml";
import { MusicSheetReader } from "../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import { MusicSheet } from "../../../src/MusicalScore/MusicSheet";
import { MusicSheetCalculator } from "../../../src/MusicalScore/Graphical/MusicSheetCalculator";
import { VexFlowMusicSheetCalculator } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import { VexFlowTextMeasurer } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowTextMeasurer";
import { GraphicalMusicSheet } from "../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import { EngravingRules } from "../../../src/MusicalScore/Graphical/EngravingRules";
import { MusicSystem } from "../../../src/MusicalScore/Graphical/MusicSystem";
import { BoundingBox } from "../../../src/MusicalScore/Graphical/BoundingBox";
import { TestUtils } from "../../Util/TestUtils";

/**
 * Builds the graphical music sheet (layout) for a test sample file, without rendering it.
 * @param filename the sample file name in test/data
 * @param setRules sets the engraving rules to calculate the layout with
 * @returns the calculated GraphicalMusicSheet
 */
function buildGraphicalMusicSheet(filename: string, setRules: (rules: EngravingRules) => void): GraphicalMusicSheet {
    const reader: MusicSheetReader = new MusicSheetReader();
    setRules(reader.rules);
    const calculator: MusicSheetCalculator = new VexFlowMusicSheetCalculator(reader.rules);
    MusicSheetCalculator.TextMeasurer = new VexFlowTextMeasurer(new EngravingRules());
    const xml: Document = TestUtils.getScore(filename);
    expect(xml, "sample file is loaded").to.not.equal(undefined);
    const score: IXmlElement = new IXmlElement(TestUtils.getPartWiseElement(xml));
    const sheet: MusicSheet = reader.createMusicSheet(score, "path-of-" + filename);
    const graphicalSheet: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calculator);
    graphicalSheet.reCalculate();
    return graphicalSheet;
}

/**
 * The y positions of all chord symbol labels, relative to their staff line (0 = top line, negative = above).
 * @param graphicalSheet the calculated sheet
 * @returns the y positions, in the order of the systems, staff lines, measures and staff entries
 */
function chordSymbolYPositions(graphicalSheet: GraphicalMusicSheet): number[] {
    const yPositions: number[] = [];
    for (const page of graphicalSheet.MusicPages) {
        for (const system of page.MusicSystems as MusicSystem[]) {
            for (const staffLine of system.StaffLines) {
                for (const measure of staffLine.Measures) {
                    for (const staffEntry of measure.staffEntries) {
                        for (const chordContainer of staffEntry.graphicalChordContainers) {
                            let y: number = 0;
                            for (let bbox: BoundingBox = chordContainer.GraphicalLabel.PositionAndShape;
                                bbox && bbox !== staffLine.PositionAndShape; bbox = bbox.Parent) {
                                y += bbox.RelativePosition.y;
                            }
                            yPositions.push(y);
                        }
                    }
                }
            }
        }
    }
    return yPositions;
}

describe("Chord symbol y-alignment (EngravingRules.ChordSymbolYAlignment)", () => {
    // test_chord_whole_rest_overlap: Cm6 over a whole measure rest and Dm7 on beat 3, not over a note, in measure 1 (at the start
    //   of the system), the same in measure 2. Nothing reaches above the staff where they are, so the alignment shouldn't lift them.
    //   It read the Dm7 at its staff entry, whose x position is the start of the measure (it has no notes),
    //   where the clef reaches above the staff, and aligned all chord symbols of the staff line above the clef.
    for (const scope of ["staffline", "measure"]) {
        it(`aligns chord symbols not over a note where they are, not at the start of the measure (scope ${scope})`, () => {
            const filename: string = "test_chord_whole_rest_overlap.musicxml";
            const aligned: number[] = chordSymbolYPositions(buildGraphicalMusicSheet(filename, (rules: EngravingRules): void => {
                rules.ChordSymbolYAlignmentScope = scope;
            }));
            // the y of a chord symbol with nothing above the staff under it: the first one, without the alignment
            //   (the others aren't a reference without the alignment: they would also avoid the margins of the chord symbol before)
            const notAligned: number[] = chordSymbolYPositions(buildGraphicalMusicSheet(filename, (rules: EngravingRules): void => {
                rules.ChordSymbolYAlignment = false;
            }));
            expect(aligned.length, "chord symbols").to.equal(4);
            for (let i: number = 0; i < aligned.length; i++) {
                expect(aligned[i], `y of chord symbol ${i + 1}`).to.be.closeTo(notAligned[0], 0.001);
            }
        });
    }

    // test_chord_symbols_overlap_narrow_measure_1688: D over the whole note and Gm6/D on beat 3, not over a note, in each measure.
    //   Aligned per measure, the Gm6/D was read at the start of its measure, under the Gm6/D of the previous measure (placed already,
    //   reaching into this measure): the chord symbols of each measure were stacked on those of the previous one, rising up to the
    //   last measure.
    it("doesn't stack the chord symbols of a measure on those of the previous measure (scope measure)", () => {
        const filename: string = "test_chord_symbols_overlap_narrow_measure_1688.musicxml";
        const perMeasure: number[] = chordSymbolYPositions(buildGraphicalMusicSheet(filename, (rules: EngravingRules): void => {
            rules.ChordSymbolYAlignmentScope = "measure";
        }));
        const perStaffLine: number[] = chordSymbolYPositions(buildGraphicalMusicSheet(filename, (rules: EngravingRules): void => {
            rules.ChordSymbolYAlignmentScope = "staffline";
        }));
        expect(perMeasure.length, "chord symbols").to.equal(16);
        // here, the chord symbols of a measure have no more above the staff under them than those of the whole staff line
        expect(Math.min(...perMeasure), "highest chord symbol, aligned per measure").to.be.at.least(Math.min(...perStaffLine) - 0.001);
    });
});
