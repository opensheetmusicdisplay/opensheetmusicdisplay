import { PointF2D } from "../../../Common/DataObjects/PointF2D";
import { PlacementEnum } from "../../VoiceData/Expressions/AbstractExpression";
import {
  calculateCandidateSlurLayout,
  SlurCandidateLayoutOptions,
} from "./SlurCandidateLayoutEngine";
import {
  SlurCurveGeometry,
  SlurCurveCandidate,
  SlurLayoutContext,
  SlurLayoutFault,
  SlurLayoutResult,
  SlurLinkedLayoutDiagnostics,
} from "./SlurLayoutTypes";

export interface SlurLinkedLayoutInput {
  context: SlurLayoutContext;
  seed: SlurCurveGeometry;
}

export interface SlurLinkedLayoutOutput {
  results: readonly SlurLayoutResult[];
  diagnostics: SlurLinkedLayoutDiagnostics;
}

const rejectedCandidateScore: number = 1_000_000;

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

function boundaryClearance(context: SlurLayoutContext, side: "start" | "end"): number {
  const values: readonly number[] = context.direction === PlacementEnum.Above
    ? context.envelope.skyline
    : context.envelope.bottomline;
  if (values.length === 0) {
    return 1.2;
  }
  const windowLength: number = Math.max(1, Math.ceil(values.length * 0.22));
  const window: readonly number[] = side === "start"
    ? values.slice(0, windowLength)
    : values.slice(values.length - windowLength);
  const finite: number[] = window.filter(Number.isFinite);
  if (finite.length === 0) {
    return 1.2;
  }
  const envelopeEdge: number = context.direction === PlacementEnum.Above
    ? Math.min(...finite)
    : Math.max(...finite);
  const staffEdge: number = context.direction === PlacementEnum.Above
    ? context.envelope.topLineOffset
    : context.envelope.bottomLineOffset;
  const distance: number = context.direction === PlacementEnum.Above
    ? staffEdge - envelopeEdge
    : envelopeEdge - staffEdge;
  return Math.max(1.2, Math.min(6, distance + 0.45));
}

function continuationTarget(context: SlurLayoutContext, clearance: number): number {
  return context.direction === PlacementEnum.Above
    ? context.envelope.topLineOffset - clearance
    : context.envelope.bottomLineOffset + clearance;
}

/**
 * Rebuild a system-break segment as a quadratic expressed in cubic form. This
 * guarantees a single curvature sign while giving the break endpoint a true
 * horizontal tangent. Independent legacy cubics can otherwise overshoot the
 * system edge and become inflected when their endpoint heights differ.
 */
function normalizeContinuationGeometry(
  context: SlurLayoutContext,
  seed: SlurCurveGeometry,
  clearance: number,
): SlurCurveGeometry {
  const geometry: SlurCurveGeometry = cloneGeometry(seed);
  const startBoundary: boolean = context.start.systemBoundary;
  const endBoundary: boolean = context.end.systemBoundary;
  if (!startBoundary && !endBoundary) {
    return geometry;
  }
  const target: number = continuationTarget(context, clearance);
  if (startBoundary) {
    geometry.p0.y = target;
  }
  if (endBoundary) {
    geometry.p3.y = target;
  }
  const width: number = geometry.p3.x - geometry.p0.x;
  if (startBoundary && endBoundary) {
    geometry.p1 = new PointF2D(geometry.p0.x + width / 3, target);
    geometry.p2 = new PointF2D(geometry.p0.x + width * 2 / 3, target);
    return geometry;
  }
  const control: PointF2D = startBoundary
    ? new PointF2D(geometry.p0.x + width * 0.35, target)
    : new PointF2D(geometry.p0.x + width * 0.65, target);
  geometry.p1 = new PointF2D(
    geometry.p0.x + (control.x - geometry.p0.x) * 2 / 3,
    geometry.p0.y + (control.y - geometry.p0.y) * 2 / 3,
  );
  geometry.p2 = new PointF2D(
    geometry.p3.x + (control.x - geometry.p3.x) * 2 / 3,
    geometry.p3.y + (control.y - geometry.p3.y) * 2 / 3,
  );
  return geometry;
}

function continuationTangentMismatch(
  context: SlurLayoutContext,
  geometry: SlurCurveGeometry,
): number {
  let mismatch: number = 0;
  if (context.start.systemBoundary) {
    mismatch += Math.abs(geometry.p1.y - geometry.p0.y);
  }
  if (context.end.systemBoundary) {
    mismatch += Math.abs(geometry.p3.y - geometry.p2.y);
  }
  return mismatch;
}

/**
 * Scores all segments of one source slur as a linked route. With a shared
 * staff-relative continuation height and horizontal break tangents, the joint
 * score is separable: choosing each segment's best survivor also minimizes the
 * sum while the continuity term remains zero.
 */
export function calculateLinkedSlurLayouts(
  inputs: readonly SlurLinkedLayoutInput[],
  options: SlurCandidateLayoutOptions,
): SlurLinkedLayoutOutput {
  const ordered: SlurLinkedLayoutInput[] = [...inputs].sort(
    (left, right): number => left.context.segmentIndex - right.context.segmentIndex,
  );
  const groupId: string = ordered[0]?.context.linkedGroupId ?? ordered[0]?.context.id ?? "slur";
  const faults: SlurLayoutFault[] = [];
  const directions: Set<PlacementEnum> = new Set(ordered.map((input) => input.context.direction));
  if (directions.size > 1) {
    faults.push({
      code: "incompatible-linked-placement",
      message: "Linked slur segments must share one placement.",
      segmentIndexes: ordered.map((input) => input.context.segmentIndex),
    });
  }
  if (ordered.some((input, index) => input.context.segmentIndex !== index)) {
    faults.push({
      code: "invalid-linked-segment-order",
      message: "Linked slur segment indexes must be consecutive.",
      segmentIndexes: ordered.map((input) => input.context.segmentIndex),
    });
  }
  const boundaryClearances: number[] = ordered.flatMap((input): number[] => {
    const clearances: number[] = [];
    if (input.context.start.systemBoundary) {
      clearances.push(boundaryClearance(input.context, "start"));
    }
    if (input.context.end.systemBoundary) {
      clearances.push(boundaryClearance(input.context, "end"));
    }
    return clearances;
  });
  const continuationClearance: number = boundaryClearances.length > 0
    ? Math.max(...boundaryClearances)
    : 0;
  let routedClearance: number = continuationClearance;
  let results: SlurLayoutResult[] = [];
  const maximumAttempts: number = 24;
  for (let attempt: number = 0; attempt < maximumAttempts; attempt++) {
    results = ordered.map((input): SlurLayoutResult =>
      calculateCandidateSlurLayout(
        input.context,
        normalizeContinuationGeometry(input.context, input.seed, routedClearance),
        options,
      ),
    );
    const hasRejectedSelection: boolean = results.some((result): boolean =>
      Boolean(result.candidates.find(
        (candidate): boolean => candidate.id === result.selectedCandidateId,
      )?.rejected),
    );
    if (!hasRejectedSelection || boundaryClearances.length === 0) {
      break;
    }
    if (attempt < maximumAttempts - 1) {
      routedClearance += 0.75;
    }
  }
  const tangentMismatch: number = results.reduce(
    (sum, result, index): number =>
      sum + continuationTangentMismatch(ordered[index].context, result.geometry),
    0,
  );
  const totalScore: number = results.reduce((sum, result): number => {
    const selected: SlurCurveCandidate = result.candidates.find(
      (candidate): boolean => candidate.id === result.selectedCandidateId,
    );
    return sum + (selected?.rejected || !selected?.score
      ? rejectedCandidateScore
      : selected.score.total);
  }, tangentMismatch * options.scoreWeights.systemContinuity);
  return {
    results,
    diagnostics: {
      groupId,
      continuationClearance: routedClearance,
      segmentIndexes: ordered.map((input) => input.context.segmentIndex),
      totalScore,
      tangentMismatch,
      faults,
    },
  };
}
