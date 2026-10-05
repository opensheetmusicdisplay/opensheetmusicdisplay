import { expect } from "chai";
import { TestUtils } from "../../Util/TestUtils";
import { OpenSheetMusicDisplay } from "../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { GraphicalLyricEntry } from "../../../src/MusicalScore/Graphical/GraphicalLyricEntry";
import { BoundingBox } from "../../../src/MusicalScore/Graphical/BoundingBox";
import { VexFlowGraphicalNote } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { unitInPixels } from "../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";

/**
 * calculateSingleStaffLineLyricsPosition() places a staff line's lyrics below the bottom line in the range of each lyric label.
 * It read that range at the staff entry's x, without the label's x relative to it: left-aligned lyrics (the default)
 * start 1 unit left of it, so the bottom line under the start of a word was not read, e.g. an accidental or the stem of a
 * stem-down note.
 */
describe("Lyrics bottom line range", () => {
    let container: HTMLElement;
    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = "1300px";
        document.body.appendChild(container);
    });
    afterEach(() => {
        container.remove();
    });

    it("keeps a word clear of the accidental under its start", async () => {
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(container);
        // "Sharp" on C#4 (stem up), whose sharp reaches below the ledger line, under the "S"
        await osmd.load(TestUtils.getScore("OSMD_function_test_accidentals.musicxml"));
        osmd.render();
        const sharp: GraphicalLyricEntry = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0].Measures[0].staffEntries[0]
            .LyricsEntries[0];
        expect(sharp.LyricsEntry.Text, "the first word").to.equal("Sharp");
        const note: VexFlowGraphicalNote = sharp.StaffEntryParent.graphicalVoiceEntries[0].notes[0] as VexFlowGraphicalNote;
        // the drawn accidental (the note's only modifier), in the page's units like the label's box
        const accidental: DOMRect = (note.getSVGGElement().querySelector(".vf-modifiers") as SVGGElement).getBBox();
        const label: BoundingBox = sharp.GraphicalLabel.PositionAndShape;
        const labelLeft: number = label.AbsolutePosition.x + label.BorderLeft;
        const labelTop: number = label.AbsolutePosition.y + label.BorderTop;
        const accidentalRight: number = (accidental.x + accidental.width) / unitInPixels;
        const accidentalBottom: number = (accidental.y + accidental.height) / unitInPixels;
        expect(accidentalRight, "the accidental is under the start of the word").to.be.greaterThan(labelLeft);
        // (the label's top was 0.3 units above the bottom of the sharp)
        expect(labelTop, "the word's top below the accidental").to.be.at.least(accidentalBottom);
    });
});
