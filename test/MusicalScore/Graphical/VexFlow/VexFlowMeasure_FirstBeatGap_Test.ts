/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from "chai";
import { VexFlowMeasure } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { VexFlowStaffEntry } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowStaffEntry";
import { VexFlowVoiceEntry } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";
import { unitInPixels } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";

/** Verifies that the first beat gap (distance from beginInstructions end to first note)
 *  is consistent across measures when they have the same accidental situation,
 *  and that accidentals don't overlap begin instructions.
 *
 *  Repro: M82 in Entertainer has two flats (Eb3, Gb3) on the first beat in the bass staff.
 *  Without the fix, modLeftPx (22.8px) is fully included in the first tick context X,
 *  pushing the gap to 3.08 units and inflating M82 vs M81/M83 which have no accidentals.
 *  With the fix, Stave.padding (8px) absorbs as much accidental space as possible,
 *  reducing the gap to 2.28 units and keeping the accidental left edge at noteStartX. */
describe("VexFlow Measure - First Beat Gap", () => {
    let osmd: OpenSheetMusicDisplay;

    before(async function (): Promise<void> {
        this.timeout(30000);
        const score: Document = TestUtils.getScore("ScottJoplin_The_Entertainer.xml");
        const div: HTMLElement = TestUtils.getDivElement(document);
        osmd = new OpenSheetMusicDisplay(div, { autoResize: false });
        await osmd.load(score);
        osmd.render();
    });

    /** Compute stave-internal gap: distance from noteStartX to the first tick context
     *  X + Stave.padding. Uses VF coordinates only. */
    function getGapInternal(measureNumber: number, staffIndex: number): {
        /** gapToInstrEnd = firstCtxX/unitInPixels + Stave.padding/unitInPixels (= 0.8).
         *  For measures with accidentals, this includes the residual accidental space
         *  not absorbed by Stave.padding. */
        gapToInstrEnd: number;
        firstCtxX: number;
        modLeftPx: number;
    } | null {
        const pages: any[] = osmd.GraphicSheet.MusicPages;
        for (const page of pages) {
            for (const system of page.MusicSystems) {
                for (const sl of system.StaffLines) {
                    if (system.StaffLines.indexOf(sl) !== staffIndex) { continue; }
                    for (const m of sl.Measures) {
                        const vfm: VexFlowMeasure = m as VexFlowMeasure;
                        if (vfm.MeasureNumber !== measureNumber) { continue; }
                        const se: VexFlowStaffEntry = vfm.staffEntries[0] as VexFlowStaffEntry;
                        if (!se || !se.graphicalVoiceEntries || se.graphicalVoiceEntries.length === 0) {
                            return null;
                        }
                        const gve: VexFlowVoiceEntry = se.graphicalVoiceEntries[0] as VexFlowVoiceEntry;
                        if (!gve.vfStaveNote) { return null; }

                        const stave: any = vfm.getVFStave();
                        // eslint-disable-next-line @typescript-eslint/typedef
                        const noteStartX = stave.getNoteStartX() / unitInPixels;
                        // eslint-disable-next-line @typescript-eslint/typedef
                        const noteAbsX = gve.vfStaveNote.getAbsoluteX() / unitInPixels;

                        const notePosFromNoteStart: number = noteAbsX - noteStartX;

                        // eslint-disable-next-line @typescript-eslint/typedef
                        const tc = gve.vfStaveNote.checkTickContext();
                        const tcMetrics: any = tc.getMetrics();
                        // eslint-disable-next-line @typescript-eslint/typedef
                        const modLeftPx = tcMetrics.modLeftPx as number;
                        // eslint-disable-next-line @typescript-eslint/typedef
                        const firstCtxX = tc.getX() as number;

                        return {
                            gapToInstrEnd: notePosFromNoteStart,
                            firstCtxX,
                            modLeftPx,
                        };
                    }
                }
            }
        }
        return null;
    }

    it("M81, M82, M83 first beat gaps are consistent", () => {
        // eslint-disable-next-line @typescript-eslint/typedef
        const m81Treble = getGapInternal(81, 0);
        // eslint-disable-next-line @typescript-eslint/typedef
        const m82Treble = getGapInternal(82, 0);
        // eslint-disable-next-line @typescript-eslint/typedef
        const m83Treble = getGapInternal(83, 0);
        // eslint-disable-next-line @typescript-eslint/typedef
        const m81Bass = getGapInternal(81, 1);
        // eslint-disable-next-line @typescript-eslint/typedef
        const m82Bass = getGapInternal(82, 1);
        // eslint-disable-next-line @typescript-eslint/typedef
        const m83Bass = getGapInternal(83, 1);

        console.log("=== First Beat Gap Internal (Treble) ===");
        console.log("  M81: gapToInstrEnd=" + m81Treble?.gapToInstrEnd?.toFixed(2)
            + " firstCtxX=" + m81Treble?.firstCtxX?.toFixed(1)
            + " modLeftPx=" + m81Treble?.modLeftPx?.toFixed(1));
        console.log("  M82: gapToInstrEnd=" + m82Treble?.gapToInstrEnd?.toFixed(2)
            + " firstCtxX=" + m82Treble?.firstCtxX?.toFixed(1)
            + " modLeftPx=" + m82Treble?.modLeftPx?.toFixed(1));
        console.log("  M83: gapToInstrEnd=" + m83Treble?.gapToInstrEnd?.toFixed(2)
            + " firstCtxX=" + m83Treble?.firstCtxX?.toFixed(1)
            + " modLeftPx=" + m83Treble?.modLeftPx?.toFixed(1));
        console.log("=== First Beat Gap Internal (Bass) ===");
        console.log("  M81: gapToInstrEnd=" + m81Bass?.gapToInstrEnd?.toFixed(2)
            + " firstCtxX=" + m81Bass?.firstCtxX?.toFixed(1)
            + " modLeftPx=" + m81Bass?.modLeftPx?.toFixed(1));
        console.log("  M82: gapToInstrEnd=" + m82Bass?.gapToInstrEnd?.toFixed(2)
            + " firstCtxX=" + m82Bass?.firstCtxX?.toFixed(1)
            + " modLeftPx=" + m82Bass?.modLeftPx?.toFixed(1));
        console.log("  M83: gapToInstrEnd=" + m83Bass?.gapToInstrEnd?.toFixed(2)
            + " firstCtxX=" + m83Bass?.firstCtxX?.toFixed(1)
            + " modLeftPx=" + m83Bass?.modLeftPx?.toFixed(1));

        expect(m81Treble, "M81 treble must exist").to.not.be.null;
        expect(m82Treble, "M82 treble must exist").to.not.be.null;
        expect(m83Treble, "M83 treble must exist").to.not.be.null;
        expect(m81Bass, "M81 bass must exist").to.not.be.null;
        expect(m82Bass, "M82 bass must exist").to.not.be.null;
        expect(m83Bass, "M83 bass must exist").to.not.be.null;

        // Treble: no first-beat accidentals in M81/M82/M83.
        // Gap should be Stave.padding (= 0.8 units) for all three.
        const trebleGaps: number[] = [m81Treble!.gapToInstrEnd, m82Treble!.gapToInstrEnd, m83Treble!.gapToInstrEnd];
        const trebleMaxDiff: number = Math.max(...trebleGaps) - Math.min(...trebleGaps);
        expect(trebleMaxDiff, "treble first-beat gap should be consistent (max diff <= 0.1)").to.be.at.most(0.1);

        // Bass: M81 and M83 have no first-beat accidentals, M82 has two flats.
        // M81 and M83 gaps should be identical (= Stave.padding = 0.8).
        const bassNoAccGap: number = Math.abs(m81Bass!.gapToInstrEnd - m83Bass!.gapToInstrEnd);
        expect(bassNoAccGap, "M81 and M83 bass gaps should be identical (both have no first-beat accidentals)")
            .to.be.at.most(0.1);

        // M82 has accidentals, so its gap will be larger than M81/M83.
        // This is expected — the accidentals need space.
        // Key assertion: the formatter fix prevents modLeftPx from inflating the gap.
        // firstCtxX should be max(modLeftPx - Stave.padding, 0), not totalLeftPx.
        // With fix: firstCtxX ≈ 14.8 (modLeftPx - 8 = 22.8 - 8 = 14.8).
        // Without fix: firstCtxX ≈ 22.8 (= totalLeftPx = modLeftPx).
        console.log("  M82 bass: firstCtxX=" + m82Bass!.firstCtxX.toFixed(1)
            + " modLeftPx=" + m82Bass!.modLeftPx.toFixed(1)
            + " expectedFirstCtxXWithFix~=" + Math.max(m82Bass!.modLeftPx - 8, 0).toFixed(1));
        expect(m82Bass!.firstCtxX,
            "M82 bass firstCtxX must be max(modLeftPx - Stave.padding, 0) = modLeftPx - 8, not modLeftPx")
            .to.be.closeTo(Math.max(m82Bass!.modLeftPx - 8, 0), 1.0);

        // M82 gap should be less than what it would have been without fix (modLeftPx + padding).
        // Without fix: gap = modLeftPx/10 + 0.8. With fix: gap = max(modLeftPx-8, 0)/10 + 0.8.
        // eslint-disable-next-line @typescript-eslint/typedef
        const gapWithoutFix = m82Bass!.modLeftPx / unitInPixels + 0.8;
        console.log("  M82 bass: gapWithFix=" + m82Bass!.gapToInstrEnd.toFixed(2)
            + " gapWithoutFix~=" + gapWithoutFix.toFixed(2));
        expect(m82Bass!.gapToInstrEnd,
            "M82 bass gap with fix must be less than without fix (modLeftPx + padding)")
            .to.be.below(gapWithoutFix - 0.01);

        // Critical: accidental left edge must not overlap begin instructions.
        // accidentalLeftEdge = gapToInstrEnd - modLeftPx/unitInPixels = (firstCtxX + 8 - modLeftPx)/10.
        // With fix: firstCtxX = max(modLeftPx - 8, 0), so accidentalLeftEdge ≈ 0.
        // eslint-disable-next-line @typescript-eslint/typedef
        const m82BassAccidentalLeftEdge = m82Bass!.gapToInstrEnd - m82Bass!.modLeftPx / unitInPixels;
        console.log("  M82 bass accidental leftEdge from noteStartX=" + m82BassAccidentalLeftEdge.toFixed(2)
            + " (>=0 = no overlap with begin instructions)");
        expect(m82BassAccidentalLeftEdge,
            "M82 bass accidental left edge must not extend left of noteStartX")
            .to.be.at.least(-0.15);
    });
});
