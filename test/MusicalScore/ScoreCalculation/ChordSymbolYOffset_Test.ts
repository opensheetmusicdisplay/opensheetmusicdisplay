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
import { StaffLine } from "../../../src/MusicalScore/Graphical/StaffLine";
import { BoundingBox } from "../../../src/MusicalScore/Graphical/BoundingBox";
import { SkyBottomLineCalculator } from "../../../src/MusicalScore/Graphical/SkyBottomLineCalculator";
import { PlacementEnum } from "../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";
import { TestUtils } from "../../Util/TestUtils";

/**
 * Builds the graphical music sheet (layout) for a MusicXML document, without rendering it.
 * @param xml the MusicXML document, e.g. a test sample file from TestUtils.getScore()
 * @param setRules sets the engraving rules to calculate the layout with
 * @returns the calculated GraphicalMusicSheet
 */
function buildGraphicalMusicSheet(xml: Document, setRules: (rules: EngravingRules) => void): GraphicalMusicSheet {
    expect(xml, "sample file is loaded").to.not.equal(undefined);
    const reader: MusicSheetReader = new MusicSheetReader();
    setRules(reader.rules);
    const calculator: MusicSheetCalculator = new VexFlowMusicSheetCalculator(reader.rules);
    MusicSheetCalculator.TextMeasurer = new VexFlowTextMeasurer(new EngravingRules());
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
                            boxes.push({
                                text: chordContainer.GraphicalLabel.Label.text,
                                placement: chordContainer.GetChordSymbolContainer.Placement,
                                top: y + labelBox.BorderTop,
                                bottom: y + labelBox.BorderBottom,
                                lowestSkyLine,
                                highestBottomLine,
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
        const xml: Document = TestUtils.getScore("test_chord_whole_rest_overlap.musicxml");
        const defaultY: number = firstStaffLineY(buildGraphicalMusicSheet(xml, (rules: EngravingRules): void => {
            rules.ChordSymbolYOffset = 0.1;
        }));
        const fartherY: number = firstStaffLineY(buildGraphicalMusicSheet(xml, (rules: EngravingRules): void => {
            rules.ChordSymbolYOffset = 2.1;
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

    // two chord symbols on one note: the second one is placed next to the first one, with ChordSymbolYPadding instead of ChordSymbolYOffset.
    it("reserves the space above the staff up to a second chord symbol on a note (ChordSymbolYPadding)", () => {
        const xml: Document = new DOMParser().parseFromString(`<?xml version="1.0" encoding="UTF-8"?>
            <score-partwise version="4.0">
              <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
              <part id="P1">
                <measure number="1">
                  <attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time>
                    <clef><sign>G</sign><line>2</line></clef></attributes>
                  <harmony><root><root-step>C</root-step></root><kind>major</kind></harmony>
                  <harmony><root><root-step>G</root-step></root><kind>dominant</kind></harmony>
                  <note><pitch><step>A</step><octave>5</octave></pitch><duration>4</duration><type>whole</type></note>
                </measure>
              </part>
            </score-partwise>`, "text/xml");
        const sheet: GraphicalMusicSheet = buildGraphicalMusicSheet(xml, (rules: EngravingRules): void => {
            rules.ChordSymbolYPadding = 1;
        });
        const boxes: ChordSymbolLabelBox[] = chordSymbolLabelBoxes(sheet);
        expect(boxes.map(box => box.text), "chord symbols").to.deep.equal(["C", "G7"]);
        expectSpaceReservedForChordSymbols(boxes, 2);
    });
});
