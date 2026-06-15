/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from "chai";
import { StaffLine } from "../../../../src/MusicalScore/Graphical/StaffLine";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";

/** Verifies that metronome marks added by addMetronomeMarksToStave() still
 *  update the skyline. The StaveTempo is created early (during
 *  buildMusicSystems), but the skyline is only populated later (during
 *  calculateSkyBottomLines). The skyline update must happen in
 *  createMetronomeMark() even when hasMetronomeMark is already true.
 *
 *  Reproducer: Without the fix, the metronome mark's skyline contribution
 *  is silently dropped, so above-staff elements (lyrics, other expressions)
 *  can overlap the metronome mark. */
describe("VexFlow Measure - Metronome Skyline", () => {
    let osmd: OpenSheetMusicDisplay;

    before(async function (): Promise<void> {
        this.timeout(30000);
        const score: Document = TestUtils.getScore("ScottJoplin_The_Entertainer.xml");
        const div: HTMLElement = TestUtils.getDivElement(document);
        osmd = new OpenSheetMusicDisplay(div, { autoResize: false });
        await osmd.load(score);
        osmd.render();
    });

    it("metronome mark updates skyline (even when added via addMetronomeMarksToStave)", () => {
        // First staffline of first system — Entertainer M1 has
        // "Not fast" (verbal tempo) + "♩ = 72" (metronome mark).
        const staffLine: StaffLine = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
        const skyline: number[] = staffLine.SkyBottomLineCalculator.SkyLine;
        expect(skyline, "skyline must be populated after render").to.not.be.undefined;
        expect(skyline.length, "skyline must have entries").to.be.greaterThan(0);

        // yShift = MetronomeMarkYShift (-1.0) - 1.4 (expression above staffline) = -2.4
        // The skyline hack pushes skyline[0] to min(skyline[0], -4.5 + yShift) = -6.9
        // Without the fix, only "Not fast" contributes, giving a higher value.
        expect(skyline[0], "skyline[0] must reflect metronome mark (<= -5.0)")
            .to.be.at.most(-5.0);
    });
});
