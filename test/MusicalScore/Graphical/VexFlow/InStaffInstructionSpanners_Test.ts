import { expect } from "vitest";
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

    /**
     * A one-staff score in 4/4 of quarters, with an 8va, a pedal line and a trill line from beat 2 of the measure at startIndex
     * to beat 3 of the one at endIndex (SourceMeasures indices). A pickup measure of one quarter first if pickup, and a final
     * barline at the end of the measure at finalBarlineIndex.
     */
    function lineScore(measureCount: number, startIndex: number, endIndex: number, pickup: boolean, finalBarlineIndex: number = -1): string {
        const direction: (type: string, placement: string) => string = (type, placement) =>
            `<direction placement="${placement}"><direction-type>${type}</direction-type></direction>`;
        const note: (wavyLine?: string) => string = wavyLine => "<note><pitch><step>C</step><octave>5</octave></pitch>" +
            "<duration>1</duration><type>quarter</type>" +
            (wavyLine ? `<notations><ornaments><wavy-line type="${wavyLine}" number="1"/></ornaments></notations>` : "") + "</note>";
        const measures: string[] = [];
        for (let index: number = 0; index < measureCount; index++) {
            let content: string = index === 0 ? "<attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type>" +
                "</time><clef><sign>G</sign><line>2</line></clef></attributes>" : "";
            const quarters: number = pickup && index === 0 ? 1 : 4;
            for (let beat: number = 1; beat <= quarters; beat++) {
                if (index === startIndex && beat === 2) {
                    content += direction("<octave-shift type=\"down\" size=\"8\"/>", "above") + direction("<pedal type=\"start\" line=\"yes\"/>", "below");
                    content += note("start");
                } else if (index === endIndex && beat === 3) {
                    content += note("stop") + direction("<octave-shift type=\"stop\" size=\"8\"/>", "above") +
                        direction("<pedal type=\"stop\" line=\"yes\"/>", "below");
                } else {
                    content += note();
                }
            }
            if (index === finalBarlineIndex) {
                content += "<barline location=\"right\"><bar-style>light-heavy</bar-style></barline>";
            }
            const number: number = pickup ? index : index + 1;
            measures.push(`<measure number="${number}"${pickup && index === 0 ? " implicit=\"yes\"" : ""}>${content}</measure>`);
        }
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><score-partwise version=\"4.0\"><part-list><score-part id=\"P1\">" +
            `<part-name></part-name></score-part></part-list><part id="P1">${measures.join("")}</part></score-partwise>`;
    }

    /** Checks that the 8va, the pedal and the trill line are drawn once, from the note at beat 2 of the measure at startIndex
     *  (SourceMeasures index) to the last note of the one at lastIndex, the last measure drawn. */
    function checkLinesFrom(startIndex: number, lastIndex: number): void {
        const lines: StaffLine[] = osmd.GraphicSheet.MusicPages[0].MusicSystems.map(system => system.StaffLines[0]);
        const noteAt: (index: number, entry: number) => VexFlowVoiceEntry = (index, entry) => {
            const entries: GraphicalStaffEntry[] = osmd.GraphicSheet.MeasureList[index][0].staffEntries;
            return entries[entry < 0 ? entries.length + entry : entry].graphicalVoiceEntries[0] as VexFlowVoiceEntry;
        };
        const kinds: ("WavyLines" | "Pedals" | "OctaveShifts")[] = ["WavyLines", "Pedals", "OctaveShifts"];
        for (const kind of kinds) {
            expect(lines.map(line => line[kind].length), `${kind}: drawn in the one system`).to.deep.equal([1]);
            const segment: VexFlowVibratoBracket | VexFlowPedal | VexFlowOctaveShift =
                lines[0][kind][0] as VexFlowVibratoBracket | VexFlowPedal | VexFlowOctaveShift;
            expect(segment.startNote === noteAt(startIndex, 1).vfStaveNote, `${kind}: starts at beat 2 of its measure`).to.equal(true);
            expect(segment.endNote === noteAt(lastIndex, -1).vfStaveNote, `${kind}: ends at the last note drawn`).to.equal(true);
        }
    }

    it("compares the drawing range with measure indices, not numbers, for lines it cuts off", async () => {
        // with a pickup, measure number n is at index n: the lines from measure 2 to 4 were cut off at the start
        //   of measure 2 (index 2 < number 2 + 1) and not drawn when the range ended in measure 3 (index 4 > 3 + 1 was false)
        await osmd.load(lineScore(5, 2, 4, true));
        osmd.setOptions({drawFromMeasureNumber: 2, drawUpToMeasureNumber: 3});
        osmd.render();
        checkLinesFrom(2, 3);

        // the measure numbers start again after a final barline with NewPartAndSystemAfterFinalBarline: measures 1, 2 || 1, 2, 3, 4
        osmd.EngravingRules.NewPartAndSystemAfterFinalBarline = true; // (read when loading)
        await osmd.load(lineScore(6, 3, 5, false, 1));
        expect(osmd.Sheet.SourceMeasures.map(measure => measure.MeasureNumber), "measure numbers").to.deep.equal([1, 2, 1, 2, 3, 4]);
        osmd.setOptions({drawFromMeasureNumber: 4, drawUpToMeasureNumber: 5}); // indices 3-4
        osmd.render();
        checkLinesFrom(3, 4);
    });
});
