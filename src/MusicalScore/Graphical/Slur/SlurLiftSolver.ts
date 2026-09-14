import { PointF2D } from "../../../Common/DataObjects/PointF2D";

/** An obstacle the slur must clear, in the same pixel frame as the endpoints. */
export interface SlurLiftObstacle {
    xPx: number;
    yPx: number;
    /** False = FOREIGN obstacle (not in the slur's voice): the curve must only
     *  avoid crossing it, never balloon over it. undefined/true = own-voice —
     *  the slur's melodic line, always cleared (default keeps callers that don't
     *  know the voice on the historical all-own path). */
    ownVoice?: boolean;
    /** Notehead body height in screen px (slur-side edge → far edge), used to
     *  decide whether a foreign obstacle is actually crossed. 0 for point
     *  obstacles (stems, model-reconstructed). */
    bandPx?: number;
}

/** Tunable levers for the lift solver (sourced from GraphicalSlur statics). */
export interface SlurLiftOptions {
    /** Clearable t-window: obstacles outside [minT,maxT] are ignored (bezier is
     *  nearly flat there and cannot bow them away). Must stay 0.25/0.75. */
    minT: number;
    maxT: number;
    /** S5 bow slope amplitude — horizontal reach of the natural (no-obstacle) bow. */
    k: number;
    /** S6 bow slope damping — vertical influence of the natural bow. */
    d: number;
    /** Baseline endpoint tangent angle (deg) feeding the natural bow. */
    tangentAngleDeg: number;
    /** Extra perpendicular clearance above an obstacle before the curve is "clear". */
    marginPx: number;
    /** Anti-balloon slack: CP perpendicular height may exceed the tallest obstacle
     *  by at most (marginPx + slackPx). Keeps CP within a fixed band of the
     *  highest obstacle instead of the amplified clearance requirement. */
    slackPx: number;
    /** Absolute ceiling: CP perpendicular height ≤ maxBowRatio · chordLength. */
    maxBowRatio: number;
    /** Absolute perpendicular ceiling (px), independent of chord length: the CP
     *  height never exceeds this. The natural bow is proportional to the chord
     *  (k·tan·d), so a very long slur would otherwise balloon to a fixed-fraction
     *  depth. Yields to clearFloor/foreignClearNeed like the other caps. Omit to
     *  disable (pure-ratio behavior). */
    maxCpPx?: number;
    /** Absolute ceiling on the CP perpendicular height that yields to nothing —
     *  not to clearFloor, not to foreignClearNeed. Guards against a divergent
     *  clearance requirement from an obstacle near a chord endpoint, which would
     *  otherwise override every other cap. */
    hardMaxCpPx?: number;
    /** Placement side. Above = curve bows to smaller screen-Y (upwards). */
    above: boolean;
}

export interface SlurLiftResult {
    c1: PointF2D;
    c2: PointF2D;
    /** Max perpendicular deviation of the curve apex from the chord, in px. */
    bowPx: number;
}

const DEG_TO_RAD: number = Math.PI / 180;

/**
 * Solve a symmetric cubic bezier that clears every in-window obstacle by a
 * margin, stays as flat/rounded as the natural bow allows, and never balloons.
 *
 * Works in a chord-horizontal frame: the chord is rotated onto the x-axis, the
 * two control points share a single perpendicular height `hCp` (symmetric), and
 * the result is rotated back into the input pixel frame.
 *
 * Clearance formula (exact for a symmetric cubic): a curve with both control
 * points at perpendicular height `hCp` reaches height `B(t) = 3·t·(1−t)·hCp`
 * at chord fraction t. To clear an obstacle at (t, h) by margin m:
 *   hCp_needed = (h + m) / (3·t·(1−t))
 * The 3·t·(1−t) denominator is ≥ 0.5625 inside [0.25,0.75] (≤1.78× inflation),
 * so a pixel-frame obstacle height produces a sane hCp — the historical
 * ballooning came from model-frame obstacle heights, not this term.
 */
export function solveSlurLift(
    start: PointF2D,
    end: PointF2D,
    obstacles: SlurLiftObstacle[],
    opts: SlurLiftOptions,
): SlurLiftResult {
    const chordDx: number = end.x - start.x;
    const chordDy: number = end.y - start.y;
    const chordLen: number = Math.sqrt(chordDx * chordDx + chordDy * chordDy);
    const chordLenSafe: number = Math.max(0.01, chordLen);

    // Chord-horizontal frame: unit vector along the chord (u) and the
    // perpendicular that points to the slur side (p). Above bows to -Y (screen
    // up), so the slur-side perpendicular is the -Y-facing normal.
    const ux: number = chordDx / chordLenSafe;
    const uy: number = chordDy / chordLenSafe;
    // Perpendicular (rotate u by -90°): (uy, -ux) points to smaller Y for a
    // left-to-right chord. Flip for Below so "positive h" is always slur-side.
    const sign: number = opts.above ? 1 : -1;
    const px: number = sign * uy;
    const py: number = sign * -ux;

    // Project an obstacle to (t along chord, h perpendicular on the slur side).
    const project: (o: SlurLiftObstacle) => { t: number, h: number } = (o: SlurLiftObstacle): { t: number, h: number } => {
        const rx: number = o.xPx - start.x;
        const ry: number = o.yPx - start.y;
        const t: number = (rx * ux + ry * uy) / chordLenSafe;
        const h: number = rx * px + ry * py;
        return { t, h };
    };

    // ── Natural bow (no obstacles): the k/d baseline, matching the legacy
    //    calculateControlPoints. cp_x = k·chordLen; cp_y = cp_x·tan(angle)·d. ──
    const cpX: number = opts.k * chordLenSafe;
    const naturalHCp: number = Math.max(
        0.5, // positive floor: bow is never flat/negative
        cpX * Math.tan(opts.tangentAngleDeg * DEG_TO_RAD) * opts.d,
    );

    // ── Obstacle classes. Own-voice obstacles (the slur's melodic line) are
    //    always cleared — the arc follows their contour. FOREIGN obstacles are
    //    only avoided: the curve passes below/above them rather than bowing over
    //    them, which is what ballooned the control points. ─────────────────────
    const own: SlurLiftObstacle[] = obstacles.filter((o: SlurLiftObstacle): boolean => o.ownVoice !== false);
    const foreign: SlurLiftObstacle[] = obstacles.filter((o: SlurLiftObstacle): boolean => o.ownVoice === false);

    // ── Own-voice clearance: the mathematically-minimal CP height that clears
    //    every in-window own obstacle by margin. ────────────────────────────────
    let clearHCpOwn: number = 0;
    let maxObstacleHOwn: number = 0;
    for (const o of own) {
        const { t, h } = project(o);
        if (t < opts.minT || t > opts.maxT) { continue; }
        if (h <= 0) { continue; } // far side of the chord — not an obstacle
        if (h > maxObstacleHOwn) { maxObstacleHOwn = h; }
        const needed: number = (h + opts.marginPx) / (3 * t * (1 - t));
        if (needed > clearHCpOwn) { clearHCpOwn = needed; }
    }

    let hCp: number = Math.max(naturalHCp, clearHCpOwn);

    // ── Foreign obstacles: only avoid crossing. A foreign obstacle forces a lift
    //    only when the current curve actually enters its notehead band; when the
    //    curve already passes below/above the body, it is fine untouched. Lifting
    //    for one obstacle can raise the curve into another's band, so iterate to a
    //    fixpoint — each foreign obstacle activates at most once and hCp is
    //    monotone ↑ and bounded, so this terminates. bandPx 0 (point obstacles)
    //    means any `B < h` grazes the point and forces a lift. ──────────────────
    const bandScale: number = Math.abs(ux);
    const foreignRounds: number = foreign.length + 2;
    let foreignClearNeed: number = 0;
    for (let round: number = 0; round < foreignRounds; round++) {
        let changed: boolean = false;
        for (const o of foreign) {
            const { t, h } = project(o);
            if (t < opts.minT || t > opts.maxT) { continue; }
            if (h <= 0) { continue; } // far side of the chord — not an obstacle
            const b: number = 3 * t * (1 - t) * hCp; // current curve height at t
            if (b >= h + opts.marginPx) { continue; } // already clear above
            const band: number = (o.bandPx ?? 0) * bandScale;
            if (b < h - band) { continue; } // passes below the notehead body — fine
            const needed: number = (h + opts.marginPx) / (3 * t * (1 - t)); // crossing/grazing → lift over
            if (needed > foreignClearNeed) { foreignClearNeed = needed; }
            if (needed > hCp) { hCp = needed; changed = true; }
        }
        if (!changed) { break; }
    }

    // ── Anti-balloon caps. A cap may only trim EXCESS above the OWN-voice
    //    clearance requirement — never below it, or the curve grazes an own note.
    //    Foreign-driven lifts are protected only up to foreignClearNeed — the
    //    height needed to clear a foreign notehead the curve is actually
    //    crossing/grazing (in the arc's path, already filtered by the reach
    //    gate). Beyond that a cap trims the lift, and the curve passes the note
    //    rather than ballooning toward a distant one. ─────────────────────────
    const clearFloor: number = clearHCpOwn;
    // Cap 1: CP no higher than the tallest own obstacle plus a fixed band. Stops
    // the natural bow (which grows with chord length) from ballooning over a low
    // own obstacle set, but yields to clearFloor when a near-edge obstacle needs
    // more.
    if (maxObstacleHOwn > 0) {
        const cpCap: number = Math.max(clearFloor, maxObstacleHOwn + opts.marginPx + opts.slackPx, foreignClearNeed);
        if (hCp > cpCap) { hCp = cpCap; }
    }
    // Cap 2: absolute ceiling relative to chord length; also yields to clearFloor.
    const ratioCeiling: number = Math.max(clearFloor, opts.maxBowRatio * chordLenSafe, foreignClearNeed);
    if (hCp > ratioCeiling) { hCp = ratioCeiling; }
    // Cap 3: absolute perpendicular ceiling independent of span. The natural bow
    // grows ∝ chord length (k·tan·d), so a page-width slur (single-line layout,
    // long same-system phrase) would balloon with no fixed bound. Cap the CP
    // depth at an absolute value, still yielding to clearance requirements so
    // notes are never clipped — this trims only cosmetic excess.
    if (opts.maxCpPx !== undefined && opts.maxCpPx > 0) {
        const absCeiling: number = Math.max(clearFloor, opts.maxCpPx, foreignClearNeed);
        if (hCp > absCeiling) { hCp = absCeiling; }
    }
    // Cap 4: hard ceiling that yields to NOTHING. Every cap above is a
    // Math.max(...) against the clearance requirements, so a single runaway
    // requirement overrides all of them. `needed = (h + margin) / (3t(1-t))`
    // diverges as t approaches either end of the chord, so an obstacle sitting
    // near an endpoint demands a practically unbounded lift — measured as a
    // 1530px tall, 161px wide curve whose control points sat ~3000 units below
    // the sheet, ballooning across the systems underneath. Clearing such an
    // obstacle is impossible anyway (the curve would have to leave the page), so
    // the lift is bounded and the slur passes the note instead.
    // It must still not clip a note the curve genuinely has to clear, so it
    // yields to the OWN-voice clearance floor — but not to foreignClearNeed,
    // which is the divergent term. A slur that needs a deep bow for its own
    // notes (John Field) keeps it; one that is merely bowing wider than
    // necessary (Dichterliebe, 61.5px with no obstacle asking for it) is
    // trimmed.
    if (opts.hardMaxCpPx !== undefined && opts.hardMaxCpPx > 0) {
        const hardCeiling: number = Math.max(clearFloor, opts.hardMaxCpPx);
        if (hCp > hardCeiling) { hCp = hardCeiling; }
    }

    // ── Symmetric control points in the chord frame, then rotate back. ─────────
    // Rounded-arc convention (matches legacy calculateControlPoints): the two
    // control points sit at along-fractions k1 < k2 of the chord, both lifted to
    // the same perpendicular height hCp. c1 MUST be the earlier point (smaller
    // fraction) and c2 the later one, or the cubic crosses itself and kinks.
    // k∈(0.5,1] gives a fuller curve; the inward reach is (1-k) from each end.
    const kIn: number = Math.min(0.49, Math.max(0, 1 - opts.k)); // reach from each end
    const buildCp: (alongFrac: number) => PointF2D = (alongFrac: number): PointF2D => {
        const along: number = alongFrac * chordLen;
        return new PointF2D(
            start.x + along * ux + hCp * px,
            start.y + along * uy + hCp * py,
        );
    };
    let c1: PointF2D = buildCp(kIn);       // near the start
    let c2: PointF2D = buildCp(1 - kIn);   // near the end

    // ── Backward-CP guard (ported from GraphicalSlur.ts:327-338). A back-rotation
    //    can push the left CP behind the start; spread it forward proportional to
    //    bow depth to avoid a purely vertical initial tangent. ───────────────────
    const spread: (cp: PointF2D, anchor: PointF2D, forwardSign: number) => PointF2D =
        (cp: PointF2D, anchor: PointF2D, forwardSign: number): PointF2D => {
        const rel: number = ((cp.x - anchor.x) * ux + (cp.y - anchor.y) * uy);
        if (forwardSign * rel >= 0) { return cp; } // already forward of anchor
        const bow: number = Math.abs(hCp);
        const span: number = chordLenSafe;
        let fwd: number = 0;
        if (bow > span * 0.5) {
            fwd = Math.min(span * 0.4, (bow - span * 0.5) * 0.5);
        }
        return new PointF2D(
            anchor.x + forwardSign * fwd * ux + hCp * px,
            anchor.y + forwardSign * fwd * uy + hCp * py,
        );
    };
    c1 = spread(c1, start, 1);
    c2 = spread(c2, end, -1);

    return { c1, c2, bowPx: 0.75 * hCp };
}
