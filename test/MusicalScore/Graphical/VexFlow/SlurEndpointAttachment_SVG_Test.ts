/* eslint-disable @typescript-eslint/typedef */
// Tickets 633/638/646: slur ends detached from their notes. Each bezier endpoint must lie near
// its own note: its notehead or its stem tip, whichever is nearer (VexFlow px).
import { expect } from "vitest";
import { GraphicalSlur } from "../../../../src/MusicalScore/Graphical/GraphicalSlur";
import { StaffLine } from "../../../../src/MusicalScore/Graphical/StaffLine";
import { unitInPixels } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";
import { EngravingRules } from "../../../../src/MusicalScore/Graphical/EngravingRules";
import { Note } from "../../../../src/MusicalScore/VoiceData/Note";
import { loadScore, prepareMeasures, renderToSvg } from "../../../Util/SlurQualityReporter";

// Page widths as the app laid them out: the tickets' SVG viewBox width / 10
const SCORES: Array<[string, number]> = [
    ["issue633_ballooning_slur_and_far_too_distant.musicxml", 71.0],
    ["issue638_detouched_slur_ends.musicxml", 120.2],
    ["issue646_detatched_slurs_in_wrapped_layout.musicxml", 141.15],
];
// An endpoint further than this from both its notehead and its stem tip is detached
const MAX_ATTACH_GAP_PX = 20;

// The app's rules (web/src/ui/render/Notation.jsx)
const APP_RULES: Partial<EngravingRules> = {
    SlurPlacementUseSkyBottomLine: false,
    StaffLineWidth: 0.1,
    PageLeftMargin: 0.1,
    PageRightMargin: 0,
    FingeringInsideStafflines: true,
    RenderFingerings: true,
    FingeringOffsetY: -11,
    AutoBeamNotes: false,
    StaffDistance: 15,
    BetweenStaffDistance: 15,
    MinimumStaffLineDistance: 7,
    SystemDistance: 15,
    BetweenSystemsDistance: 15,
    PageTopMargin: 2,
    PageBottomMargin: 0,
};

interface Pt { x: number, y: number }

const anchorsOf = (note: Note, rules: EngravingRules): Pt[] => {
    const [vf, index]: [any, number] = (rules.GNote(note) as any).vfnote;
    const head: Pt = { x: vf.getAbsoluteX() + vf.getGlyphWidth() / 2, y: vf.getYs()[index] };
    if (!vf.hasStem()) { return [head]; }
    return [head, { x: vf.getStemX(), y: vf.getStemExtents().topY }];
};

const staffLineOf = (note: Note, rules: EngravingRules): StaffLine =>
    rules.GNote(note).parentVoiceEntry.parentStaffEntry.parentMeasure.ParentStaffLine;

const toPx = (p: Pt, sl: StaffLine): Pt => {
    const abs = sl.PositionAndShape.AbsolutePosition;
    return { x: (p.x + abs.x) * unitInPixels, y: (p.y + abs.y) * unitInPixels };
};

const gap = (p: Pt, anchors: Pt[]): number => Math.min(...anchors.map(a => Math.hypot(a.x - p.x, a.y - p.y)));

const fmt = (p: Pt): string => `(${p.x.toFixed(0)},${p.y.toFixed(0)})`;

// The app renders one sheet several times (fitSheetToBox searches zoom and system count):
// first at another page width, then at its own
const RERENDER_PAGE_WIDTH_FACTORS: number[] = [0.6, 1.4];

describe("slur endpoint attachment", () => {
    for (const [path, pageWidth] of SCORES) {
        for (const rerender of [false, true]) {
            it(`${path}${rerender ? " re-rendered" : ""}`, async () => {
                const { gms, calc } = await loadScore(path, APP_RULES, pageWidth);
                prepareMeasures(gms);
                renderToSvg(gms, calc.rules);
                if (rerender) {
                    for (const width of [...RERENDER_PAGE_WIDTH_FACTORS.map(f => f * pageWidth), pageWidth]) {
                        gms.ParentMusicSheet.pageWidth = width;
                        gms.reCalculate();
                        prepareMeasures(gms);
                        renderToSvg(gms, calc.rules);
                    }
                }
                const lines: string[] = [];
                const detached: string[] = [];
                for (const page of gms.MusicPages) {
                    for (const sys of page.MusicSystems) {
                        for (const sl of sys.StaffLines) {
                            for (const slur of sl.GraphicalSlurs as GraphicalSlur[]) {
                                const sn: Note = slur.slur.StartNote;
                                const en: Note = slur.slur.EndNote;
                                const s = toPx(slur.bezierStartPt, sl);
                                const e = toPx(slur.bezierEndPt, sl);
                                // A slur split over systems ends at the system's edge
                                const sGap = sys.StaffLines.includes(staffLineOf(sn, calc.rules)) ? gap(s, anchorsOf(sn, calc.rules)) : NaN;
                                const eGap = sys.StaffLines.includes(staffLineOf(en, calc.rules)) ? gap(e, anchorsOf(en, calc.rules)) : NaN;
                                const line = `sys${page.MusicSystems.indexOf(sys)} line${sys.StaffLines.indexOf(sl)}`
                                    + ` ${(sn as any).xmlId}->${(en as any).xmlId} place=${slur.placement}`
                                    + ` start${fmt(s)} gap ${sGap.toFixed(0)} end${fmt(e)} gap ${eGap.toFixed(0)}`
                                    + ` cp ${fmt(toPx(slur.bezierStartControlPt, sl))} ${fmt(toPx(slur.bezierEndControlPt, sl))}`;
                                lines.push(line);
                                if (sGap > MAX_ATTACH_GAP_PX || eGap > MAX_ATTACH_GAP_PX) { detached.push(line); }
                            }
                        }
                    }
                }
                expect(lines.length, `${path}: no slurs laid out`).greaterThan(0);
                expect(detached, `${path}: detached slur ends\n${lines.join("\n")}`).toEqual([]);
            }, 120000);
        }
    }
});
