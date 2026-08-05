import { expect } from "chai";
import { PointF2D } from "../../../src/Common/DataObjects/PointF2D";
import { PlacementEnum } from "../../../src/MusicalScore/VoiceData/Expressions/AbstractExpression";
import {
  calculateCandidateSlurLayout,
  generateSlurAnchors,
  SlurCandidateLayoutOptions,
} from "../../../src/MusicalScore/Graphical/SlurLayout/SlurCandidateLayoutEngine";
import {
  SlurAnchorCandidate,
  SlurCurveGeometry,
  SlurCurveCandidate,
  SlurEndpointContext,
  SlurLayoutContext,
  SlurLayoutResult,
  SlurObstacle,
} from "../../../src/MusicalScore/Graphical/SlurLayout/SlurLayoutTypes";

const endpoint: (side: "start" | "end", x: number) => SlurEndpointContext = (
  side: "start" | "end",
  x: number,
): SlurEndpointContext => ({
  side,
  present: true,
  notehead: { left: x - 0.5, right: x + 0.5, top: 1.5, bottom: 2.5 },
  stemSide: false,
  beams: [],
  accidentals: [],
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
    expect(
      result.candidates.some((candidate) => candidate.rejectionObstacleIds?.includes("middle-head")),
    ).to.equal(true);
    const selected: SlurCurveCandidate = result.candidates.find(
      (candidate) => candidate.id === result.selectedCandidateId,
    );
    expect(selected?.rejected).to.equal(false);
  });

  it("hard-rejects a thin internal stem between regular curve samples", (): void => {
    const thinStem: SlurObstacle = {
      id: "thin-middle-stem",
      type: "stem",
      bounds: {left: 9.087, right: 9.107, top: -1.7, bottom: 0.4},
      clearance: 0.08,
    };
    const result: SlurLayoutResult = calculateCandidateSlurLayout(
      context({obstacles: [thinStem]}),
      seed,
      options,
    );

    expect(result.candidates.some(
      (candidate): boolean => candidate.rejectionObstacleIds?.includes(thinStem.id),
    )).to.equal(true);
    const selected: SlurCurveCandidate = result.candidates.find(
      (candidate): boolean => candidate.id === result.selectedCandidateId,
    );
    expect(selected?.rejected).to.equal(false);
    expect(selected?.rejectionObstacleIds ?? []).not.to.include(thinStem.id);
  });

  it("does not let an endpoint-local polyphonic head inflate the high route", (): void => {
    const localHead: SlurObstacle = {
      id: "endpoint-local-polyphonic-head",
      type: "notehead",
      bounds: {left: 1.6, right: 2.4, top: 2.8, bottom: 5.8},
      clearance: 0.1,
    };
    const belowSeed: SlurCurveGeometry = {
      p0: new PointF2D(2, 2.8),
      p1: new PointF2D(6, 6),
      p2: new PointF2D(14, 6),
      p3: new PointF2D(18, 2.8),
    };
    const result: SlurLayoutResult = calculateCandidateSlurLayout(
      context({direction: PlacementEnum.Below, obstacles: [localHead]}),
      belowSeed,
      options,
    );
    const high: SlurCurveCandidate = result.candidates.find(
      (candidate): boolean => candidate.family === "high",
    );

    expect(high.geometry.p1.y).to.be.lessThan(10);
    expect(result.candidates.some(
      (candidate): boolean => candidate.rejectionObstacleIds?.includes(localHead.id),
    )).to.equal(true);
  });

  it("raises obstacle-routed curves only as far as their clearance requires", (): void => {
    const nearlyClearedSeed: SlurCurveGeometry = {
      p0: new PointF2D(2, 1.2),
      p1: new PointF2D(6, -2.2),
      p2: new PointF2D(14, -2.2),
      p3: new PointF2D(18, 1.2),
    };
    const result: SlurLayoutResult = calculateCandidateSlurLayout(
      context({
        obstacles: [{
          id: "near-seed-head",
          type: "notehead",
          bounds: {left: 9, right: 11, top: -1.3, bottom: 0.2},
          clearance: 0.1,
        }],
      }),
      nearlyClearedSeed,
      options,
    );
    const routed: SlurCurveCandidate = result.candidates.find(
      (candidate) => candidate.family === "high" && candidate.generationIndex === 2,
    );
    const seedBow: number = nearlyClearedSeed.p0.y - nearlyClearedSeed.p1.y;
    const routedBow: number = routed.geometry.p0.y - routed.geometry.p1.y;

    expect(routed.rejected).to.equal(false);
    expect(routedBow).to.be.greaterThan(seedBow);
    expect(routedBow).to.be.lessThan(seedBow * 1.5);
  });

  it("offers a notehead crown while retaining the legacy attachment candidate", (): void => {
    const anchors: {start: SlurAnchorCandidate[], end: SlurAnchorCandidate[]} = generateSlurAnchors(
      context(),
      seed,
      options.obstacleClearance,
    );
    const crown: SlurAnchorCandidate = anchors.start.find(
      (anchor) => anchor.type === "notehead-center",
    );

    expect(crown.x).to.equal(2);
    expect(crown.y).to.equal(1.15);
    expect(anchors.start.some((anchor) => anchor.type === "notehead")).to.equal(true);
    expect(anchors.end.some((anchor) => anchor.type === "notehead")).to.equal(true);
  });

  it("does not reuse a drifted staff-entry stem anchor", (): void => {
    const driftedStart: SlurEndpointContext = {
      ...endpoint("start", 2),
      stem: {left: 1.95, right: 2.05, top: 0, bottom: 3},
      stemSide: true,
      legacyAnchor: new PointF2D(5, 1.2),
      legacyAttachment: "stem",
    };
    const driftedSeed: SlurCurveGeometry = {
      p0: new PointF2D(5, 1.2),
      p1: new PointF2D(8, -2.2),
      p2: new PointF2D(14, -2.2),
      p3: new PointF2D(18, 1.2),
    };
    const result: SlurLayoutResult = calculateCandidateSlurLayout(
      context({start: driftedStart}),
      driftedSeed,
      options,
    );
    const anchors: {start: SlurAnchorCandidate[], end: SlurAnchorCandidate[]} =
      generateSlurAnchors(context({start: driftedStart}), driftedSeed, options.obstacleClearance);
    const selected: SlurCurveCandidate = result.candidates.find(
      (candidate) => candidate.id === result.selectedCandidateId,
    );
    const finalizedStem: SlurAnchorCandidate = anchors.start.find(
      (anchor): boolean => anchor.type === "stem-tip",
    );

    expect(anchors.start.some((anchor) => anchor.type === "stem")).to.equal(false);
    expect(finalizedStem.x).to.be.closeTo(2.08, 0.001);
    expect(selected.startAnchor.type).not.to.equal("stem");
    expect(selected.geometry.p0.x).not.to.be.closeTo(driftedSeed.p0.x, 0.001);
  });

  it("does not penalize a finalized stem-tip merely because its note is tied", (): void => {
    const tiedEnd: SlurEndpointContext = {
      ...endpoint("end", 18),
      stem: {left: 17.95, right: 18.05, top: -0.5, bottom: 2.5},
      stemSide: true,
      tiedEndpoint: true,
      legacyAttachment: "notehead",
    };
    const anchors: {start: SlurAnchorCandidate[], end: SlurAnchorCandidate[]} = generateSlurAnchors(
      context({end: tiedEnd}),
      seed,
      options.obstacleClearance,
    );
    const stemTip: SlurAnchorCandidate = anchors.end.find(
      (anchor) => anchor.type === "stem-tip",
    );

    expect(stemTip).not.to.equal(undefined);
    expect(stemTip.penalties.tieConflict).to.equal(0);

    const originalShoulder: SlurAnchorCandidate = anchors.end.find(
      (anchor) => anchor.type === "notehead-shoulder",
    );
    const alternateShoulder: SlurAnchorCandidate = generateSlurAnchors(
      context({end: {...tiedEnd, legacyAttachment: "stem"}}),
      seed,
      options.obstacleClearance,
    ).end.find((anchor) => anchor.type === "notehead-shoulder");
    expect(originalShoulder.penalties.tieConflict).to.equal(0.5);
    expect(alternateShoulder.penalties.tieConflict).to.equal(0.5);
  });

  it("favours a balanced crown on a flat obstacle profile", (): void => {
    const asymmetricSeed: SlurCurveGeometry = {
      p0: new PointF2D(2, 1.2),
      p1: new PointF2D(2.8, -2.2),
      p2: new PointF2D(10, -2.2),
      p3: new PointF2D(18, 1.2),
    };
    const result: SlurLayoutResult = calculateCandidateSlurLayout(
      context(),
      asymmetricSeed,
      options,
    );
    const selected: SlurCurveCandidate = result.candidates.find(
      (candidate) => candidate.id === result.selectedCandidateId,
    );
    const crownX: number = (selected.geometry.p1.x + selected.geometry.p2.x) / 2;

    expect(crownX).to.be.closeTo(10, 0.75);
  });

  it("offers a finalized stem-tip anchor for a chord on the slur side", (): void => {
    const chordStart: SlurEndpointContext = {
      ...endpoint("start", 2),
      chordSize: 4,
      stem: {left: 1.95, right: 2.05, top: -4, bottom: 3},
      stemSide: true,
    };
    const anchors: {start: SlurAnchorCandidate[], end: SlurAnchorCandidate[]} = generateSlurAnchors(
      context({start: chordStart}),
      seed,
      options.obstacleClearance,
    );

    expect(anchors.start.some((anchor) => anchor.type === "stem-tip")).to.equal(true);
  });

  it("keeps a nested compact chord stem tip as a fallback behind the outer head", (): void => {
    const compactSeed: SlurCurveGeometry = {
      p0: new PointF2D(2, 1.2),
      p1: new PointF2D(3.5, -0.8),
      p2: new PointF2D(6.5, -0.8),
      p3: new PointF2D(8, 1.2),
    };
    const chordStart: SlurEndpointContext = {
      ...endpoint("start", 2),
      chordSize: 3,
      stem: {left: 1.95, right: 2.05, top: -4, bottom: 3},
      stemSide: true,
    };
    const anchors: {start: SlurAnchorCandidate[], end: SlurAnchorCandidate[]} = generateSlurAnchors(
      context({start: chordStart, end: endpoint("end", 8), isNested: true}),
      compactSeed,
      options.obstacleClearance,
    );
    const stemTip: SlurAnchorCandidate = anchors.start.find((anchor) => anchor.type === "stem-tip");
    const notehead: SlurAnchorCandidate = anchors.start.find((anchor) => anchor.type === "notehead");
    const penalty: (anchor: SlurAnchorCandidate) => number = (anchor) =>
      anchor.penalties.displacement + anchor.penalties.stemRelationship;

    expect(stemTip).not.to.equal(undefined);
    expect(penalty(stemTip)).to.be.greaterThan(penalty(notehead));
  });

  it("lets a single compact chord phrase use finalized stem tips", (): void => {
    const compactSeed: SlurCurveGeometry = {
      p0: new PointF2D(2, 1.2),
      p1: new PointF2D(3.5, -4.8),
      p2: new PointF2D(6.5, -4.8),
      p3: new PointF2D(8, 1.2),
    };
    const chordEndpoint: (side: "start" | "end", x: number) => SlurEndpointContext =
      (side, x): SlurEndpointContext => ({
        ...endpoint(side, x),
        chordSize: 3,
        stem: {left: x - 0.05, right: x + 0.05, top: -2, bottom: 3},
        stemSide: true,
      });
    const layoutContext: SlurLayoutContext = context({
      start: chordEndpoint("start", 2),
      end: chordEndpoint("end", 8),
    });
    const result: SlurLayoutResult = calculateCandidateSlurLayout(
      layoutContext,
      compactSeed,
      options,
    );
    const selected: SlurCurveCandidate = result.candidates.find(
      (candidate): boolean => candidate.id === result.selectedCandidateId,
    );
    const selectedBow: number = Math.abs(
      selected.geometry.p1.y -
      (selected.geometry.p0.y + selected.geometry.p3.y) / 2,
    );
    const seedBow: number = Math.abs(compactSeed.p1.y - compactSeed.p0.y);

    expect(selected.startAnchor.type).to.equal("stem-tip");
    expect(selected.endAnchor.type).to.equal("stem-tip");
    expect(selectedBow).to.be.lessThan(seedBow / 2);
  });

  it("keeps a duration articulation inside the selected slur", (): void => {
    const articulatedEnd: SlurEndpointContext = {
      ...endpoint("end", 18),
      // The finalized stem stops on the note-side of the staccato, reproducing
      // the real endpoint overlap this rule must reject.
      stem: {left: 17.95, right: 18.05, top: 1.2, bottom: 3},
      stemSide: true,
      legacyAttachment: "stem",
      articulations: [{
        id: "staccato",
        glyphType: "a.",
        classification: "duration",
        position: 3,
        bounds: {left: 17.8, right: 18.2, top: 0.7, bottom: 1.1},
        outwardShift: 0,
      }],
    };
    const result: SlurLayoutResult = calculateCandidateSlurLayout(
      context({end: articulatedEnd}),
      seed,
      options,
    );
    const selected: SlurCurveCandidate = result.candidates.find(
      (candidate) => candidate.id === result.selectedCandidateId,
    );

    expect(selected.endAnchor.type).to.equal("outside-articulation");
    expect(selected.geometry.p3.y).to.be.lessThan(articulatedEnd.articulations[0].bounds.top);
    expect(result.candidates.some(
      (candidate): boolean =>
        candidate.endAnchor.type === "stem-tip" &&
        candidate.rejectionReason === "duration-articulation-outside-slur",
    )).to.equal(true);
  });

  it("does not offer shallow or flattened-long families for compact phrase slurs", (): void => {
    const shortSeed: SlurCurveGeometry = {
      p0: new PointF2D(2, 1.2),
      p1: new PointF2D(3.5, -0.8),
      p2: new PointF2D(6.5, -0.8),
      p3: new PointF2D(8, 1.2),
    };
    const result: SlurLayoutResult = calculateCandidateSlurLayout(
      context({end: endpoint("end", 8)}),
      shortSeed,
      options,
    );
    expect(result.candidates.some((candidate) => candidate.family === "shallow")).to.equal(false);
    expect(result.candidates.some((candidate) => candidate.family === "flattened-long")).to.equal(false);
    expect(result.candidates.some((candidate) => candidate.family === "normal")).to.equal(true);
  });

  it("places a chord endpoint shoulder outside its selected accidental", (): void => {
    const accidentalStart: SlurEndpointContext = {
      ...endpoint("start", 2),
      notehead: {left: 1.5, right: 2.5, top: 1.5, bottom: 2.5},
      accidentals: [{left: 0.4, right: 1.3, top: -0.25, bottom: 2.8}],
      chordSize: 2,
    };
    const anchors: {start: SlurAnchorCandidate[], end: SlurAnchorCandidate[]} = generateSlurAnchors(
      context({start: accidentalStart}),
      seed,
      options.obstacleClearance,
    );
    const shoulder: SlurAnchorCandidate = anchors.start.find(
      (anchor) => anchor.type === "notehead-shoulder",
    );

    expect(shoulder.y).to.equal(-0.25 - options.obstacleClearance);
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
      stemSide: true,
      beams: [{ left: 1.8, right: 18.2, top: -0.5, bottom: 0 }],
    };
    const beamedEnd: SlurEndpointContext = {
      ...endpoint("end", 18),
      stem: { left: 17.95, right: 18.05, top: 0, bottom: 3 },
      stemSide: true,
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

  it("does not exempt a spanning endpoint beam outside the attachment zone", (): void => {
    const spanningBeam: SlurObstacle = {
      id: "endpoint-spanning-beam",
      type: "beam" as const,
      bounds: {left: 1.8, right: 18.2, top: -3.1, bottom: 0.1},
      polygon: [
        new PointF2D(1.8, -3.1),
        new PointF2D(18.2, -3.1),
        new PointF2D(18.2, 0.1),
        new PointF2D(1.8, 0.1),
      ],
      endpoint: "both" as const,
      clearance: 0.1,
    };
    const result: SlurLayoutResult = calculateCandidateSlurLayout(
      context({
        start: {
          ...endpoint("start", 2),
          stem: {left: 1.95, right: 2.05, top: -3.1, bottom: 2.5},
          stemSide: true,
          beams: [spanningBeam.bounds],
        },
        end: {
          ...endpoint("end", 18),
          stem: {left: 17.95, right: 18.05, top: -3.1, bottom: 2.5},
          stemSide: true,
          beams: [spanningBeam.bounds],
        },
        obstacles: [spanningBeam],
      }),
      seed,
      options,
    );
    const selected: SlurCurveCandidate = result.candidates.find(
      (candidate) => candidate.id === result.selectedCandidateId,
    );

    expect(
      result.candidates.some(
        (candidate) => candidate.rejectionObstacleIds?.includes(spanningBeam.id),
      ),
    ).to.equal(true);
    expect(selected?.rejected).to.equal(false);
  });

  it("uses the finalized beam polygon instead of its loose bounding box", (): void => {
    const slopedBeam: SlurObstacle = {
      id: "sloped-beam",
      type: "beam",
      bounds: {left: 6, right: 14, top: -4, bottom: -1.6},
      polygon: [
        new PointF2D(6, -4),
        new PointF2D(6.2, -4),
        new PointF2D(14, -1.8),
        new PointF2D(13.8, -1.6),
      ],
      clearance: 0.1,
    };
    const result: SlurLayoutResult = calculateCandidateSlurLayout(
      context({obstacles: [slopedBeam]}),
      seed,
      options,
    );
    const exactSeed: SlurCurveCandidate = result.candidates.find(
      (candidate): boolean =>
        candidate.family === "normal" &&
        candidate.geometry.p0.x === seed.p0.x &&
        candidate.geometry.p0.y === seed.p0.y &&
        candidate.geometry.p3.x === seed.p3.x &&
        candidate.geometry.p3.y === seed.p3.y,
    );

    expect(exactSeed.rejectionObstacleIds?.includes(slopedBeam.id) ?? false).to.equal(false);
  });

  it("does not exempt an outgoing endpoint tie outside the attachment zone", (): void => {
    const outgoingTie: SlurObstacle = {
      id: "outgoing-endpoint-tie",
      type: "tie" as const,
      bounds: {left: 2, right: 12, top: -2.4, bottom: 1.3},
      endpoint: "start" as const,
      clearance: 0.1,
      curve: {
        p0: new PointF2D(2, 1.1),
        p1: new PointF2D(5, -2),
        p2: new PointF2D(9, -2),
        p3: new PointF2D(12, 1.1),
      },
    };
    const result: SlurLayoutResult = calculateCandidateSlurLayout(
      context({obstacles: [outgoingTie]}),
      seed,
      options,
    );

    expect(
      result.candidates.some(
        (candidate) => candidate.rejectionObstacleIds?.includes(outgoingTie.id),
      ),
    ).to.equal(true);
  });

  it("keeps outer-head and beam-side choices in a capped candidate set", (): void => {
    const complexEndpoint: SlurEndpointContext = {
      ...endpoint("start", 2),
      stem: { left: 1.95, right: 2.05, top: 0, bottom: 3 },
      stemSide: true,
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

    const retainedLegacy: SlurCurveCandidate = result.candidates.find(
      (candidate) =>
        candidate.family === "normal" &&
        candidate.startAnchor.generationIndex === 0 &&
        candidate.endAnchor.generationIndex === 0,
    );
    expect(retainedLegacy.rejectionReason).to.equal("looping");
    expect(result.candidates.some((candidate) => !candidate.rejected)).to.equal(true);
  });

  it("treats selected inner slurs as hard obstacles for an outer route", (): void => {
    const inner: SlurCurveGeometry = {
      p0: new PointF2D(5, 0.4),
      p1: new PointF2D(8, -1.8),
      p2: new PointF2D(12, -1.8),
      p3: new PointF2D(15, 0.4),
    };
    const result: SlurLayoutResult = calculateCandidateSlurLayout(
      context({
        isNested: true,
        obstacles: [{
          id: "selected-inner-slur",
          type: "slur",
          bounds: {left: 5, right: 15, top: -1.8, bottom: 0.4},
          clearance: 0.2,
          curve: inner,
        }],
      }),
      seed,
      options,
    );
    const selected: SlurCurveCandidate = result.candidates.find(
      (candidate) => candidate.id === result.selectedCandidateId,
    );

    expect(result.candidates.some((candidate) => candidate.rejectionReason === "obstacle-intersection"))
      .to.equal(true);
    expect(selected?.rejected).to.equal(false);
  });

  it("routes around grace-note, tuplet, and neighbouring-tie geometry", (): void => {
    const result: SlurLayoutResult = calculateCandidateSlurLayout(
      context({
        obstacles: [
          {
            id: "grace-head",
            type: "grace-note",
            bounds: {left: 5, right: 6, top: -1.4, bottom: 0.4},
            clearance: 0.12,
          },
          {
            id: "tuplet-number",
            type: "tuplet",
            bounds: {left: 9, right: 11, top: -2.2, bottom: -1.2},
            clearance: 0.12,
          },
          {
            id: "neighbouring-tie",
            type: "tie",
            bounds: {left: 13, right: 16, top: -1.1, bottom: 0.5},
            clearance: 0.12,
            curve: {
              p0: new PointF2D(13, 0.2),
              p1: new PointF2D(14, -0.8),
              p2: new PointF2D(15, -0.8),
              p3: new PointF2D(16, 0.2),
            },
          },
        ],
      }),
      seed,
      options,
    );

    expect(result.candidates.some((candidate) => candidate.rejectionReason === "obstacle-intersection"))
      .to.equal(true);
    expect(result.candidates.some((candidate) => !candidate.rejected)).to.equal(true);
  });
});
