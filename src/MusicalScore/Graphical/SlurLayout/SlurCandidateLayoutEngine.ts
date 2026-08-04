import { PointF2D } from "../../../Common/DataObjects/PointF2D";
import { PlacementEnum } from "../../VoiceData/Expressions/AbstractExpression";
import {
  SlurAnchorCandidate,
  SlurArticulationAdjustment,
  SlurArticulationContext,
  SlurBounds,
  SlurCandidateScore,
  SlurCandidateScoreWeights,
  SlurCurveCandidate,
  SlurCurveFamily,
  SlurCurveGeometry,
  SlurDiagnosticsLevel,
  SlurEndpointContext,
  SlurLayoutContext,
  SlurLayoutResult,
  SlurObstacle,
  SlurSkylineUpdate,
} from "./SlurLayoutTypes";

export interface SlurCandidateLayoutOptions {
  candidateLimit: number;
  diagnosticsLevel: SlurDiagnosticsLevel;
  maximumPreferredClearance: number;
  obstacleClearance: number;
  scoreWeights: SlurCandidateScoreWeights;
}

interface EvaluatedGeometry {
  maximumPenetration: number;
  minimumClearance: number;
  nearCollisionCount: number;
  obstacleIntersections: number;
  forbiddenObstacleIntersections: number;
  forbiddenObstacleIds: readonly string[];
  excessiveClearance: number;
  staffLineInteraction: number;
}

const curveFamilies: readonly SlurCurveFamily[] = [
  "normal",
  "shallow",
  "high",
  "flattened-long",
  "start-weighted",
  "end-weighted",
  "system-continuation",
];

const finitePoint: (point: PointF2D) => boolean = (point: PointF2D): boolean =>
  Number.isFinite(point.x) && Number.isFinite(point.y);

const clonePoint: (point: PointF2D) => PointF2D = (point: PointF2D): PointF2D =>
  new PointF2D(point.x, point.y);

const cloneGeometry: (geometry: SlurCurveGeometry) => SlurCurveGeometry = (
  geometry: SlurCurveGeometry,
): SlurCurveGeometry => ({
  p0: clonePoint(geometry.p0),
  p1: clonePoint(geometry.p1),
  p2: clonePoint(geometry.p2),
  p3: clonePoint(geometry.p3),
});

export function pointOnSlurCurve(geometry: SlurCurveGeometry, t: number): PointF2D {
  const inverse: number = 1 - t;
  const inverseSquared: number = inverse * inverse;
  const tSquared: number = t * t;
  return new PointF2D(
    inverseSquared * inverse * geometry.p0.x +
      3 * inverseSquared * t * geometry.p1.x +
      3 * inverse * tSquared * geometry.p2.x +
      tSquared * t * geometry.p3.x,
    inverseSquared * inverse * geometry.p0.y +
      3 * inverseSquared * t * geometry.p1.y +
      3 * inverse * tSquared * geometry.p2.y +
      tSquared * t * geometry.p3.y,
  );
}

function makeAnchor(
  context: SlurLayoutContext,
  side: "start" | "end",
  x: number,
  y: number,
  type: SlurAnchorCandidate["type"],
  generationIndex: number,
  displacement: number,
): SlurAnchorCandidate {
  const endpoint: SlurEndpointContext = side === "start" ? context.start : context.end;
  const expectedArticulationPosition: number = context.direction === PlacementEnum.Above ? 3 : 4;
  const insideDurationArticulations: number = endpoint.articulations.filter(
    (articulation) =>
      articulation.position === expectedArticulationPosition &&
      articulation.classification === "duration",
  ).length;
  return {
    id: `${context.id}-${side}-${type}-${generationIndex}`,
    x,
    y,
    type,
    side,
    direction: context.direction,
    penalties: {
      displacement,
      articulationRelationship:
        type === "outside-articulation" ? 0 : insideDurationArticulations * 0.24,
      stemRelationship:
        type === "stem" || type === "stem-tip" || type === "beam-side"
          ? endpoint.stemSide ? 0 : 0.45
          : endpoint.stemSide ? 0.3 : 0,
      // A tie at the same notehead does not make the finalized stem tip an
      // invalid slur attachment. The old blanket penalty made a stale
      // notehead anchor win even when the slur sat on the rendered stem side.
      // Retain a small warning only when changing between notehead variants,
      // where the tie and slur can genuinely compete for the same shoulder.
      tieConflict:
        endpoint.tiedEndpoint &&
        type !== endpoint.legacyAttachment &&
        ["notehead", "notehead-center", "notehead-shoulder", "outer-head"].includes(type)
          ? 0.5
          : 0,
    },
    generationIndex,
  };
}

export function generateSlurAnchors(
  context: SlurLayoutContext,
  seed: SlurCurveGeometry,
  endpointGap: number,
): { start: SlurAnchorCandidate[], end: SlurAnchorCandidate[] } {
  const result: { start: SlurAnchorCandidate[], end: SlurAnchorCandidate[] } = {
    start: [],
    end: [],
  };
  for (const side of ["start", "end"] as const) {
    const endpoint: SlurEndpointContext = side === "start" ? context.start : context.end;
    const seedPoint: PointF2D = side === "start" ? seed.p0 : seed.p3;
    let generationIndex: number = 0;
    const direction: number = context.direction === PlacementEnum.Above ? -1 : 1;
    const noteheadCenterX: number | undefined = endpoint.notehead
      ? (endpoint.notehead.left + endpoint.notehead.right) / 2
      : undefined;
    const noteheadSideY: number | undefined = endpoint.notehead
      ? (direction < 0 ? endpoint.notehead.top : endpoint.notehead.bottom) + direction * endpointGap
      : undefined;
    const stemTipX: number | undefined = endpoint.stem
      ? (endpoint.stem.left + endpoint.stem.right) / 2 + (side === "start" ? 0.08 : -0.08)
      : undefined;
    const stemTipY: number | undefined = endpoint.stem
      ? (direction < 0 ? endpoint.stem.top : endpoint.stem.bottom) + direction * endpointGap
      : undefined;
    let legacyDisplacement: number = endpoint.legacyAttachment === "voice-entry" ? 0.12 : 0.04;
    if (endpoint.legacyAttachment === "stem" && stemTipX !== undefined && stemTipY !== undefined) {
      legacyDisplacement += Math.hypot(seedPoint.x - stemTipX, seedPoint.y - stemTipY) * 0.42;
    }
    const legacyStemHasFinalGeometry: boolean =
      endpoint.legacyAttachment === "stem" && Boolean(endpoint.stem);
    const legacyContainerHasFinalGeometry: boolean =
      endpoint.legacyAttachment === "voice-entry" && Boolean(endpoint.notehead || endpoint.stem);
    const unreliableLegacyStem: boolean =
      endpoint.legacyAttachment === "stem" && !endpoint.stem && Boolean(endpoint.notehead);
    if (
      !legacyStemHasFinalGeometry &&
      !legacyContainerHasFinalGeometry &&
      !unreliableLegacyStem
    ) {
      result[side].push(
        makeAnchor(
          context,
          side,
          seedPoint.x,
          seedPoint.y,
          endpoint.legacyAttachment,
          generationIndex++,
          legacyDisplacement,
        ),
      );
    }
    if (endpoint.systemBoundary) {
      result[side].push(
        makeAnchor(context, side, seedPoint.x, seedPoint.y, "system-edge", generationIndex++, 0),
      );
      continue;
    }
    if (endpoint.notehead) {
      const centerDisplacement: number = Math.hypot(
        noteheadCenterX - seedPoint.x,
        noteheadSideY - seedPoint.y,
      );
      result[side].push(
        makeAnchor(
          context,
          side,
          noteheadCenterX,
          noteheadSideY,
          "notehead-center",
          generationIndex++,
          // The crown is a useful Dorico-style option, not a universal rule.
          // Leave an ordinary, exact legacy shoulder slightly cheaper unless
          // the crown produces materially better curve geometry.
          centerDisplacement * 0.1,
        ),
      );
      const x: number =
        side === "start" ? endpoint.notehead.right + 0.08 : endpoint.notehead.left - 0.08;
      const sameSideBounds: SlurBounds[] = [endpoint.notehead, ...endpoint.accidentals];
      const y: number =
        (direction < 0
          ? Math.min(...sameSideBounds.map((bounds): number => bounds.top))
          : Math.max(...sameSideBounds.map((bounds): number => bounds.bottom))) +
        direction * endpointGap;
      const displacement: number = Math.hypot(x - seedPoint.x, y - seedPoint.y);
      result[side].push(
        makeAnchor(
          context,
          side,
          x,
          y,
          "notehead-shoulder",
          generationIndex++,
          displacement * 0.45,
        ),
      );
      // Chord endpoint geometry has already selected the placement-side outer
      // head. An additional inset anchor would pull opposing double slurs back
      // into the chord, so reserve it for single-note endpoints.
      if (endpoint.chordSize <= 1) {
        const noteheadWidth: number = endpoint.notehead.right - endpoint.notehead.left;
        const inset: number = Math.min(0.45, noteheadWidth * 0.42);
        const outerHeadX: number =
          side === "start" ? endpoint.notehead.right - inset : endpoint.notehead.left + inset;
        const outerHeadDisplacement: number = Math.hypot(
          outerHeadX - seedPoint.x,
          y - seedPoint.y,
        );
        result[side].push(
          makeAnchor(
            context,
            side,
            outerHeadX,
            y,
            "outer-head",
            generationIndex++,
            outerHeadDisplacement * 0.35,
          ),
        );
      }
    }
    if (endpoint.beams.length > 0) {
      const x: number = endpoint.stem
        ? (endpoint.stem.left + endpoint.stem.right) / 2 + (side === "start" ? 0.08 : -0.08)
        : seedPoint.x;
      const beamEdge: number =
        direction < 0
          ? Math.min(...endpoint.beams.map((beam) => beam.top))
          : Math.max(...endpoint.beams.map((beam) => beam.bottom));
      const y: number = beamEdge + direction * endpointGap;
      const displacement: number = Math.hypot(x - seedPoint.x, y - seedPoint.y);
      result[side].push(
        makeAnchor(context, side, x, y, "beam-side", generationIndex++, displacement * 0.12),
      );
    }
    if (endpoint.stem && (endpoint.chordSize <= 1 || endpoint.stemSide)) {
      const displacement: number = Math.hypot(
        stemTipX - seedPoint.x,
        stemTipY - seedPoint.y,
      );
      const compactChordEndpoint: boolean =
        endpoint.chordSize > 1 && Math.abs(seed.p3.x - seed.p0.x) < 10;
      result[side].push(
        makeAnchor(
          context,
          side,
          stemTipX,
          stemTipY,
          "stem-tip",
          generationIndex++,
          displacement * (endpoint.stemSide
            ? compactChordEndpoint ? 1 : 0.04
            : 0.16) +
            // Keep this geometrically valid fallback available if every head
            // route collides, but do not let a short chord-to-chord slur leap
            // to remote stem tips merely to gain cheap clearance. The fixed
            // semantic cost is needed when the legacy seed is already at the
            // stem tip, making its geometric displacement misleadingly zero.
            (compactChordEndpoint ? 0.85 : 0) +
            (endpoint.stemSide ? 0 : 0.15),
        ),
      );
    }
    const sameSideArticulations: SlurArticulationContext[] = endpoint.articulations.filter(
      (articulation) =>
        articulation.classification === "duration" &&
        (context.direction === PlacementEnum.Above
          ? articulation.position === 3
          : articulation.position === 4),
    );
    if (sameSideArticulations.length > 0) {
      const extreme: number =
        direction < 0
          ? Math.min(...sameSideArticulations.map((articulation) => articulation.bounds.top))
          : Math.max(...sameSideArticulations.map((articulation) => articulation.bounds.bottom));
      const y: number = extreme + direction * endpointGap;
      const x: number = endpoint.stemSide && stemTipX !== undefined
        ? stemTipX
        : noteheadCenterX ?? seedPoint.x;
      const displacement: number = Math.hypot(x - seedPoint.x, y - seedPoint.y);
      result[side].push(
        makeAnchor(
          context,
          side,
          x,
          y,
          "outside-articulation",
          generationIndex++,
          displacement * 0.14,
        ),
      );
    }
  }
  return result;
}

function contourPressureRatio(
  context: SlurLayoutContext,
  start: {x: number, y: number},
  end: {x: number, y: number},
): number {
  const width: number = end.x - start.x;
  if (width <= 0.001) {
    return 0.5;
  }
  const samples: {ratio: number, pressure: number}[] = [];
  for (let sample: number = 0; sample <= 32; sample++) {
    const ratio: number = 0.12 + (sample / 32) * 0.76;
    const x: number = start.x + width * ratio;
    const envelopeIndex: number = Math.max(
      0,
      Math.min(
        context.envelope.skyline.length - 1,
        Math.round(x * context.envelope.samplingUnit),
      ),
    );
    const envelopeValue: number = context.direction === PlacementEnum.Above
      ? context.envelope.skyline[envelopeIndex]
      : context.envelope.bottomline[envelopeIndex];
    if (!Number.isFinite(envelopeValue)) {
      continue;
    }
    const baseline: number = lineY(start, end, x);
    const pressure: number = context.direction === PlacementEnum.Above
      ? baseline - envelopeValue
      : envelopeValue - baseline;
    samples.push({ratio, pressure});
  }
  if (samples.length === 0) {
    return 0.5;
  }
  const floor: number = Math.min(...samples.map((sample): number => sample.pressure));
  let totalWeight: number = 0;
  let weightedRatio: number = 0;
  for (const sample of samples) {
    // Subtract the uniform staff contour so an otherwise clear phrase remains
    // symmetrical. The small residual weight averages several nearby peaks
    // instead of snapping the crown to one skyline sample.
    const weight: number = Math.max(0, sample.pressure - floor);
    totalWeight += weight;
    weightedRatio += sample.ratio * weight;
  }
  if (totalWeight <= 0.001) {
    return 0.5;
  }
  const pressureRatio: number = weightedRatio / totalWeight;
  return Math.max(0.3, Math.min(0.7, 0.5 + (pressureRatio - 0.5) * 0.65));
}

function curveApexRatio(context: SlurLayoutContext, geometry: SlurCurveGeometry): number {
  let apexRatio: number = 0.5;
  let apexY: number = context.direction === PlacementEnum.Above
    ? Number.POSITIVE_INFINITY
    : Number.NEGATIVE_INFINITY;
  for (let sample: number = 0; sample <= 64; sample++) {
    const ratio: number = sample / 64;
    const point: PointF2D = pointOnSlurCurve(geometry, ratio);
    const isNewApex: boolean = context.direction === PlacementEnum.Above
      ? point.y < apexY
      : point.y > apexY;
    if (isNewApex) {
      apexY = point.y;
      apexRatio = (point.x - geometry.p0.x) /
        Math.max(0.001, geometry.p3.x - geometry.p0.x);
    }
  }
  return apexRatio;
}

function lineY(start: { x: number, y: number }, end: { x: number, y: number }, x: number): number {
  const width: number = end.x - start.x;
  if (Math.abs(width) < 0.0001) {
    return (start.y + end.y) / 2;
  }
  return start.y + (end.y - start.y) * ((x - start.x) / width);
}

function requiredObstacleBow(
  context: SlurLayoutContext,
  start: SlurAnchorCandidate,
  end: SlurAnchorCandidate,
): number {
  let required: number = 0;
  const middleX: number = (start.x + end.x) / 2;
  const middleBaseline: number = lineY(start, end, middleX);
  const staffEdgeClearance: number = 0.12;
  const staffEdgeBow: number = context.direction === PlacementEnum.Above
    ? middleBaseline - (context.envelope.topLineOffset - staffEdgeClearance)
    : context.envelope.bottomLineOffset + staffEdgeClearance - middleBaseline;
  // At t=0.5, equal cubic controls contribute 0.75 of their bow. This gives
  // the high family a genuine route outside the staff while retaining its
  // notehead attachments, instead of making remote stem tips the only way to
  // avoid a staff-line penalty.
  required = Math.max(required, staffEdgeBow / 0.75);
  for (const obstacle of context.obstacles) {
    if ((obstacle.endpoint && obstacle.type !== "accidental") || !isForbiddenObstacle(obstacle)) {
      continue;
    }
    const left: number = Math.max(start.x, obstacle.bounds.left);
    const right: number = Math.min(end.x, obstacle.bounds.right);
    if (right <= left) {
      continue;
    }
    const x: number = (left + right) / 2;
    const baseline: number = lineY(start, end, x);
    const neededAtX: number = context.direction === PlacementEnum.Above
      ? baseline - (obstacle.bounds.top - obstacle.clearance)
      : obstacle.bounds.bottom + obstacle.clearance - baseline;
    const t: number = (x - start.x) / Math.max(0.001, end.x - start.x);
    const cubicControlInfluence: number = Math.max(0.04, 3 * t * (1 - t));
    required = Math.max(required, neededAtX / cubicControlInfluence);
  }
  return Math.max(0, required);
}

function familyGeometry(
  seed: SlurCurveGeometry,
  start: SlurAnchorCandidate,
  end: SlurAnchorCandidate,
  family: SlurCurveFamily,
  context: SlurLayoutContext,
): SlurCurveGeometry {
  if (
    family === "normal" &&
    start.type === context.start.legacyAttachment &&
    end.type === context.end.legacyAttachment &&
    Math.abs(start.x - seed.p0.x) < 0.0001 &&
    Math.abs(start.y - seed.p0.y) < 0.0001 &&
    Math.abs(end.x - seed.p3.x) < 0.0001 &&
    Math.abs(end.y - seed.p3.y) < 0.0001 &&
    !context.isCrossStaff
  ) {
    return cloneGeometry(seed);
  }
  const width: number = end.x - start.x;
  if (family === "system-continuation") {
    const p0: PointF2D = new PointF2D(start.x, start.y);
    const p3: PointF2D = new PointF2D(end.x, end.y);
    if (context.start.systemBoundary && context.end.systemBoundary) {
      return {
        p0,
        p1: new PointF2D(start.x + width / 3, start.y),
        p2: new PointF2D(start.x + width * 2 / 3, end.y),
        p3,
      };
    }
    const control: PointF2D = context.start.systemBoundary
      ? new PointF2D(start.x + width * 0.35, start.y)
      : new PointF2D(start.x + width * 0.65, end.y);
    return {
      p0,
      p1: new PointF2D(
        start.x + (control.x - start.x) * 2 / 3,
        start.y + (control.y - start.y) * 2 / 3,
      ),
      p2: new PointF2D(
        end.x + (control.x - end.x) * 2 / 3,
        end.y + (control.y - end.y) * 2 / 3,
      ),
      p3,
    };
  }
  const pressureRatio: number = contourPressureRatio(context, start, end);
  let firstRatio: number = Math.max(0.18, Math.min(0.42, pressureRatio - 0.24));
  let secondRatio: number = Math.max(0.58, Math.min(0.82, pressureRatio + 0.24));
  let heightFactor: number = 1;
  switch (family) {
    case "shallow":
      // Short and cross-staff slurs need a readable arch. Flattening these
      // small gestures makes their endpoints look disconnected even when the
      // curve is technically collision-free.
      heightFactor = Math.abs(width) < 10 || context.isCrossStaff ? 1 : 0.78;
      break;
    case "high":
      heightFactor = 1;
      break;
    case "flattened-long":
      heightFactor = width > 14 ? 0.72 : 0.92;
      break;
    case "start-weighted":
      firstRatio = 0.04;
      secondRatio = 0.66;
      heightFactor = 1.22;
      break;
    case "end-weighted":
      firstRatio = 0.34;
      secondRatio = 0.96;
      heightFactor = 1.22;
      break;
    default:
      break;
  }
  const p1x: number = start.x + width * firstRatio;
  const p2x: number = start.x + width * secondRatio;
  const seedP1Line: number = lineY(seed.p0, seed.p3, seed.p1.x);
  const seedP2Line: number = lineY(seed.p0, seed.p3, seed.p2.x);
  const direction: number = context.direction === PlacementEnum.Above ? -1 : 1;
  let minimumBow: number = Math.min(3.2, Math.max(0.65, Math.abs(width) * 0.055));
  if (context.isCrossStaff) {
    // A steep cross-staff route needs enough independent bow to read as a
    // slur rather than a loose diagonal joining two different staves.
    minimumBow = Math.max(
      minimumBow,
      Math.min(2, 0.9 + Math.abs(end.y - start.y) * 0.12),
    );
  }
  if (family === "high") {
    // The ordinary skyline seed can remain inside a dense beam, tuplet, grace
    // cluster, or an already-selected inner slur. Reserve the high family as a
    // deterministic obstacle-routed alternative rather than merely scaling the
    // same insufficient bow by a fixed percentage.
    minimumBow = Math.max(
      minimumBow,
      requiredObstacleBow(context, start, end) * 1.08,
    );
  }
  let commonBow: number =
    Math.max(
      minimumBow,
      Math.abs(seed.p1.y - seedP1Line),
      Math.abs(seed.p2.y - seedP2Line),
    ) * direction;
  if (context.isCrossStaff) {
    // `commonBow` is applied on the screen's y axis. For a steep cross-staff
    // phrase that represents only a fraction of the visible, perpendicular
    // curvature and makes the result read as a nearly straight diagonal.
    // Preserve a stable x progression while converting the intended bow to
    // its vertical projection. The cap prevents almost-vertical gestures from
    // producing an unreasonably high arch.
    const perpendicularProjection: number = Math.min(
      1.75,
      Math.hypot(width, end.y - start.y) / Math.max(0.001, Math.abs(width)),
    );
    commonBow *= perpendicularProjection;
  }
  const p1: PointF2D = new PointF2D(p1x, lineY(start, end, p1x) + commonBow * heightFactor);
  const p2: PointF2D = new PointF2D(p2x, lineY(start, end, p2x) + commonBow * heightFactor);
  if (context.start.systemBoundary) {
    p1.y = start.y;
  }
  if (context.end.systemBoundary) {
    p2.y = end.y;
  }
  return {
    p0: new PointF2D(start.x, start.y),
    p1,
    p2,
    p3: new PointF2D(end.x, end.y),
  };
}

function boundsContain(
  bounds: SlurObstacle["bounds"],
  point: PointF2D,
  clearance: number,
): boolean {
  return (
    point.x >= bounds.left - clearance &&
    point.x <= bounds.right + clearance &&
    point.y >= bounds.top - clearance &&
    point.y <= bounds.bottom + clearance
  );
}

function sampleCount(geometry: SlurCurveGeometry): number {
  return Math.max(24, Math.min(256, Math.ceil(Math.abs(geometry.p3.x - geometry.p0.x) / 0.2)));
}

function isForbiddenObstacle(obstacle: SlurObstacle): boolean {
  switch (obstacle.type) {
    case "notehead":
    case "beam":
    case "accidental":
    case "tie":
    case "tuplet":
    case "grace-note":
    case "slur":
      return true;
    case "stem":
      return obstacle.endpoint !== undefined;
    default:
      return false;
  }
}

function evaluateGeometry(
  context: SlurLayoutContext,
  geometry: SlurCurveGeometry,
  options: SlurCandidateLayoutOptions,
): EvaluatedGeometry {
  const count: number = sampleCount(geometry);
  let maximumPenetration: number = 0;
  let minimumClearance: number = Number.POSITIVE_INFINITY;
  let excessiveClearance: number = 0;
  let nearCollisionCount: number = 0;
  let obstacleIntersections: number = 0;
  let forbiddenObstacleIntersections: number = 0;
  const forbiddenObstacleIds: Set<string> = new Set<string>();
  let staffLineInteraction: number = 0;
  const endpointEnvelopeFraction: number = Math.abs(geometry.p3.x - geometry.p0.x) < 10 ? 0.28 : 0.16;
  for (let index: number = 1; index < count; index++) {
    const t: number = index / count;
    const point: PointF2D = pointOnSlurCurve(geometry, t);
    const envelopeIndex: number = Math.max(
      0,
      Math.min(
        context.envelope.skyline.length - 1,
        Math.round(point.x * context.envelope.samplingUnit),
      ),
    );
    const envelopeValue: number =
      context.direction === PlacementEnum.Above
        ? context.envelope.skyline[envelopeIndex]
        : context.envelope.bottomline[envelopeIndex];
    const insideStartAttachment: boolean = context.start.notehead
      ? point.x <= context.start.notehead.right + options.obstacleClearance
      : false;
    const insideEndAttachment: boolean = context.end.notehead
      ? point.x >= context.end.notehead.left - options.obstacleClearance
      : false;
    const interiorSample: boolean =
      t > endpointEnvelopeFraction &&
      t < 1 - endpointEnvelopeFraction &&
      !insideStartAttachment &&
      !insideEndAttachment;
    if (
      Number.isFinite(envelopeValue) &&
      interiorSample
    ) {
      const clearance: number =
        context.direction === PlacementEnum.Above
          ? envelopeValue - point.y
          : point.y - envelopeValue;
      minimumClearance = Math.min(minimumClearance, clearance);
      maximumPenetration = Math.max(maximumPenetration, options.obstacleClearance - clearance);
      if (clearance < options.obstacleClearance * 1.5) {
        nearCollisionCount += 1;
      }
      excessiveClearance += Math.max(0, clearance - options.maximumPreferredClearance) / count;
    }
    if (interiorSample) {
      if (context.direction === PlacementEnum.Above) {
        staffLineInteraction += Math.max(0, point.y - context.envelope.topLineOffset + 0.1) / count;
      } else {
        staffLineInteraction +=
          Math.max(0, context.envelope.bottomLineOffset - point.y + 0.1) / count;
      }
    }
    for (const obstacle of context.obstacles) {
      const endpointClearance: number = Math.max(obstacle.clearance, 0.08);
      const belongsToAttachment: boolean = obstacle.type !== "accidental";
      if (
        belongsToAttachment &&
        obstacle.endpoint === "start" &&
        point.x <= obstacle.bounds.right + endpointClearance
      ) {
        continue;
      }
      if (
        belongsToAttachment &&
        obstacle.endpoint === "end" &&
        point.x >= obstacle.bounds.left - endpointClearance
      ) {
        continue;
      }
      if (obstacle.curve) {
        const obstacleWidth: number = obstacle.curve.p3.x - obstacle.curve.p0.x;
        if (
          Math.abs(obstacleWidth) > 0.0001 &&
          point.x >= obstacle.curve.p0.x &&
          point.x <= obstacle.curve.p3.x
        ) {
          const obstaclePoint: PointF2D = pointOnSlurCurve(
            obstacle.curve,
            (point.x - obstacle.curve.p0.x) / obstacleWidth,
          );
          if (
            Math.hypot(point.x - obstaclePoint.x, point.y - obstaclePoint.y) <
            Math.max(obstacle.clearance, 0.12)
          ) {
            obstacleIntersections += 1;
            if (isForbiddenObstacle(obstacle)) {
              forbiddenObstacleIntersections += 1;
              forbiddenObstacleIds.add(obstacle.id);
            }
          }
        }
        continue;
      }
      if (boundsContain(obstacle.bounds, point, Math.max(obstacle.clearance, 0.08))) {
        obstacleIntersections += 1;
        if (isForbiddenObstacle(obstacle)) {
          forbiddenObstacleIntersections += 1;
          forbiddenObstacleIds.add(obstacle.id);
        }
      }
    }
  }
  return {
    maximumPenetration,
    minimumClearance: Number.isFinite(minimumClearance)
      ? minimumClearance
      : options.obstacleClearance,
    nearCollisionCount,
    obstacleIntersections,
    forbiddenObstacleIntersections,
    forbiddenObstacleIds: [...forbiddenObstacleIds],
    excessiveClearance,
    staffLineInteraction,
  };
}

function scoreCandidate(
  context: SlurLayoutContext,
  candidate: SlurCurveCandidate,
  options: SlurCandidateLayoutOptions,
): SlurCandidateScore {
  const evaluation: EvaluatedGeometry = evaluateGeometry(context, candidate.geometry, options);
  const startSlope: number = Math.abs(
    (candidate.geometry.p1.y - candidate.geometry.p0.y) /
      Math.max(0.001, candidate.geometry.p1.x - candidate.geometry.p0.x),
  );
  const endSlope: number = Math.abs(
    (candidate.geometry.p3.y - candidate.geometry.p2.y) /
      Math.max(0.001, candidate.geometry.p3.x - candidate.geometry.p2.x),
  );
  const midpoint: PointF2D = pointOnSlurCurve(candidate.geometry, 0.5);
  const baselineMidpoint: number = (candidate.geometry.p0.y + candidate.geometry.p3.y) / 2;
  const expectedDirection: number = context.direction === PlacementEnum.Above ? -1 : 1;
  const wrongDirectionContour: number = Math.max(
    0,
    -(midpoint.y - baselineMidpoint) * expectedDirection,
  );
  const targetApexRatio: number = contourPressureRatio(
    context,
    candidate.geometry.p0,
    candidate.geometry.p3,
  );
  const contour: number = wrongDirectionContour +
    Math.abs(curveApexRatio(context, candidate.geometry) - targetApexRatio) * 4;
  const phraseSlope: number = Math.abs(
    (candidate.geometry.p3.y - candidate.geometry.p0.y) /
      Math.max(0.001, candidate.geometry.p3.x - candidate.geometry.p0.x),
  );
  const acuteNoteheadPenalty: (anchor: SlurAnchorCandidate) => number =
    (anchor): number => {
      if (anchor.type === "notehead-center") {
        // A shallow phrase normally leaves a chord more cleanly from its
        // shoulder. Reserve the crown preference for an acute approach, where
        // a lateral attachment otherwise looks as though it lands in space.
        return phraseSlope < 0.65 ? 0.5 : 0;
      }
      if (phraseSlope <= 0.65) {
        return 0;
      }
      if (!["notehead", "notehead-shoulder", "outer-head"].includes(anchor.type)) {
        return 0;
      }
      // A steep tangent reads more cleanly at the notehead crown than at a
      // lateral shoulder. This remains a small preference: exact stems,
      // beams, articulations, and collision clearance still dominate.
      return Math.min(0.18, (phraseSlope - 0.65) * 0.12);
    };
  const anchorDisplacement: number =
    candidate.startAnchor.penalties.displacement +
    candidate.endAnchor.penalties.displacement +
    candidate.startAnchor.penalties.stemRelationship +
    candidate.endAnchor.penalties.stemRelationship +
    acuteNoteheadPenalty(candidate.startAnchor) +
    acuteNoteheadPenalty(candidate.endAnchor);
  const articulation: number =
    candidate.startAnchor.penalties.articulationRelationship +
    candidate.endAnchor.penalties.articulationRelationship;
  const tieInteraction: number =
    candidate.startAnchor.penalties.tieConflict + candidate.endAnchor.penalties.tieConflict;
  const tangent: number = Math.max(0, startSlope - 1.25) + Math.max(0, endSlope - 1.25);
  const slope: number = Math.max(0, startSlope - 2.5) + Math.max(0, endSlope - 2.5);
  const curvature: number = Math.abs(startSlope - endSlope) * 0.08;
  const systemContinuity: number =
    (context.start.systemBoundary &&
    Math.abs(candidate.geometry.p1.y - candidate.geometry.p0.y) > 0.05
      ? 1
      : 0) +
    (context.end.systemBoundary &&
    Math.abs(candidate.geometry.p3.y - candidate.geometry.p2.y) > 0.05
      ? 1
      : 0);
  const clearance: number =
    Math.max(0, options.obstacleClearance - evaluation.minimumClearance) +
    Math.max(0, evaluation.maximumPenetration) * 0.35;
  const weights: SlurCandidateScoreWeights = options.scoreWeights;
  const score: SlurCandidateScore = {
    total: 0,
    collision: evaluation.forbiddenObstacleIntersections,
    clearance,
    excessiveClearance: evaluation.excessiveClearance,
    anchorDisplacement,
    tangent,
    slope,
    curvature,
    contour,
    articulation,
    tieInteraction,
    staffLineInteraction: evaluation.staffLineInteraction,
    nesting: context.isNested ? evaluation.nearCollisionCount * 0.01 : 0,
    systemContinuity,
    nearCollisionCount: evaluation.nearCollisionCount,
  };
  score.total =
    score.collision * 10000 +
    score.clearance * weights.clearance +
    score.excessiveClearance * weights.excessiveClearance +
    score.anchorDisplacement * weights.anchorDisplacement +
    score.tangent * weights.tangent +
    score.slope * weights.slope +
    score.curvature * weights.curvature +
    score.contour * weights.contour +
    score.articulation * weights.articulation +
    score.tieInteraction * weights.tieInteraction +
    score.staffLineInteraction * weights.staffLineInteraction +
    score.nesting * weights.nesting +
    score.systemContinuity * weights.systemContinuity;
  return score;
}

function rejectionReason(
  candidate: SlurCurveCandidate,
  context: SlurLayoutContext,
): string | undefined {
  const { p0, p1, p2, p3 } = candidate.geometry;
  if (![p0, p1, p2, p3].every(finitePoint)) {
    return "non-finite";
  }
  if (p3.x <= p0.x + 0.0001) {
    return "reversed";
  }
  if (p1.x < p0.x || p2.x < p1.x || p2.x > p3.x) {
    return "looping";
  }
  let positiveCurvature: boolean = false;
  let negativeCurvature: boolean = false;
  for (const t of [0, 0.25, 0.5, 0.75, 1]) {
    const inverse: number = 1 - t;
    const dx: number =
      3 * inverse * inverse * (p1.x - p0.x) +
      6 * inverse * t * (p2.x - p1.x) +
      3 * t * t * (p3.x - p2.x);
    const dy: number =
      3 * inverse * inverse * (p1.y - p0.y) +
      6 * inverse * t * (p2.y - p1.y) +
      3 * t * t * (p3.y - p2.y);
    const ddx: number = 6 * inverse * (p2.x - 2 * p1.x + p0.x) + 6 * t * (p3.x - 2 * p2.x + p1.x);
    const ddy: number = 6 * inverse * (p2.y - 2 * p1.y + p0.y) + 6 * t * (p3.y - 2 * p2.y + p1.y);
    const cross: number = dx * ddy - dy * ddx;
    positiveCurvature = positiveCurvature || cross > 0.0001;
    negativeCurvature = negativeCurvature || cross < -0.0001;
  }
  if (positiveCurvature && negativeCurvature) {
    return "inflected";
  }
  const startSlope: number = Math.abs((p1.y - p0.y) / Math.max(0.001, p1.x - p0.x));
  const endSlope: number = Math.abs((p3.y - p2.y) / Math.max(0.001, p3.x - p2.x));
  const maximumSlope: number = context.start.systemBoundary
    || context.end.systemBoundary
    || candidate.family === "high"
    ? 12
    : 5.6713;
  if (startSlope > maximumSlope || endSlope > maximumSlope) {
    return "excessively-steep";
  }
  return undefined;
}

function semanticArticulationAdjustments(
  context: SlurLayoutContext,
  geometry: SlurCurveGeometry,
  clearance: number,
): SlurArticulationAdjustment[] {
  const adjustments: SlurArticulationAdjustment[] = [];
  for (const endpoint of [context.start, context.end]) {
    const t: number = endpoint.side === "start" ? 0.045 : 0.955;
    const curvePoint: PointF2D = pointOnSlurCurve(geometry, t);
    const expectedPosition: number = context.direction === PlacementEnum.Above ? 3 : 4;
    for (const articulation of endpoint.articulations) {
      if (
        articulation.position !== expectedPosition ||
        !["force", "stress"].includes(articulation.classification)
      ) {
        continue;
      }
      const missingClearance: number =
        context.direction === PlacementEnum.Above
          ? articulation.bounds.bottom - (curvePoint.y - clearance)
          : curvePoint.y + clearance - articulation.bounds.top;
      adjustments.push({
        articulationId: articulation.id,
        outwardShift: articulation.outwardShift + Math.max(0, missingClearance * 10),
      });
    }
  }
  return adjustments;
}

export function createSkylineUpdates(
  context: SlurLayoutContext,
  geometry: SlurCurveGeometry,
): { skylineUpdates: SlurSkylineUpdate[], bottomlineUpdates: SlurSkylineUpdate[] } {
  const skyline: Map<number, number> = new Map<number, number>();
  const bottomline: Map<number, number> = new Map<number, number>();
  const count: number = sampleCount(geometry);
  const length: number =
    context.direction === PlacementEnum.Above
      ? context.envelope.skyline.length
      : context.envelope.bottomline.length;
  for (let index: number = 0; index <= count; index++) {
    const point: PointF2D = pointOnSlurCurve(geometry, index / count);
    const left: number = Math.max(
      0,
      Math.min(length - 1, Math.floor(point.x * context.envelope.samplingUnit)),
    );
    for (const target of [left, left + 1]) {
      if (target < 0 || target >= length) {
        continue;
      }
      if (context.direction === PlacementEnum.Above) {
        skyline.set(target, Math.min(skyline.get(target) ?? Number.POSITIVE_INFINITY, point.y));
      } else {
        bottomline.set(
          target,
          Math.max(bottomline.get(target) ?? Number.NEGATIVE_INFINITY, point.y),
        );
      }
    }
  }
  return {
    skylineUpdates: [...skyline].map(([index, value]) => ({ index, value })),
    bottomlineUpdates: [...bottomline].map(([index, value]) => ({ index, value })),
  };
}

export function calculateCandidateSlurLayout(
  context: SlurLayoutContext,
  seed: SlurCurveGeometry,
  options: SlurCandidateLayoutOptions,
): SlurLayoutResult {
  const anchors: { start: SlurAnchorCandidate[], end: SlurAnchorCandidate[] } = generateSlurAnchors(
    context,
    seed,
    options.obstacleClearance,
  );
  const candidates: SlurCurveCandidate[] = [];
  let generationIndex: number = 0;
  const anchorPairs: {start: SlurAnchorCandidate, end: SlurAnchorCandidate}[] =
    anchors.start.flatMap((start): {start: SlurAnchorCandidate, end: SlurAnchorCandidate}[] =>
      anchors.end.map((end): {start: SlurAnchorCandidate, end: SlurAnchorCandidate} => ({start, end})),
    ).sort((left, right): number => {
      const penalty: (pair: {start: SlurAnchorCandidate, end: SlurAnchorCandidate}) => number =
        (pair): number =>
          pair.start.penalties.displacement + pair.end.penalties.displacement +
          pair.start.penalties.stemRelationship + pair.end.penalties.stemRelationship +
          pair.start.penalties.articulationRelationship * 2 +
          pair.end.penalties.articulationRelationship * 2 +
          pair.start.penalties.tieConflict * 2 + pair.end.penalties.tieConflict * 2;
      return penalty(left) - penalty(right)
      || Math.min(left.start.generationIndex, left.end.generationIndex)
        - Math.min(right.start.generationIndex, right.end.generationIndex)
      || left.start.generationIndex - right.start.generationIndex
      || left.end.generationIndex - right.end.generationIndex;
    });
  outer: for (const pair of anchorPairs) {
    const startAnchor: SlurAnchorCandidate = pair.start;
    const endAnchor: SlurAnchorCandidate = pair.end;
      for (const family of curveFamilies) {
        const anchorWidth: number = Math.abs(endAnchor.x - startAnchor.x);
        if (
          (family === "shallow" && anchorWidth < 10) ||
          (family === "flattened-long" && anchorWidth < 14)
        ) {
          // These families are optical reductions for genuinely broad
          // phrases. On compact and cross-staff gestures they make the slur
          // read as a loose diagonal or an under-curved tie.
          continue;
        }
        if (
          family === "system-continuation" &&
          !context.start.systemBoundary &&
          !context.end.systemBoundary
        ) {
          continue;
        }
        if (generationIndex >= Math.max(1, options.candidateLimit)) {
          break outer;
        }
        const candidate: SlurCurveCandidate = {
          id: `${context.id}-${family}-${generationIndex}`,
          startAnchor,
          endAnchor,
          geometry: familyGeometry(seed, startAnchor, endAnchor, family, context),
          family,
          rejected: false,
          generationIndex,
          articulationAdjustments: [],
        };
        candidate.rejectionReason = rejectionReason(candidate, context);
        if (!candidate.rejectionReason) {
          const evaluation: EvaluatedGeometry = evaluateGeometry(context, candidate.geometry, options);
          if (evaluation.forbiddenObstacleIntersections > 0) {
            candidate.rejectionReason = "obstacle-intersection";
            candidate.rejectionObstacleIds = evaluation.forbiddenObstacleIds;
          }
        }
        candidate.rejected = Boolean(candidate.rejectionReason);
        if (!candidate.rejected) {
          candidate.score = scoreCandidate(context, candidate, options);
        }
        candidates.push(candidate);
        generationIndex += 1;
      }
  }
  const survivors: SlurCurveCandidate[] = candidates.filter((candidate) => !candidate.rejected);
  survivors.sort(
    (left, right) =>
      (left.score?.total ?? Number.POSITIVE_INFINITY) -
        (right.score?.total ?? Number.POSITIVE_INFINITY) ||
      (left.score?.nearCollisionCount ?? Number.MAX_SAFE_INTEGER) -
        (right.score?.nearCollisionCount ?? Number.MAX_SAFE_INTEGER) ||
      (left.score?.anchorDisplacement ?? Number.POSITIVE_INFINITY) -
        (right.score?.anchorDisplacement ?? Number.POSITIVE_INFINITY) ||
      Number(left.family !== "normal") - Number(right.family !== "normal") ||
      left.generationIndex - right.generationIndex,
  );
  const selected: SlurCurveCandidate = survivors[0] ?? candidates[0];
  const geometry: SlurCurveGeometry = cloneGeometry(selected?.geometry ?? seed);
  const articulationAdjustments: SlurArticulationAdjustment[] = semanticArticulationAdjustments(
    context,
    geometry,
    options.obstacleClearance,
  );
  if (selected) {
    selected.articulationAdjustments = articulationAdjustments;
  }
  const updates: { skylineUpdates: SlurSkylineUpdate[], bottomlineUpdates: SlurSkylineUpdate[] } =
    createSkylineUpdates(context, geometry);
  const retainedCandidates: readonly SlurCurveCandidate[] =
    options.diagnosticsLevel === "candidates" ? candidates : selected ? [selected] : [];
  return {
    mode: "candidate",
    geometry,
    selectedCandidateId: selected?.id ?? `${context.id}-seed`,
    family: selected?.family ?? "normal",
    candidates: retainedCandidates,
    articulationAdjustments,
    skylineUpdates: updates.skylineUpdates,
    bottomlineUpdates: updates.bottomlineUpdates,
  };
}
