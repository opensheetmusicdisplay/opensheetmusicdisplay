import { expect } from "chai";
import { PointF2D } from "../../../src/Common/DataObjects/PointF2D";
import { PlacementEnum } from "../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";
import {
  calculateCandidateSlurLayout,
  SlurCandidateLayoutOptions,
} from "../../../src/MusicalScore/Graphical/SlurLayout/SlurCandidateLayoutEngine";
import {
  SlurCurveGeometry,
  SlurCurveCandidate,
  SlurEndpointContext,
  SlurLayoutContext,
  SlurLayoutResult,
} from "../../../src/MusicalScore/Graphical/SlurLayout/SlurLayoutTypes";

const endpoint: (side: "start" | "end", x: number) => SlurEndpointContext = (
  side: "start" | "end",
  x: number,
): SlurEndpointContext => ({
  side,
  present: true,
  notehead: { left: x - 0.5, right: x + 0.5, top: 1.5, bottom: 2.5 },
  beams: [],
  articulations: [],
  legacyAnchor: new PointF2D(x, 1.2),
  legacyAttachment: "notehead",
  tiedEndpoint: false,
  chordSize: 1,
  grace: false,
  systemBoundary: false,
});

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

function context(overrides: Partial<SlurLayoutContext> = {}): SlurLayoutContext {
  return {
    id: "unit-slur",
    mode: "candidate",
    direction: PlacementEnum.Above,
    start: endpoint("start", 2),
    end: endpoint("end", 18),
    obstacles: [],
    envelope: {
      samplingUnit: 10,
      skyline: Array(201).fill(0),
      bottomline: Array(201).fill(4),
      topLineOffset: 0,
      bottomLineOffset: 4,
      width: 20,
    },
    segmentIndex: 0,
    segmentCount: 1,
    isCrossStaff: false,
    isCrossSystem: false,
    isNested: false,
    ...overrides,
  };
}

const seed: SlurCurveGeometry = {
  p0: new PointF2D(2, 1.2),
  p1: new PointF2D(6, -2.2),
  p2: new PointF2D(14, -2.2),
  p3: new PointF2D(18, 1.2),
};

describe("candidate slur layout engine", (): void => {
  it("scores a bounded deterministic candidate set", (): void => {
    const first: SlurLayoutResult = calculateCandidateSlurLayout(context(), seed, options);
    const second: SlurLayoutResult = calculateCandidateSlurLayout(context(), seed, options);

    expect(first.candidates.length).to.be.greaterThan(1).and.at.most(96);
    expect(first.selectedCandidateId).to.equal(second.selectedCandidateId);
    expect(first.geometry).to.deep.equal(second.geometry);
    expect(first.candidates.map((candidate) => candidate.score?.total)).to.deep.equal(
      second.candidates.map((candidate) => candidate.score?.total),
    );
    expect(first.skylineUpdates.length).to.be.greaterThan(0);
  });

  it("keeps weighted controls close to the endpoint they protect", (): void => {
    const result: SlurLayoutResult = calculateCandidateSlurLayout(context(), seed, options);
    const startWeighted: SlurCurveCandidate = result.candidates.find(
      (candidate) => candidate.family === "start-weighted",
    );
    const endWeighted: SlurCurveCandidate = result.candidates.find(
      (candidate) => candidate.family === "end-weighted",
    );
    const width: number = seed.p3.x - seed.p0.x;

    expect(startWeighted.geometry.p1.x).to.be.lessThan(seed.p0.x + width * 0.05);
    expect(endWeighted.geometry.p2.x).to.be.greaterThan(seed.p0.x + width * 0.95);
  });

  it("hard-rejects curves intersecting an internal notehead", (): void => {
    const result: SlurLayoutResult = calculateCandidateSlurLayout(
      context({
        obstacles: [
          {
            id: "middle-head",
            type: "notehead",
            bounds: { left: 9, right: 11, top: -1, bottom: 2 },
            clearance: 0.1,
          },
        ],
      }),
      seed,
      options,
    );

    expect(
      result.candidates.some((candidate) => candidate.rejectionReason === "obstacle-intersection"),
    ).to.equal(true);
    const selected: SlurCurveCandidate = result.candidates.find(
      (candidate) => candidate.id === result.selectedCandidateId,
    );
    expect(selected?.rejected).to.equal(false);
  });

  it("scores movable articulations as soft obstacles", (): void => {
    const result: SlurLayoutResult = calculateCandidateSlurLayout(
      context({
        obstacles: [
          {
            id: "movable-accent",
            type: "force-articulation",
            articulationClass: "force",
            bounds: { left: 9, right: 11, top: -3, bottom: 1 },
            clearance: 0.1,
          },
        ],
      }),
      seed,
      options,
    );

    expect(result.candidates.some((candidate) => !candidate.rejected)).to.equal(true);
    expect(
      result.candidates.every((candidate) => candidate.rejectionReason !== "obstacle-intersection"),
    ).to.equal(true);
  });

  it("offers beam-side anchors outside a finalized endpoint beam", (): void => {
    const beamedStart: SlurEndpointContext = {
      ...endpoint("start", 2),
      stem: { left: 1.95, right: 2.05, top: 0, bottom: 3 },
      beams: [{ left: 1.8, right: 18.2, top: -0.5, bottom: 0 }],
    };
    const beamedEnd: SlurEndpointContext = {
      ...endpoint("end", 18),
      stem: { left: 17.95, right: 18.05, top: 0, bottom: 3 },
      beams: [{ left: 1.8, right: 18.2, top: -0.5, bottom: 0 }],
    };
    const result: SlurLayoutResult = calculateCandidateSlurLayout(
      context({ start: beamedStart, end: beamedEnd }),
      seed,
      options,
    );

    expect(
      result.candidates.some(
        (candidate) =>
          candidate.startAnchor.type === "beam-side" || candidate.endAnchor.type === "beam-side",
      ),
    ).to.equal(true);
  });

  it("keeps outer-head and beam-side choices in a capped candidate set", (): void => {
    const complexEndpoint: SlurEndpointContext = {
      ...endpoint("start", 2),
      stem: { left: 1.95, right: 2.05, top: 0, bottom: 3 },
      beams: [{ left: 1.8, right: 18.2, top: -0.5, bottom: 0 }],
      articulations: [{
        id: "accent",
        glyphType: "a>",
        classification: "force",
        position: 3,
        bounds: { left: 1.5, right: 2.5, top: -1.5, bottom: -0.5 },
        outwardShift: 0,
      }],
    };
    const result: SlurLayoutResult = calculateCandidateSlurLayout(
      context({ start: complexEndpoint }),
      seed,
      {...options, candidateLimit: 48},
    );
    const anchorTypes: Set<string> = new Set(result.candidates.flatMap((candidate) => [
      candidate.startAnchor.type,
      candidate.endAnchor.type,
    ]));

    expect(anchorTypes.has("outer-head")).to.equal(true);
    expect(anchorTypes.has("beam-side")).to.equal(true);
  });

  it("records invalid reversed geometry as a hard rejection", (): void => {
    const reversed: SlurCurveGeometry = {
      p0: new PointF2D(18, 1),
      p1: new PointF2D(14, -1),
      p2: new PointF2D(6, -1),
      p3: new PointF2D(2, 1),
    };
    const result: SlurLayoutResult = calculateCandidateSlurLayout(
      context({ start: endpoint("start", 18), end: endpoint("end", 2) }),
      reversed,
      options,
    );

    expect(result.candidates.every((candidate) => candidate.rejected)).to.equal(true);
    expect(
      result.candidates.every((candidate) => candidate.rejectionReason === "reversed"),
    ).to.equal(true);
  });

  it("generates non-inflected alternatives when legacy controls overshoot a diagonal endpoint", (): void => {
    const overshootingSeed: SlurCurveGeometry = {
      p0: new PointF2D(2, 4),
      p1: new PointF2D(6, 4.3),
      p2: new PointF2D(20, 7.5),
      p3: new PointF2D(18, 1.5),
    };
    const result: SlurLayoutResult = calculateCandidateSlurLayout(
      context({
        start: { ...endpoint("start", 2), legacyAnchor: overshootingSeed.p0 },
        end: { ...endpoint("end", 18), legacyAnchor: overshootingSeed.p3 },
      }),
      overshootingSeed,
      options,
    );

    expect(result.candidates[0].rejectionReason).to.equal("looping");
    expect(result.candidates.some((candidate) => !candidate.rejected)).to.equal(true);
  });
});
