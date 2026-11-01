import { expect } from "chai";
import { GraphicalMeasure } from "../../../../src/MusicalScore/Graphical/GraphicalMeasure";
import { GraphicalStaffEntry } from "../../../../src/MusicalScore/Graphical/GraphicalStaffEntry";
import { StaffLine } from "../../../../src/MusicalScore/Graphical/StaffLine";
import { unitInPixels } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";
import { VexFlowVoiceEntry } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";

describe("Octave shift start timestamps", () => {
    let container: HTMLElement;
    let osmd: OpenSheetMusicDisplay;

    beforeEach(() => {
        container = TestUtils.getDivElement(document);
        container.style.width = "1050px";
        osmd = TestUtils.createOpenSheetMusicDisplay(container);
    });
    afterEach(() => {
        osmd.clear();
        container.remove();
    });

    /** The x of the note at beat 2 of the measure, in pixels. */
    function beat2X(measure: GraphicalMeasure): number {
        const entry: GraphicalStaffEntry = measure.staffEntries.find(staffEntry => staffEntry.relInMeasureTimestamp.RealValue === 0.25);
        return (entry.graphicalVoiceEntries[0] as VexFlowVoiceEntry).vfStaveNote.getAbsoluteX();
    }

    it("starts at its time also when its voice is on the other staff there, and stays at its own staff (#1841)", async () => {
        await osmd.load(TestUtils.getScore("test_octaveshift_start_cross_staff_1841.musicxml"));
        osmd.render();
        // the drawn "8" labels: the 8va of the upper staff line, then the 8vb of the lower one
        const labels: SVGTextElement[] = Array.from(container.querySelectorAll("text")).filter(text => text.textContent === "8");
        expect(labels.length, "8va and 8vb").to.equal(2);
        const [vaX, vbX] = labels.map(label => Number(label.getAttribute("x")));
        const [vaY, vbY] = labels.map(label => Number(label.getAttribute("y")));
        const [upper, lower] = osmd.GraphicSheet.MeasureList[0].map(measure => measure.ParentStaffLine);
        // m1: the 8va of the upper staff starts at beat 2, where its voice is on the lower staff
        expect(vaX, "8va at beat 2").to.be.closeTo(beat2X(osmd.GraphicSheet.MeasureList[0][1]), 0.01);
        // m2: the 8vb of the lower staff starts at beat 2, where its voice is on the upper staff
        expect(vbX, "8vb at beat 2").to.be.closeTo(beat2X(osmd.GraphicSheet.MeasureList[1][0]), 0.01);
        const top: (staffLine: StaffLine) => number = staffLine => staffLine.PositionAndShape.AbsolutePosition.y * unitInPixels;
        expect(vaY, "8va above the upper staff").to.be.below(top(upper));
        expect(vbY, "8vb below the lower staff").to.be.above(top(lower) + lower.StaffHeight * unitInPixels);
    });
});
