import { expect } from "vitest";
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { MusicSheetReader } from "../../../src/MusicalScore/ScoreIO/MusicSheetReader";
import { MusicSheet } from "../../../src/MusicalScore/MusicSheet";
import { IXmlElement } from "../../../src/Common/FileIO/Xml";
import { Note } from "../../../src/MusicalScore/VoiceData/Note";
import { NoteHeadShape } from "../../../src/MusicalScore/VoiceData/Notehead";
import { NoteEnum } from "../../../src/Common/DataObjects/Pitch";
import { PlacementEnum } from "../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";
import { ArrowDirection, CircularArrowDirection, TechnicalArrow } from "../../../src/MusicalScore/VoiceData/TechnicalArrow";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../Util/TestUtils";

describe("Technical arrows", () => {
    function read(filename: string): MusicSheet {
        const doc: Document = (window as any).__xml__[filename];
        expect(doc, filename).to.not.be.undefined;
        return new MusicSheetReader().createMusicSheet(
            new IXmlElement(doc.getElementsByTagName("score-partwise")[0]), filename);
    }

    function arrowsOf(sheet: MusicSheet): TechnicalArrow[] {
        const arrows: TechnicalArrow[] = [];
        for (const measure of sheet.SourceMeasures) {
            for (const container of measure.VerticalSourceStaffEntryContainers) {
                for (const staffEntry of container.StaffEntries) {
                    if (!staffEntry) {
                        continue;
                    }
                    for (const voiceEntry of staffEntry.VoiceEntries) {
                        for (const note of voiceEntry.Notes) {
                            arrows.push(...note.TechnicalArrows);
                        }
                    }
                }
            }
        }
        return arrows;
    }

    it("reads arrow-direction, circular-arrow, placement and smufl, and skips an unknown direction", () => {
        const sheet: MusicSheet = read("test/data/test_technical_arrow.musicxml");
        const arrows: TechnicalArrow[] = arrowsOf(sheet);
        const directions: (ArrowDirection | CircularArrowDirection)[] = arrows.map(
            (arrow: TechnicalArrow) => arrow.circular ?? arrow.direction);
        expect(directions).to.deep.equal([
            ArrowDirection.Down,
            ArrowDirection.Up,
            ArrowDirection.Left,
            ArrowDirection.Right,
            ArrowDirection.Northwest,
            ArrowDirection.Northeast,
            ArrowDirection.Southeast,
            ArrowDirection.Southwest,
            ArrowDirection.LeftRight,
            ArrowDirection.UpDown,
            ArrowDirection.NorthwestSoutheast,
            ArrowDirection.NortheastSouthwest,
            CircularArrowDirection.Clockwise,
            CircularArrowDirection.Anticlockwise,
            ArrowDirection.Down,
            ArrowDirection.Up,
        ]);
        expect(arrows[0].placement).to.equal(PlacementEnum.Above);
        expect(arrows[0].smufl).to.equal("guitarStrumDown");
        expect(arrows[0].sourceNote).to.be.instanceOf(Note);
        expect(arrows[0].sourceNote.Notehead?.Shape).to.equal(NoteHeadShape.X);
        expect(arrows[14].placement).to.equal(PlacementEnum.Below);
        expect(arrows[15].sourceNote.Pitch.FundamentalNote).to.equal(NoteEnum.E);
    });

    it("draws an arrow for every direction it read", async () => {
        const div: HTMLElement = TestUtils.getDivElement(document);
        div.style.width = "1200px";
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false, backend: "svg" });
        const xml: string = new XMLSerializer().serializeToString(TestUtils.getScore("test_technical_arrow.musicxml"));
        await osmd.load(xml);
        osmd.render();
        const arrows: SVGGraphicsElement[] = Array.from(div.querySelectorAll(".vf-technicalarrow"));
        expect(arrows.length).to.equal(16);
        for (const arrow of arrows) {
            const box: DOMRect = arrow.getBBox();
            // A vertical arrow is only as wide as its head; a horizontal one only as tall.
            expect(Math.max(box.width, box.height)).to.be.greaterThan(12);
            expect(Math.min(box.width, box.height)).to.be.greaterThan(4);
        }
    });
});
