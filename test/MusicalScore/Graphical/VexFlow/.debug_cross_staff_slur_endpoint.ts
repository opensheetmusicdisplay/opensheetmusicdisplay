/* eslint-disable @typescript-eslint/typedef, max-len */
import { expect } from "vitest";
import { GraphicalNote } from "../../../../src/MusicalScore/Graphical/GraphicalNote";
import { GraphicalMusicSheet } from "../../../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import { VexFlowGraphicalNote } from "../../../../src/MusicalScore/Graphical/VexFlow";
import * as VF from "vexflow";
import { unitInPixels } from "../../../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";
import { GraphicalSlur } from "../../../../src/MusicalScore/Graphical/GraphicalSlur";
import { EngravingRules } from "../../../../src/MusicalScore/Graphical/EngravingRules";
import { SLUR_CLEARABLE_MIN_T, SLUR_CLEARABLE_MAX_T, SLUR_COLLISION_TOLERANCE_PX } from "../../../../src/MusicalScore/Graphical/SlurQualityConstants";
import {
    loadScore,
    prepareMeasures,
    renderToSvg,
    getSlurQuality,
    aggregateSlurQuality,
    debugSvgFontCss,
    fitDebugSvgViewBox,
    writeDebugSvgHtml,
} from "../../../Util/SlurQualityReporter";
// fs/path imported lazily in writeAnnotatedSvg (browser mode lacks Node builtins)

// ── Data types ───────────────────────────────────────────────────────────────

interface BBoxRect { x: number; y: number; width: number; height: number; }

interface SlurInfo {
    id: string;
    vfId: string;
    isCrossed: boolean;
    startNoteStaff: number;
    endNoteStaff: number;
    startPt: { x: number; y: number };
    endPt: { x: number; y: number };
    startCp: { x: number; y: number } | null;
    endCp: { x: number; y: number } | null;
    startPitch: string;
    endPitch: string;
    startMeasure: number;
    endMeasure: number;
    cpY_osmd: number;
    mergedClearance: number;
    rightClearance: number;
    obstacleCount: number;
    svgStart: { x: number; y: number };
    svgEnd: { x: number; y: number };
    svgStartCp: { x: number; y: number } | null;
    svgEndCp: { x: number; y: number } | null;
    skyInfo: string;
    spanX: number;
    staffTopSvg: number;
    staffBottomSvg: number;
    leakPx: number; // positive = slur extends beyond staff boundary
    leakOverlap: boolean; // true = bezier overlaps elements in adjacent system
    obstacleSvgPoints: Array<{ x: number; y: number; cat: string }>;
}

interface ScoreConfig {
    name: string;
    path: string;
    maxCpY: number;
    /** File-stem interfix distinguishing render variants that share a score file (e.g. "singleline"). */
    tag?: string;
    /** EngravingRules applied to calc.rules before calculate() — per-item overrides. */
    engravingRules?: Partial<EngravingRules>;
    /** False for scores with no <slur> elements (stem/flag investigations) — skips the finds-slurs assertion. */
    slursExpected?: boolean;
}

const SCORES: ScoreConfig[] = [
    { name: "issue217", path: "issue217_ballooning_slur.musicxml", maxCpY: 8.0 },
    { name: "issue181", path: "issue181_slur_up_stem.musicxml", maxCpY: 8.0 },
    { name: "issue138", path: "issue138_stem_not_rendered.musicxml", maxCpY: 8.0, slursExpected: false },
    { name: "Liszt", path: ".Franz_Liszt_Transcendental_Etude_No.10_in_F_minor_Appassionata.mxl", maxCpY: 11.0,
        engravingRules: { RenderSingleHorizontalStaffline: true } },
    { name: "issue126", path: ".issue126_flag_position.musicxml", maxCpY: 8.0,
        engravingRules: { RenderSingleHorizontalStaffline: true } },
    { name: "Land der Berge", path: "Land_der_Berge.musicxml", maxCpY: 8.0 },
    { name: "issue123", path: "issue123_strange_slur_beam_collisions.musicxml", maxCpY: 8.0 },
    { name: "issue122", path: "issue122_accents_clearing.musicxml", maxCpY: 8.0 },
    { name: "Dichterliebe", path: "Dichterliebe01.xml", maxCpY: 8.0 },
    { name: "John Field", path: ".john-field-piano-concerto-7_m318-323.mxl", maxCpY: 6.0 },
    { name: "Beethoven", path: "Beethoven_AnDieFerneGeliebte.xml", maxCpY: 6.0 },
];

/** Every issue sample and every complete piece is rendered under both the default multi-staffline layout
 * and the single-horizontal-staffline layout, so the slur/beam geometry is exercised (and inspectable)
 * under each. Issue repro samples that force the single-line layout for their own reason (issue126) keep
 * just that one variant. The single-line html gets a "singleline" file-stem interfix so it doesn't clobber
 * the multi-staffline one. */
const SCORE_VARIANTS: ScoreConfig[] = SCORES.flatMap(cfg => {
    const multi: ScoreConfig = { ...cfg, engravingRules: { ...cfg.engravingRules, RenderSingleHorizontalStaffline: false } };
    const single: ScoreConfig = {
        ...cfg,
        name: `${cfg.name} (single-line)`,
        tag: "singleline",
        engravingRules: { ...cfg.engravingRules, RenderSingleHorizontalStaffline: true },
    };
    if (cfg.name.toLowerCase().includes("issue") && cfg.engravingRules?.RenderSingleHorizontalStaffline) {
        return [{ ...cfg, tag: "singleline" }]; // single-line-only repro: unchanged
    }
    if (cfg.name.toLowerCase().includes("issue")) {
        return [cfg, single];
    }
    return [multi, single]; // complete pieces: both layouts
});

// ── SVG BBox helpers ─────────────────────────────────────────────────────────

function bboxOf(el: Element): BBoxRect {
    if (typeof el.getBBox !== "function") { return { x: 0, y: 0, width: 0, height: 0 }; }
    try {
        const r: DOMRect = el.getBBox();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
    } catch (_e) { return { x: 0, y: 0, width: 0, height: 0 }; }
}

/** Query notehead bboxes keyed by OSMD xmlId via data-note-id attribute. */
function queryNoteheadBBoxes(svg: SVGSVGElement): Map<string, BBoxRect> {
    const map: Map<string, BBoxRect> = new Map();
    for (const nh of svg.querySelectorAll("g.vf-notehead")) {
        const noteEl: Element | null = nh.closest("[data-note-id]");
        const xmlId: string = noteEl?.getAttribute("data-note-id") ?? "";
        if (xmlId) {
            const existing: BBoxRect | undefined = map.get(xmlId);
            const cur: BBoxRect = bboxOf(nh);
            if (!existing || cur.y < existing.y) { map.set(xmlId, cur); }
        }
    }
    return map;
}

/**
 * Query slur path bboxes keyed by OSMD xmlId.
 * Uses vfIdToXmlId map built from collectCrossStaffSlurs (vfId = VF5 auto ID,
 * xmlId = OSMD note id). The slur group id is vf-{autoId}-slur.
 */
function querySlurBBoxes(svg: SVGSVGElement, vfIdToXmlId: Map<string, string>): Map<string, BBoxRect> {
    const map: Map<string, BBoxRect> = new Map();
    for (const path of svg.querySelectorAll("g.vf-curve > path, g.vf-curve path")) {
        const fullD: string = path.getAttribute("d") ?? "";
        if (!fullD.includes("C")) { continue; }
        const parentG: Element | null = path.closest("g.vf-curve");
        const gid: string = parentG?.getAttribute("id") ?? "";
        // gid = "vf-auto{number}-slur"
        const m: RegExpMatchArray | null = gid.match(/^vf-(.+)-\w*slur$/);
        const vfId: string = m ? m[1] : gid;
        const xmlId: string = vfIdToXmlId.get(vfId) ?? "";
        if (xmlId) { map.set(xmlId, bboxOf(path)); }
    }
    return map;
}

// ── Coordinate helpers ───────────────────────────────────────────────────────

function toSvgCoords(osmdX: number, osmdY: number, sl: any): { x: number, y: number } {
    const abs: any = sl.PositionAndShape?.AbsolutePosition;
    if (!abs) { return { x: osmdX * unitInPixels, y: osmdY * unitInPixels }; }
    return {
        x: (osmdX + abs.x) * unitInPixels,
        y: (osmdY + abs.y) * unitInPixels,
    };
}

const NOTE_LETTERS: string[] = ["C", "", "D", "", "E", "F", "", "G", "", "A", "", "B"];

function pitchOf(note: any): string {
    const p: any = note?.Pitch;
    if (!p) { return "?"; }
    const letter: string = NOTE_LETTERS[p.FundamentalNote] ?? "?";
    const acc: string = p.AccidentalHalfTones > 0 ? "#" : p.AccidentalHalfTones < 0 ? "b" : "";
    return `${letter}${acc}${p.Octave}`;
}

function measureOf(note: any): number {
    return note?.SourceMeasure?.MeasureNumber ?? note?.ParentStaffEntry?.VerticalContainerParent?.ParentMeasure?.MeasureNumber ?? -1;
}

function dumpSkylineForSlur(sl: any, startX: number, endX: number): string {
    const sky: number[] = sl.SkyLine ?? [];
    if (!sky.length) { return "  (no skyline data)"; }
    const sbl: any = sl.SkyBottomLineCalculator;
    const samp: number = sbl?.SamplingUnit ?? 4;
    const lo: number = Math.max(0, Math.floor(startX * samp));
    const hi: number = Math.min(sky.length, Math.ceil(endX * samp));
    if (hi <= lo) { return "  (slur outside skyline range)"; }
    let minY: number = Infinity;
    let minIdx: number = -1;
    for (let i: number = lo; i < hi; i++) {
        if (sky[i] < minY) { minY = sky[i]; minIdx = i; }
    }
    const allVals: { idx: number, x: number, y: number }[] = [];
    for (let i: number = lo; i < hi; i++) {
        allVals.push({ idx: i, x: i / samp, y: sky[i] });
    }
    allVals.sort((a, b) => a.y - b.y);
    const worst: string = allVals.slice(0, 5).map(
        v => `x=${v.x.toFixed(2)} y=${v.y.toFixed(2)}`
    ).join(", ");
    return `  skylineRange=[${lo},${hi}) minY=${minY.toFixed(2)}@x=${(minIdx / samp).toFixed(2)} worst5=${worst}`;
}

function getMergedClearance(slur: any): number {
    return slur.mergedClearanceCpY ?? -Infinity;
}

function getRightClearance(slur: any): number {
    return slur.rightClearanceCpY ?? -Infinity;
}

// ── Slur collection ──────────────────────────────────────────────────────────

function collectCrossStaffSlurs(gms: GraphicalMusicSheet, rules: EngravingRules): SlurInfo[] {
    const result: SlurInfo[] = [];
    for (const page of gms.MusicPages) {
        for (const sys of page.MusicSystems) {
            for (const sl of sys.StaffLines) {
                for (const slur of sl.GraphicalSlurs) {
                    if (slur.slur.isCrossed()) {
                        slur.calculateCurveCrossStaff(rules);
                    } else {
                        if (!slur.bezierStartPt) { continue; }
                    }

                    const startNote: any = slur.slur.StartNote;
                    const endNote: any = slur.slur.EndNote;

                    const startGN: GraphicalNote = rules.GNote(slur.slur.StartNote);
                    const endGN: GraphicalNote = rules.GNote(slur.slur.EndNote);
                    const vfStart: VF.StaveNote = (startGN as VexFlowGraphicalNote)?.vfnote?.[0] as VF.StaveNote;
                    const vfEnd: VF.StaveNote = (endGN as VexFlowGraphicalNote)?.vfnote?.[0] as VF.StaveNote;
                    const sStave: VF.Stave | undefined = vfStart?.getStave?.();
                    const eStave: VF.Stave | undefined = vfEnd?.getStave?.();

                    const vfId: string = vfStart?.getAttribute?.("id") ?? "?";
                    // VF5 note id = xmlId (if set) ?? computedSvgId() (note-{m}-{s}-{v}-{i})
                    const noteId: string = startNote?.xmlId ?? endNote?.xmlId ?? vfId ?? "?";
                    if (noteId === "note-3-1-2-0") {
                        const resStart: GraphicalNote | undefined = slur.staffEntries[0]?.findGraphicalNoteFromNote(slur.slur.StartNote);
                        const resEnd: GraphicalNote | undefined = slur.staffEntries[slur.staffEntries.length - 1]?.findGraphicalNoteFromNote(slur.slur.EndNote);
                        const dumpGN = (tag: string, gn: GraphicalNote | undefined): string => {
                            if (!gn) { return `${tag}: undefined`; }
                            const ve: any = gn.parentVoiceEntry;
                            return `${tag}: veRel=(${ve?.PositionAndShape?.RelativePosition?.x?.toFixed(2) ?? "?"},${ve?.PositionAndShape?.RelativePosition?.y?.toFixed(2) ?? "?"}) borderTop=${(ve?.PositionAndShape?.BorderTop ?? "?").toFixed(2)} borderBottom=${(ve?.PositionAndShape?.BorderBottom ?? "?").toFixed(2)} staveRel=(${gn.PositionAndShape?.RelativePosition?.x?.toFixed(2) ?? "?"},${gn.PositionAndShape?.RelativePosition?.y?.toFixed(2) ?? "?"}) vfYs=[${(gn as VexFlowGraphicalNote).vfnote?.[0]?.getYs?.()?.map((y: number) => y.toFixed(1)).join(",") ?? "?"}] placement=${slur.placement}`;
                        };
                        console.warn(`    [resolved] startGN: ${dumpGN("s", resStart)}`);
                        console.warn(`    [resolved] endGN:   ${dumpGN("e", resEnd)}`);
                        const sse0: any = slur.staffEntries[0];
                        const sseL: any = slur.staffEntries[slur.staffEntries.length - 1];
                        console.warn(`    [resolved] staffEntries len=${slur.staffEntries.length} first=(${sse0?.PositionAndShape?.RelativePosition?.x?.toFixed(2) ?? "?"},${sse0?.PositionAndShape?.RelativePosition?.y?.toFixed(2) ?? "?"}) last=(${sseL?.PositionAndShape?.RelativePosition?.x?.toFixed(2) ?? "?"},${sseL?.PositionAndShape?.RelativePosition?.y?.toFixed(2) ?? "?"})`);
                        const slAbsY: number = sl.PositionAndShape?.AbsolutePosition?.y ?? NaN;
                        const absOf = (gn: GraphicalNote | undefined): string => {
                            if (!gn) { return "?"; }
                            const a: any = gn.PositionAndShape?.AbsolutePosition;
                            return `abs=(${a?.x?.toFixed(2) ?? "?"},${a?.y?.toFixed(2) ?? "?"})`;
                        };
                        const vfAbsOf = (gn: GraphicalNote | undefined): string => {
                            const v: any = (gn as VexFlowGraphicalNote)?.vfnote?.[0];
                            if (!v) { return "?"; }
                            return `vfAbsX=${(v.getAbsoluteX?.() ?? NaN).toFixed(1)} vfYs=[${(v.getYs?.() ?? []).map((y: number) => y.toFixed(1)).join(",")}] keyLines=[${(v.getKeyProps?.() ?? []).map((kp: any) => kp.line).join(",")}]`;
                        };
                        console.warn(`    [resolved] staffLineAbsY=${slAbsY.toFixed(2)} unitPx=${unitInPixels}`);
                        console.warn(`    [resolved] start abs: ${absOf(resStart)} ${vfAbsOf(resStart)}`);
                        console.warn(`    [resolved] end   abs: ${absOf(resEnd)} ${vfAbsOf(resEnd)}`);
                        console.warn(`    [resolved] slur bezierStartPt=(${slur.bezierStartPt.x.toFixed(2)},${slur.bezierStartPt.y.toFixed(2)}) bezierEndPt=(${slur.bezierEndPt.x.toFixed(2)},${slur.bezierEndPt.y.toFixed(2)}) placement=${slur.placement}`);
                        // dump all stavenotes of the m3 piano treble measure (staff idx 1)
                        const m3meas: any = (resStart as any)?.parentVoiceEntry?.parentStaffEntry?.parentMeasure;
                        if (m3meas) {
                            for (const gse of (m3meas as any).staffEntries ?? []) {
                                for (const gve of (gse as any).graphicalVoiceEntries ?? []) {
                                    const v: any = (gve as any).vfStaveNote;
                                    if (!v) { continue; }
                                    const kps: any[] = v.getKeyProps?.() ?? [];
                                    const keys: string = kps.map((kp: any) => `${kp.key}/${kp.line}`).join(",");
                                    const veRelY: number = gve?.PositionAndShape?.RelativePosition?.y ?? NaN;
                                    let bboxStr: string = "?";
                                    try {
                                        const bb: any = v.getBoundingBox?.();
                                        if (bb) { bboxStr = `bbox(x=${bb.x?.toFixed(1)},y=${bb.y?.toFixed(1)},w=${bb.w?.toFixed(1)},h=${bb.h?.toFixed(1)})`; }
                                    } catch (_e) { bboxStr = "bboxError"; }
                                    const staveTop: number = v.getStave?.()?.getYForLine?.(0) ?? NaN;
                                    const mods: string = (v.getModifiers?.() ?? []).map((m: any) => {
                                        let mb: string = "?";
                                        try {
                                            const bb: any = m.getBoundingBox?.();
                                            if (bb) { mb = `(y=${bb.y?.toFixed(1)},h=${bb.h?.toFixed(1)})`; }
                                        } catch (_e) { mb = "err"; }
                                        return `${m.getCategory?.() ?? "?"}${mb}`;
                                    }).join(" ");
                                    console.warn(`      stavenote id=${v.getAttribute?.("id")} keys=[${keys}] veRelY=${veRelY.toFixed(2)} vfYs=[${(v.getYs?.() ?? []).map((y: number) => y.toFixed(1)).join(",")}] stemDir=${v.getStemDirection?.()} ${bboxStr} mods=${mods}`);
                                }
                            }
                        }
                    }
                    const cpY_osmd: number = slur.bezierStartControlPt
                        ? Math.abs(slur.bezierStartControlPt.y - slur.bezierStartPt.y) : 0;
                    const mergedClear: number = getMergedClearance(slur);
                    const rightClear: number = getRightClearance(slur);
                    const obstacleCount: number = slur.debugSkyPoints?.length ?? 0;
                    const obstacleSvgPoints: Array<{ x: number; y: number; cat: string }> = [];
                    if (slur.debugSkyPoints && slur.debugSkyCategories) {
                        for (let oi: number = 0; oi < slur.debugSkyPoints.length && oi < slur.debugSkyCategories.length; oi++) {
                            const svgP: { x: number; y: number } = toSvgCoords(
                                slur.debugSkyPoints[oi].x, slur.debugSkyPoints[oi].y, sl);
                            obstacleSvgPoints.push({ x: svgP.x, y: svgP.y, cat: slur.debugSkyCategories[oi] });
                        }
                    }

                    const svgStart: { x: number, y: number } = toSvgCoords(
                        slur.bezierStartPt.x, slur.bezierStartPt.y, sl);
                    const svgEnd: { x: number, y: number } = toSvgCoords(
                        slur.bezierEndPt.x, slur.bezierEndPt.y, sl);
                    const svgStartCp: { x: number, y: number } | null = slur.bezierStartControlPt
                        ? toSvgCoords(slur.bezierStartControlPt.x, slur.bezierStartControlPt.y, sl) : null;
                    const svgEndCp: { x: number, y: number } | null = slur.bezierEndControlPt
                        ? toSvgCoords(slur.bezierEndControlPt.x, slur.bezierEndControlPt.y, sl) : null;

                    const skyInfo: string = dumpSkylineForSlur(sl,
                        slur.bezierStartPt.x, slur.bezierEndPt.x);

                    const spanX: number = slur.bezierEndPt.x - slur.bezierStartPt.x;

                    // Staff Y bounds in SVG pixels
                    const absPosY: number = sl.PositionAndShape?.AbsolutePosition?.y ?? 0;
                    const staffH: number = sl.PositionAndShape?.Size?.height ?? 40;
                    let stTopSvg: number = absPosY * unitInPixels;
                    let stBotSvg: number = (absPosY + staffH) * unitInPixels;
                    // Cross-staff: use union of all staves in same system
                    if (slur.slur.isCrossed()) {
                        const musicSys: any = sl.ParentMusicSystem;
                        if (musicSys?.StaffLines) {
                            for (const otherSl of musicSys.StaffLines) {
                                const oA: number = otherSl.PositionAndShape?.AbsolutePosition?.y ?? absPosY;
                                const oH2: number = otherSl.PositionAndShape?.Size?.height ?? staffH;
                                const oT: number = oA * unitInPixels;
                                const oB: number = (oA + oH2) * unitInPixels;
                                if (oT < stTopSvg) { stTopSvg = oT; }
                                if (oB > stBotSvg) { stBotSvg = oB; }
                            }
                        }
                    }

                    // Leak: how far bezier extends beyond staff boundary (SVG px)
                    let leakPx: number = 0;
                    if (svgStartCp && svgEndCp) {
                        const above: boolean = cpY_osmd > 0
                            && slur.bezierStartControlPt!.y < slur.bezierStartPt.y;
                        // Bezier Y at t=0.5 approximates curve's max extent
                        const midY: number = 0.125 * svgStart.y + 0.375 * svgStartCp.y
                            + 0.375 * svgEndCp.y + 0.125 * svgEnd.y;
                        if (above) {
                            // Above-placement: curve extends upward (smaller Y)
                            const curveTop: number = Math.min(svgStart.y, svgEnd.y, svgStartCp.y, svgEndCp.y, midY);
                            if (curveTop < stTopSvg) { leakPx = stTopSvg - curveTop; }
                        } else {
                            // Below-placement: curve extends downward (larger Y)
                            const curveBot: number = Math.max(svgStart.y, svgEnd.y, svgStartCp.y, svgEndCp.y);
                            if (curveBot > stBotSvg) { leakPx = curveBot - stBotSvg; }
                        }
                    }

                    result.push({
                        id: noteId,
                        vfId: vfId,
                        isCrossed: slur.slur.isCrossed(),
                        startNoteStaff: startNote?.ParentStaffEntry?.ParentStaff?.id,
                        endNoteStaff: endNote?.ParentStaffEntry?.ParentStaff?.id,
                        startPt: { x: slur.bezierStartPt.x, y: slur.bezierStartPt.y },
                        endPt: { x: slur.bezierEndPt.x, y: slur.bezierEndPt.y },
                        startCp: slur.bezierStartControlPt ? { x: slur.bezierStartControlPt.x, y: slur.bezierStartControlPt.y } : null,
                        endCp: slur.bezierEndControlPt ? { x: slur.bezierEndControlPt.x, y: slur.bezierEndControlPt.y } : null,
                        startPitch: pitchOf(startNote),
                        endPitch: pitchOf(endNote),
                        startMeasure: measureOf(startNote),
                        endMeasure: measureOf(endNote),
                        cpY_osmd,
                        mergedClearance: mergedClear,
                        rightClearance: rightClear,
                        obstacleCount,
                        obstacleSvgPoints,
                        svgStart,
                        svgEnd,
                        svgStartCp,
                        svgEndCp,
                        skyInfo,
                        spanX,
                        staffTopSvg: stTopSvg,
                        staffBottomSvg: stBotSvg,
                        leakPx,
                        leakOverlap: false, // filled after SVG annotation
                    });
                }
            }
        }
    }
    return result;
}

// ── SVG structure dump ───────────────────────────────────────────────────────

function dumpSvgStructure(svg: SVGSVGElement): void {
    const paths: Element[] = [...svg.querySelectorAll("path")];
    const beziers: Element[] = paths.filter(p => (p.getAttribute("d") ?? "").includes("C"));
    console.warn(`\n  ── SVG bezier paths (${beziers.length}/${paths.length} total) ──`);
    for (const p of beziers) {
        const d: string = p.getAttribute("d") ?? "";
        const coords: string = d.length > 100 ? d.substring(0, 100) + "..." : d;
        const pid: string = p.closest("g")?.getAttribute("id") ?? "(no-g)";
        console.warn(`    <path d="${coords}" in-g="${pid}"`);
    }
    const staves: Element[] = [...svg.querySelectorAll("g.vf-stave")];
    console.warn(`  Staff groups (g.vf-stave): ${staves.length}`);
    for (const st of staves.slice(0, 4)) {
        const notesInStave: number = st.querySelectorAll("g.vf-notehead").length;
        const beamsInStave: number = st.querySelectorAll("g.vf-beam").length;
        console.warn(`    ${st.getAttribute("id")}: ${notesInStave} noteheads, ${beamsInStave} beams`);
    }
    const vfNoteheads: Element[] = [...svg.querySelectorAll("g.vf-notehead")];
    console.warn(`  g.vf-notehead elements: ${vfNoteheads.length}`);
}

// ── Problem SVG annotation ───────────────────────────────────────────────────

function getPathBBox(el: Element): { x: number; y: number; w: number; h: number } | null {
    const d: string = el.getAttribute("d") ?? "";
    const nums: number[] = d.match(/[\d.]+/g)?.map(Number) ?? [];
    if (nums.length < 4) { return null; }
    let mnX: number = Infinity, mnY: number = Infinity, mxX: number = -Infinity, mxY: number = -Infinity;
    for (let i: number = 0; i + 1 < nums.length; i += 2) {
        if (nums[i] < mnX) { mnX = nums[i]; }
        if (nums[i] > mxX) { mxX = nums[i]; }
        if (nums[i + 1] < mnY) { mnY = nums[i + 1]; }
        if (nums[i + 1] > mxY) { mxY = nums[i + 1]; }
    }
    if (mxX <= mnX || mxY <= mnY) { return null; }
    return { x: mnX, y: mnY, w: mxX - mnX, h: mxY - mnY };
}

/// Check if a bezier curve overlaps any non-slur path elements in an SVG group.
/// Samples the curve at 20 points and checks point-in-bbox for each.
/// For all slurs, check if the bezier curve's extreme Y (min for above-placement,
/// max for below-placement) reaches into the adjacent staff system's Y range.
/// Sets `s.leakOverlap` on each slur.
function computeAdjacentOverlaps(svg: SVGSVGElement, slurs: SlurInfo[]): void {
    // Build staffline index sorted by Y
    const slLines: { bbox: { x: number; y: number; w: number; h: number } }[] = [];
    for (const slEl of svg.querySelectorAll('.staffline')) {
        const bb: { x: number; y: number; w: number; h: number } | null = getPathBBox(slEl);
        if (bb) { slLines.push({ bbox: bb }); }
    }
    slLines.sort((a, b) => a.bbox.y - b.bbox.y);

    for (const s of slurs) {
        s.leakOverlap = false;
        if (!s.startCp) { continue; }
        const above: boolean = s.svgStartCp.y < s.svgStart.y;
        // Find which staffline the slur lives in (by mid Y)
        const slurMidY: number = (s.svgStart.y + s.svgEnd.y) / 2;
        const slIdx: number = slLines.findIndex(slb =>
            slurMidY >= slb.bbox.y && slurMidY <= slb.bbox.y + slb.bbox.h);
        if (slIdx < 0) { continue; }
        const adjIdx: number = above ? slIdx - 1 : slIdx + 1;
        if (adjIdx < 0 || adjIdx >= slLines.length) { continue; }
        const adjBBox: { x: number; y: number; w: number; h: number } = slLines[adjIdx].bbox;

        // Compute bezier extreme Y by sampling
        const sx: number = s.svgStart.x, sy: number = s.svgStart.y;
        const c1x: number = s.svgStartCp.x, c1y: number = s.svgStartCp.y;
        const c2x: number = s.svgEndCp.x, c2y: number = s.svgEndCp.y;
        const ex: number = s.svgEnd.x, ey: number = s.svgEnd.y;
        let minY: number = Math.min(sy, ey, c1y, c2y);
        let maxY: number = Math.max(sy, ey, c1y, c2y);
        for (let i: number = 1; i < 15; i++) {
            const t: number = i / 15;
            const t1: number = 1 - t;
            const by: number = t1 * t1 * t1 * sy + 3 * t1 * t1 * t * c1y + 3 * t1 * t * t * c2y + t * t * t * ey;
            if (by < minY) { minY = by; }
            if (by > maxY) { maxY = by; }
        }

        if (above) {
            // Above-placement: check if bezier's top (minY) reaches into system above's Y range
            const adjTop: number = adjBBox.y;
            const adjBot: number = adjBBox.y + adjBBox.h;
            if (minY >= adjTop && minY <= adjBot) { s.leakOverlap = true; }
        } else {
            // Below-placement: check if bezier's bottom (maxY) reaches into system below's Y range
            const adjTop: number = adjBBox.y;
            const adjBot: number = adjBBox.y + adjBBox.h;
            if (maxY >= adjTop && maxY <= adjBot) { s.leakOverlap = true; }
        }
    }
}

/**
 * Check if a cubic bezier overlaps any obstacle points.
 * Samples bezier at 100 t-values, finds nearest X to each obstacle,
 * then checks if bezier Y at that t exceeds obstacle Y (above-placement)
 * or falls below obstacle Y (below-placement).
 */
function bezierCollidesWithObstacles(
    sx: number, sy: number,
    c1x: number, c1y: number,
    c2x: number, c2y: number,
    ex: number, ey: number,
    above: boolean,
    obstacles: Array<{ x: number; y: number }>,
): boolean {
    if (obstacles.length === 0) { return false; }
    const N: number = 100;
    const sampleX: number[] = new Array(N + 1);
    const sampleY: number[] = new Array(N + 1);
    for (let i: number = 0; i <= N; i++) {
        const t: number = i / N;
        const t1: number = 1 - t;
        const t1sq: number = t1 * t1;
        const tsq: number = t * t;
        sampleX[i] = t1sq * t1 * sx + 3 * t1sq * t * c1x + 3 * t1 * tsq * c2x + tsq * t * ex;
        sampleY[i] = t1sq * t1 * sy + 3 * t1sq * t * c1y + 3 * t1 * tsq * c2y + tsq * t * ey;
    }
    for (const obs of obstacles) {
        // Skip obstacles outside the clearable t range — the clearance computation
        // ignores edge-near obstacles (a bezier can't bow much near its endpoints),
        // so flagging them here is a false positive.
        const chordDx: number = ex - sx;
        const chordDy: number = ey - sy;
        const chordLenSq: number = chordDx * chordDx + chordDy * chordDy;
        const tObs: number = ((obs.x - sx) * chordDx + (obs.y - sy) * chordDy) / chordLenSq;
        if (tObs < SLUR_CLEARABLE_MIN_T || tObs > SLUR_CLEARABLE_MAX_T) { continue; }
        let bestIdx: number = -1;
        let bestDist: number = Infinity;
        for (let i: number = 0; i <= N; i++) {
            const d: number = Math.abs(sampleX[i] - obs.x);
            if (d < bestDist) { bestDist = d; bestIdx = i; }
        }
        if (bestIdx < 0) { continue; }
        const by: number = sampleY[bestIdx];
        // Crossing-aware collision: the curve only collides when it CROSSES the
        // notehead body (|bezierY − noteheadY| < tolerance). Passing cleanly
        // below/above a foreign notehead is correct avoid-crossing behavior, not
        // a collision. Tolerance shared with SlurQualityConstants.
        if (Math.abs(by - obs.y) < SLUR_COLLISION_TOLERANCE_PX) { return true; }
    }
    return false;
}

/** Add SVG-verified notehead positions as obstacle points.
 *  Queries <text> x/y attributes directly (getBBox() returns 0 in JSDOM).
 *  Replaces OSMD-converted injected/stem points (wrong Y for sibling staff)
 *  with pixel-perfect SVG positions. */
function addSvgObstacles(svg: SVGSVGElement, slurs: SlurInfo[]): void {
    // Build stave Y ranges from SVG: each stave has 5 staff lines
    const staveRanges: Array<{ top: number; bot: number }> = [];
    for (const stave of svg.querySelectorAll("g.vf-stave")) {
        const lines: number[] = [];
        for (const p of stave.querySelectorAll("path[d]")) {
            const d: string = p.getAttribute("d") ?? "";
            const coords: string[] = d.match(/[\d.]+/g) ?? [];
            for (let ci: number = 0; ci + 1 < coords.length; ci += 2) {
                lines.push(parseFloat(coords[ci + 1]));
            }
        }
        if (lines.length > 0) {
            const top: number = Math.min(...lines);
            const bot: number = Math.max(...lines);
            staveRanges.push({ top, bot });
        }
    }

    const nhMap: Map<string, { x: number; y: number }[]> = new Map();
    for (const nh of svg.querySelectorAll("g.vf-notehead")) {
        const noteEl: Element | null = nh.closest("[data-note-id]");
        const xmlId: string = noteEl?.getAttribute("data-note-id") ?? "";
        if (!xmlId) { continue; }
        const textEl: Element | null = nh.querySelector("text");
        if (!textEl) { continue; }
        const tx: string | null = textEl.getAttribute("x");
        const ty: string | null = textEl.getAttribute("y");
        if (!tx || !ty) { continue; }
        let cx: number = parseFloat(tx);
        const rectEl: Element | null = nh.parentElement?.querySelector("rect");
        if (rectEl) {
            const rw: string | null = rectEl.getAttribute("width");
            if (rw) { cx += parseFloat(rw) / 2; }
        } else { cx += 6; }
        const arr: { x: number; y: number }[] = nhMap.get(xmlId) || [];
        arr.push({ x: cx, y: parseFloat(ty) });
        nhMap.set(xmlId, arr);
    }
    /** Nearest stave range to a given Y (returns stave index, or -1 if none). */
    const nearestStave = (y: number): number => {
        let bestIdx: number = -1;
        let bestDist: number = Infinity;
        for (let si: number = 0; si < staveRanges.length; si++) {
            const sr: { top: number; bot: number } = staveRanges[si];
            const near: number = y < sr.top ? sr.top : (y > sr.bot ? sr.bot : y);
            const dist: number = Math.abs(y - near);
            if (dist < bestDist) { bestDist = dist; bestIdx = si; }
        }
        return bestIdx;
    };
    for (const s of slurs) {
        s.obstacleSvgPoints = s.obstacleSvgPoints.filter(op => op.cat === "skyline");
        const minSvgX: number = Math.min(s.svgStart.x, s.svgEnd.x);
        const maxSvgX: number = Math.max(s.svgStart.x, s.svgEnd.x);
        const aboveSlur: boolean = s.svgStartCp.y < s.svgStart.y;
        const chordMidY: number = (s.svgStart.y + s.svgEnd.y) / 2;
        // For non-cross slurs: find which stave the chord belongs to via start Y,
        // then only include noteheads from that stave (exclude sibling staff).
        // For cross-staff slurs: include all noteheads.
        // Match each candidate notehead to its own nearest stave, and require the
        // same stave index as the slur's chord — ledger-line noteheads still land
        // on their own staff, while noteheads a system away map to a different stave.
        let chordStaveIdx: number = -1;
        if (!s.isCrossed) {
            // VF5: g.vf-stavenote is a SIBLING of g.vf-stave (both under g.vf-measure),
            // so closest("g.vf-stave") fails. Instead match the start note's own
            // SVG Y against the nearest stave range. nhMap already holds the start
            // note's text-Y — no per-slur DOM query.
            const startPos: { x: number, y: number } | undefined = nhMap.get(s.id)?.[0];
            const startNoteY: number = startPos ? startPos.y : chordMidY;
            chordStaveIdx = nearestStave(startNoteY);
        }
        for (const [xmlId, positions] of nhMap) {
            if (xmlId === s.id) { continue; }
            for (const pos of positions) {
                if (pos.x < minSvgX || pos.x > maxSvgX) { continue; }
                if ((aboveSlur && pos.y >= chordMidY) || (!aboveSlur && pos.y <= chordMidY)) { continue; }
                if (chordStaveIdx >= 0 && nearestStave(pos.y) !== chordStaveIdx) { continue; }
                s.obstacleSvgPoints.push({ x: pos.x, y: pos.y, cat: "injected" });
            }
        }
    }
}

/** Derive output stem from score filename (strip ext, leading dots, normalize). */
function stemFromPath(path: string): string {
    let s: string = path.replace(/\.(mxl|xml)$/, "").replace(/^\.+/, "");
    return s.replace(/[^a-zA-Z0-9]+/g, "_").replace(/_+$/, "");
}

function writeAnnotatedSvg(svg: SVGSVGElement, slurs: SlurInfo[], cfg: ScoreConfig): void {
    const stem: string = stemFromPath(cfg.path);
    const tagPart: string = cfg.tag ? `_${cfg.tag}` : "";

    const clone: SVGSVGElement = svg.cloneNode(true) as SVGSVGElement;
    const ns: string = "http://www.w3.org/2000/svg";

    // Fix viewBox: OSMD draws past the nominal canvas, so the served SVG clips.
    fitDebugSvgViewBox(clone);

    const styleEl: SVGStyleElement = document.createElementNS(ns, "style") as SVGStyleElement;
    styleEl.textContent = debugSvgFontCss() + `.problem-slur{fill:rgba(255,40,40,0.35)!important}
.problem-marked{stroke:#c00!important;stroke-width:4px!important}
.problem-rect{fill:none;stroke:#c00;stroke-width:1}
.problem-label{font:9px sans-serif;fill:#c00}
.problem-bg{fill:rgba(255,255,255,0.5);stroke:#c00;stroke-width:1;rx:2}
.balloon-slur{fill:rgba(40,120,255,0.3)!important}
.balloon-marked{stroke:#06c!important;stroke-width:3px!important;stroke-dasharray:6,3}`;
    clone.insertBefore(styleEl, clone.firstChild);

    // Pre-compute adjacent-system overlaps for leak detection
    computeAdjacentOverlaps(clone, slurs);

    // Query notehead SVG positions directly from DOM — bypasses OSMD unit
    // conversion which gives wrong Y for sibling-staff obstacle points.
    // Replace OSMD-converted injected/stem points with SVG-verified positions
    addSvgObstacles(clone, slurs);

    // Pre-index every id'd element once — the per-slur querySelector scans the
    // whole multi-MB DOM each time, which dominates for large scores (Liszt).
    const idToEl: Map<string, Element> = new Map();
    for (const el of clone.querySelectorAll("[id]")) {
        idToEl.set(el.getAttribute("id") ?? "", el);
    }


    for (const s of slurs) {
        // Detect real collision: does the bezier curve actually intersect any obstacle point?
        const aboveSlur: boolean = s.svgStartCp.y < s.svgStart.y;
        const hasCollision: boolean = s.obstacleSvgPoints.length > 0 && s.startCp
            ? bezierCollidesWithObstacles(
                s.svgStart.x, s.svgStart.y,
                s.svgStartCp.x, s.svgStartCp.y,
                s.svgEndCp.x, s.svgEndCp.y,
                s.svgEnd.x, s.svgEnd.y,
                aboveSlur,
                s.obstacleSvgPoints
              )
            : false;
        const isLeak: boolean = s.leakOverlap;
        // Ballooning = bow height / span ratio above a threshold. Default angle-based
        // slurs have ratio ~0.10; content-driven clearance pushes it higher. 0.4 is
        // ~4x the normal baseline and clearly indicates an over-inflated curve.
        const balloonRatio: number = s.cpY_osmd / Math.max(0.01, Math.abs(s.spanX));
        const isBalloon: boolean = balloonRatio > 0.4;
        const isProblem: boolean = hasCollision || isLeak || isBalloon;

        // Draw obstacle points as circles for ALL slurs (not just problem ones)
        if (s.obstacleSvgPoints.length > 0 && s.startCp) {
            const sg: Element | undefined = idToEl.get(`vf-${s.id}-slur`);
            if (sg && sg.parentNode) {
                for (const op of s.obstacleSvgPoints) {
                    const isSky: boolean = op.cat === "skyline";
                    const circ: SVGCircleElement = document.createElementNS(ns, "circle") as SVGCircleElement;
                    circ.setAttribute("cx", String(op.x));
                    circ.setAttribute("cy", String(op.y));
                    circ.setAttribute("r", isSky ? "2.5" : "3.5");
                    circ.setAttribute("fill", isSky ? "rgba(0,180,0,0.6)" : "rgba(255,165,0,0.8)");
                    circ.setAttribute("stroke", isSky ? "#060" : "#f80");
                    circ.setAttribute("stroke-width", "1");
                    sg.appendChild(circ);
                }
            }
        }

        // Problem annotations (balloon/leak) only for problematic slurs
        if (!isProblem || !s.startCp) { continue; }

        // Find the slur SVG group by ID (indexed once above)
        const slurGroup: Element | undefined = idToEl.get(`vf-${s.id}-slur`);
        if (!slurGroup) { continue; }

        // Ballooning gets blue dashed marking; collision/leak stays red.
        if (isBalloon && !hasCollision && !isLeak) {
            slurGroup.classList.add("balloon-slur", "balloon-marked");
        } else {
            slurGroup.classList.add("problem-slur", "problem-marked");
        }

        const p2: Element | null = slurGroup.querySelector("path");
        if (p2) {
            p2.removeAttribute("stroke");
            p2.removeAttribute("fill");
            if (isBalloon && !hasCollision && !isLeak) {
                p2.setAttribute("fill", "rgba(40,120,255,0.3)");
                p2.setAttribute("stroke", "#06c");
                p2.setAttribute("stroke-width", "3");
                p2.setAttribute("stroke-dasharray", "6 3");
            } else {
                p2.setAttribute("fill", "rgba(255,40,40,0.35)");
                p2.setAttribute("stroke", "#c00");
                p2.setAttribute("stroke-width", "4");
            }
        }

        // Bbox rect around the slur path
        const addRect = (): void => {
            const pe: Element | null = slurGroup.querySelector("path");
            if (!pe) { return; }
            const d: string = pe.getAttribute("d") ?? "";
            const nums: number[] = d.match(/[\d.]+/g)?.map(Number) ?? [];
            if (nums.length < 4) { return; }
            let mnX: number = Infinity, mnY: number = Infinity;
            let mxX: number = -Infinity, mxY: number = -Infinity;
            for (let i: number = 0; i + 1 < nums.length; i += 2) {
                if (nums[i] < mnX) { mnX = nums[i]; }
                if (nums[i] > mxX) { mxX = nums[i]; }
                if (nums[i + 1] < mnY) { mnY = nums[i + 1]; }
                if (nums[i + 1] > mxY) { mxY = nums[i + 1]; }
            }
            if (mxX <= mnX || mxY <= mnY) { return; }
            const rect: SVGRectElement = document.createElementNS(ns, "rect") as SVGRectElement;
            rect.setAttribute("class", `problem-rect`);
            rect.setAttribute("x", String(mnX - 3));
            rect.setAttribute("y", String(mnY - 3));
            rect.setAttribute("width", String(mxX - mnX + 6));
            rect.setAttribute("height", String(mxY - mnY + 6));
            slurGroup.parentNode?.insertBefore(rect, slurGroup);
        };
        addRect();

        // Labels at bottom-right, stacked
        const lbls: string[] = [];
        if (hasCollision) { lbls.push(`collide obs=${s.obstacleCount}`); }
        if (isLeak) { lbls.push("leak"); }
        if (isBalloon) { lbls.push(`balloon r=${balloonRatio.toFixed(2)}`); }
        if (!s.startCp) { continue; }
        let lx: number = s.svgStart.x;
        let ly: number = Math.max(s.svgStartCp.y, s.svgEndCp.y) + 18;
        const prevRect: Element | null = slurGroup.previousElementSibling;
        if (prevRect && prevRect.tagName === "rect" && prevRect.hasAttribute("x")) {
            lx = parseFloat(prevRect.getAttribute("x")!);
            ly = parseFloat(prevRect.getAttribute("y")!) + parseFloat(prevRect.getAttribute("height")!) + 2;
        }
        for (let li: number = 0; li < lbls.length; li++) {
            const txt: string = lbls[li];
            const yy: number = ly + li * 18;
            const bgR: SVGRectElement = document.createElementNS(ns, "rect") as SVGRectElement;
            bgR.setAttribute("class", "problem-bg");
            bgR.setAttribute("x", String(lx - 4));
            bgR.setAttribute("y", String(yy - 12));
            bgR.setAttribute("width", String(txt.length * 7 + 8));
            bgR.setAttribute("height", "16");
            slurGroup.parentNode?.insertBefore(bgR, slurGroup);
            const lb: SVGTextElement = document.createElementNS(ns, "text") as SVGTextElement;
            lb.setAttribute("class", "problem-label");
            lb.setAttribute("x", String(lx));
            lb.setAttribute("y", String(yy));
            lb.textContent = txt;
            slurGroup.parentNode?.insertBefore(lb, slurGroup);
        }
    }

    writeDebugSvgHtml(clone, `${stem}${tagPart}`);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("Debug slur obstacles", () => {
    for (const cfg of SCORE_VARIANTS) {
        describe(cfg.name, () => {
            let slurs: SlurInfo[];
            let svg: SVGSVGElement | null;
            let noteheadBBoxes: Map<string, BBoxRect>;
            let slurBBoxes: Map<string, BBoxRect>;
            let gmsRef: GraphicalMusicSheet;
            let rulesRef: EngravingRules;

            beforeAll(async () => {
                const { calc, gms } = await loadScore(cfg.path, cfg.engravingRules);
                gmsRef = gms;
                rulesRef = calc.rules;
                prepareMeasures(gms);

                // Render first — this calls calculateCurve which populates debugSkyPoints
                svg = renderToSvg(gms, calc.rules);

                // Collect slur data AFTER rendering so debugSkyPoints is populated
                slurs = collectCrossStaffSlurs(gms, calc.rules);
                // Add SVG-verified notehead positions as obstacle points (replaces OSMD-converted with wrong Y for sibling staves)
                addSvgObstacles(svg, slurs);

                // Build VF5 auto-ID → xmlId map for slur SVG lookup
                const vfIdToXmlId: Map<string, string> = new Map();
                for (const s of slurs) {
                    if (s.vfId && s.vfId !== "?" && s.id && s.id !== "?") {
                        vfIdToXmlId.set(s.vfId, s.id);
                    }
                }

                noteheadBBoxes = queryNoteheadBBoxes(svg);
                slurBBoxes = querySlurBBoxes(svg, vfIdToXmlId);
            }, 300000); // Liszt loads + renders a multi-page score in jsdom — far beyond the 10s hook default

            afterAll(() => {
                if (svg) {
                    try { writeAnnotatedSvg(svg, slurs, cfg); } catch (_e) { /* skip if fs unavailable */ }
                }
            }, 300000); // writeAnnotatedSvg deep-clones the multi-MB SVG and walks it repeatedly

            // ── Assertions ───────────────────────────────────────────────

            it("finds slurs", () => {
                if (cfg.slursExpected === false) { return; }
                expect(slurs.length).greaterThan(0,
                    `${cfg.name}: expected ≥1 slur, got ${slurs.length}`);
            });

            it("no bezier-obstacle collision — real overlap check", () => {
                // Compute adjacent overlaps for leak detection
                if (svg && slurs.length > 0) {
                    computeAdjacentOverlaps(svg, slurs);
                }
                const failures: string[] = [];
                for (const s of slurs) {
                    if (!s.startCp) { continue; }
                    const aboveSlur: boolean = s.svgStartCp.y < s.svgStart.y;
                    const hasCollision: boolean = s.obstacleSvgPoints.length > 0
                        ? bezierCollidesWithObstacles(
                            s.svgStart.x, s.svgStart.y,
                            s.svgStartCp.x, s.svgStartCp.y,
                            s.svgEndCp.x, s.svgEndCp.y,
                            s.svgEnd.x, s.svgEnd.y,
                            aboveSlur,
                            s.obstacleSvgPoints
                          )
                        : false;
                    if (hasCollision) {
                        failures.push(`${s.id} bezier intersects ${s.obstacleCount} obstacles`);
                    }
                    if (s.leakOverlap) {
                        failures.push(`${s.id} leaks into adjacent system`);
                    }
                }
                expect(failures, `${failures.length} slurs with bezier-obstacle collision`)
                    .to.deep.equal([]);
            });

            it("no absurd spanX or staff height", () => {
                const failures: string[] = [];
                for (const s of slurs) {
                    const absSpan: number = Math.abs(s.spanX);
                    const staffH: number = s.staffBottomSvg - s.staffTopSvg;
                    if (isNaN(s.spanX) || isNaN(s.staffTopSvg) || isNaN(s.staffBottomSvg)) {
                        failures.push(`${s.id} NaN coordinates`);
                    }
                    if (absSpan < 0.1 && s.spanX !== 0) {
                        failures.push(`${s.id} spanX=${s.spanX.toFixed(2)} near-zero`);
                    }
                    if (staffH <= 0) {
                        failures.push(`${s.id} staffH=${staffH.toFixed(1)} <= 0`);
                    }
                    if (s.leakPx < 0) {
                        failures.push(`${s.id} negative leak=${s.leakPx.toFixed(1)}`);
                    }
                }
                expect(failures, `${failures.length} slurs with absurd data`)
                    .to.deep.equal([]);
            });

            it("no leaking into adjacent staff systems — bezier overlaps elements", () => {
                const failures: string[] = [];
                if (!svg || !slurs.length) { expect(failures).to.deep.equal([]); return; }
                // Compute adjacent overlaps for all slurs
                computeAdjacentOverlaps(svg, slurs);
                for (const s of slurs) {
                    if (s.leakOverlap) {
                        failures.push(`${s.id} bezier overlaps adjacent system`);
                    }
                }
                expect(failures, `${failures.length} slurs leak into adjacent staff`)
                    .to.deep.equal([]);
            });

            // Clearance verified visually via obstacle dots on annotated SVG.
            // Relies on mergedClearanceCpY check above (obstacle clearance).

            it("above-placement non-cross slurs have obstacle clearance", () => {
                // Ground-truth clearance from the reporter (single SVG-pixel frame),
                // not the legacy mergedClearanceCpY internal (unset by the unified
                // solver). A non-cross above slur with in-window obstacles must not
                // collide with them.
                const reports = getSlurQuality(gmsRef, svg as SVGSVGElement, rulesRef);
                const aboveWithObs = reports.filter(
                    r => !r.isCrossed && r.placement === "above" && r.obstacleCount > 0 && r.trusted);
                if (aboveWithObs.length === 0) { return; }
                const colliding = aboveWithObs.filter(r => r.collision).map(r => r.id);
                expect(colliding, `${colliding.length}/${aboveWithObs.length} colliding: ${colliding.join(",")}`)
                    .to.deep.equal([]);
            });

            // ── Debug dump ──────────────────────────────────────────────

            it("reports slurs", () => {
                console.warn(`\n=== ${cfg.name} (${cfg.path}) ===`);
                console.warn(`Found ${slurs.length} slurs`);
                console.warn(`SVG: ${noteheadBBoxes.size} noteheads, ${slurBBoxes.size} slurs mapped`);

                const ballooned: SlurInfo[] = slurs.filter(s => s.cpY_osmd > cfg.maxCpY);
                const normal: SlurInfo[] = slurs.filter(s => s.cpY_osmd <= cfg.maxCpY);
                console.warn(`Ballooned (>${cfg.maxCpY}): ${ballooned.length}  Normal: ${normal.length}`);

                for (const s of slurs) {
                    const flag: string = s.cpY_osmd > cfg.maxCpY ? " ⚠️BALLOONED" : "";
                    console.warn(`\n  Slur ${s.id}${flag}:`);
                    console.warn(`    vfId=${s.vfId} isCrossed=${s.isCrossed}`);
                    console.warn(`    notes: ${s.startPitch} (m${s.startMeasure}) → ${s.endPitch} (m${s.endMeasure})  staff ${s.startNoteStaff}→${s.endNoteStaff}`);
                    console.warn(`    OSMD:  start=(${s.startPt.x.toFixed(2)}, ${s.startPt.y.toFixed(2)})  end=(${s.endPt.x.toFixed(2)}, ${s.endPt.y.toFixed(2)}) spanX=${s.spanX.toFixed(2)}`);
                    if (s.startCp) {
                        console.warn(`    CPs:  cp1=(${s.startCp.x.toFixed(2)}, ${s.startCp.y.toFixed(2)}) cp2=(${s.endCp.x.toFixed(2)}, ${s.endCp.y.toFixed(2)}) cpY=${s.cpY_osmd.toFixed(2)} mL=${s.mergedClearance.toFixed(2)} rC=${s.rightClearance.toFixed(2)} obs=${s.obstacleCount} leak=${s.leakPx.toFixed(1)}px`);
                    }
                    console.warn(`    SVG:  M${s.svgStart.x.toFixed(1)} ${s.svgStart.y.toFixed(1)} C${s.svgStartCp?.x.toFixed(1) ?? "?"} ${s.svgStartCp?.y.toFixed(1) ?? "?"},${s.svgEndCp?.x.toFixed(1) ?? "?"} ${s.svgEndCp?.y.toFixed(1) ?? "?"},${s.svgEnd.x.toFixed(1)} ${s.svgEnd.y.toFixed(1)}`);
                    console.warn(`    ratio=cpY/span=${(s.cpY_osmd / Math.max(0.01, s.spanX)).toFixed(3)}`);

                    // SVG bbox cross-check
                    const slBBox: BBoxRect | undefined = slurBBoxes.get(s.id);
                    const nhBBox: BBoxRect | undefined = noteheadBBoxes.get(s.id);
                    if (slBBox && nhBBox && nhBBox.height > 0) {
                        console.warn(`    SVG bbox: slur_top=${slBBox.y.toFixed(1)} note_top=${nhBBox.y.toFixed(1)} clear=${(nhBBox.y - slBBox.y).toFixed(1)}px`);
                    }
                }

                // Show top worst ballooning
                const sorted: SlurInfo[] = [...slurs].sort((a, b) => b.cpY_osmd - a.cpY_osmd);
                console.warn(`\n  ── Top 5 worst by cpY ──`);
                for (let i: number = 0; i < Math.min(5, sorted.length); i++) {
                    const s: SlurInfo = sorted[i];
                    console.warn(`    #${i+1}: ${s.id} cpY=${s.cpY_osmd.toFixed(2)} spanX=${s.spanX.toFixed(2)} hw=${(s.cpY_osmd / Math.max(0.01, Math.abs(s.spanX))).toFixed(3)} obs=${s.obstacleCount} mL=${s.mergedClearance.toFixed(2)} rC=${s.rightClearance.toFixed(2)} leak=${s.leakPx.toFixed(1)}px`);
                }

                if (svg) { dumpSvgStructure(svg); }
            });

            it("prints ground-truth quality report", () => {
                if (!svg || !gmsRef) { return; }
                const reports = getSlurQuality(gmsRef, svg, rulesRef);
                const agg = aggregateSlurQuality(reports);
                console.warn(`\n  ── Ground-truth report (${reports.length} slurs) ──`);
                console.warn(`    frame=${reports[0]?.frame ?? "?"} trusted=${reports.filter(r => r.trusted).length}/${reports.length} untrusted=${agg.untrusted}`);
                console.warn(`    crossings=${agg.collisions} balloons=${agg.balloons} leaks=${agg.leaks} leakOverlaps=${agg.leakOverlaps}`);
                console.warn(`    meanClearancePx=${agg.meanClearancePx.toFixed(1)} minClearancePx=${agg.minClearancePx.toFixed(1)} meanBowRatio=${agg.meanBowRatio.toFixed(3)} maxBowRatio=${agg.maxBowRatio.toFixed(3)}`);
                for (const r of reports) {
                    const flag: string = r.collision ? " 💥" : r.balloon ? " 🎈" : "";
                    console.warn(`    ${r.id}${flag} frame=${r.frame} crossed=${r.isCrossed} ${r.placement} clearance=${r.clearancePx.toFixed(1)}px@t=${r.clearanceT.toFixed(2)} bow=${r.bowPx.toFixed(1)}px r=${r.bowRatio.toFixed(3)} obs=${r.obstacleCount} x=${r.crossingCount}↓${r.passBelowCount} leak=${r.leakPx.toFixed(0)}${r.trusted ? "" : ` !${r.reasons.join(",")}`}`);
                }
            });

            // ── Articulation + tuplet dump (issue 122) ──────────────────

            it("dumps VF beams with noteheads (issue 123)", () => {
                if (!gmsRef || !svg) { return; }
                console.warn(`\n  ── VF beams + noteheads ──`);
                // notehead text positions from the rendered SVG, keyed by xmlId
                const nhMap: Map<string, { x: number, y: number }[]> = new Map();
                for (const nh of svg.querySelectorAll("g.vf-notehead")) {
                    const noteEl: Element | null = nh.closest("[data-note-id]");
                    const xmlId: string = noteEl?.getAttribute("data-note-id") ?? "";
                    if (!xmlId) { continue; }
                    const t: Element | null = nh.querySelector("text");
                    if (!t) { continue; }
                    const x: number = parseFloat(t.getAttribute("x") ?? "NaN");
                    const y: number = parseFloat(t.getAttribute("y") ?? "NaN");
                    if (!Number.isNaN(x)) {
                        const arr = nhMap.get(xmlId) || [];
                        arr.push({ x, y });
                        nhMap.set(xmlId, arr);
                    }
                }
                // all beams with their notes + beamline y (from fill path rects)
                let bi: number = 0;
                for (const page of gmsRef.MusicPages) {
                    for (const sys of page.MusicSystems) {
                        for (const col of sys.GraphicalMeasures) {
                            for (const m of col) {
                                const vfbeams: any[] = (m as any).vfbeams ?? {};
                                const staveNotes: any[] = (m as any).staveNotes ?? [];
                                for (const voiceId in vfbeams) {
                                    for (const b of vfbeams[voiceId] ?? []) {
                                        const notes: any[] = b?.notes ?? [];
                                        const ids: string[] = notes.map((n: any) => n.getAttribute?.("id") ?? "?");
                                        const yVals: string[] = notes.map((n: any) => n.getYs?.()?.map((y: number) => y.toFixed(1)).join(",") ?? "?");
                                        // beamline y from SVG fill path
                                        let beamY: string = "?";
                                        const dAttr: string = b?.svgGroup?.querySelector?.("path[stroke='none']")?.getAttribute?.("d") ?? "";
                                        if (dAttr) {
                                            const nums: number[] = dAttr.match(/[\d.]+/g)?.map(Number) ?? [];
                                            if (nums.length >= 4) { beamY = `y ${Math.min(...nums.filter((_v: number, i: number) => i % 2 === 1)).toFixed(1)}..${Math.max(...nums.filter((_v: number, i: number) => i % 2 === 1)).toFixed(1)}`; }
                                        }
                                        console.warn(`    beam#${bi} voice=${voiceId} m=${m.MeasureNumber} notes=[${ids.join(", ")}] noteYs=[${yVals.join(" | ")}] beamline=${beamY} stemDir=${(notes[0] as any)?.getStemDirection?.()}`);
                                        // nearest noteheads in beam x-range
                                        bi++;
                                    }
                                }
                            }
                        }
                    }
                }
                // beam#9 (voice-2 E4→F4 up-stem) collision gap vs foreign noteheads
                const b9 = ((): Element | null => {
                    for (const b of svg.querySelectorAll("[class*='vf-beam']")) {
                        const stems: { x: number, y: number }[] = Array.from(b.querySelectorAll("[class*='vf-stem']")).map(
                            s => { const m: RegExpMatchArray | null = s.querySelector("path")?.getAttribute("d")?.match(/M([\d.-]+) ([\d.-]+)/);
                                return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : { x: NaN, y: NaN }; })
                            .filter(s => Number.isFinite(s.x) && Number.isFinite(s.y));
                        // beam#9 (voice-2 E4→F4) stems sit in x 340..490, y 580..680 (system-2 top staff)
                        if (stems.some(s => s.x > 330 && s.x < 500 && s.y > 580 && s.y < 680)) { return b; }
                    }
                    return null;
                })();
                if (b9) {
                    const rects: { x1: number, x2: number, y2: number }[] = [];
                    for (const p of b9.querySelectorAll(":scope > path[stroke='none']")) {
                        const d: string = p.getAttribute("d") ?? "";
                        const nums: number[] = d.match(/[\d.]+/g)?.map(Number) ?? [];
                        let mnX = Infinity, mxX = -Infinity, mxY = -Infinity;
                        for (let i: number = 0; i + 1 < nums.length; i += 2) {
                            if (nums[i] < mnX) mnX = nums[i];
                            if (nums[i] > mxX) mxX = nums[i];
                            if (nums[i + 1] > mxY) mxY = nums[i + 1];
                        }
                        if (mxX > mnX) { rects.push({ x1: mnX, x2: mxX, y2: mxY }); }
                    }
                    const beamBot: number = Math.max(...rects.map(r => r.y2));
                    const foreign: number[] = ["p0n19_10", "p0n19_11"].map(
                        id => { const t: Element | null = svg.querySelector(`[data-note-id="${id}"] text`);
                            return t ? parseFloat(t.getAttribute("y") ?? "NaN") : NaN; }).filter(Number.isFinite);
                    const highest: number = Math.min(...foreign);
                    console.warn(`  beam#9 collision: beamBottom=${beamBot.toFixed(1)} highestForeign=${highest.toFixed(1)} gap=${(highest - beamBot).toFixed(1)}px`);
                }
                // all noteheads dump for m19/m20 top staff
                console.warn(`  ── all noteheads (m19/m20) ──`);
                for (const [id, poss] of nhMap) {
                    if (!/p0n(19|20)_/.test(id)) { continue; }
                    console.warn(`    ${id} ${poss.map((p: { x: number, y: number }) => `(${p.x.toFixed(1)},${p.y.toFixed(1)})`).join(" ")}`);
                }
            });

            it("dumps music systems + void geometry", () => {
                if (!gmsRef) { return; }
                console.warn(`\n  ── music systems ──`);
                for (const page of gmsRef.MusicPages) {
                    for (const sys of page.MusicSystems) {
                        const ps: any = (sys as any).PositionAndShape;
                        const abs: any = ps?.AbsolutePosition;
                        const sz: any = ps?.Size;
                        console.warn(`  sys top=${(abs?.y ?? NaN).toFixed(1)} h=${(sz?.height ?? NaN).toFixed(1)} bottom=${((abs?.y ?? 0) + (sz?.height ?? 0)).toFixed(1)} staffLines=${(sys as any).StaffLines?.length ?? "?"}`);
                        for (const sl of (sys as any).StaffLines ?? []) {
                            const slAbs: any = sl.PositionAndShape?.AbsolutePosition;
                            const slSz: any = sl.PositionAndShape?.Size;
                            console.warn(`    staffLine absY=${(slAbs?.y ?? NaN).toFixed(1)} h=${(slSz?.height ?? NaN).toFixed(1)} bottom=${((slAbs?.y ?? 0) + (slSz?.height ?? 0)).toFixed(1)}`);
                        }
                    }
                }
            });

            it("dumps OSMD tuplet model", () => {
                if (!gmsRef) { return; }
                console.warn(`\n  ── OSMD tuplets ──`);
                for (const page of gmsRef.MusicPages) {
                    for (const sys of page.MusicSystems) {
                        for (const col of sys.GraphicalMeasures) {
                            for (const m of col) {
                                const gse: GraphicalStaffEntry[] = (m as any).staffEntries ?? [];
                                const tups: any[] = (m as any).tuplets ?? [];
                                if (!tups) { continue; }
                                for (const voiceId in tups) {
                                    for (const builder of tups[voiceId] ?? []) {
                                        const t: any = builder[0];
                                        const ve: any[] = builder[1];
                                        const bracketed: boolean = t.shouldBeBracketed(
                                            (rulesRef as any).TupletsBracketedUseXMLValue,
                                            (rulesRef as any).TupletsBracketed,
                                            (rulesRef as any).TripletsBracketed,
                                            false,
                                            false
                                        );
                                        // VF tuplet (post-render): bracketed option + geometry
                                        const vft: any = (m as any).osmdTupletToVfTuplet?.get?.(t);
                                        const vfOpts: any = vft?.options;
                                        const vfX: number = vft?.getX?.() ?? NaN;
                                        const vfW: number = vft?.getWidth?.() ?? NaN;
                                        // beam info: does every note share the starting beam?
                                        const startBeam: any = t.Notes?.[0]?.[0]?.NoteBeam;
                                        const allSameBeam: boolean = !!startBeam && t.Notes.every((ng: any[]) => ng[0].NoteBeam === startBeam);
                                        const groupInfo: string[] = t.Notes.map((ng: any[]) => {
                                            const beamRefs: string = ng.map((n: any) => {
                                                const b: any = n.NoteBeam;
                                                return b ? `b:${ng.indexOf(n)}` : `-`;
                                            }).join(",");
                                            return `${ng.map((n: any) => n?.id ?? "?").join("+")}[${beamRefs}]`;
                                        });
                                        // every group has ≥1 beamed note AND all those beams are one object
                                        const beamObjs: any[] = t.Notes.map((ng: any[]) => ng.find((n: any) => n.NoteBeam)?.NoteBeam);
                                        const singleBeam: boolean = beamObjs.every((b: any) => !!b && b === beamObjs[0]);
                                        // VF-side: do the tuplet's VF stavenotes share one VF beam?
                                        const vfNotes: any[] = vft?.notes ?? [];
                                        const firstVfBeam: any = vfNotes[0]?.beam;
                                        const vfSingleBeam: boolean = !!firstVfBeam && vfNotes.every((n: any) => n.beam === firstVfBeam);
                                        console.warn(`    tuplet m=${m.MeasureNumber} voice=${voiceId} osmdSingleBeam=${singleBeam} vfSingleBeam=${vfSingleBeam} vfBracketed=${vfOpts?.bracketed} groups=[${groupInfo.join(" | ")}]`);
                                    }
                                }
                            }
                        }
                    }
                }
            });

            it("dumps VF articulation modifier internals", () => {
                if (!gmsRef) { return; }
                console.warn(`\n  ── VF articulation modifiers ──`);
                for (const page of gmsRef.MusicPages) {
                    for (const sys of page.MusicSystems) {
                        for (const col of sys.GraphicalMeasures) {
                            for (const m of col) {
                                const gse: GraphicalStaffEntry[] = (m as any).staffEntries ?? [];
                                for (const se of gse) {
                                    for (const gve of (se as any).graphicalVoiceEntries ?? []) {
                                        const vfnote: VF.StemmableNote = (gve as any).vfStaveNote;
                                        if (!vfnote?.getModifiers) { continue; }
                                        const arts: VF.Modifier[] = vfnote.getModifiers().filter(
                                            (mod: VF.Modifier) => mod.getCategory?.() === "Articulation");
                                        if (!arts.length) { continue; }
                                        const props: any[] = (vfnote as any).getKeyProps?.() ?? [];
                                        const ys: number[] = (vfnote as any).getYs?.() ?? [];
                                        const ext: any = (vfnote as any).getStemExtents?.() ?? {};
                                        const stemDir: number = vfnote.getStemDirection?.() ?? "?";
                                        console.warn(`    stavenote id=${(vfnote as any).getAttribute?.("id")} keys=${props.map((p: any) => `line=${p.line}`).join(",")} ys=[${ys.map((y: number) => y.toFixed(1)).join(",")}] stemDir=${stemDir} stemBase=${ext.baseY} stemTop=${ext.topY}`);
                                        for (const art of arts) {
                                            console.warn(`      art type=${(art as any).type} pos=${art.getPosition?.()} textLine=${(art as any).textLine} x=${(art as any).x?.toFixed(1)} y=${(art as any).y?.toFixed(1)} yShift=${(art as any)._userYShift} betweenLines=${(art as any).articulation?.betweenLines}`);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            it("dumps articulations and tuplet brackets", () => {
                if (!svg) { return; }
                // Articulation glyphs: Bravura/Gonville articulation region U+E4A0..E4B0
                const artEls: Element[] = Array.from(svg.querySelectorAll("text")).filter((t: Element) => {
                    const cp: number = t.textContent?.codePointAt(0) ?? 0;
                    return cp >= 0xE4A0 && cp <= 0xE4B0;
                });
                console.warn(`\n  ── Articulations (${artEls.length}) ──`);
                for (const t of artEls) {
                    const cp: number = t.textContent?.codePointAt(0) ?? 0;
                    const x: number = parseFloat(t.getAttribute("x") ?? "NaN");
                    const y: number = parseFloat(t.getAttribute("y") ?? "NaN");
                    // nearest notehead bbox from queryNoteheadBBoxes map
                    let near: string = "?";
                    let nearD: number = Infinity;
                    for (const [id, r] of noteheadBBoxes) {
                        const cx: number = r.x + r.width / 2;
                        const cy: number = r.y + r.height / 2;
                        const d: number = Math.abs(x - cx) + Math.abs(y - cy);
                        if (d < nearD) { nearD = d; near = id; }
                    }
                    console.warn(`    cp=${cp.toString(16)} x=${x.toFixed(1)} y=${y.toFixed(1)} nearNote=${near} dist=${nearD.toFixed(1)}px`);
                }
                // Tuplet brackets: VF5 draws them as g.vf-tuplet with child path/line
                const tupletEls: Element[] = Array.from(svg.querySelectorAll("g.vf-tuplet, .vf-tuplet"));
                console.warn(`\n  ── Tuplet brackets (${tupletEls.length}) ──`);
                for (const g of tupletEls) {
                    const d: string = g.querySelector("path")?.getAttribute("d") ?? "";
                    console.warn(`    class=${g.getAttribute("class")} ${d.slice(0, 120)}`);
                }
            });

            // Dichterliebe-specific: cross-staff slurs with positive bow
            if (cfg.name === "Dichterliebe") {
                it("cross-staff slurs have positive bow", () => {
                    const cs: SlurInfo[] = slurs.filter(s => s.isCrossed || s.spanX > 15);
                    const failures: string[] = [];
                    for (const s of cs) {
                        // A system-break split continuation can be a few px long (end
                        // note on the first beat of the next system) — too short to bow.
                        // "A few px" is more than 2: pinning noteStartX to the measure's
                        // own beginInstructionsWidth moved one such stub from 1.9px to
                        // 2.7px, and a 2.7px slur still has nowhere to put a bow.
                        if (s.cpY_osmd < 0.5 && Math.abs(s.spanX) > 4) {
                            failures.push(`${s.id} cpY=${s.cpY_osmd.toFixed(2)} spanX=${s.spanX.toFixed(1)}`);
                        }
                    }
                    expect(failures, `${failures.length} cross slurs with low bow`)
                        .to.deep.equal([]);
                });
            }
        });
    }
});
