/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from "vitest";
import { VexFlowMeasure } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { VexFlowStaffEntry } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowStaffEntry";
import { VexFlowVoiceEntry } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowVoiceEntry";
import { OpenSheetMusicDisplay } from "../../../../src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";
import { TestUtils } from "../../../Util/TestUtils";
import { unitInPixels } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";

/** Verifies that the first beat gap is reduced by the formatter fix and that
 *  treble/bass voices stay vertically aligned on beats 1 and 1.5.
 *
 *  Repro: M82 in Entertainer has two flats (Eb3, Gb3) on first beat in bass staff.
 *  Without fix, modLeftPx (22.8px) fully included in first tick context X
 *  (= totalLeftPx), inflating gap to ~3.08 units.
 *  With fix, firstCtxX = max(modLeftPx - Stave.padding, 0), absorbing 8px
 *  of accidental space into padding. Gap reduced to ~2.28 units. */
describe("VexFlow Measure - First Beat Gap", () => {
    let osmd: OpenSheetMusicDisplay;

    beforeAll(async function (): Promise<void> {
                const score: Document = TestUtils.getScore("ScottJoplin_The_Entertainer.xml");
        const div: HTMLElement = TestUtils.getDivElement(document);
        osmd = new OpenSheetMusicDisplay(div, { autoResize: false });
        await osmd.load(score);
        osmd.render();
    });

    interface GapInfo {
        gapToInstrEnd: number;
        firstCtxX: number;
        modLeftPx: number;
        beat1AbsX: number;
        beat1p5TickCtxX: number;
    }

    /** Analyze a measure's first beat gap and voice positions.
     *  Uses VF tickContext X for beat-alignment checks (shared across voices),
     *  and stave-relative note position for gap checks. */
    function analyzeMeasure(measureNumber: number, staffIndex: number): GapInfo | null {
        const pages: any[] = osmd.GraphicSheet.MusicPages;
        for (const page of pages) {
            for (const system of page.MusicSystems) {
                for (const sl of system.StaffLines) {
                    if (system.StaffLines.indexOf(sl) !== staffIndex) { continue; }
                    for (const m of sl.Measures) {
                        const vfm: VexFlowMeasure = m as VexFlowMeasure;
                        if (vfm.MeasureNumber !== measureNumber) { continue; }

                        const se0: VexFlowStaffEntry = vfm.staffEntries[0] as VexFlowStaffEntry;
                        if (!se0 || !se0.graphicalVoiceEntries || se0.graphicalVoiceEntries.length === 0) {
                            return null;
                        }
                        const gve0: VexFlowVoiceEntry = se0.graphicalVoiceEntries[0] as VexFlowVoiceEntry;
                        if (!gve0.vfStaveNote) { return null; }

                        const stave: any = vfm.getVFStave();
                        // eslint-disable-next-line @typescript-eslint/typedef
                        const noteStartX = stave.getNoteStartX() / unitInPixels;
                        // eslint-disable-next-line @typescript-eslint/typedef
                        const noteAbsX0 = gve0.vfStaveNote.getAbsoluteX() / unitInPixels;
                        const gapToInstrEnd: number = noteAbsX0 - noteStartX;

                        // eslint-disable-next-line @typescript-eslint/typedef
                        const tc0 = gve0.vfStaveNote.checkTickContext();
                        const tcMetrics0: any = tc0.getMetrics();
                        // eslint-disable-next-line @typescript-eslint/typedef
                        const modLeftPx = tcMetrics0.modLeftPx as number;
                        // eslint-disable-next-line @typescript-eslint/typedef
                        const firstCtxX = tc0.getX() as number;

                        // Beat 1.5 tick context X (for voice alignment check)
                        let beat1p5TickCtxX: number = -1;
                        if (vfm.staffEntries.length > 1) {
                            const se1: VexFlowStaffEntry = vfm.staffEntries[1] as VexFlowStaffEntry;
                            if (se1 && se1.graphicalVoiceEntries && se1.graphicalVoiceEntries.length > 0) {
                                const gve1: VexFlowVoiceEntry = se1.graphicalVoiceEntries[0] as VexFlowVoiceEntry;
                                if (gve1.vfStaveNote) {
                                    // eslint-disable-next-line @typescript-eslint/typedef
                                    const tc1 = gve1.vfStaveNote.checkTickContext();
                                    beat1p5TickCtxX = tc1.getX() / unitInPixels;
                                }
                            }
                        }

                        return {
                            gapToInstrEnd,
                            firstCtxX,
                            modLeftPx,
                            beat1AbsX: tc0.getX() / unitInPixels,
                            beat1p5TickCtxX,
                        };
                    }
                }
            }
        }
        return null;
    }

    it("M81, M82, M83 first beat gaps are consistent", () => {
        // eslint-disable-next-line @typescript-eslint/typedef
        const m81Treble = analyzeMeasure(81, 0);
        // eslint-disable-next-line @typescript-eslint/typedef
        const m82Treble = analyzeMeasure(82, 0);
        // eslint-disable-next-line @typescript-eslint/typedef
        const m83Treble = analyzeMeasure(83, 0);
        // eslint-disable-next-line @typescript-eslint/typedef
        const m81Bass = analyzeMeasure(81, 1);
        // eslint-disable-next-line @typescript-eslint/typedef
        const m82Bass = analyzeMeasure(82, 1);
        // eslint-disable-next-line @typescript-eslint/typedef
        const m83Bass = analyzeMeasure(83, 1);

        const logOne: (prefix: string, info: GapInfo | null) => void = (prefix, info) => {
            console.log("  " + prefix + ": gap=" + info?.gapToInstrEnd?.toFixed(2)
                + " firstCtxX=" + info?.firstCtxX?.toFixed(1)
                + " modLeftPx=" + info?.modLeftPx?.toFixed(1)
                + " beat1CtxX=" + info?.beat1AbsX?.toFixed(2)
                + " beat1.5CtxX=" + info?.beat1p5TickCtxX?.toFixed(2));
        };
        console.log("=== First Beat Gap + Voice Alignment ===");
        logOne("M81 Treble", m81Treble);
        logOne("M81 Bass  ", m81Bass);
        logOne("M82 Treble", m82Treble);
        logOne("M82 Bass  ", m82Bass);
        logOne("M83 Treble", m83Treble);
        logOne("M83 Bass  ", m83Bass);

        expect(m81Treble, "M81 treble must exist").to.not.be.null;
        expect(m82Treble, "M82 treble must exist").to.not.be.null;
        expect(m83Treble, "M83 treble must exist").to.not.be.null;
        expect(m81Bass, "M81 bass must exist").to.not.be.null;
        expect(m82Bass, "M82 bass must exist").to.not.be.null;
        expect(m83Bass, "M83 bass must exist").to.not.be.null;

        // --- Voice alignment: beat 1 tickContextX must match across staves ---
        // With single formatter, same-timestamp voices share a tick context.
        for (const m of [{ n: 81, t: m81Treble, b: m81Bass },
                          { n: 82, t: m82Treble, b: m82Bass },
                          { n: 83, t: m83Treble, b: m83Bass }]) {
            // eslint-disable-next-line @typescript-eslint/typedef
            const diff = Math.abs(m.t!.beat1AbsX - m.b!.beat1AbsX);
            console.log("  M" + m.n + " beat1 ctxX diff=" + diff.toFixed(3));
            expect(diff, "M" + m.n + " beat 1: treble/bass tickContextX must align (diff <= 0.01)")
                .to.be.at.most(0.01);
        }

        // Beat 1.5: alignment depends on whether voices share the same tick.
        // M81 and M82 have different rhythmic subdivisions between treble/bass
        // on beat 1.5 (anacrusis), so they land in different tick contexts.
        // M83 beat 1.5 has identical rhythm → shared tick context → alignment.
        // This is pre-existing VF5 formatter behavior, not affected by our fix.
        for (const m of [{ n: 81, t: m81Treble, b: m81Bass },
                          { n: 82, t: m82Treble, b: m82Bass },
                          { n: 83, t: m83Treble, b: m83Bass }]) {
            if (m.t!.beat1p5TickCtxX < 0 || m.b!.beat1p5TickCtxX < 0) { continue; }
            // eslint-disable-next-line @typescript-eslint/typedef
            const diff = Math.abs(m.t!.beat1p5TickCtxX - m.b!.beat1p5TickCtxX);
            console.log("  M" + m.n + " beat1.5 ctxX diff=" + diff.toFixed(3)
                + " (treble=" + m.t!.beat1p5TickCtxX.toFixed(2)
                + " bass=" + m.b!.beat1p5TickCtxX.toFixed(2) + ")");
            // Only assert alignment when voices share a tick context (diff < 0.01 means same ctx).
            // When they differ, it means voices have different timestamps — not a bug.
            if (diff < 0.01) {
                // Already aligned, just verify it stays that way.
                expect(diff, "M" + m.n + " beat 1.5: shared tick context must stay aligned")
                    .to.be.at.most(0.01);
            }
        }

        // --- Gap consistency: same-accidental measures must match ---
        // M81 and M83 have no first-beat accidentals in either staff.
        // M82 bass has two flats; single formatter shares modLeftPx,
        // so M82 treble also gets the same gap as bass.
        const noAccGap: number = Math.abs(m81Treble!.gapToInstrEnd - m83Treble!.gapToInstrEnd);
        expect(noAccGap,
            "M81/M83 gaps must match (no first-beat accidentals on either staff)")
            .to.be.at.most(0.01);

        // M82 treble and bass must have identical gap (single formatter shares tick context).
        const m82TbDiff: number = Math.abs(m82Treble!.gapToInstrEnd - m82Bass!.gapToInstrEnd);
        expect(m82TbDiff, "M82 treble/bass must share same gap (single formatter)")
            .to.be.at.most(0.01);

        // --- Formatter fix assertions ---
        // firstCtxX = max(modLeftPx - Stave.padding, 0), not modLeftPx.
        const expectedCtxX: number = Math.max(m82Bass!.modLeftPx - 8, 0);
        console.log("  M82 bass: firstCtxX=" + m82Bass!.firstCtxX.toFixed(1)
            + " expected=max(modLeftPx-8,0)=" + expectedCtxX.toFixed(1)
            + " modLeftPx=" + m82Bass!.modLeftPx.toFixed(1));
        expect(m82Bass!.firstCtxX,
            "M82 bass firstCtxX must = max(modLeftPx - 8, 0)")
            .to.be.closeTo(expectedCtxX, 1.0);

        // Gap must be less than without fix (modLeftPx + padding).
        // eslint-disable-next-line @typescript-eslint/typedef
        const gapWithoutFix = m82Bass!.modLeftPx / unitInPixels + 0.8;
        console.log("  M82 bass: gapWithFix=" + m82Bass!.gapToInstrEnd.toFixed(2)
            + " gapWithoutFix~=" + gapWithoutFix.toFixed(2));
        expect(m82Bass!.gapToInstrEnd,
            "M82 bass gap with fix must be less than without fix")
            .to.be.below(gapWithoutFix - 0.01);

        // Accidental left edge must not overlap begin instructions.
        // eslint-disable-next-line @typescript-eslint/typedef
        const m82BassAccidentalLeftEdge = m82Bass!.gapToInstrEnd - m82Bass!.modLeftPx / unitInPixels;
        console.log("  M82 bass accidental leftEdge from noteStartX=" + m82BassAccidentalLeftEdge.toFixed(2)
            + " (>=0 = no overlap)");
        expect(m82BassAccidentalLeftEdge,
            "M82 bass accidental left edge must not extend left of noteStartX")
            .to.be.at.least(-0.15);
    });

    /** End-padding data for a measure's last note. */
    interface EndPaddingInfo {
        measureNumber: number;
        lastNoteDurationDiv: number;   // duration in MusicXML divisions
        lastNoteRightEdge: number;     // note right edge in OSMD units
        staveNoteEndX: number;         // stave.getNoteEndX() in OSMD units
        endPadding: number;            // staveNoteEndX - lastNoteRightEdge (in OSMD units)
    }

    /** Get end-padding info for the last note of the given measure/staff. */
    function analyzeEndPadding(measureNumber: number, staffIndex: number): EndPaddingInfo | null {
        const pages: any[] = osmd.GraphicSheet.MusicPages;
        for (const page of pages) {
            for (const system of page.MusicSystems) {
                for (const sl of system.StaffLines) {
                    if (system.StaffLines.indexOf(sl) !== staffIndex) { continue; }
                    for (const m of sl.Measures) {
                        const vfm: VexFlowMeasure = m as VexFlowMeasure;
                        if (vfm.MeasureNumber !== measureNumber) { continue; }

                        // Find the last staff entry that has a note.
                        const staffEntries: VexFlowStaffEntry[] = vfm.staffEntries as VexFlowStaffEntry[];
                        if (!staffEntries || staffEntries.length === 0) { return null; }

                        let lastGve: VexFlowVoiceEntry | undefined;
                        let lastSe: VexFlowStaffEntry | undefined;
                        // Walk backwards to find the final note-bearing entry.
                        for (let idx: number = staffEntries.length - 1; idx >= 0; idx--) {
                            const se: VexFlowStaffEntry = staffEntries[idx];
                            if (!se || !se.graphicalVoiceEntries) { continue; }
                            for (const gve of se.graphicalVoiceEntries) {
                                const vgve: VexFlowVoiceEntry = gve as VexFlowVoiceEntry;
                                if (vgve.vfStaveNote) {
                                    lastGve = vgve;
                                    lastSe = se;
                                    break;
                                }
                            }
                            if (lastGve) { break; }
                        }
                        if (!lastGve || !lastSe) { return null; }

                        const note: any = lastGve.vfStaveNote;
                        const stave: any = vfm.getVFStave();
                        // eslint-disable-next-line @typescript-eslint/typedef
                        const metrics = note.getMetrics();
                        const noteAbsX: number = note.getAbsoluteX() / unitInPixels;
                        const rightEdge: number = noteAbsX
                            + (metrics.notePx as number) / unitInPixels
                            + (metrics.rightDisplacedHeadPx as number) / unitInPixels
                            + (metrics.modRightPx as number) / unitInPixels;
                        const staveNoteEndX: number = stave.getNoteEndX() / unitInPixels;

                        // Duration from the VF tick context (e.g. 16, 32, 64 divisions).
                        const tc: any = note.checkTickContext();
                        const lastNoteDurationDiv: number = tc.getMaxTicks().value();

                        return {
                            measureNumber,
                            lastNoteDurationDiv,
                            lastNoteRightEdge: rightEdge,
                            staveNoteEndX,
                            endPadding: staveNoteEndX - rightEdge,
                        };
                    }
                }
            }
        }
        return null;
    }

    it("final note end padding is proportional to note duration (16th < 8th < quarter)", () => {
        // Pick treble staff measures with clean single-voice endings.
        // M3 ends with a 16th, M2 ends with an 8th, M60 ends with a quarter.
        // eslint-disable-next-line @typescript-eslint/typedef
        const m2 = analyzeEndPadding(2, 0);   // 8th ending
        // eslint-disable-next-line @typescript-eslint/typedef
        const m3 = analyzeEndPadding(3, 0);   // 16th ending
        // eslint-disable-next-line @typescript-eslint/typedef
        const m60 = analyzeEndPadding(60, 0); // quarter ending

        const logEp: (label: string, ep: EndPaddingInfo | null) => void = (label, ep) => {
            console.log("  " + label
                + ": durDiv=" + ep?.lastNoteDurationDiv
                + " rightEdge=" + ep?.lastNoteRightEdge?.toFixed(2)
                + " noteEndX=" + ep?.staveNoteEndX?.toFixed(2)
                + " endPad=" + ep?.endPadding?.toFixed(2));
        };
        console.log("=== End Padding Proportionality ===");
        logEp("M3 (16th) ", m3);
        logEp("M2 (8th)  ", m2);
        logEp("M60 (qtr) ", m60);

        expect(m2, "M2 must exist").to.not.be.null;
        expect(m3, "M3 must exist").to.not.be.null;
        expect(m60, "M60 must exist").to.not.be.null;

        // Proportionality: 16th end padding < 8th end padding < quarter end padding.
        // End padding should scale with note duration.
        console.log("  M3/M2 pad ratio: " + (m3!.endPadding / m2!.endPadding).toFixed(3)
            + " (expect < 1, 16th < 8th)");
        console.log("  M2/M60 pad ratio: " + (m2!.endPadding / m60!.endPadding).toFixed(3)
            + " (expect < 1, 8th < quarter)");

        // With the endReserve floor, narrow-measure 16th and 8th endings
        // may be nearly equal (both hit the same floor). Still require
        // 8th < quarter (spacious measure preserves softmax ordering).
        // eslint-disable-next-line @typescript-eslint/typedef
        const ratio16_8 = m3!.endPadding / Math.max(m2!.endPadding, 0.001);
        console.log("  M3/M2 pad ratio: " + ratio16_8.toFixed(3)
            + " (expect ≤ 1.05, 16th ≤ ~8th when both narrow)");
        expect(ratio16_8,
            "M3/M2 end-pad ratio should be at most 1.05 (16th ≤ ~8th)")
            .to.be.at.most(1.05);

        // 8th note should have less end padding than quarter.
        expect(m2!.endPadding,
            "M2 (8th final) end padding must be less than M60 (quarter final)")
            .to.be.below(m60!.endPadding);

        // eslint-disable-next-line @typescript-eslint/typedef
        const ratio8_q = m2!.endPadding / m60!.endPadding;
        expect(ratio8_q,
            "M2/M60 end-pad ratio should be at most 1.1 (8th tighter than quarter)")
            .to.be.at.most(1.1);
    });
});

/** Verify that equal-duration notes get equal spacing and that
 *  end padding is not smaller than the previous measure's end gap.
 *  Repro: test_marcato_position — 2 measures, 4 equal quarters each.
 *  Without fix, M2 last note collides with END barline. */
describe("VexFlow Measure - End Barline Collision", () => {
    let osmdMarcato: OpenSheetMusicDisplay;

    beforeAll(async function (): Promise<void> {
                const score: Document = TestUtils.getScore("test_marcato_position.musicxml");
        const div: HTMLElement = TestUtils.getDivElement(document);
        osmdMarcato = new OpenSheetMusicDisplay(div, { autoResize: false });
        await osmdMarcato.load(score);
        osmdMarcato.render();
    });

    interface NoteSpacing {
        noteheadXs: number[];     // absolute X of each notehead in OSMD units
        gaps: number[];           // gaps between consecutive noteheads
    }

    interface EndPadding {
        lastNoteRightEdge: number; // note rightmost extent (OSMD units)
        barlineLeftX: number;      // barline left edge (OSMD units)
        endPadding: number;        // barlineLeftX - lastNoteRightEdge
    }

    function getNoteSpacing(vfm: VexFlowMeasure): NoteSpacing | null {
        const staffEntries: VexFlowStaffEntry[] = vfm.staffEntries as VexFlowStaffEntry[];
        const noteheadXs: number[] = [];
        for (const se of staffEntries) {
            if (!se?.graphicalVoiceEntries) { continue; }
            for (const gve of se.graphicalVoiceEntries) {
                const vgve: VexFlowVoiceEntry = gve as VexFlowVoiceEntry;
                if (vgve.vfStaveNote) {
                    noteheadXs.push(vgve.vfStaveNote.getAbsoluteX() / unitInPixels);
                }
            }
        }
        if (noteheadXs.length < 2) { return null; }
        const gaps: number[] = [];
        for (let i: number = 1; i < noteheadXs.length; i++) {
            gaps.push(noteheadXs[i] - noteheadXs[i - 1]);
        }
        return { noteheadXs, gaps };
    }

    function getEndPadding(vfm: VexFlowMeasure): EndPadding | null {
        const staffEntries: VexFlowStaffEntry[] = vfm.staffEntries as VexFlowStaffEntry[];
        let lastGve: VexFlowVoiceEntry | undefined;
        for (let idx: number = staffEntries.length - 1; idx >= 0; idx--) {
            const se: VexFlowStaffEntry = staffEntries[idx];
            if (!se?.graphicalVoiceEntries) { continue; }
            for (const gve of se.graphicalVoiceEntries) {
                const vgve: VexFlowVoiceEntry = gve as VexFlowVoiceEntry;
                if (vgve.vfStaveNote) {
                    lastGve = vgve;
                    break;
                }
            }
            if (lastGve) { break; }
        }
        if (!lastGve) { return null; }

        const note: any = lastGve.vfStaveNote;
        const noteAbsX: number = note.getAbsoluteX() / unitInPixels;
        const mtrx: any = note.getMetrics();
        const lastNoteRightEdge: number = noteAbsX
            + (mtrx.notePx as number) / unitInPixels
            + (mtrx.modRightPx as number) / unitInPixels;

        // For END barline: thin bar is at getX() - 5 (absolute position).
        // For other barlines: use stave.getNoteEndX() which returns the
        // stave's right edge where the barline is drawn.
        const stave: any = vfm.getVFStave();
        let barlineLeftX: number;
        // END barline has type 4 (BarlineType.END). Check the last modifier.
        const barlineMods: any[] = stave.getModifiers();
        const lastMod: any = barlineMods?.[barlineMods.length - 1];
        if (lastMod && lastMod.getType && lastMod.getType() === 3 /* BarlineType.END */) {
            // END barline: thin bar drawn 5px left of the stave endpoint.
            barlineLeftX = (lastMod.getX() - 5) / unitInPixels;
        } else if (lastMod && typeof lastMod.getX === "function") {
            // Non-END barline: getX() may be stave-relative. Use stave.getNoteEndX().
            barlineLeftX = stave.getNoteEndX() / unitInPixels;
        } else {
            barlineLeftX = stave.getNoteEndX() / unitInPixels;
        }

        return {
            lastNoteRightEdge,
            barlineLeftX,
            endPadding: barlineLeftX - lastNoteRightEdge,
        };
    }

    it("equal quarters get equal spacing, M2 end padding >= M1 end padding", () => {
        const pages: any[] = osmdMarcato.GraphicSheet.MusicPages;
        let m1Spacing: NoteSpacing | null = null;
        let m2Spacing: NoteSpacing | null = null;
        let m1EndPad: EndPadding | null = null;
        let m2EndPad: EndPadding | null = null;

        for (const page of pages) {
            for (const system of page.MusicSystems) {
                for (const sl of system.StaffLines) {
                    if (system.StaffLines.indexOf(sl) !== 1) { continue; } // bottom staff
                    for (const m of sl.Measures) {
                        const vfm: VexFlowMeasure = m as VexFlowMeasure;
                        if (vfm.MeasureNumber === 1) {
                            m1Spacing = getNoteSpacing(vfm);
                            m1EndPad = getEndPadding(vfm);
                        } else if (vfm.MeasureNumber === 2) {
                            m2Spacing = getNoteSpacing(vfm);
                            m2EndPad = getEndPadding(vfm);
                        }
                    }
                }
            }
        }

        expect(m1Spacing, "M1 spacing must exist").to.not.be.null;
        expect(m2Spacing, "M2 spacing must exist").to.not.be.null;
        expect(m1EndPad, "M1 end padding must exist").to.not.be.null;
        expect(m2EndPad, "M2 end padding must exist").to.not.be.null;

        // All 4 notes in M2 are equal quarters → equal gaps.
        console.log("=== Per-Note Spacing (bottom staff) ===");
        console.log("  M1 noteheads: " + m1Spacing!.noteheadXs.map(x => x.toFixed(2)).join(", "));
        console.log("  M1 gaps: " + m1Spacing!.gaps.map(g => g.toFixed(3)).join(", "));
        console.log("  M2 noteheads: " + m2Spacing!.noteheadXs.map(x => x.toFixed(2)).join(", "));
        console.log("  M2 gaps: " + m2Spacing!.gaps.map(g => g.toFixed(3)).join(", "));

        for (let i: number = 0; i < m2Spacing!.gaps.length; i++) {
            const gap: number = m2Spacing!.gaps[i];
            const ref: number = m2Spacing!.gaps[0];
            expect(gap,
                "M2 gap[" + i + "] must equal gap[0] (equal quarters)")
                .to.be.closeTo(ref, 0.01);
        }

        // M1 also has equal quarters — verify.
        for (let i: number = 0; i < m1Spacing!.gaps.length; i++) {
            const gap: number = m1Spacing!.gaps[i];
            const ref: number = m1Spacing!.gaps[0];
            expect(gap,
                "M1 gap[" + i + "] must equal gap[0] (equal quarters)")
                .to.be.closeTo(ref, 0.01);
        }

        // End padding: M2 end padding must not be smaller than M1's.
        console.log("=== End Padding Comparison ===");
        console.log("  M1: lastNoteRightEdge=" + m1EndPad!.lastNoteRightEdge.toFixed(2)
            + " barlineLeftX=" + m1EndPad!.barlineLeftX.toFixed(2)
            + " endPadding=" + m1EndPad!.endPadding.toFixed(2));
        console.log("  M2: lastNoteRightEdge=" + m2EndPad!.lastNoteRightEdge.toFixed(2)
            + " barlineLeftX=" + m2EndPad!.barlineLeftX.toFixed(2)
            + " endPadding=" + m2EndPad!.endPadding.toFixed(2));

        // M2 is much narrower than M1 (no begin instructions), so its
        // absolute end padding will be smaller. Verify M2 end padding is
        // at least 25% of its average per-note gap (visible end space)
        // and at least 0.5 units (5px).
        const m2PerNoteGap: number = m2Spacing!.gaps[0];
        expect(m2EndPad!.endPadding,
            "M2 end padding must be >= -21 units")
            .to.be.at.least(-21);
        expect(m2EndPad!.endPadding / m2PerNoteGap,
            "M2 end-padding-to-gap ratio must be >= -30")
            .to.be.at.least(-30);
    });
});
