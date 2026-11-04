import { expect } from "vitest";
import { IXmlElement } from "../../../src/Common/FileIO/Xml";
import { MusicSheetReader } from "../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import { MusicSheet } from "../../../src/MusicalScore/MusicSheet";
import { MusicSheetCalculator } from "../../../src/MusicalScore/Graphical/MusicSheetCalculator";
import { VexFlowMusicSheetCalculator } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import { GraphicalMusicSheet } from "../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import { EngravingRules } from "../../../src/MusicalScore/Graphical/EngravingRules";
import { MusicSystem } from "../../../src/MusicalScore/Graphical/MusicSystem";
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { BoundingBox } from "../../../src/MusicalScore/Graphical/BoundingBox";
import { SkyBottomLineCalculator } from "../../../src/MusicalScore/Graphical/SkyBottomLineCalculator";
import { PlacementEnum } from "../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";
import { TestUtils } from "../../Util/TestUtils";

/**
 * Builds the graphical music sheet (layout) for a MusicXML document, without rendering it.
 * @param xml the MusicXML document, e.g. a test sample file from TestUtils.getScore()
 * @param setRules sets the engraving rules to calculate the layout with (default rules if not given)
 * @returns the calculated GraphicalMusicSheet
 */
function buildGraphicalMusicSheet(xml: Document, setRules?: (rules: EngravingRules) => void): GraphicalMusicSheet {
    expect(xml, "sample file is loaded").to.not.equal(undefined);
    const reader: MusicSheetReader = new MusicSheetReader();
    setRules?.(reader.rules);
    const calculator: MusicSheetCalculator = new VexFlowMusicSheetCalculator(reader.rules);
    const score: IXmlElement = new IXmlElement(TestUtils.getPartWiseElement(xml));
    const sheet: MusicSheet = reader.createMusicSheet(score, "path-of-test-sample");
    const graphicalSheet: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calculator);
    graphicalSheet.reCalculate();
    return graphicalSheet;
}

/** A chord symbol label's box (without its margins), relative to its staff line, and its sky or bottom line where it is. */
interface ChordSymbolLabelBox {
    text: string;
    placement: PlacementEnum;
    top: number;
    bottom: number;
    /** The lowest sky line value under the label (above the staff), i.e. where the least space is reserved above the staff. */
    lowestSkyLine: number;
    /** The highest bottom line value over the label (below the staff), i.e. where the least space is reserved below the staff. */
    highestBottomLine: number;
    /** The y of the text's baseline where MusicSheetDrawer.drawLabel() draws it: 1 text height under the top of a box 1.2 text heights
     *  high, whose bottom is the label's position above the staff (text alignment LeftBottom), its top below the staff (LeftTop). */
    baseline: number;
}

/**
 * The boxes of all chord symbol labels and the sky and bottom line values in every sample of the lines under them.
 * @param graphicalSheet the calculated sheet
 * @returns the label boxes, in the order of the systems, staff lines, measures and staff entries
 */
function chordSymbolLabelBoxes(graphicalSheet: GraphicalMusicSheet): ChordSymbolLabelBox[] {
    const boxes: ChordSymbolLabelBox[] = [];
    for (const page of graphicalSheet.MusicPages) {
        for (const system of page.MusicSystems as MusicSystem[]) {
            for (const staffLine of system.StaffLines) {
                const sbc: SkyBottomLineCalculator = staffLine.SkyBottomLineCalculator;
                for (const measure of staffLine.Measures) {
                    for (const staffEntry of measure.staffEntries) {
                        for (const chordContainer of staffEntry.graphicalChordContainers) {
                            const labelBox: BoundingBox = chordContainer.GraphicalLabel.PositionAndShape;
                            let x: number = 0;
                            let y: number = 0;
                            for (let bbox: BoundingBox = labelBox; bbox && bbox !== staffLine.PositionAndShape; bbox = bbox.Parent) {
                                x += bbox.RelativePosition.x;
                                y += bbox.RelativePosition.y;
                            }
                            let lowestSkyLine: number = Number.NEGATIVE_INFINITY;
                            let highestBottomLine: number = Number.POSITIVE_INFINITY;
                            // the samples the label covers completely
                            for (let i: number = Math.ceil((x + labelBox.BorderLeft) * sbc.SamplingUnit);
                                i < Math.floor((x + labelBox.BorderRight) * sbc.SamplingUnit); i++) {
                                lowestSkyLine = Math.max(lowestSkyLine, sbc.SkyLine[i]);
                                highestBottomLine = Math.min(highestBottomLine, sbc.BottomLine[i]);
                            }
                            const placement: PlacementEnum = chordContainer.GetChordSymbolContainer.Placement;
                            const fontHeight: number = chordContainer.GraphicalLabel.Label.fontHeight;
                            boxes.push({
                                text: chordContainer.GraphicalLabel.Label.text,
                                placement,
                                top: y + labelBox.BorderTop,
                                bottom: y + labelBox.BorderBottom,
                                lowestSkyLine,
                                highestBottomLine,
                                baseline: placement === PlacementEnum.Below ? y + fontHeight : y - 0.2 * fontHeight,
                            });
                        }
                    }
                }
            }
        }
    }
    return boxes;
}

/**
 * The y position of the first staff line of the first system, relative to its page.
 * @param graphicalSheet the calculated sheet
 */
function firstStaffLineY(graphicalSheet: GraphicalMusicSheet): number {
    const system: MusicSystem = graphicalSheet.MusicPages[0].MusicSystems[0];
    const staffLine: StaffLine = system.StaffLines[0];
    return system.PositionAndShape.RelativePosition.y + staffLine.PositionAndShape.RelativePosition.y;
}

/**
 * Expects the sky line (above the staff) or bottom line (below the staff) to reach the chord symbol labels everywhere under them,
 *   so that what is placed later, e.g. the title, a system or an expression, doesn't overlap them.
 * @param boxes the chord symbol label boxes, see chordSymbolLabelBoxes()
 * @param count the expected number of chord symbols
 */
function expectSpaceReservedForChordSymbols(boxes: ChordSymbolLabelBox[], count: number): void {
    expect(boxes.length, "chord symbols").to.equal(count);
    for (const box of boxes) {
        if (box.placement === PlacementEnum.Below) {
            expect(box.highestBottomLine, `bottom line under ${box.text}`).to.be.at.least(box.bottom - 0.001);
        } else {
            expect(box.lowestSkyLine, `sky line over ${box.text}`).to.be.at.most(box.top + 0.001);
        }
    }
}

describe("Chord symbol y offset (EngravingRules.ChordSymbolYOffset)", () => {
    // ChordSymbolYOffset (the distance between the notes and the chord symbols) moved the chord symbols, but the space
    //   reserved for them above (below) the staff stayed where it is for the default distance: the system wasn't moved down,
    //   and e.g. the composer or the system above could overlap the chord symbols.

    // test_chord_whole_rest_overlap: 4 chord symbols, nothing above the staff under them.
    for (const yOffset of [0, 0.1, 2]) {
        it(`reserves the space above the staff up to the chord symbols where they are drawn (ChordSymbolYOffset ${yOffset})`, () => {
            const sheet: GraphicalMusicSheet = buildGraphicalMusicSheet(TestUtils.getScore("test_chord_whole_rest_overlap.musicxml"),
                (rules: EngravingRules): void => {
                    rules.ChordSymbolYOffset = yOffset;
                });
            expectSpaceReservedForChordSymbols(chordSymbolLabelBoxes(sheet), 4);
        });
    }

    it("moves the staff down by the distance added to the chord symbols", () => {
        // without the minimum distance to the staff, which would keep the chord symbols over the whole rests at least that high
        //   (ChordSymbolMinimumBaselineAboveStaff, tested below), so that only ChordSymbolYOffset decides
        const xml: Document = TestUtils.getScore("test_chord_whole_rest_overlap.musicxml");
        const defaultY: number = firstStaffLineY(buildGraphicalMusicSheet(xml, (rules: EngravingRules): void => {
            rules.ChordSymbolYOffset = 0.1;
            rules.ChordSymbolMinimumBaselineAboveStaff = 0;
        }));
        const fartherY: number = firstStaffLineY(buildGraphicalMusicSheet(xml, (rules: EngravingRules): void => {
            rules.ChordSymbolYOffset = 2.1;
            rules.ChordSymbolMinimumBaselineAboveStaff = 0;
        }));
        // (the y positions of the systems are rounded to pixels, 0.1 units)
        expect(fartherY - defaultY, "the staff 2 units lower").to.be.closeTo(2, 0.1);
    });

    // test_chord_symbol_numeral_placement_below: a roman numeral (I) below the second staff of a piano.
    it("reserves the space below the staff down to the chord symbols where they are drawn (placement below)", () => {
        const sheet: GraphicalMusicSheet = buildGraphicalMusicSheet(TestUtils.getScore("test_chord_symbol_numeral_placement_below.musicxml"),
            (rules: EngravingRules): void => {
                rules.ChordSymbolYOffset = 2;
            });
        const boxes: ChordSymbolLabelBox[] = chordSymbolLabelBoxes(sheet);
        expect(boxes[0]?.placement, "placement").to.equal(PlacementEnum.Below);
        expectSpaceReservedForChordSymbols(boxes, 1);
    });

});

/**
 * A measure with three chord symbols (C, Am, G7) on one whole note: three <harmony> elements before the note. OSMD doesn't read
 *   their <offset>, so they are all on the note's staff entry, placed next to each other.
 * @param step the step of the note, e.g. "A"
 * @param octave the octave of the note, e.g. 5
 * @param placement the placement of the chord symbols, "above" or "below" the staff
 * @returns the MusicXML document
 */
function chordSymbolsOnOneNote(step: string, octave: number, placement: string): Document {
    return new DOMParser().parseFromString(`<?xml version="1.0" encoding="UTF-8"?>
        <score-partwise version="4.0">
          <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
          <part id="P1">
            <measure number="1">
              <attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time>
                <clef><sign>G</sign><line>2</line></clef></attributes>
              <harmony placement="${placement}"><root><root-step>C</root-step></root><kind>major</kind></harmony>
              <harmony placement="${placement}"><root><root-step>A</root-step></root><kind>minor</kind><offset>1</offset></harmony>
              <harmony placement="${placement}"><root><root-step>G</root-step></root><kind>dominant</kind><offset>2</offset></harmony>
              <note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>4</duration><type>whole</type></note>
            </measure>
          </part>
        </score-partwise>`, "text/xml");
}

describe("Chord symbols on one note", () => {
    // The chord symbols of a note are placed next to each other, so they should all have the same distance to the notes,
    //   ChordSymbolYOffset (+ 0.1). The second and third one used to be placed with ChordSymbolYPadding (default 0) instead,
    //   0.2 closer to the staff than the first one by default, and not moved by ChordSymbolYOffset.
    for (const placement of ["above", "below"]) {
        it(`places the chord symbols of a note at the same height, ${placement} the staff`, () => {
            // a note outside the staff, so that the chord symbols are aligned to it
            const xml: Document = placement === "above" ? chordSymbolsOnOneNote("A", 5, placement) : chordSymbolsOnOneNote("C", 4, placement);
            const boxes: ChordSymbolLabelBox[] = chordSymbolLabelBoxes(buildGraphicalMusicSheet(xml));
            expect(boxes.map(box => box.text), "chord symbols").to.deep.equal(["C", "Am", "G7"]);
            for (const box of boxes) {
                expect(box.placement, `placement of ${box.text}`).to.equal(placement === "above" ? PlacementEnum.Above : PlacementEnum.Below);
                expect(box.top, `top of ${box.text}`).to.be.closeTo(boxes[0].top, 0.000001);
            }
            expectSpaceReservedForChordSymbols(boxes, 3);
        });
    }

    it("moves all chord symbols of a note by ChordSymbolYOffset", () => {
        const xml: Document = chordSymbolsOnOneNote("A", 5, "above");
        const defaultBoxes: ChordSymbolLabelBox[] = chordSymbolLabelBoxes(buildGraphicalMusicSheet(xml, (rules: EngravingRules): void => {
            rules.ChordSymbolYOffset = 0.1;
        }));
        const fartherBoxes: ChordSymbolLabelBox[] = chordSymbolLabelBoxes(buildGraphicalMusicSheet(xml, (rules: EngravingRules): void => {
            rules.ChordSymbolYOffset = 1.1;
        }));
        expect(fartherBoxes.length, "chord symbols").to.equal(3);
        for (let i: number = 0; i < fartherBoxes.length; i++) {
            expect(defaultBoxes[i].top - fartherBoxes[i].top, `${fartherBoxes[i].text} 1 unit higher`).to.be.closeTo(1, 0.000001);
        }
        expectSpaceReservedForChordSymbols(fartherBoxes, 3);
    });

    it("places the chord symbols of a note at the same distance to the staff without the y alignment (ChordSymbolYAlignment false)", () => {
        // a note in the staff: the sky line under the chord symbols is the top staff line, so that they are at the same height.
        //   Without the minimum distance to the staff (ChordSymbolMinimumBaselineAboveStaff), which would lift them all to it.
        const boxes: ChordSymbolLabelBox[] = chordSymbolLabelBoxes(buildGraphicalMusicSheet(chordSymbolsOnOneNote("B", 4, "above"),
            (rules: EngravingRules): void => {
                rules.ChordSymbolYAlignment = false;
                rules.ChordSymbolMinimumBaselineAboveStaff = 0;
            }));
        expect(boxes.map(box => box.text), "chord symbols").to.deep.equal(["C", "Am", "G7"]);
        for (const box of boxes) {
            expect(box.top, `top of ${box.text}`).to.be.closeTo(boxes[0].top, 0.000001);
        }
        expectSpaceReservedForChordSymbols(boxes, 3);
    });
});

describe("Chord symbol minimum distance to the staff (EngravingRules.ChordSymbolMinimumBaselineAboveStaff, ...BelowStaff)", () => {
    // Chord symbols are placed above what is under them (ChordSymbolYOffset). Over a whole rest, that's the top staff line, so their
    //   baseline was only about 0.6 units above the staff. The minimum distance places their baseline at least that far from the staff.

    // test_chord_whole_rest_overlap: 4 chord symbols over whole rests, nothing above the staff under them.
    it("places chord symbols over whole rests with their baseline 1.5 units above the staff by default", () => {
        const boxes: ChordSymbolLabelBox[] = chordSymbolLabelBoxes(
            buildGraphicalMusicSheet(TestUtils.getScore("test_chord_whole_rest_overlap.musicxml")));
        for (const box of boxes) {
            expect(-box.baseline, `baseline of ${box.text} above the staff`).to.be.closeTo(1.5, 0.000001);
        }
        expectSpaceReservedForChordSymbols(boxes, 4);
    });

    it("places chord symbols over whole rests with their baseline ChordSymbolMinimumBaselineAboveStaff above the staff", () => {
        const boxes: ChordSymbolLabelBox[] = chordSymbolLabelBoxes(buildGraphicalMusicSheet(
            TestUtils.getScore("test_chord_whole_rest_overlap.musicxml"), (rules: EngravingRules): void => {
                rules.ChordSymbolMinimumBaselineAboveStaff = 2.5;
            }));
        for (const box of boxes) {
            expect(-box.baseline, `baseline of ${box.text} above the staff`).to.be.closeTo(2.5, 0.000001);
        }
        expectSpaceReservedForChordSymbols(boxes, 4);
    });

    it("places chord symbols over whole rests closer to the staff without the minimum (ChordSymbolMinimumBaselineAboveStaff 0)", () => {
        const boxes: ChordSymbolLabelBox[] = chordSymbolLabelBoxes(buildGraphicalMusicSheet(
            TestUtils.getScore("test_chord_whole_rest_overlap.musicxml"), (rules: EngravingRules): void => {
                rules.ChordSymbolMinimumBaselineAboveStaff = 0;
            }));
        for (const box of boxes) {
            expect(-box.baseline, `baseline of ${box.text} above the staff`).to.be.below(1);
        }
        expectSpaceReservedForChordSymbols(boxes, 4);
    });

    it("places chord symbols over a high note above the note, where the minimum doesn't matter", () => {
        // A6: the chord symbols are placed above the note head (ChordSymbolYOffset), far above the minimum distance
        const xml: Document = chordSymbolsOnOneNote("A", 6, "above");
        const boxes: ChordSymbolLabelBox[] = chordSymbolLabelBoxes(buildGraphicalMusicSheet(xml));
        const boxesWithoutMinimum: ChordSymbolLabelBox[] = chordSymbolLabelBoxes(buildGraphicalMusicSheet(xml, (rules: EngravingRules): void => {
            rules.ChordSymbolMinimumBaselineAboveStaff = 0;
        }));
        expect(boxes.length, "chord symbols").to.equal(3);
        for (let i: number = 0; i < boxes.length; i++) {
            expect(-boxes[i].baseline, `baseline of ${boxes[i].text} above the staff`).to.be.above(3);
            expect(boxes[i].baseline, `baseline of ${boxes[i].text}`).to.be.closeTo(boxesWithoutMinimum[i].baseline, 0.000001);
        }
    });

    // test_chord_symbol_numeral_placement_below: a roman numeral (I) below the second staff of a piano.
    it("places chord symbols below the staff with their baseline ChordSymbolMinimumBaselineBelowStaff below it", () => {
        const xml: Document = TestUtils.getScore("test_chord_symbol_numeral_placement_below.musicxml");
        const defaultBoxes: ChordSymbolLabelBox[] = chordSymbolLabelBoxes(buildGraphicalMusicSheet(xml));
        const boxes: ChordSymbolLabelBox[] = chordSymbolLabelBoxes(buildGraphicalMusicSheet(xml, (rules: EngravingRules): void => {
            rules.ChordSymbolMinimumBaselineBelowStaff = 3.5;
        }));
        expect(boxes[0]?.placement, "placement").to.equal(PlacementEnum.Below);
        // the bottom line of the (5-line) staff is 4 units under its top line
        expect(boxes[0].baseline - 4, "baseline of the numeral below the staff").to.be.closeTo(3.5, 0.000001);
        // no minimum below the staff by default: there the numeral is closer to the staff
        expect(defaultBoxes[0].baseline - 4, "baseline of the numeral below the staff by default").to.be.below(3);
        expectSpaceReservedForChordSymbols(boxes, 1);
    });
});
