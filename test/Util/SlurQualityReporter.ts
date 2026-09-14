/* eslint-disable @typescript-eslint/typedef */
/**
 * Ground-truth slur quality reporter (study deliverable A).
 *
 * One coordinate frame everywhere: rendered SVG pixels. The bezier is the
 * OSMD control-point curve converted via the staff line's absolute position
 * (matches what VexFlow draws — the SVG dump shows the identical path), and
 * obstacles are queried straight from the SVG noteheads. No OSMD-model Y for
 * obstacles.
 *
 * Numbers reported per slur:
 *   - clearance_px  min signed gap between sampled bezier and obstacle points
 *                   (positive = curve is on the clearing side; a bezier that
 *                   grazes an obstacle is < tolerance → collision)
 *   - bow_px / bow_ratio  max vertical deviation of the bezier from its chord,
 *                   ratio = bow_px / chord_len_px
 *   - t_min/t_max   the clearable t-window, read from GraphicalSlur statics so
 *                   the reporter and the curve algorithm can never drift
 *   - frame/trusted self-check: flags missing data-note-id / empty skyline /
 *                   non-finite coordinates instead of silently producing numbers
 */
import { IMusicPage } from "../../src/MusicalScore/Graphical/IMusicPage";
import { MusicSystem } from "../../src/MusicalScore/Graphical/MusicSystem";
import { StaffLine } from "../../src/MusicalScore/Graphical/StaffLine";
import { GraphicalSlur } from "../../src/MusicalScore/Graphical/GraphicalSlur";
import { GraphicalNote } from "../../src/MusicalScore/Graphical/GraphicalNote";
import { PlacementEnum } from "../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";
import { Element as VfElement } from "vexflow";
import { unitInPixels } from "../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";
import {
    SLUR_BALLOON_BOW_RATIO,
    SLUR_COLLISION_TOLERANCE_PX,
} from "../../src/MusicalScore/Graphical/SlurQualityConstants";

export interface PxPoint { x: number, y: number }

export interface SlurQualityReport {
    id: string;
    frame: "svg" | "osmd-model";
    trusted: boolean;
    reasons: string[];
    isCrossed: boolean;
    placement: "above" | "below";
    start: PxPoint;
    end: PxPoint;
    startCp: PxPoint | null;
    endCp: PxPoint | null;
    chordLenPx: number;
    bowPx: number;
    bowRatio: number;
    clearancePx: number;
    clearanceT: number;
    /** Min signed gap over ALL obstacles (no t-window) — reference honesty check
     *  independent of the algorithm's clearable window. */
    clearanceAllPx: number;
    tMin: number;
    tMax: number;
    obstacleCount: number;
    /** Curve crosses a notehead body (|gap| < tolerance) in the t-window. A
     *  curve passing BELOW a foreign notehead is not a collision — only a real
     *  crossing of the notehead body is. */
    collision: boolean;
    /** Collision judged against all obstacles (no t-window). */
    collisionAll: boolean;
    /** Number of t-window obstacles the curve crosses (|gap| < tolerance). */
    crossingCount: number;
    /** Obstacles the curve passes below/above cleanly (|gap| ≥ tolerance on the
     *  non-clearing side) — foreign-avoid crossings, correct by design. */
    passBelowCount: number;
    leakPx: number;
    leakOverlap: boolean;
    balloon: boolean;
}

export interface SlurQualityAggregate {
    slurCount: number;
    uncomputed: number;
    collisions: number;
    collisionsAll: number;
    balloons: number;
    leaks: number;
    leakOverlaps: number;
    untrusted: number;
    meanClearancePx: number;
    minClearancePx: number;
    meanBowRatio: number;
    maxBowRatio: number;
    meanBowPx: number;
}

interface NoteheadInfo { x: number, y: number, xmlId: string | null }
interface StaveRange { top: number, bot: number }

/** Sample a cubic bezier (start, c1, c2, end) at N+1 t values → px points. */
function sampleBezier(
    sx: number, sy: number, c1x: number, c1y: number,
    c2x: number, c2y: number, ex: number, ey: number, n: number,
): PxPoint[] {
    const out: PxPoint[] = [];
    for (let i: number = 0; i <= n; i++) {
        const t: number = i / n;
        const t1: number = 1 - t;
        const t1sq: number = t1 * t1;
        const tsq: number = t * t;
        out.push({
            x: t1sq * t1 * sx + 3 * t1sq * t * c1x + 3 * t1 * tsq * c2x + tsq * t * ex,
            y: t1sq * t1 * sy + 3 * t1sq * t * c1y + 3 * t1 * tsq * c2y + tsq * t * ey,
        });
    }
    return out;
}

/** Convert OSMD staff-line-relative coords to rendered SVG pixels. */
function toSvgCoords(osmdX: number, osmdY: number, sl: StaffLine): PxPoint {
    const abs: any = sl.PositionAndShape?.AbsolutePosition;
    if (!abs) { return { x: osmdX * unitInPixels, y: osmdY * unitInPixels }; }
    return { x: (osmdX + abs.x) * unitInPixels, y: (osmdY + abs.y) * unitInPixels };
}

/** All noteheads in the rendered SVG: center point + xmlId when available. */
function queryNoteheads(svg: SVGSVGElement): NoteheadInfo[] {
    const out: NoteheadInfo[] = [];
    for (const nh of svg.querySelectorAll("g.vf-notehead")) {
        const noteEl: Element | null = nh.closest("[data-note-id]");
        const xmlId: string | null = noteEl?.getAttribute("data-note-id") ?? null;
        const textEl: Element | null = nh.querySelector("text");
        if (!textEl) { continue; }
        const tx: string | null = textEl.getAttribute("x");
        const ty: string | null = textEl.getAttribute("y");
        if (tx === null || ty === null) { continue; }
        let cx: number = parseFloat(tx);
        const rectEl: Element | null = nh.parentElement?.querySelector("rect");
        if (rectEl) {
            const rw: string | null = rectEl.getAttribute("width");
            if (rw) { cx += parseFloat(rw) / 2; }
        } else { cx += 6; }
        out.push({ x: cx, y: parseFloat(ty), xmlId });
    }
    return out;
}

/** Y ranges of every stave in the SVG, from its 5 staff-line path coords. */
function staveRanges(svg: SVGSVGElement): StaveRange[] {
    const ranges: StaveRange[] = [];
    for (const stave of svg.querySelectorAll("g.vf-stave")) {
        const ys: number[] = [];
        for (const p of stave.querySelectorAll("path[d]")) {
            const d: string = p.getAttribute("d") ?? "";
            const coords: string[] = d.match(/[\d.]+/g) ?? [];
            for (let ci: number = 0; ci + 1 < coords.length; ci += 2) {
                ys.push(parseFloat(coords[ci + 1]));
            }
        }
        if (ys.length > 0) {
            ranges.push({ top: Math.min(...ys), bot: Math.max(...ys) });
        }
    }
    return ranges;
}

/** Y bands of every .staffline group in the SVG (union of child path coords). */
function svgStafflineBands(svg: SVGSVGElement): StaveRange[] {
    const bands: StaveRange[] = [];
    for (const slEl of svg.querySelectorAll(".staffline")) {
        let mnY: number = Infinity;
        let mxY: number = -Infinity;
        for (const p of slEl.querySelectorAll("path[d]")) {
            const d: string = p.getAttribute("d") ?? "";
            const nums: number[] = d.match(/[\d.]+/g)?.map(Number) ?? [];
            for (let i: number = 1; i + 1 < nums.length; i += 2) {
                if (nums[i] < mnY) { mnY = nums[i]; }
                if (nums[i] > mxY) { mxY = nums[i]; }
            }
        }
        if (isFinite(mnY) && mxY > mnY) { bands.push({ top: mnY, bot: mxY }); }
    }
    return bands;
}

function nearestStaveIndex(y: number, ranges: StaveRange[]): number {
    let bestIdx: number = -1;
    let bestDist: number = Infinity;
    for (let si: number = 0; si < ranges.length; si++) {
        const sr: StaveRange = ranges[si];
        const near: number = y < sr.top ? sr.top : (y > sr.bot ? sr.bot : y);
        const dist: number = Math.abs(y - near);
        if (dist < bestDist) { bestDist = dist; bestIdx = si; }
    }
    return bestIdx;
}

/** Collect (slur, staffLine) pairs from the graphical music sheet. */
function collectSlurs(gms: any): Array<{ slur: GraphicalSlur, staffLine: StaffLine }> {
    const out: Array<{ slur: GraphicalSlur, staffLine: StaffLine }> = [];
    for (const page of gms.MusicPages as IMusicPage[]) {
        for (const sys of page.MusicSystems as MusicSystem[]) {
            for (const sl of sys.StaffLines as StaffLine[]) {
                for (const slur of sl.GraphicalSlurs) {
                    out.push({ slur, staffLine: sl });
                }
            }
        }
    }
    return out;
}

/** Resolve a slur's id: source xmlId, else VF note id (computed like note-m-s-v-i). */
function slurId(slur: GraphicalSlur, rules: EngravingRules): string {
    const sn: any = slur.slur?.StartNote;
    const en: any = slur.slur?.EndNote;
    if (sn?.xmlId) { return sn.xmlId; }
    if (en?.xmlId) { return en.xmlId; }
    try {
        const gn: GraphicalNote = rules.GNote(sn);
        const vfN: any = (gn as any)?.vfnote?.[0];
        const id: string | undefined = vfN?.getAttribute?.("id");
        if (id) { return id; }
    } catch (_e) { /* fall through */ }
    return "?";
}

/** Measure one slur against the rendered SVG. */
function measureSlur(
    slur: GraphicalSlur,
    staffLine: StaffLine,
    noteheads: NoteheadInfo[],
    ranges: StaveRange[],
    hasIds: boolean,
    stafflineBands: StaveRange[],
    rules: EngravingRules,
): SlurQualityReport | null {
    if (!slur.bezierStartPt || !slur.bezierEndPt) { return null; }
    const start: PxPoint = toSvgCoords(slur.bezierStartPt.x, slur.bezierStartPt.y, staffLine);
    const end: PxPoint = toSvgCoords(slur.bezierEndPt.x, slur.bezierEndPt.y, staffLine);
    const startCp: PxPoint | null = slur.bezierStartControlPt
        ? toSvgCoords(slur.bezierStartControlPt.x, slur.bezierStartControlPt.y, staffLine) : null;
    const endCp: PxPoint | null = slur.bezierEndControlPt
        ? toSvgCoords(slur.bezierEndControlPt.x, slur.bezierEndControlPt.y, staffLine) : null;
    if (!startCp || !endCp) { return null; }

    const above: boolean = slur.placement === PlacementEnum.Above;
    const placement: "above" | "below" = above ? "above" : "below";
    const isCrossed: boolean = !!slur.slur?.isCrossed();
    const chordDx: number = end.x - start.x;
    const chordDy: number = end.y - start.y;
    const chordLenPx: number = Math.sqrt(chordDx * chordDx + chordDy * chordDy);
    const minX: number = Math.min(start.x, end.x);
    const maxX: number = Math.max(start.x, end.x);
    const midY: number = (start.y + end.y) / 2;

    const startNoteId: string | null = (slur.slur?.StartNote as any)?.xmlId ?? null;
    const endNoteId: string | null = (slur.slur?.EndNote as any)?.xmlId ?? null;

    // ── Obstacles (SVG frame, all noteheads) ───────────────────────────────
    let chordStaveIdx: number = -1;
    if (!isCrossed) { chordStaveIdx = nearestStaveIndex(start.y, ranges); }
    const obstacles: PxPoint[] = [];
    for (const nh of noteheads) {
        if (nh.x < minX || nh.x > maxX) { continue; }
        if ((above && nh.y >= midY) || (!above && nh.y <= midY)) { continue; }
        if (chordStaveIdx >= 0 && nearestStaveIndex(nh.y, ranges) !== chordStaveIdx) { continue; }
        if (nh.xmlId && (nh.xmlId === startNoteId || nh.xmlId === endNoteId)) { continue; }
        obstacles.push({ x: nh.x, y: nh.y });
    }

    // ── Sample bezier once ─────────────────────────────────────────────────
    const samples: PxPoint[] = sampleBezier(
        start.x, start.y, startCp.x, startCp.y, endCp.x, endCp.y, end.x, end.y, 100);

    // ── Clearance oracle: min signed gap in the clearable t-window ─────────
    // The signed gap is positive when the curve clears an obstacle on the slur
    // side. Since the obstacle fix lets the curve pass BELOW foreign obstacles
    // (avoid-crossing, never balloon-over), a negative gap is only a collision
    // when the curve actually CROSSES the notehead body (|gap| < tolerance).
    // Passing cleanly below a foreign notehead is correct behavior.
    const tMin: number = GraphicalSlur.clearableMinT;
    const tMax: number = GraphicalSlur.clearableMaxT;
    const chordLenSq: number = Math.max(0.01, chordLenPx * chordLenPx);
    let clearancePx: number = Infinity;
    let clearanceT: number = -1;
    let clearanceAllPx: number = Infinity;
    let crossingCount: number = 0;
    let crossingAllCount: number = 0;
    let passBelowCount: number = 0;
    const gapAt = (obs: PxPoint): { gap: number, idx: number, t: number } => {
        const tObs: number = ((obs.x - start.x) * chordDx + (obs.y - start.y) * chordDy) / chordLenSq;
        let bestIdx: number = -1;
        let bestDist: number = Infinity;
        for (let i: number = 0; i < samples.length; i++) {
            const d: number = Math.abs(samples[i].x - obs.x);
            if (d < bestDist) { bestDist = d; bestIdx = i; }
        }
        if (bestIdx < 0) { return { gap: Infinity, idx: -1, t: tObs }; }
        const gap: number = above ? (obs.y - samples[bestIdx].y) : (samples[bestIdx].y - obs.y);
        return { gap, idx: bestIdx, t: tObs };
    };
    for (const obs of obstacles) {
        const { gap, t: tObs } = gapAt(obs);
        if (gap < clearanceAllPx) { clearanceAllPx = gap; }
        if (Math.abs(gap) < SLUR_COLLISION_TOLERANCE_PX) { crossingAllCount++; }
        if (tObs < tMin || tObs > tMax) { continue; }
        if (gap < clearancePx) { clearancePx = gap; clearanceT = tObs; }
        if (Math.abs(gap) < SLUR_COLLISION_TOLERANCE_PX) { crossingCount++; }
        if (gap < -SLUR_COLLISION_TOLERANCE_PX) { passBelowCount++; }
    }
    const collision: boolean = crossingCount > 0;
    const collisionAll: boolean = crossingAllCount > 0;
    const obstacleCount: number = obstacles.filter(
        o => { const t = ((o.x - start.x) * chordDx + (o.y - start.y) * chordDy) / chordLenSq; return t >= tMin && t <= tMax; },
    ).length;

    // ── Bow: max vertical deviation from chord ─────────────────────────────
    let bowPx: number = 0;
    for (let i: number = 0; i < samples.length; i++) {
        const t: number = i / 100;
        const chordY: number = start.y + t * chordDy;
        const dev: number = Math.abs(samples[i].y - chordY);
        if (dev > bowPx) { bowPx = dev; }
    }
    const bowRatio: number = chordLenPx > 0.5 ? bowPx / chordLenPx : 0;
    const balloon: boolean = bowRatio > SLUR_BALLOON_BOW_RATIO;

    // ── Leak beyond staff band ─────────────────────────────────────────────
    let stTopPx: number = Infinity;
    let stBotPx: number = -Infinity;
    if (isCrossed && staffLine.ParentMusicSystem) {
        for (const otherSl of (staffLine.ParentMusicSystem as MusicSystem).StaffLines) {
            const oAbs: any = otherSl.PositionAndShape?.AbsolutePosition;
            const oH: any = otherSl.PositionAndShape?.Size?.height ?? 40;
            const oTop: number = (oAbs?.y ?? 0) * unitInPixels;
            const oBot: number = ((oAbs?.y ?? 0) + oH) * unitInPixels;
            if (oTop < stTopPx) { stTopPx = oTop; }
            if (oBot > stBotPx) { stBotPx = oBot; }
        }
    } else {
        const absY: any = staffLine.PositionAndShape?.AbsolutePosition?.y ?? 0;
        const staffH: any = staffLine.PositionAndShape?.Size?.height ?? 40;
        stTopPx = absY * unitInPixels;
        stBotPx = (absY + staffH) * unitInPixels;
    }
    let leakPx: number = 0;
    if (above) {
        let curveTop: number = Math.min(start.y, end.y, startCp.y, endCp.y);
        for (const s of samples) { if (s.y < curveTop) { curveTop = s.y; } }
        if (curveTop < stTopPx) { leakPx = stTopPx - curveTop; }
    } else {
        let curveBot: number = Math.max(start.y, end.y, startCp.y, endCp.y);
        for (const s of samples) { if (s.y > curveBot) { curveBot = s.y; } }
        if (curveBot > stBotPx) { leakPx = curveBot - stBotPx; }
    }

    // ── Leak into adjacent system (extreme reaches next staffline's band) ──
    let leakOverlap: boolean = false;
    if (stafflineBands.length > 0) {
        stafflineBands.sort((a, b) => a.top - b.top);
        const slurMidY: number = (start.y + end.y) / 2;
        const idx: number = stafflineBands.findIndex(b => slurMidY >= b.top && slurMidY <= b.bot);
        if (idx >= 0) {
            const adjIdx: number = above ? idx - 1 : idx + 1;
            if (adjIdx >= 0 && adjIdx < stafflineBands.length) {
                const adj: StaveRange = stafflineBands[adjIdx];
                let extreme: number = above ? Infinity : -Infinity;
                for (const s of samples) { if (above ? s.y < extreme : s.y > extreme) { extreme = s.y; } }
                if (extreme >= adj.top && extreme <= adj.bot) { leakOverlap = true; }
            }
        }
    }

    // ── Self-check ─────────────────────────────────────────────────────────
    const reasons: string[] = [];
    if (!hasIds) { reasons.push("own notes lack data-note-id"); }
    const coords: number[] = [start.x, start.y, end.x, end.y, startCp.x, startCp.y, endCp.x, endCp.y];
    if (!coords.every(Number.isFinite)) { reasons.push("non-finite bezier coordinates"); }
    if (!staffLine.SkyLine || staffLine.SkyLine.length === 0) { reasons.push("empty skyline"); }
    if (chordLenPx < 0.5) { reasons.push("degenerate chord"); }
    if (end.x < start.x - 1) { reasons.push("backwards span"); }

    return {
        id: slurId(slur, rules),
        frame: hasIds ? "svg" : "osmd-model",
        trusted: reasons.length === 0,
        reasons,
        isCrossed,
        placement,
        start, end, startCp, endCp,
        chordLenPx,
        bowPx,
        bowRatio,
        clearancePx,
        clearanceT,
        clearanceAllPx,
        tMin, tMax,
        obstacleCount,
        collision,
        collisionAll,
        crossingCount,
        passBelowCount,
        leakPx,
        leakOverlap,
        balloon,
    };
}

/**
 * Measure every slur on the sheet against the rendered SVG.
 * Must run after prepareMeasures() + a full render (cross-staff curves are
 * only computed at draw time).
 */
export function getSlurQuality(gms: any, svg: SVGSVGElement, rules: EngravingRules): SlurQualityReport[] {
    const noteheads: NoteheadInfo[] = queryNoteheads(svg);
    const ranges: StaveRange[] = staveRanges(svg);
    const hasIds: boolean = noteheads.some(nh => nh.xmlId !== null);
    const stafflineBands: StaveRange[] = svgStafflineBands(svg);
    const reports: SlurQualityReport[] = [];
    for (const { slur, staffLine } of collectSlurs(gms)) {
        const r: SlurQualityReport | null = measureSlur(slur, staffLine, noteheads, ranges, hasIds, stafflineBands, rules);
        if (r) { reports.push(r); }
    }
    return reports;
}

// ── Shared score load + render (single source, used by debug + regression) ──
import { IXmlElement } from "../../src/Common/FileIO/Xml";
import { MusicSheet } from "../../src/MusicalScore/MusicSheet";
import { MusicSheetReader } from "../../src/MusicalScore/ScoreIO/MusicSheetReader";
import { VexFlowMusicSheetCalculator } from "../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetCalculator";
import { TestUtils } from "./TestUtils";
import { VexFlowMeasure } from "../../src/MusicalScore/Graphical/VexFlow/VexFlowMeasure";
import { GraphicalMusicSheet } from "../../src/MusicalScore/Graphical/GraphicalMusicSheet";
import { VexFlowMusicSheetDrawer } from "../../src/MusicalScore/Graphical/VexFlow/VexFlowMusicSheetDrawer";
import { SvgVexFlowBackend } from "../../src/MusicalScore/Graphical/VexFlow/SvgVexFlowBackend";
import { DrawingParameters } from "../../src/MusicalScore/Graphical/DrawingParameters";
import { EngravingRules } from "../../src/MusicalScore/Graphical/EngravingRules";
import JSZip from "jszip";

export interface LoadedScore { calc: VexFlowMusicSheetCalculator, gms: GraphicalMusicSheet, reader: MusicSheetReader }

/** Load a MusicXML/MXL score and run the layout (VexFlow calculator). */
/** `pageWidth` (OSMD units) narrows the page so MusicSystemBuilder wraps, which is
 *  what a sub-1 zoom does in the app (sheet.pageWidth = containerWidth / zoom / 10).
 *  Omit it to keep the default page width. */
export async function loadScore(
    path: string, engravingRules?: Partial<EngravingRules>, pageWidth?: number,
    beforeCalculate?: (sheet: MusicSheet) => void,
): Promise<LoadedScore> {
    let xmlString: string;
    if (path.endsWith(".mxl")) {
        const raw: string = TestUtils.getMXL(path);
        const zip: JSZip = await JSZip.loadAsync(raw, { base64: false, checkCRC32: false });
        const containerXml: string = await zip.file("META-INF/container.xml").async("text");
        const containerDoc: Document = new DOMParser().parseFromString(containerXml, "text/xml");
        const rootfileEl: Element = containerDoc.querySelector("rootfile");
        const musicXmlPath: string = rootfileEl?.getAttribute("full-path") ?? "";
        if (!musicXmlPath) { throw new Error("No rootfile in container.xml"); }
        xmlString = await zip.file(musicXmlPath).async("text");
    } else {
        xmlString = new XMLSerializer().serializeToString(TestUtils.getScore(path));
    }
    const score: Document = new DOMParser().parseFromString(xmlString, "text/xml");
    const partwise: Element = TestUtils.getPartWiseElement(score);
    const reader: MusicSheetReader = new MusicSheetReader();
    const calc: VexFlowMusicSheetCalculator = new VexFlowMusicSheetCalculator(reader.rules);
    const sheet: MusicSheet = reader.createMusicSheet(new IXmlElement(partwise), path);
    const gms: GraphicalMusicSheet = new GraphicalMusicSheet(sheet, calc);
    if (engravingRules) { Object.assign(calc.rules, engravingRules); }
    if (pageWidth !== undefined) {
        sheet.pageWidth = pageWidth;
    } else if (calc.rules.RenderSingleHorizontalStaffline) {
        // Single-line layout = one unbroken horizontal staffline: widen the line-break
        // threshold beyond any score's content so MusicSystemBuilder never wraps. OSMD's
        // render() does this by setting pageWidth to SheetMaximumWidth (zoom 1.0).
        sheet.pageWidth = calc.rules.SheetMaximumWidth / 10.0;
    }
    // Lets a caller mark system breaks (SourceMeasure.printNewSystemXml) or edit
    // the sheet before it is engraved — calculate() consumes those flags.
    beforeCalculate?.(sheet);
    calc.calculate();
    return { calc, gms, reader };
}

/** Make every measure's AbsolutePosition valid (needed for px conversion). */
export function prepareMeasures(gms: GraphicalMusicSheet): void {
    for (const page of gms.MusicPages) {
        for (const sys of page.MusicSystems) {
            for (const col of sys.GraphicalMeasures) {
                for (const m of col) {
                    if ((m as VexFlowMeasure).setAbsoluteCoordinates) {
                        (m as VexFlowMeasure).setAbsoluteCoordinates(
                            m.PositionAndShape.AbsolutePosition.x * 10,
                            m.PositionAndShape.AbsolutePosition.y * 10,
                        );
                    }
                }
            }
        }
    }
}

/** Render the sheet to SVG. Must run after prepareMeasures(). */
export function renderToSvg(gms: GraphicalMusicSheet, rules: EngravingRules): SVGSVGElement {
    const container: HTMLElement = document.createElement("div");
    container.style.position = "absolute";
    container.style.left = "-9999px";
    document.body.appendChild(container);
    const dp: DrawingParameters = new DrawingParameters();
    dp.Rules = rules;
    const drawer: VexFlowMusicSheetDrawer = new VexFlowMusicSheetDrawer(dp);
    for (const page of gms.MusicPages) {
        if (page.PageNumber > rules.MaxPageToDrawNumber) { break; }
        const backend: SvgVexFlowBackend = new SvgVexFlowBackend(rules);
        backend.graphicalMusicPage = page;
        backend.initialize(container, 1.0);
        drawer.Backends.push(backend);
    }
    drawer.drawSheet(gms);
    const svg: SVGSVGElement = container.querySelector("svg")!;
    // Detach so repeated renders (sweeps) don't leak DOM nodes into <body>.
    container.remove();
    return svg;
}

/**
 * Clear VF's shared text-metrics cache. It is a module-global static keyed on
 * `${font}|${text}` but the jsdom measurement canvas's state drifts between
 * renders, so a warm cache yields different layout than a cold one. Clearing
 * before every measurement makes repeated renders deterministic.
 */
function clearVfMetricsCache(): void {
    const cache: Map<string, { width: number, height: number }> | undefined =
        (VfElement as unknown as { glyphMetricsCache?: Map<string, { width: number, height: number }> }).glyphMetricsCache;
    if (cache?.clear) { cache.clear(); }
}

/** Convenience: load → prepare → render → measure in one call. */
export async function slurQualityForPath(
    path: string, rules: EngravingRules,
): Promise<{ reports: SlurQualityReport[], svg: SVGSVGElement }> {
    clearVfMetricsCache();
    const { gms } = await loadScore(path);
    prepareMeasures(gms);
    const svg: SVGSVGElement = renderToSvg(gms, rules);
    return { reports: getSlurQuality(gms, svg, rules), svg };
}

/** Aggregate a report set into the effect-matrix dimensions. */
export function aggregateSlurQuality(reports: SlurQualityReport[]): SlurQualityAggregate {
    const valid: SlurQualityReport[] = reports.filter(r => Number.isFinite(r.clearancePx));
    const mean = (xs: number[]): number => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
    const finiteClearances: number[] = reports
        .filter(r => Number.isFinite(r.clearancePx)).map(r => r.clearancePx);
    const bows: number[] = valid.map(r => r.bowRatio);
    return {
        slurCount: reports.length,
        uncomputed: 0,
        collisions: reports.filter(r => r.collision).length,
        collisionsAll: reports.filter(r => r.collisionAll).length,
        balloons: reports.filter(r => r.balloon).length,
        leaks: reports.filter(r => r.leakPx > 0).length,
        leakOverlaps: reports.filter(r => r.leakOverlap).length,
        untrusted: reports.filter(r => !r.trusted).length,
        meanClearancePx: valid.length ? mean(finiteClearances) : 0,
        minClearancePx: finiteClearances.length ? Math.min(...finiteClearances) : 0,
        meanBowRatio: bows.length ? mean(bows) : 0,
        maxBowRatio: bows.length ? Math.max(...bows) : 0,
        meanBowPx: valid.length ? mean(valid.map(r => r.bowPx)) : 0,
    };
}

// ── Debug SVG artifacts ──────────────────────────────────────────────────────

/** Inline the test fonts so the artifact renders standalone. */
export function debugSvgFontCss(): string {
    let css: string = "";
    const fontData: Record<string, string> = (globalThis as any).__fontData__ ?? {};
    for (const [family, b64] of Object.entries(fontData)) {
        css += `@font-face{font-family:'${family}';src:url(data:font/woff2;base64,${b64})}`;
    }
    return css;
}

/** OSMD draws past the nominal canvas, so the served SVG clips. Recompute the
 *  viewBox from the actual path/rect coordinates. */
export function fitDebugSvgViewBox(svg: SVGSVGElement, pad: number = 50): void {
    let minX: number = Infinity, minY: number = Infinity;
    let maxX: number = -Infinity, maxY: number = -Infinity;
    for (const el of svg.querySelectorAll("path, rect")) {
        const d: string = el.getAttribute("d")
            || (el.getAttribute("x") && `M${el.getAttribute("x")} ${el.getAttribute("y")}`)
            || "";
        const nums: number[] = d.match(/[\d.]+/g)?.map(Number) ?? [];
        for (let i: number = 0; i + 1 < nums.length; i += 2) {
            const x: number = nums[i];
            const y: number = nums[i + 1];
            if (!isFinite(x) || !isFinite(y)) { continue; }
            if (x < minX) { minX = x; }
            if (y < minY) { minY = y; }
            if (x > maxX) { maxX = x; }
            if (y > maxY) { maxY = y; }
        }
    }
    if (isFinite(minX) && isFinite(minY) && maxX > minX && maxY > minY) {
        svg.setAttribute("viewBox", `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`);
    }
}

/** Write an annotated SVG to visual_regression/debug-svgs (override with
 *  DEBUG_SVG_DIR). `name` is the file stem; the env suffix is appended here so
 *  jsdom and browser runs never clobber each other. Node-only; a browser run
 *  reports the name instead of writing. */
export function writeDebugSvgHtml(svg: SVGSVGElement, name: string, caption?: string): string {
    const isNode: boolean = typeof process !== "undefined" && typeof require !== "undefined";
    const envTag: string = isNode ? "jsdom" : "browser";
    const fileName: string = `${name}_${envTag}.html`;
    const svgStr: string = new XMLSerializer().serializeToString(svg);
    const head: string = caption ? `<p style="font:13px sans-serif;margin:6px">${caption}</p>` : "";
    const html: string = `<!DOCTYPE html><html><meta charset="utf-8"><body style="margin:0">${head}${svgStr}</body></html>`;
    if (isNode) {
        // Node-only artifact write; ESM import would break the browser path.
        /* eslint-disable @typescript-eslint/no-require-imports */
        const fs2: any = require("fs");
        const path2: any = require("path");
        /* eslint-enable @typescript-eslint/no-require-imports */
        const baseDir: string = process.env.DEBUG_SVG_DIR
            || path2.resolve(__dirname, "../../visual_regression/debug-svgs");
        if (!fs2.existsSync(baseDir)) { fs2.mkdirSync(baseDir, { recursive: true }); }
        fs2.writeFileSync(path2.join(baseDir, fileName), html);
    }
    console.warn(`  ${fileName}`);
    return fileName;
}
