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

    /** The x of each vertical stroke of the drawn pedal brackets: the hooks at their ends that aren't open. */
    function pedalHookXs(): number[] {
        const xs: number[] = [];
        // (a pedal marking of a single path has the class on the path, see VexFlowPatch/src/pedalmarking.js)
        for (const path of Array.from(container.querySelectorAll("g.vf-pedalmarking path, path.vf-pedalmarking"))) {
            const coordinates: number[] = path.getAttribute("d").match(/-?[\d.]+/g).map(Number); // M x y L x y ...
            for (let i: number = 2; i + 1 < coordinates.length; i += 2) {
                if (coordinates[i] === coordinates[i - 2] && coordinates[i + 1] !== coordinates[i - 1]) {
                    xs.push(coordinates[i]);
                }
            }
        }
        return xs;
    }

    /** Checks the lines of test_drawing_range_octaveshift_pedal_trill.musicxml when the drawing range cuts off both ends: they
     *  start at the first note drawn, not at beat 2 of the first measure drawn, and end open at the last note drawn. */
    function checkCutLines(systems: number): void {
        const staffLines: StaffLine[][] = osmd.GraphicSheet.MusicPages[0].MusicSystems.map(system => system.StaffLines);
        expect(staffLines.length, "systems").to.equal(systems);
        const noteXs: (line: StaffLine) => number[] = line => line.Measures.flatMap(measure => measure.staffEntries)
            .map(entry => (entry.graphicalVoiceEntries[0] as VexFlowVoiceEntry).vfStaveNote.getAbsoluteX());
        // the 8va is on the right hand's staff, the trill line and the pedal on the left hand's
        const kinds: ["WavyLines" | "Pedals" | "OctaveShifts", number][] = [["OctaveShifts", 0], ["WavyLines", 1], ["Pedals", 1]];
        for (const [kind, staff] of kinds) {
            const lines: StaffLine[] = staffLines.map(systemLines => systemLines[staff]);
            expect(lines.map(line => line[kind].length), `${kind}: one segment per system`).to.deep.equal(Array(systems).fill(1));
            const first: VexFlowVibratoBracket | VexFlowPedal | VexFlowOctaveShift =
                lines[0][kind][0] as VexFlowVibratoBracket | VexFlowPedal | VexFlowOctaveShift;
            const last: VexFlowVibratoBracket | VexFlowPedal | VexFlowOctaveShift =
                lines[lines.length - 1][kind][0] as VexFlowVibratoBracket | VexFlowPedal | VexFlowOctaveShift;
            expect(first.startNote.getAbsoluteX(), `${kind}: starts at the first note drawn`).to.equal(noteXs(lines[0])[0]);
            expect(last.endNote.getAbsoluteX(), `${kind}: ends at the last note drawn`).to.equal(noteXs(lines[lines.length - 1]).pop());
        }
        const [rightHand, leftHand] = staffLines[staffLines.length - 1];
        expect((rightHand.OctaveShifts[0] as VexFlowOctaveShift).endsOnDifferentStaffLine, "8va: no closing hook").to.equal(true);
        expect((leftHand.WavyLines[0] as VexFlowVibratoBracket).ToEndOfStopStave, "trill line: on to the barline").to.equal(true);
        expect(pedalHookXs(), "pedal: a hook at its start only").to.have.lengthOf(1);
    }

    it("starts and ends lines cut off by the drawing range at its first and last notes, open at a cut-off end", async () => {
        // an 8va, a trill line and a pedal line from beat 2 of measure 1 to beat 3 of measure 4, over quarters in both hands
        await osmd.load(TestUtils.getScore("test_drawing_range_octaveshift_pedal_trill.musicxml"));
        osmd.setOptions({drawFromMeasureNumber: 2, drawUpToMeasureNumber: 3});
        osmd.render();
        checkCutLines(2); // measure 3 starts a system
        osmd.setOptions({drawFromMeasureNumber: 3, drawUpToMeasureNumber: 3});
        osmd.render();
        checkCutLines(1);
    });
});
