import { expect } from "chai";
import { GraphicalStaffEntry } from "../../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { StaffLine } from "../../../../src/MusicalScore/Graphical/StaffLine";
import { VexFlowOctaveShift } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowOctaveShift";
import { VexFlowPedal } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowPedal";
import { VexFlowVibratoBracket } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowVibratoBracket";
import { VexFlowVoiceEntry } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";

describe("Instruction-only span endpoints", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(() => {
        container = TestUtils.getDivElement(document);
        container.style.width = "800px";
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
        osmd.setOptions({newSystemFromXML: true});
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    function checkSegments(kind: "WavyLines" | "Pedals" | "OctaveShifts", count: number): void {
        const lines: StaffLine[] = osmd.GraphicSheet.MusicPages[0].MusicSystems.map(system => system.StaffLines[0]);
        expect(lines.map(line => line[kind].length)).to.deep.equal(Array(count).fill(1));
        const middle: StaffLine = lines.find(line => line.Measures.some(measure => measure.MeasureNumber === 3));
        const entries: GraphicalStaffEntry[] = middle.Measures.find(measure => measure.MeasureNumber === 3).staffEntries;
        expect(entries[0].graphicalVoiceEntries.length, "leading key has no note").to.equal(0);
        expect(entries[entries.length - 1].graphicalVoiceEntries.length, "trailing key has no note").to.equal(0);
        const noteEntry: GraphicalStaffEntry = entries.find(entry => entry.graphicalVoiceEntries.length > 0);
        const note: VexFlowVoiceEntry = noteEntry.graphicalVoiceEntries[0] as VexFlowVoiceEntry;
        const segment: VexFlowVibratoBracket | VexFlowPedal | VexFlowOctaveShift =
            middle[kind][0] as VexFlowVibratoBracket | VexFlowPedal | VexFlowOctaveShift;
        expect(segment.startNote === note.vfStaveNote, "starts at the actual note").to.equal(true);
        expect(segment.endNote === note.vfStaveNote, "ends at the actual note").to.equal(true);
    }

    function checkDrawingRanges(kind: "WavyLines" | "Pedals" | "OctaveShifts"): void {
        osmd.render();
        checkSegments(kind, 3);
        osmd.setOptions({drawFromMeasureNumber: 2});
        osmd.render();
        checkSegments(kind, 2);
        osmd.setOptions({drawUpToMeasureNumber: 4});
        osmd.render();
        checkSegments(kind, 1);
        osmd.setOptions({drawFromMeasureNumber: 3, drawUpToMeasureNumber: 3});
        osmd.render();
        checkSegments(kind, 1);
        osmd.setOptions({drawFromMeasureNumber: 1, drawUpToMeasureNumber: 5});
        osmd.render();
        checkSegments(kind, 3);
    }

    it("keeps wavy lines across key-only entries, including a truncated drawing range", async () => {
        await osmd.load(TestUtils.getScore("test_instruction_only_wavy_endpoints.musicxml"));
        checkDrawingRanges("WavyLines");
    });

    it("keeps pedal brackets across key-only entries", async () => {
        await osmd.load(TestUtils.getScore("test_instruction_only_pedal_endpoints.musicxml"));
        checkDrawingRanges("Pedals");
    });

    it("keeps octave brackets across key-only entries", async () => {
        await osmd.load(TestUtils.getScore("test_instruction_only_octave_endpoints.musicxml"));
        checkDrawingRanges("OctaveShifts");
    });
});
