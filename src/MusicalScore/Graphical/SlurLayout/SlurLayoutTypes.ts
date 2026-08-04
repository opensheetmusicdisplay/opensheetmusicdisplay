import { PointF2D } from "../../../Common/DataObjects/PointF2D";
import { PlacementEnum } from "../../VoiceData/Expressions/AbstractExpression";

export type SlurLayoutMode = "legacy" | "candidate";

export type SlurDiagnosticsLevel = "off" | "selected" | "candidates";

export type SlurEndpointSide = "start" | "end";

export type SlurEndpointAttachment =
    | "notehead"
    | "notehead-center"
    | "notehead-shoulder"
    | "outer-head"
    | "stem"
    | "stem-side"
    | "stem-tip"
    | "beam-side"
    | "outside-articulation"
    | "voice-entry"
    | "system-edge";

export type SlurObstacleType =
    | "notehead"
    | "stem"
    | "beam"
    | "accidental"
    | "tie"
    | "duration-articulation"
    | "force-articulation"
    | "stress-articulation"
    | "tuplet"
    | "grace-note"
    | "slur"
    | "text"
    | "skyline"
    | "other";

export type SlurArticulationClass = "duration" | "force" | "stress" | "other";

export type SlurCurveFamily =
    | "shallow"
    | "normal"
    | "high"
    | "flattened-long"
    | "start-weighted"
    | "end-weighted"
    | "system-continuation";

export interface SlurBounds {
    left: number;
    right: number;
    top: number;
    bottom: number;
}

export interface SlurEndpointContext {
    side: SlurEndpointSide;
    present: boolean;
    sourceNoteId?: string;
    pitchHalfTone?: number;
    stemDirection?: number;
    /** True when the slur lies on the rendered stem side of this endpoint. */
    stemSide: boolean;
    voiceId?: number;
    notehead?: SlurBounds;
    stem?: SlurBounds;
    beams: readonly SlurBounds[];
    accidentals: readonly SlurBounds[];
    articulations: SlurArticulationContext[];
    legacyAnchor: PointF2D;
    legacyAttachment: SlurEndpointAttachment;
    tiedEndpoint: boolean;
    chordSize: number;
    grace: boolean;
    systemBoundary: boolean;
}

export interface SlurArticulationContext {
    id: string;
    sourceType?: number;
    glyphType: string;
    classification: SlurArticulationClass;
    position: number;
    bounds: SlurBounds;
    outwardShift: number;
}

export interface SlurObstacle {
    id: string;
    type: SlurObstacleType;
    bounds: SlurBounds;
    sourceNoteId?: string;
    endpoint?: SlurEndpointSide | "both";
    articulationClass?: SlurArticulationClass;
    clearance: number;
    polygon?: PointF2D[];
    curve?: SlurCurveGeometry;
}

export interface SlurEnvelopeContext {
    samplingUnit: number;
    skyline: readonly number[];
    bottomline: readonly number[];
    topLineOffset: number;
    bottomLineOffset: number;
    width: number;
}

export interface SlurLayoutContext {
    id: string;
    mode: SlurLayoutMode;
    direction: PlacementEnum;
    start: SlurEndpointContext;
    end: SlurEndpointContext;
    obstacles: readonly SlurObstacle[];
    envelope: SlurEnvelopeContext;
    segmentIndex: number;
    segmentCount: number;
    isCrossStaff: boolean;
    isCrossSystem: boolean;
    isNested: boolean;
    linkedGroupId?: string;
}

export type SlurLayoutFaultCode =
    | "incompatible-linked-placement"
    | "invalid-linked-segment-order"
    | "missing-candidate-layout-context"
    | "unsupported-cross-staff-cross-system"
    | "no-valid-candidate";

export interface SlurLayoutFault {
    code: SlurLayoutFaultCode;
    message: string;
    segmentIndexes: readonly number[];
}

export interface SlurLinkedLayoutDiagnostics {
    groupId: string;
    continuationClearance: number;
    segmentIndexes: readonly number[];
    totalScore: number;
    tangentMismatch: number;
    faults: readonly SlurLayoutFault[];
}

export interface SlurAnchorPenalties {
    displacement: number;
    articulationRelationship: number;
    stemRelationship: number;
    tieConflict: number;
}

export interface SlurAnchorCandidate {
    id: string;
    x: number;
    y: number;
    type: SlurEndpointAttachment;
    side: SlurEndpointSide;
    direction: PlacementEnum;
    preferredTangent?: number;
    penalties: SlurAnchorPenalties;
    generationIndex: number;
}

export interface SlurCurveGeometry {
    p0: PointF2D;
    p1: PointF2D;
    p2: PointF2D;
    p3: PointF2D;
}

export interface SlurCandidateScore {
    total: number;
    collision: number;
    clearance: number;
    excessiveClearance: number;
    anchorDisplacement: number;
    tangent: number;
    slope: number;
    curvature: number;
    contour: number;
    articulation: number;
    tieInteraction: number;
    staffLineInteraction: number;
    nesting: number;
    systemContinuity: number;
    nearCollisionCount: number;
}

export interface SlurArticulationAdjustment {
    articulationId: string;
    outwardShift: number;
}

export interface SlurCurveCandidate {
    id: string;
    startAnchor: SlurAnchorCandidate;
    endAnchor: SlurAnchorCandidate;
    geometry: SlurCurveGeometry;
    family: SlurCurveFamily;
    score?: SlurCandidateScore;
    rejected: boolean;
    rejectionReason?: string;
    rejectionObstacleIds?: readonly string[];
    generationIndex: number;
    articulationAdjustments: SlurArticulationAdjustment[];
}

export interface SlurSkylineUpdate {
    index: number;
    value: number;
}

export interface SlurLayoutResult {
    mode: SlurLayoutMode;
    geometry: SlurCurveGeometry;
    selectedCandidateId: string;
    family: SlurCurveFamily;
    candidates: readonly SlurCurveCandidate[];
    articulationAdjustments: readonly SlurArticulationAdjustment[];
    skylineUpdates: readonly SlurSkylineUpdate[];
    bottomlineUpdates: readonly SlurSkylineUpdate[];
}

export interface SlurCandidateScoreWeights {
    clearance: number;
    excessiveClearance: number;
    anchorDisplacement: number;
    tangent: number;
    slope: number;
    curvature: number;
    contour: number;
    articulation: number;
    tieInteraction: number;
    staffLineInteraction: number;
    nesting: number;
    systemContinuity: number;
}
