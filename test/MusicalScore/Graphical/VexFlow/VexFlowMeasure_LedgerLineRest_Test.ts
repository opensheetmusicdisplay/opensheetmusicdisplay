import { expect } from "vitest";
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { GraphicalMeasure } from "../../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { GraphicalStaffEntry } from "../../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { GraphicalVoiceEntry } from "../../../../src/MusicalScore/Graphical/GraphicalVoiceEntry";
import { VexFlowGraphicalNote } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowGraphicalNote";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";

describe("VexFlow GraphicalNote ledger lines for rests", () => {
    it("rests with display-step/display-octave get ledger lines", async () => {
        const score: Document = TestUtils.getScore("test_ledger_line_rest.musicxml");
        const div: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        await osmd.load(score);
        osmd.render();

        // Measure 1: voice 2 has a whole rest at D6 (display-step=D, display-octave=6)
        const gm1: GraphicalMeasure = osmd.GraphicSheet.findGraphicalMeasure(0, 0);
        const staffEntry0: GraphicalStaffEntry = gm1.staffEntries[0];
        expect(staffEntry0).to.not.be.undefined;

        const voiceEntries1: GraphicalVoiceEntry[] = staffEntry0.graphicalVoiceEntries;
        expect(voiceEntries1).to.not.be.undefined;
        expect(voiceEntries1.length).to.be.greaterThan(1);

        const wholeRestNote: VexFlowGraphicalNote = voiceEntries1[1]?.notes[0] as VexFlowGraphicalNote;
        expect(wholeRestNote).to.not.be.undefined;
        expect(wholeRestNote.sourceNote.isRest()).to.be.true;

        // Whole rest at D6 (above staff) with display-step/display-octave
        expect(wholeRestNote.vfnote[0].getDuration()).to.equal("w");

        // Measure 2: voice 2 has two half rests at C3 (display-step=C, display-octave=3)
        const gm2: GraphicalMeasure = osmd.GraphicSheet.findGraphicalMeasure(1, 0);
        const staffEntry: GraphicalStaffEntry = gm2.staffEntries[0];
        expect(staffEntry).to.not.be.undefined;

        const voiceEntries: GraphicalVoiceEntry[] = staffEntry.graphicalVoiceEntries;
        expect(voiceEntries).to.not.be.undefined;
        expect(voiceEntries.length).to.be.greaterThan(1);

        const restNote: VexFlowGraphicalNote = voiceEntries[1]?.notes[0] as VexFlowGraphicalNote;
        expect(restNote).to.not.be.undefined;
        expect(restNote.sourceNote.isRest()).to.be.true;

        const ledgerLines: HTMLElement[] = restNote.getLedgerLineSVGs();
        expect(ledgerLines.length).to.equal(1);
    });

    it("voice 2 whole rest at D6 is correctly positioned as whole rest", async () => {
        const score: Document = TestUtils.getScore("test_ledger_line_rest.musicxml");
        const div: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = TestUtils.createOpenSheetMusicDisplay(div);
        await osmd.load(score);
        osmd.render();

        const gm1: GraphicalMeasure = osmd.GraphicSheet.findGraphicalMeasure(0, 0);
        const wholeRestNote: VexFlowGraphicalNote =
            gm1.staffEntries[0]?.graphicalVoiceEntries[1]?.notes[0] as VexFlowGraphicalNote;
        expect(wholeRestNote).to.not.be.undefined;

        const vfnote: any = wholeRestNote.vfnote[0];

        // Verify the whole-measure rest uses R/4 key (not display-step pitch)
        const vfKeys: string[] = vfnote.getKeys?.() ?? [];
        expect(vfKeys).to.deep.equal(["R/4"]);

        // Verify duration is whole
        const duration: string = vfnote.getDuration();
        expect(duration).to.equal("w");

        // Whole rest at line 7 (floored from D6 line 7.5) — 1 ledger line.
        const ledgerLines: HTMLElement[] = wholeRestNote.getLedgerLineSVGs();
        expect(ledgerLines.length).to.equal(1);
    });
});
