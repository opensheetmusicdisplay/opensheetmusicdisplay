import { expect } from "chai";
import { IXmlElement } from "../../../src/Common/FileIO/Xml";
import { MusicSheetReader } from "../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import { MusicSheet } from "../../../src/MusicalScore/MusicSheet";
import { MusicSheetCalculator } from "../../../src/MusicalScore/Graphical/MusicSheetCalculator";
import { VexFlowMusicSheetCalculator } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import { VexFlowTextMeasurer } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowTextMeasurer";
import { VexFlowMeasure } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { GraphicalMusicSheet } from "../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import { EngravingRules } from "../../../src/MusicalScore/Graphical/EngravingRules";
import { GraphicalLabel } from "../../../src/MusicalScore/Graphical/GraphicalLabel";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { MusicSystem } from "../../../src/MusicalScore/Graphical/MusicSystem";
import { BoundingBox } from "../../../src/MusicalScore/Graphical/BoundingBox";
import { TestUtils } from "../../Util/TestUtils";
import Vex from "vexflow";
import VF = Vex.Flow;

interface LabelRect {
    left: number;
    right: number;
    top: number;
    bottom: number;
    text: string;
}

/**
 * Builds the graphical music sheet (layout) for a test sample file, without rendering it.
 * @param filename the sample file name in test/data
 * @returns the calculated GraphicalMusicSheet
 */
function buildGraphicalMusicSheet(filename: string): GraphicalMusicSheet {
    const reader: MusicSheetReader = new MusicSheetReader();
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
 * Computes the page-absolute position of a bounding box by walking up the bounding box tree.
 * @param bbox the bounding box
 * @returns the absolute x and y position
 */
function absolutePosition(bbox: BoundingBox): { x: number, y: number } {
    let x: number = 0;
    let y: number = 0;
    for (let current: BoundingBox = bbox; current; current = current.Parent) {
        x += current.RelativePosition.x;
        y += current.RelativePosition.y;
    }
    return { x, y };
}

/**
 * Collects the absolute label rectangles (without margins) of all chord symbols in a staff line.
 * @param staffLine the staff line to collect chord symbol labels from
 * @returns the label rectangles
 */
function collectChordLabelRects(staffLine: StaffLine): LabelRect[] {
    const rects: LabelRect[] = [];
    for (const measure of staffLine.Measures) {
        for (const staffEntry of measure.staffEntries) {
            for (const chordContainer of staffEntry.graphicalChordContainers) {
                const label: GraphicalLabel = chordContainer.GraphicalLabel;
                const pos: { x: number, y: number } = absolutePosition(label.PositionAndShape);
                rects.push({
                    left: pos.x + label.PositionAndShape.BorderLeft,
                    right: pos.x + label.PositionAndShape.BorderRight,
                    top: pos.y + label.PositionAndShape.BorderTop,
                    bottom: pos.y + label.PositionAndShape.BorderBottom,
                    text: label.Label.text
                });
            }
        }
    }
    return rects;
}

/**
 * Expects that none of the given label rectangles overlap each other.
 * @param rects the label rectangles to check pairwise
 */
function expectNoOverlaps(rects: LabelRect[]): void {
    const epsilon: number = 0.01; // ignore merely touching edges
    for (let i: number = 0; i < rects.length; i++) {
        for (let j: number = i + 1; j < rects.length; j++) {
            const a: LabelRect = rects[i];
            const b: LabelRect = rects[j];
            const xOverlap: number = Math.min(a.right, b.right) - Math.max(a.left, b.left);
            const yOverlap: number = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
            const overlaps: boolean = xOverlap > epsilon && yOverlap > epsilon;
            expect(overlaps, `chord symbol labels "${a.text}" and "${b.text}" overlap`).to.equal(false);
        }
    }
}

describe("Chord symbol and repetition instruction collision avoidance", () => {
    describe("chord symbols in a too narrow measure (issue #1688)", () => {
        const filename: string = "test_chord_symbols_overlap_narrow_measure_1688.musicxml";
        let graphicalSheet: GraphicalMusicSheet;
        let staffLines: StaffLine[];

        before((): void => {
            graphicalSheet = buildGraphicalMusicSheet(filename);
            staffLines = [];
            for (const page of graphicalSheet.MusicPages) {
                for (const system of page.MusicSystems as MusicSystem[]) {
                    staffLines.push(...system.StaffLines);
                }
            }
        });

        it("renders all chord symbols", () => {
            const allRects: LabelRect[] = staffLines.map(collectChordLabelRects).reduce(
                (all: LabelRect[], rects: LabelRect[]): LabelRect[] => all.concat(rects), []);
            expect(allRects.length, "two chord symbols per measure").to.equal(16);
        });

        it("does not overlap chord symbols, even in narrow measures", () => {
            for (const staffLine of staffLines) {
                expectNoOverlaps(collectChordLabelRects(staffLine));
            }
        });

        it("stacks colliding chord symbols above each other", () => {
            let stackedPairFound: boolean = false;
            for (const staffLine of staffLines) {
                const rects: LabelRect[] = collectChordLabelRects(staffLine);
                for (let i: number = 1; i < rects.length; i++) {
                    if (Math.abs(rects[i].top - rects[i - 1].top) > 0.5) {
                        stackedPairFound = true;
                    }
                }
            }
            expect(stackedPairFound, "at least one chord symbol is stacked above a colliding one").to.equal(true);
        });
    });

    describe("chord symbols and repetition instructions (issue #1689)", () => {
        const filename: string = "test_chord_symbols_repetition_instructions_overlap_1689.musicxml";
        let graphicalSheet: GraphicalMusicSheet;
        let measures: VexFlowMeasure[];
        let staffLine: StaffLine;

        before((): void => {
            graphicalSheet = buildGraphicalMusicSheet(filename);
            measures = graphicalSheet.MeasureList.map(
                (measuresOfAllStaves: VexFlowMeasure[]): VexFlowMeasure => measuresOfAllStaves[0]);
            staffLine = measures[0].ParentStaffLine;
        });

        it("creates the repetition instruction stave modifiers", () => {
            const repetitionTypes: number[][] = measures.map((measure: VexFlowMeasure): number[] =>
                measure.vfRepetitionWords.map((repetition: VF.Repetition): number => (repetition as any).symbol_type));
            // measure 1: Segno / measure 2: To Coda / measure 3: D.S. al Coda / measure 4: Coda
            expect(repetitionTypes).to.deep.equal([
                [VF.Repetition.type.SEGNO_LEFT],
                [(VF.Repetition as any).type.TO_CODA],
                [VF.Repetition.type.DS_AL_CODA],
                [VF.Repetition.type.CODA_LEFT]
            ]);
        });

        it("shifts colliding repetition instructions upwards, above the chord symbols", () => {
            for (const measure of measures) {
                for (const repetition of measure.vfRepetitionWords) {
                    const yShift: number = (repetition as any).y_shift;
                    expect(yShift, "repetition instructions are never shifted downwards").to.be.at.most(0);
                }
            }
            // the segno sign in measure 1 is shifted above the chord symbol at the measure start:
            expect((measures[0].vfRepetitionWords[0] as any).y_shift).to.be.lessThan(0);
            // the To Coda text at the end of measure 2 is shifted above the chord symbol on the third beat:
            expect((measures[1].vfRepetitionWords[0] as any).y_shift).to.be.lessThan(0);
        });

        it("reserves skyline space for the repetition instructions", () => {
            // the default drawing position of the repetition texts/glyphs reaches 4.5 units above the staff
            expect(Math.min(...staffLine.SkyLine)).to.be.at.most(-4.4);
        });

        it("does not overlap the chord symbols in the same measure (measure 3)", () => {
            expectNoOverlaps(collectChordLabelRects(staffLine));
        });
    });
});
