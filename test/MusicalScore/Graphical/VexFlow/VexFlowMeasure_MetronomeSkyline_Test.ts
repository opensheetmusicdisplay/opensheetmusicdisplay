/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from "vitest";
import { EngravingRules } from "../../../../src/MusicalScore/Graphical/EngravingRules";
import { SkyBottomLineCalculator } from "../../../../src/MusicalScore/Graphical/SkyBottomLineCalculator";
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

    beforeAll(async function (): Promise<void> {
                const score: Document = TestUtils.getScore("ScottJoplin_The_Entertainer.xml");
        const div: HTMLElement = TestUtils.getDivElement(document);
        osmd = new OpenSheetMusicDisplay(div, { autoResize: false });
        await osmd.load(score);
        osmd.render();
    });

    it("metronome mark updates skyline in its x-range", () => {
        const staffLine: StaffLine = osmd.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0];
        const skyCalc: SkyBottomLineCalculator = staffLine.SkyBottomLineCalculator;
        const skyline: number[] = skyCalc.SkyLine;
        expect(skyline, "skyline must be populated after render").to.not.be.undefined;
        expect(skyline.length, "skyline must have entries").to.be.greaterThan(0);

        // The metronome's skyline footprint starts at measureX + beginW.
        const measure: VexFlowMeasure = staffLine.Measures[0] as VexFlowMeasure;
        const measureX: number = measure.PositionAndShape.RelativePosition.x;
        const beginW: number = measure.beginInstructionsWidth;
        // getSkyLineMinInRange multiplies by SamplingUnit internally — pass OSMD units
        const rangeStart: number = measureX + beginW;
        const skyMin: number = skyCalc.getSkyLineMinInRange(rangeStart, rangeStart + 3);

        // After createMetronomeMark() the skyline in the metronome range
        // must reflect the mark (typically <= -5.0).
        expect(skyMin, `skyline in metronome range [${rangeStart}..] must reflect mark (<= -2.5)`)
            .to.be.at.most(-2.5);
    });

    it("StaveTempo yShift pushed above stems by skyline check", () => {
        const rules: EngravingRules = osmd.EngravingRules;
        const measure: VexFlowMeasure = osmd.GraphicSheet.MusicPages[0].MusicSystems[0]
            .StaffLines[0].Measures[0] as VexFlowMeasure;
        const vfStave: any = measure.getVFStave();

        let staveTempo: any = undefined;
        for (const mod of vfStave.getModifiers()) {
            if ((mod as any).tempo && (mod as any).tempo.duration) {
                staveTempo = mod;
                break;
            }
        }
        expect(staveTempo, "StaveTempo must be present on M1").to.not.be.undefined;

        // Entertainer M1 has stems extending ~6.7 units above staff in the
        // metronome range. The skyline check pushes the metronome above them.
        const unitInPixels: number = 10;
        const baseYShiftPx: number = (rules.MetronomeMarkYShift - 1.4) * unitInPixels;
        const actualYShiftPx: number = staveTempo.getYShift();

        expect(actualYShiftPx, "yShift must be pushed below base by skyline")
            .to.be.at.most(baseYShiftPx);
        expect(actualYShiftPx, "yShift must not be excessively pushed")
            .to.be.at.least(-80);
    });
});

/** Verify the StaveTempo stays close to the stave (not pushed far away
 *  by Phase 1 footprint contamination). */
describe("VexFlow Measure - Metronome Distance", () => {
    it("Bach BWV846: metronome pushed above stems by skyline", async function (): Promise<void> {
                const score: Document = TestUtils.getScore(
            "JohannSebastianBach_PraeludiumInCDur_BWV846_1.xml");
        const div: HTMLElement = TestUtils.getDivElement(document);
        const o: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false });
        await o.load(score);
        o.render();

        const measure: VexFlowMeasure =
            o.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0].Measures[0] as VexFlowMeasure;
        const vfStave: any = measure.getVFStave();
        let staveTempo: any = undefined;
        for (const mod of vfStave.getModifiers()) {
            if ((mod as any).tempo && (mod as any).tempo.duration) {
                staveTempo = mod;
                break;
            }
        }
        expect(staveTempo, "StaveTempo must be present").to.not.be.undefined;

        // BWV846 M1 has 16th note arpeggios extending above the staff.
        // Skyline excludes StaveTempo's own footprint (no self-push feedback).
        const unitInPixels: number = 10;
        const baseYShiftPx: number = (o.EngravingRules.MetronomeMarkYShift - 1.4) * unitInPixels;
        const actualYShiftPx: number = staveTempo.getYShift();

        expect(actualYShiftPx, "yShift should be at or below base by skyline")
            .to.be.at.most(baseYShiftPx);
        expect(actualYShiftPx, "yShift must not be excessively negative")
            .to.be.at.least(-70);
    });

    it("Bach Air: metronome pushed only as needed by beams", async function (): Promise<void> {
                const score: Document = TestUtils.getScore("JohannSebastianBach_Air.xml");
        const div: HTMLElement = TestUtils.getDivElement(document);
        const o: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false });
        await o.load(score);
        o.render();

        const measure: VexFlowMeasure =
            o.GraphicSheet.MusicPages[0].MusicSystems[0].StaffLines[0].Measures[0] as VexFlowMeasure;
        const vfStave: any = measure.getVFStave();
        let staveTempo: any = undefined;
        for (const mod of vfStave.getModifiers()) {
            if ((mod as any).tempo && (mod as any).tempo.duration) {
                staveTempo = mod;
                break;
            }
        }
        expect(staveTempo, "StaveTempo must be present").to.not.be.undefined;

        const unitInPixels: number = 10;
        const defaultYShiftPx: number = o.EngravingRules.MetronomeMarkYShift * unitInPixels;
        const actualYShiftPx: number = staveTempo.getYShift();

        // Air's beams extend above staff; skyline adjusts if needed.
        // StaveTempo's own footprint is excluded from skyline (no self-push).
        expect(actualYShiftPx, "yShift should be at or below default (skyline-adjusted for beams)")
            .to.be.at.most(defaultYShiftPx);
        expect(actualYShiftPx, "yShift must not be pushed too far away")
            .to.be.at.least(defaultYShiftPx - 30);
    });
});

describe("VexFlow Measure - Complex Metronome Mark", () => {
    it("swing score renders noteEquation StaveTempo, not simple bpm", async function (): Promise<void> {
                const score: Document = TestUtils.getScore("test_swing_and_complex_metronome_markings.musicxml");
        const div: HTMLElement = TestUtils.getDivElement(document);
        const o: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false });
        await o.load(score);
        o.render();

        const measure: VexFlowMeasure = o.GraphicSheet.MusicPages[0].MusicSystems[0]
            .StaffLines[0].Measures[0] as VexFlowMeasure;
        const vfStave: any = measure.getVFStave();

        let staveTempo: any = undefined;
        for (const mod of vfStave.getModifiers()) {
            if ((mod as any).tempo) {
                staveTempo = mod;
                break;
            }
        }
        expect(staveTempo, "StaveTempo must be present on M1").to.not.be.undefined;
        expect(staveTempo.tempo.noteEquation, "must have noteEquation (complex mark)")
            .to.not.be.undefined;
        expect(staveTempo.tempo.noteEquation.length, "noteEquation must have items")
            .to.be.greaterThan(0);
    });
});
