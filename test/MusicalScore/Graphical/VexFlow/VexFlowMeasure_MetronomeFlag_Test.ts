import { expect } from "vitest";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";

/**
 * Verifies the drawMetronomeMarks option flag suppresses metronome marks
 * when false, and includes them by default.
 */
describe("VexFlow Measure - Metronome Mark Flag", () => {
    it("draws metronome marks by default", async function (): Promise<void> {
        const score: Document = TestUtils.getScore("test_metronome_mark_flag.musicxml");
        const div: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, { autoResize: false });
        await osmd.load(score);
        osmd.render();

        const vfStave: any = osmd.GraphicSheet.MusicPages[0].MusicSystems[0]
            .StaffLines[0].Measures[0].getVFStave();
        const tempos: any[] = vfStave.getModifiers().filter(
            (m: any) => m.tempo && m.tempo.duration
        );
        expect(tempos.length, "metronome mark should exist by default")
            .to.be.at.least(1);
    });

    it("suppresses metronome marks when drawMetronomeMarks=false", async function (): Promise<void> {
        const score: Document = TestUtils.getScore("test_metronome_mark_flag.musicxml");
        const div: HTMLElement = TestUtils.getDivElement(document);
        const osmd: OpenSheetMusicDisplay = new OpenSheetMusicDisplay(div, {
            autoResize: false,
            drawMetronomeMarks: false,
        });
        await osmd.load(score);
        osmd.render();

        // Check no StaveTempo modifiers with bpm appear in any measure
        for (const system of osmd.GraphicSheet.MusicPages[0].MusicSystems) {
            for (const staffLine of system.StaffLines) {
                for (const measure of staffLine.Measures) {
                    const vfStave: any = (measure as any).getVFStave();
                    const tempos: any[] = vfStave.getModifiers().filter(
                        (m: any) => m.tempo && m.tempo.duration
                    );
                    expect(tempos.length, "no metronome marks when flag=false")
                        .to.equal(0);
                }
            }
        }
    });
});
