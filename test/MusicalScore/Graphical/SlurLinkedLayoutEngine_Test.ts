import { expect } from "chai";
import { PointF2D } from "../../../src/Common/DataObjects/PointF2D";
import { PlacementEnum } from "../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";
import { SlurCandidateLayoutOptions } from
  "../../../src/MusicalScore/Graphical/SlurLayout/SlurCandidateLayoutEngine";
import {
  calculateLinkedSlurLayouts,
  SlurLinkedLayoutInput,
  SlurLinkedLayoutOutput,
} from "../../../src/MusicalScore/Graphical/SlurLayout/SlurLinkedLayoutEngine";
import {
  SlurCurveCandidate,
  SlurCurveGeometry,
  SlurEndpointContext,
  SlurLayoutContext,
} from "../../../src/MusicalScore/Graphical/SlurLayout/SlurLayoutTypes";

const options: SlurCandidateLayoutOptions = {
  candidateLimit: 96,
  diagnosticsLevel: "candidates",
  maximumPreferredClearance: 2.5,
  obstacleClearance: 0.35,
  scoreWeights: {
    clearance: 40,
    excessiveClearance: 4,
    anchorDisplacement: 12,
    tangent: 10,
    slope: 8,
    curvature: 8,
    contour: 2,
    articulation: 24,
    tieInteraction: 24,
    staffLineInteraction: 12,
    nesting: 30,
    systemContinuity: 20,
  },
};

function endpoint(side: "start" | "end", x: number, boundary: boolean): SlurEndpointContext {
  return {
    side,
    present: !boundary,
    notehead: boundary ? undefined : {left: x - 0.5, right: x + 0.5, top: 1.5, bottom: 2.5},
    stemSide: false,
    beams: [],
    accidentals: [],
    articulations: [],
    seedAnchor: new PointF2D(x, boundary ? -1 : 1.2),
    seedAttachment: boundary ? "system-edge" : "notehead",
    tiedEndpoint: false,
    chordSize: boundary ? 0 : 1,
    grace: false,
    systemBoundary: boundary,
  };
}

function input(
  segmentIndex: number,
  startBoundary: boolean,
  endBoundary: boolean,
  direction: PlacementEnum = PlacementEnum.Above,
): SlurLinkedLayoutInput {
  const start: SlurEndpointContext = endpoint("start", 2, startBoundary);
  const end: SlurEndpointContext = endpoint("end", 18, endBoundary);
  const context: SlurLayoutContext = {
    id: `linked-${segmentIndex}`,
    linkedGroupId: "linked-unit",
    direction,
    start,
    end,
    obstacles: [],
    envelope: {
      samplingUnit: 10,
      skyline: Array(201).fill(-0.8 - segmentIndex * 0.2),
      bottomline: Array(201).fill(4.8 + segmentIndex * 0.2),
      topLineOffset: 0,
      bottomLineOffset: 4,
      width: 20,
    },
    segmentIndex,
    segmentCount: 2,
    isCrossStaff: false,
    isCrossSystem: true,
    isNested: false,
  };
  return {
    context,
    seed: {
      p0: new PointF2D(start.seedAnchor.x, start.seedAnchor.y),
      p1: new PointF2D(6, -2.5),
      p2: new PointF2D(14, -2.5),
      p3: new PointF2D(end.seedAnchor.x, end.seedAnchor.y),
    },
  };
}

describe("linked slur layout engine", (): void => {
  it("uses one continuation height and horizontal break tangents", (): void => {
    const output: SlurLinkedLayoutOutput = calculateLinkedSlurLayouts(
      [input(0, false, true), input(1, true, false)],
      options,
    );
    const first: SlurCurveGeometry = output.results[0].geometry;
    const second: SlurCurveGeometry = output.results[1].geometry;

    expect(output.diagnostics.continuationClearance).to.be.greaterThan(1.2);
    expect(first.p3.y).to.equal(second.p0.y);
    expect(first.p2.y).to.equal(first.p3.y);
    expect(second.p1.y).to.equal(second.p0.y);
    expect(output.diagnostics.tangentMismatch).to.equal(0);
    expect(output.results.every((result) =>
      !result.candidates.find((candidate) => candidate.id === result.selectedCandidateId)?.rejected,
    )).to.equal(true);
  });

  it("keeps a middle continuation segment finite and horizontal", (): void => {
    const middle: SlurLinkedLayoutInput = input(0, true, true);
    middle.context.segmentCount = 1;
    const output: SlurLinkedLayoutOutput = calculateLinkedSlurLayouts([middle], options);
    const geometry: SlurCurveGeometry = output.results[0].geometry;

    expect(geometry.p0.y).to.equal(geometry.p1.y);
    expect(geometry.p2.y).to.equal(geometry.p3.y);
    expect([geometry.p0, geometry.p1, geometry.p2, geometry.p3].every(
      (point): boolean => Number.isFinite(point.x) && Number.isFinite(point.y),
    )).to.equal(true);
  });

  it("reports incompatible linked placement as a structured fault", (): void => {
    const output: SlurLinkedLayoutOutput = calculateLinkedSlurLayouts(
      [input(0, false, true), input(1, true, false, PlacementEnum.Below)],
      options,
    );

    expect(output.diagnostics.faults.map((fault) => fault.code)).to.include(
      "incompatible-linked-placement",
    );
  });

  it("includes rejected selections in the linked route score", (): void => {
    const reversed: SlurLinkedLayoutInput = input(0, false, false);
    reversed.context.start.notehead = {left: 17.5, right: 18.5, top: 1.5, bottom: 2.5};
    reversed.context.end.notehead = {left: 1.5, right: 2.5, top: 1.5, bottom: 2.5};
    reversed.context.start.seedAnchor = new PointF2D(18, 1.2);
    reversed.context.end.seedAnchor = new PointF2D(2, 1.2);
    reversed.seed.p0 = new PointF2D(18, 1.2);
    reversed.seed.p3 = new PointF2D(2, 1.2);

    const output: SlurLinkedLayoutOutput = calculateLinkedSlurLayouts([reversed], options);
    const selected: SlurCurveCandidate = output.results[0].candidates.find(
      (candidate): boolean => candidate.id === output.results[0].selectedCandidateId,
    );

    expect(selected?.rejected).to.equal(true);
    expect(output.diagnostics.totalScore).to.be.at.least(1_000_000);
  });
});
