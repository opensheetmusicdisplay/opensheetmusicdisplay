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

    function checkSegments(count: number, startMeasure: number = 2, endMeasure: number = 4): void {
        const lines: StaffLine[] = osmd.GraphicSheet.MusicPages[0].MusicSystems.map(system => system.StaffLines[0]);
        const middle: StaffLine = lines.find(line => line.Measures.some(measure => measure.MeasureNumber === 3));
        const entries: GraphicalStaffEntry[] = middle.Measures.find(measure => measure.MeasureNumber === 3).staffEntries;
        expect(entries[0].graphicalVoiceEntries.length, "leading key has no note").to.equal(0);
        expect(entries[entries.length - 1].graphicalVoiceEntries.length, "trailing key has no note").to.equal(0);
        const firstEntry: GraphicalStaffEntry = middle.Measures.find(measure => measure.MeasureNumber === startMeasure)
            .staffEntries.find(entry => entry.graphicalVoiceEntries.length > 0);
        const lastEntry: GraphicalStaffEntry = middle.Measures.find(measure => measure.MeasureNumber === endMeasure)
            .staffEntries.find(entry => entry.graphicalVoiceEntries.length > 0);
        const firstNote: VexFlowVoiceEntry = firstEntry.graphicalVoiceEntries[0] as VexFlowVoiceEntry;
        const lastNote: VexFlowVoiceEntry = lastEntry.graphicalVoiceEntries[0] as VexFlowVoiceEntry;
        const kinds: ("WavyLines" | "Pedals" | "OctaveShifts")[] = ["WavyLines", "Pedals", "OctaveShifts"];
        for (const kind of kinds) {
            expect(lines.map(line => line[kind].length), `${kind}: one segment per system`).to.deep.equal(Array(count).fill(1));
            const segment: VexFlowVibratoBracket | VexFlowPedal | VexFlowOctaveShift =
                middle[kind][0] as VexFlowVibratoBracket | VexFlowPedal | VexFlowOctaveShift;
            expect(segment.startNote === firstNote.vfStaveNote, `${kind}: starts at the first note or rest`).to.equal(true);
            expect(segment.endNote === lastNote.vfStaveNote, `${kind}: ends at the last note or rest`).to.equal(true);
        }
    }

    it("keeps octave, pedal, and wavy lines across key-only entries and truncated drawing ranges", async () => {
        await osmd.load(TestUtils.getScore("test_instruction_only_endpoints.musicxml"));
        expect(osmd.Sheet.SourceMeasures.map(measure => measure.Duration.RealValue), "all five measures have their full length")
            .to.deep.equal([1, 1, 1, 1, 1]);
        osmd.render();
        checkSegments(3);
        osmd.setOptions({drawFromMeasureNumber: 2});
        osmd.render();
        checkSegments(2);
        osmd.setOptions({drawUpToMeasureNumber: 4});
        osmd.render();
        checkSegments(1);
        osmd.setOptions({drawFromMeasureNumber: 3, drawUpToMeasureNumber: 3});
        osmd.render();
        checkSegments(1, 3, 3);
        osmd.setOptions({drawFromMeasureNumber: 1, drawUpToMeasureNumber: 5});
        osmd.render();
        checkSegments(3);
    });
});
