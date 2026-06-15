/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from "chai";
import { EngravingRules } from "../../../../src/MusicalScore/Graphical/EngravingRules";
import { StaffLine } from "../../../../src/MusicalScore/Graphical/StaffLine";
import { VexFlowMeasure } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
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

        // skyline[0] is the minimum in the metronome mark's x-range.
        // Default yShift = MetronomeMarkYShift (-1.0) - 1.4 (expression above staffline) = -2.4.
        // Skyline hack deposits -4.5 + yShift = -6.9 at index 0.
        // Without the fix, only "Not fast" contributes (< ~ -3.5).
        expect(skyline[0], "skyline[0] must reflect metronome mark (<= -5.0)")
            .to.be.at.most(-5.0);
    });

    it("StaveTempo yShift is adjusted below default when skyline has beams above staff", () => {
        const rules: EngravingRules = osmd.EngravingRules;
        const measure: VexFlowMeasure = osmd.GraphicSheet.MusicPages[0].MusicSystems[0]
            .StaffLines[0].Measures[0] as VexFlowMeasure;
        const vfStave: any = measure.getVFStave();

        // Find the StaveTempo modifier (has tempo.duration).
        let staveTempo: any = undefined;
        for (const mod of vfStave.getModifiers()) {
            if ((mod as any).tempo && (mod as any).tempo.duration) {
                staveTempo = mod;
                break;
            }
        }
        expect(staveTempo, "StaveTempo must be present on M1").to.not.be.undefined;

        // Default yShift without skyline adjustment: MetronomeMarkYShift (-1.0)
        // minus 1.4 for expression above staffline ("Not fast") = -2.4 units = -24 px.
        // unitInPixels = 10 (OSMD constant, 1 OSMD unit = 10 VF px).
        const unitInPixels: number = 10;
        const defaultYShiftPx: number = (rules.MetronomeMarkYShift - 1.4) * unitInPixels;
        const actualYShiftPx: number = staveTempo.getYShift();

        // The skyline in M1 has beams extending above the staff, so the
        // adjusted yShift must be more negative than the default.
        expect(actualYShiftPx, "StaveTempo yShift must be more negative than default")
            .to.be.below(defaultYShiftPx);
    });
});
