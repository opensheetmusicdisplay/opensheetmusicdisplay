
import { PointF2D } from "../../Common/DataObjects/PointF2D";
import { GraphicalNote } from "./GraphicalNote";
import { GraphicalCurve } from "./GraphicalCurve";
import { Slur } from "../VoiceData/Expressions/ContinuousExpressions/Slur";
import { PlacementEnum } from "../VoiceData/Expressions/AbstractExpression";
import { EngravingRules } from "./EngravingRules";
import { StaffLine } from "./StaffLine";
import { SkyBottomLineCalculator } from "./SkyBottomLineCalculator";
import { BoundingBox } from "./BoundingBox";
import { Matrix2D } from "../../Common/DataObjects/Matrix2D";
import { LinkedVoice } from "../VoiceData/LinkedVoice";
import { GraphicalStaffEntry } from "./GraphicalStaffEntry";
import { GraphicalVoiceEntry } from "./GraphicalVoiceEntry";
import { Fraction } from "../../Common/DataObjects/Fraction";
import { ArticulationEnum, StemDirectionType } from "../VoiceData/VoiceEntry";
import { VexFlowGraphicalNote } from "./VexFlow";
import * as VF from "vexflow/core";
import {
    SlurAnchorCandidate,
    SlurArticulationClass,
    SlurBounds,
    SlurCurveCandidate,
    SlurCurveGeometry,
    SlurEndpointAttachment,
    SlurEndpointContext,
    SlurLayoutContext,
    SlurLayoutMode,
    SlurLayoutResult,
    SlurObstacle,
} from "./SlurLayout/SlurLayoutTypes";
import { calculateCandidateSlurLayout } from "./SlurLayout/SlurCandidateLayoutEngine";

const vexflowUnitInPixels: number = 10;
const cloneSlurPoint: (point: PointF2D) => PointF2D =
    (point: PointF2D): PointF2D => new PointF2D(point.x, point.y);
const lineValueAtX: (start: PointF2D, end: PointF2D, x: number) => number =
    (start: PointF2D, end: PointF2D, x: number): number => {
        const width: number = end.x - start.x;
        return Math.abs(width) < 0.0001
            ? (start.y + end.y) / 2
            : start.y + (end.y - start.y) * ((x - start.x) / width);
    };

export interface GraphicalSlurBoundsDiagnostics {
    left: number;
    right: number;
    top: number;
    bottom: number;
}

export interface GraphicalSlurArticulationShiftDiagnostics {
    baseline: PointF2D;
    endpoint: "start" | "end";
    glyph: string;
    type: string;
    previousShiftPx: number;
    finalShiftPx: number;
    bounds: GraphicalSlurBoundsDiagnostics;
}

export interface GraphicalSlurDiagnostics {
    mode?: SlurLayoutMode;
    segmentIndex: number;
    segmentCount: number;
    placement?: PlacementEnum;
    startNotehead?: GraphicalSlurBoundsDiagnostics;
    endNotehead?: GraphicalSlurBoundsDiagnostics;
    startAttachment?: SlurEndpointAttachment;
    endAttachment?: SlurEndpointAttachment;
    articulationShifts: GraphicalSlurArticulationShiftDiagnostics[];
    unsupportedRouting?: "cross-staff-cross-system";
    selectedCandidateId?: string;
    candidateCount?: number;
    faults?: string[];
}

interface RenderedSlurEndpointGeometry {
    notehead: GraphicalSlurBoundsDiagnostics;
    stem?: GraphicalSlurBoundsDiagnostics;
    articulations: {
        baseline: PointF2D;
        modifier: any;
        type: string;
        position: number;
        bounds: GraphicalSlurBoundsDiagnostics;
    }[];
    beamPolygons: PointF2D[][];
    accidentals: GraphicalSlurBoundsDiagnostics[];
    tuplets: GraphicalSlurBoundsDiagnostics[];
}

interface CandidateArticulationBinding {
    modifier: any;
    note: GraphicalNote;
    staffLine: StaffLine;
    endpoint: "start" | "end";
    type: string;
}

export class GraphicalSlur extends GraphicalCurve {
    // private intersection: PointF2D;

    constructor(slur: Slur, rules: EngravingRules) {
        super();
        this.slur = slur;
        this.rules = rules;
    }

    public slur: Slur;
    public staffEntries: GraphicalStaffEntry[] = [];
    public placement: PlacementEnum;
    public graceStart: boolean;
    public graceEnd: boolean;
    private rules: EngravingRules;
    public SVGElement: Node;
    public layoutContext?: SlurLayoutContext;
    public layoutResult?: SlurLayoutResult;
    private candidateArticulationBindings: Map<string, CandidateArticulationBinding> = new Map();
    public diagnostics: GraphicalSlurDiagnostics = {
        segmentIndex: 0,
        segmentCount: 1,
        articulationShifts: [],
    };

    /**
     * Compares the timespan of two Graphical Slurs
     * @param x
     * @param y
     */
    public static Compare (x: GraphicalSlur, y: GraphicalSlur ): number {
        if (x.staffEntries.length < 1) { // x.staffEntries[i] can return undefined in Beethoven Moonlight Sonata sample
            return -1;
        } else if (y.staffEntries.length < 1) {
            return 1;
        }
        const xTimestampSpan: Fraction = Fraction.minus(x.staffEntries[x.staffEntries.length - 1].getAbsoluteTimestamp(),
                                                        x.staffEntries[0].getAbsoluteTimestamp());
        const yTimestampSpan: Fraction = Fraction.minus(y.staffEntries[y.staffEntries.length - 1].getAbsoluteTimestamp(),
                                                        y.staffEntries[0].getAbsoluteTimestamp());

        if (xTimestampSpan.RealValue > yTimestampSpan.RealValue) {
            return 1;
        }

        if (yTimestampSpan.RealValue > xTimestampSpan.RealValue) {
            return -1;
        }

        return 0;
    }

    public setLinkedSegment(index: number, count: number, placement: PlacementEnum): void {
        this.diagnostics.segmentIndex = index;
        this.diagnostics.segmentCount = count;
        this.diagnostics.placement = placement;
        this.placement = placement;
    }

    public markUnsupportedCrossStaffSystemBreak(): void {
        this.diagnostics.unsupportedRouting = "cross-staff-cross-system";
    }

    public determinePlacement(): PlacementEnum {
        const staffLine: StaffLine = this.staffEntries[0]?.parentMeasure?.ParentStaffLine;
        if (!staffLine) {
            return this.placement;
        }
        this.calculatePlacement(staffLine.SkyBottomLineCalculator, staffLine);
        this.diagnostics.placement = this.placement;
        return this.placement;
    }

    /**
     * Move endpoint-side articulations beyond the slur's fixed notehead
     * attachment. Returns true when any final articulation geometry changed.
     */
    public prepareEndpointArticulationClearance(): boolean {
        const staffLine: StaffLine = this.staffEntries[0]?.parentMeasure?.ParentStaffLine;
        if (!staffLine || (this.placement !== PlacementEnum.Above && this.placement !== PlacementEnum.Below)) {
            return false;
        }
        this.diagnostics.articulationShifts = [];
        const { startNote, endNote } = this.resolveEndpointNotes();
        let changed: boolean = false;
        if (startNote) {
            changed = this.displaceEndpointArticulations(startNote, staffLine, "start") || changed;
        }
        if (endNote && endNote !== startNote) {
            changed = this.displaceEndpointArticulations(endNote, staffLine, "end") || changed;
        }
        return changed;
    }

    private resolveEndpointNotes(): {startNote: GraphicalNote, endNote: GraphicalNote} {
        const startStaffEntry: GraphicalStaffEntry = this.staffEntries[0];
        const endStaffEntry: GraphicalStaffEntry = this.staffEntries[this.staffEntries.length - 1];
        if (!startStaffEntry || !endStaffEntry) {
            return {startNote: undefined, endNote: undefined};
        }
        let startNote: GraphicalNote = startStaffEntry.findGraphicalNoteFromNote(this.slur.StartNote);
        if (!startNote && this.graceStart) {
            startNote = startStaffEntry.findGraphicalNoteFromGraceNote(this.slur.StartNote);
        }
        if (!startNote) {
            startNote = startStaffEntry.findEndTieGraphicalNoteFromNoteWithStartingSlur(this.slur.StartNote, this.slur);
        }
        let endNote: GraphicalNote = endStaffEntry.findGraphicalNoteFromNote(this.slur.EndNote);
        if (!endNote && this.graceEnd) {
            endNote = endStaffEntry.findGraphicalNoteFromGraceNote(this.slur.EndNote);
        }
        return {startNote, endNote};
    }

    private renderedEndpointGeometry(note: GraphicalNote, staffLine: StaffLine): RenderedSlurEndpointGeometry {
        const vexflowNote: VexFlowGraphicalNote = note as VexFlowGraphicalNote;
        const vfNote: any = vexflowNote.vfnote?.[0] as any;
        const noteIndex: number = vexflowNote.vfnote?.[1] ?? vexflowNote.vfnoteIndex ?? 0;
        if (!vfNote) {
            return undefined;
        }
        vfNote.layoutArticulations?.();
        const stave: any = vfNote.getStave?.();
        const measureX: number = note.parentVoiceEntry.parentStaffEntry.parentMeasure.PositionAndShape.RelativePosition.x;
        const staveX: number = stave?.getX?.() ?? 0;
        const staffTopY: number = stave?.getYForLine?.(0) ?? stave?.getY?.() ?? 0;
        const selectedBounds: any = vfNote.getSelectedNoteHeadBounds?.(noteIndex);
        let noteheadBoundingBox: any = selectedBounds?.boundingBox;
        if (!noteheadBoundingBox) {
            const noteheads: any[] = vfNote.noteHeads ?? vfNote.note_heads ?? [];
            noteheadBoundingBox = noteheads[noteIndex]?.getBoundingBox?.();
        }
        if (!noteheadBoundingBox) {
            return undefined;
        }

        const toStaffLineBounds: (boundingBox: any) => GraphicalSlurBoundsDiagnostics = (
            boundingBox: any,
        ): GraphicalSlurBoundsDiagnostics => {
            const leftPx: number = boundingBox.getX?.() ?? boundingBox.x;
            const topPx: number = boundingBox.getY?.() ?? boundingBox.y;
            const widthPx: number = boundingBox.getW?.() ?? boundingBox.w;
            const heightPx: number = boundingBox.getH?.() ?? boundingBox.h;
            return {
                left: measureX + (leftPx - staveX) / vexflowUnitInPixels,
                right: measureX + (leftPx + widthPx - staveX) / vexflowUnitInPixels,
                top: staffLine.TopLineOffset + (topPx - staffTopY) / vexflowUnitInPixels,
                bottom: staffLine.TopLineOffset + (topPx + heightPx - staffTopY) / vexflowUnitInPixels,
            };
        };
        const toStaffLinePoint: (x: number, y: number) => PointF2D = (
            x: number,
            y: number,
        ): PointF2D => new PointF2D(
            measureX + (x - staveX) / vexflowUnitInPixels,
            staffLine.TopLineOffset + (y - staffTopY) / vexflowUnitInPixels,
        );

        const notehead: GraphicalSlurBoundsDiagnostics = toStaffLineBounds(noteheadBoundingBox);
        let stem: GraphicalSlurBoundsDiagnostics;
        if (vfNote.hasStem?.() && vfNote.getStemExtents && vfNote.getStemX) {
            const extents: {topY: number, baseY: number} = vfNote.getStemExtents();
            const stemX: number = measureX + (vfNote.getStemX() - staveX) / vexflowUnitInPixels;
            const top: number = staffLine.TopLineOffset +
                (Math.min(extents.topY, extents.baseY) - staffTopY) / vexflowUnitInPixels;
            const bottom: number = staffLine.TopLineOffset +
                (Math.max(extents.topY, extents.baseY) - staffTopY) / vexflowUnitInPixels;
            stem = {
                left: stemX - VF.Stem.WIDTH / vexflowUnitInPixels / 2,
                right: stemX + VF.Stem.WIDTH / vexflowUnitInPixels / 2,
                top,
                bottom,
            };
        }

        const articulations: RenderedSlurEndpointGeometry["articulations"] = [];
        const accidentals: GraphicalSlurBoundsDiagnostics[] = [];
        for (const modifier of vfNote.modifiers ?? []) {
            if (modifier.getCategory?.() === VF.Accidental.CATEGORY
                && (modifier.getIndex?.() ?? modifier.index) === noteIndex) {
                const accidentalBounds: any = modifier.getBoundingBox?.();
                if (accidentalBounds) {
                    accidentals.push(toStaffLineBounds(accidentalBounds));
                }
            }
            if (modifier.getCategory?.() !== VF.Articulation.CATEGORY ||
                (modifier.getIndex?.() ?? modifier.index) !== noteIndex) {
                continue;
            }
            const layout: any = modifier.layout?.();
            const boundingBox: any = layout?.boundingBox ?? modifier.getBoundingBox?.();
            if (!boundingBox) {
                continue;
            }
            articulations.push({
                baseline: toStaffLinePoint(
                    layout?.x ?? modifier.getX?.() ?? modifier.x,
                    layout?.y ?? modifier.getY?.() ?? modifier.y,
                ),
                modifier,
                type: modifier.type ?? modifier.getText?.() ?? "unknown",
                position: modifier.getPosition?.() ?? modifier.position,
                bounds: toStaffLineBounds(boundingBox),
            });
        }

        const beamPolygons: PointF2D[][] = (vfNote.getBeam?.()?.getRenderedBeamPolygons?.() ?? [])
            .map((polygon): PointF2D[] => polygon.points.map(
                (point): PointF2D => toStaffLinePoint(point.x, point.y),
            ));
        const tuplets: GraphicalSlurBoundsDiagnostics[] = (vfNote.getTupletStack?.() ?? [])
            .map((tuplet): GraphicalSlurBoundsDiagnostics => {
                const boundingBox: any = tuplet.getBoundingBox?.();
                return boundingBox ? toStaffLineBounds(boundingBox) : undefined;
            })
            .filter(Boolean);

        return {notehead, stem, articulations, beamPolygons, accidentals, tuplets};
    }

    /**
     * A slur attached to a chord uses the outer notehead on its placement
     * side. MusicXML commonly associates both the upper and lower slur with
     * the chord's first source note, so that source-note index alone cannot
     * identify the visually correct head.
     */
    private renderedOuterChordGeometry(
        note: GraphicalNote,
        staffLine: StaffLine,
    ): RenderedSlurEndpointGeometry {
        const chordNotes: GraphicalNote[] = note.parentVoiceEntry.notes;
        let selected: RenderedSlurEndpointGeometry;
        for (const chordNote of chordNotes) {
            const candidate: RenderedSlurEndpointGeometry =
                this.renderedEndpointGeometry(chordNote, staffLine);
            if (!candidate) {
                continue;
            }
            if (!selected
                || (this.placement === PlacementEnum.Above
                    ? candidate.notehead.top < selected.notehead.top
                    : candidate.notehead.bottom > selected.notehead.bottom)) {
                selected = candidate;
            }
        }
        return selected;
    }

    private displaceEndpointArticulations(
        note: GraphicalNote,
        staffLine: StaffLine,
        endpoint: "start" | "end",
    ): boolean {
        const geometry: RenderedSlurEndpointGeometry = this.renderedEndpointGeometry(note, staffLine);
        if (!geometry) {
            return false;
        }
        if (endpoint === "start") {
            this.diagnostics.startNotehead = geometry.notehead;
        } else {
            this.diagnostics.endNotehead = geometry.notehead;
        }
        const vfPosition: number = this.placement === PlacementEnum.Above
            ? VF.Modifier.Position.ABOVE
            : VF.Modifier.Position.BELOW;
        const supportedTypes: Set<string> = new Set(["a.", "a-", "a>", "a^"]);
        const attachmentY: number = this.placement === PlacementEnum.Above
            ? geometry.notehead.top - this.rules.SlurNoteHeadYOffset
            : geometry.notehead.bottom + this.rules.SlurNoteHeadYOffset;
        let changed: boolean = false;

        for (const articulation of geometry.articulations) {
            if (articulation.position !== vfPosition || !supportedTypes.has(articulation.type)) {
                continue;
            }
            const currentShiftPx: number = articulation.modifier.getOutwardShift?.() ?? 0;
            const missingClearanceUnits: number = this.placement === PlacementEnum.Above
                ? articulation.bounds.bottom - (attachmentY - this.rules.SlurArticulationClearance)
                : attachmentY + this.rules.SlurArticulationClearance - articulation.bounds.top;
            const finalShiftPx: number = currentShiftPx +
                Math.max(0, missingClearanceUnits * vexflowUnitInPixels);
            if (finalShiftPx > currentShiftPx + 0.001) {
                articulation.modifier.setOutwardShift?.(finalShiftPx);
                articulation.modifier.layout?.();
                changed = true;
            }
            const finalGeometry: RenderedSlurEndpointGeometry = this.renderedEndpointGeometry(note, staffLine);
            const finalArticulation: RenderedSlurEndpointGeometry["articulations"][number] =
                finalGeometry?.articulations.find(
                (candidate): boolean => candidate.modifier === articulation.modifier,
            );
            this.diagnostics.articulationShifts.push({
                baseline: finalArticulation?.baseline ?? articulation.baseline,
                endpoint,
                glyph: String(articulation.modifier.getText?.() ?? ""),
                type: articulation.type,
                previousShiftPx: currentShiftPx,
                finalShiftPx,
                bounds: finalArticulation?.bounds ?? articulation.bounds,
            });
        }
        return changed;
    }

    /**
     *
     * @param rules
     */
    public calculateCurve(rules: EngravingRules): void {

        this.candidateArticulationBindings.clear();
        if (rules.SlurLayoutMode === "candidate") {
            this.diagnostics.articulationShifts = [];
        }

        // single GraphicalSlur means a single Curve, eg each GraphicalSlurObject is meant to be on the same StaffLine
        // a Slur can span more than one GraphicalSlurObjects
        const startStaffEntry: GraphicalStaffEntry = this.staffEntries[0];
        const {startNote: slurStartNote, endNote: slurEndNote} = this.resolveEndpointNotes();

        const staffLine: StaffLine = startStaffEntry.parentMeasure.ParentStaffLine;
        const skyBottomLineCalculator: SkyBottomLineCalculator = staffLine.SkyBottomLineCalculator;

        if (this.placement !== PlacementEnum.Above && this.placement !== PlacementEnum.Below) {
            this.calculatePlacement(skyBottomLineCalculator, staffLine);
        }

        // the Start- and End Reference Points for the Sky-BottomLine
        const startEndPoints: {startX: number, startY: number, endX: number, endY: number} =
            this.calculateStartAndEnd(slurStartNote, slurEndNote, staffLine, rules);

        const startX: number = startEndPoints.startX;
        const endX: number = startEndPoints.endX;
        let startY: number = startEndPoints.startY;
        let endY: number = startEndPoints.endY;
        const endpointOffset: number = this.placement === PlacementEnum.Above
            ? -rules.SlurNoteHeadYOffset
            : rules.SlurNoteHeadYOffset;
        this.layoutContext = this.createLayoutContext(
            slurStartNote,
            slurEndNote,
            staffLine,
            startX,
            startY + endpointOffset,
            endX,
            endY + endpointOffset,
            rules.SlurLayoutMode,
        );
        this.diagnostics.mode = rules.SlurLayoutMode;

        // Degenerate case: start and end point (nearly) coincide, e.g. for a zero-length slur from a malformed
        // file. The curve calculation below would divide 0 by 0 (start-end angle, tangent slopes) and produce
        // NaN control points, ending up as an invalid SVG path - use a collapsed (invisible) curve instead.
        if (Math.abs(endX - startX) < 0.0001 && Math.abs(endY - startY) < 0.0001) {
            this.bezierStartPt = new PointF2D(startX, startY);
            this.bezierStartControlPt = new PointF2D(startX, startY);
            this.bezierEndControlPt = new PointF2D(endX, endY);
            this.bezierEndPt = new PointF2D(endX, endY);
            this.finalizeLayout(rules, staffLine);
            return;
        }

        const minAngle: number = rules.SlurTangentMinAngle;
        const maxAngle: number = rules.SlurTangentMaxAngle;
        let points: PointF2D[];

        if (this.placement === PlacementEnum.Above) {
            startY -= rules.SlurNoteHeadYOffset;
            endY -= rules.SlurNoteHeadYOffset;
            const startUpperRight: PointF2D = new PointF2D(startX, startY);
            const endUpperLeft: PointF2D = new PointF2D(endX, endY);

            // SkyLinePointsList between firstStaffEntry startUpperRightPoint and lastStaffentry endUpperLeftPoint
            points = this.calculateTopPoints(startUpperRight, endUpperLeft, staffLine, skyBottomLineCalculator);

            if (points.length === 0) {
                const pointF: PointF2D = new PointF2D((endUpperLeft.x - startUpperRight.x) / 2 + startUpperRight.x,
                                                      (endUpperLeft.y - startUpperRight.y) / 2 + startUpperRight.y);
                points.push(pointF);
            }

            // Angle between original x-Axis and Line from Start-Point to End-Point
            const startEndLineAngleRadians: number = (Math.atan((endY - startY) / (endX - startX)));

            // translate origin at Start (positiveY from Bottom to Top => change sign for Y)
            const start2: PointF2D = new PointF2D(0, 0);
            let end2: PointF2D = new PointF2D(endX - startX, -(endY - startY));

            // and Rotate at new Origin startEndLineAngle degrees
                // clockwise/counterclockwise Rotation
                // after Rotation end2.Y must be 0
                // Inverse of RotationMatrix = TransposeMatrix of RotationMatrix
            const rotationMatrix: Matrix2D = Matrix2D.getRotationMatrix(startEndLineAngleRadians);
            const transposeMatrix: Matrix2D = rotationMatrix.getTransposeMatrix();
            end2 = rotationMatrix.vectorMultiplication(end2);
            const transformedPoints: PointF2D[] = this.calculateTranslatedAndRotatedPointListAbove(points, startX, startY, rotationMatrix);

            // calculate tangent Lines maximum Slopes between StartPoint and EndPoint to all Points in SkyLine
                // and tangent Lines characteristica
            const startLineSlope: number = this.calculateMaxLeftSlope(transformedPoints, start2, end2);
            const endLineSlope: number = this.calculateMaxRightSlope(transformedPoints, start2, end2);
            const startLineD: number = start2.y - start2.x * startLineSlope;
            const endLineD: number = end2.y - end2.x * endLineSlope;

            // calculate IntersectionPoint of the 2 Lines
                // if same Slope, then Point.X between Start and End and Point.Y fixed
            const intersectionPoint: PointF2D = new PointF2D();
            let sameSlope: boolean = false;
            if (Math.abs(Math.abs(startLineSlope) - Math.abs(endLineSlope)) < 0.0001) {
                intersectionPoint.x = end2.x / 2;
                intersectionPoint.y = 0;
                sameSlope = true;
            } else {
                intersectionPoint.x = (endLineD - startLineD) / (startLineSlope - endLineSlope);
                intersectionPoint.y = startLineSlope * intersectionPoint.x + startLineD;
            }

            // calculate HeightWidthRatio between the MaxYpoint (from the points between StartPoint and EndPoint)
            // and the X-distance from StartPoint to EndPoint
            const heightWidthRatio: number = this.calculateHeightWidthRatio(end2.x, transformedPoints);

            // Shift start- or endPoint and corresponding controlPoint away from note, if needed:
            // e.g. if there is a close object creating a high slope, better shift it away to reduce the slope:
            // idea is to compare the half heightWidthRatio of the bounding box of the skyline points with the slope (which is also a ratio: k/1)
            // if the slope is greater than the half heightWidthRatio (which will 99% be the case),
            // then add a y-offset to reduce the slope to the same value as the half heightWidthRatio of the bounding box
            const startYOffset: number = 0;
            const endYOffset: number = 0;
            /*if (Math.abs(heightWidthRatio) > 0.001) {
                // 1. start side:
                const startSlopeRatio: number = Math.abs(startLineSlope / (heightWidthRatio * 2));
                const maxLeftYOffset: number = Math.abs(startLineSlope);
                startYOffset = Math.max(0, maxLeftYOffset * (Math.min(10, startSlopeRatio - 1) / 10));
                // slope has to be adapted now due to the y-offset:
                startLineSlope -= startYOffset;

                // 2. end side:
                const endSlopeRatio: number = Math.abs(endLineSlope / (heightWidthRatio * 2));
                const maxRightYOffset: number = Math.abs(endLineSlope);
                endYOffset = Math.max(0, maxRightYOffset * (Math.min(10, endSlopeRatio - 1) / 10));
                // slope has to be adapted now due to the y-offset:
                endLineSlope += endYOffset;
            }*/



            // calculate tangent Lines Angles
                // (using the calculated Slopes and the Ratio from the IntersectionPoint's distance to the MaxPoint in the SkyLine)
            let startAngle: number = minAngle;
            let endAngle: number = -minAngle;
            // if the calculated Slopes (start and end) are equal, then Angles have fixed values
            if (!sameSlope) {
                const result: {startAngle: number, endAngle: number} =
                    this.calculateAngles(minAngle, startLineSlope, endLineSlope, maxAngle);
                startAngle = result.startAngle;
                endAngle = result.endAngle;
            }

            // calculate Curve's Control Points
            const controlPoints: {startControlPoint: PointF2D, endControlPoint: PointF2D} =
                this.calculateControlPoints(end2.x, startAngle, endAngle, transformedPoints, heightWidthRatio, startY, endY);

            let startControlPoint: PointF2D = controlPoints.startControlPoint;
            let endControlPoint: PointF2D = controlPoints.endControlPoint;

            // transform ControlPoints to original Coordinate System
                // (rotate back and translate back)
            startControlPoint = transposeMatrix.vectorMultiplication(startControlPoint);
            startControlPoint.x += startX;
            startControlPoint.y = -startControlPoint.y + startY;
            endControlPoint = transposeMatrix.vectorMultiplication(endControlPoint);
            endControlPoint.x += startX;
            endControlPoint.y = -endControlPoint.y + startY;
            // middleControlPoint.x = (startControlPoint.x + endControlPoint.x) / 2;
            // middleControlPoint.y = (startControlPoint.y + endControlPoint.y) / 2 + 1.0;

            /* for DEBUG only */
            // this.intersection = transposeMatrix.vectorMultiplication(intersectionPoint);
            // this.intersection.x += startX;
            // this.intersection.y = -this.intersection.y + startY;
            /* for DEBUG only */

            // set private members
            this.bezierStartPt = new PointF2D(startX, startY - startYOffset);
            this.bezierStartControlPt = new PointF2D(startControlPoint.x, startControlPoint.y - startYOffset);
            this.bezierEndControlPt = new PointF2D(endControlPoint.x, endControlPoint.y - endYOffset);
            this.bezierEndPt = new PointF2D(endX, endY - endYOffset);
            this.applySystemBreakTangents(Boolean(slurStartNote), Boolean(slurEndNote));

            // calculate slur Curvepoints and update Skyline
            const length: number = staffLine.SkyLine.length;
            const startIndex: number = skyBottomLineCalculator.getLeftIndexForPointX(this.bezierStartPt.x, length);
            const endIndex: number = skyBottomLineCalculator.getLeftIndexForPointX(this.bezierEndPt.x, length);
            const distance: number = this.bezierEndPt.x - this.bezierStartPt.x;
            const samplingUnit: number = skyBottomLineCalculator.SamplingUnit;
            for (let i: number = startIndex; rules.SlurLayoutMode === "legacy" && i < endIndex; i++) {
                // get the right distance ratio and index on the curve
                const diff: number = i / samplingUnit - this.bezierStartPt.x;
                const curvePoint: PointF2D = this.calculateCurvePointAtIndex(Math.abs(diff) / distance);

                // update left- and rightIndex for better accuracy
                let index: number = skyBottomLineCalculator.getLeftIndexForPointX(curvePoint.x, length);
                // update SkyLine with final slur curve:
                if (index >= startIndex) {
                    staffLine.SkyLine[index] = Math.min(staffLine.SkyLine[index], curvePoint.y);
                }
                index++;
                if (index < length) {
                    staffLine.SkyLine[index] = Math.min(staffLine.SkyLine[index], curvePoint.y);
                }
            }
        } else {
            startY += rules.SlurNoteHeadYOffset;
            endY += rules.SlurNoteHeadYOffset;

            // firstStaffEntry startLowerRightPoint and lastStaffentry endLowerLeftPoint
            const startLowerRight: PointF2D = new PointF2D(startX, startY);
            const endLowerLeft: PointF2D = new PointF2D(endX, endY);

            // BottomLinePointsList between firstStaffEntry startLowerRightPoint and lastStaffentry endLowerLeftPoint
            points = this.calculateBottomPoints(startLowerRight, endLowerLeft, staffLine, skyBottomLineCalculator);

            if (points.length === 0) {
                const pointF: PointF2D = new PointF2D((endLowerLeft.x - startLowerRight.x) / 2 + startLowerRight.x,
                                                      (endLowerLeft.y - startLowerRight.y) / 2 + startLowerRight.y);
                points.push(pointF);
            }

            // Angle between original x-Axis and Line from Start-Point to End-Point
            const startEndLineAngleRadians: number = Math.atan((endY - startY) / (endX - startX));
            // translate origin at Start
            const start2: PointF2D = new PointF2D(0, 0);
            let end2: PointF2D = new PointF2D(endX - startX, endY - startY);

            // and Rotate at new Origin startEndLineAngle degrees
            // clockwise/counterclockwise Rotation
            // after Rotation end2.Y must be 0
            // Inverse of RotationMatrix = TransposeMatrix of RotationMatrix
            const rotationMatrix: Matrix2D = Matrix2D.getRotationMatrix(-startEndLineAngleRadians);
            const transposeMatrix: Matrix2D = rotationMatrix.getTransposeMatrix();
            end2 = rotationMatrix.vectorMultiplication(end2);
            const transformedPoints: PointF2D[] = this.calculateTranslatedAndRotatedPointListBelow(points, startX, startY, rotationMatrix);

            // calculate tangent Lines maximum Slopes between StartPoint and EndPoint to all Points in BottomLine
            // and tangent Lines characteristica
            const startLineSlope: number = this.calculateMaxLeftSlope(transformedPoints, start2, end2);
            const endLineSlope: number = this.calculateMaxRightSlope(transformedPoints, start2, end2);
            const startLineD: number = start2.y - start2.x * startLineSlope;
            const endLineD: number = end2.y - end2.x * endLineSlope;

            // calculate IntersectionPoint of the 2 Lines
            // if same Slope, then Point.X between Start and End and Point.Y fixed
            const intersectionPoint: PointF2D = new PointF2D();
            let sameSlope: boolean = false;
            if (Math.abs(Math.abs(startLineSlope) - Math.abs(endLineSlope)) < 0.0001) {
                intersectionPoint.x = end2.x / 2;
                intersectionPoint.y = 0;
                sameSlope = true;
            } else {
                intersectionPoint.x = (endLineD - startLineD) / (startLineSlope - endLineSlope);
                intersectionPoint.y = startLineSlope * intersectionPoint.x + startLineD;
            }

            // calculate HeightWidthRatio between the MaxYpoint (from the points between StartPoint and EndPoint)
            // and the X-distance from StartPoint to EndPoint
            const heightWidthRatio: number = this.calculateHeightWidthRatio(end2.x, transformedPoints);

            // Shift start- or endPoint and corresponding controlPoint away from note, if needed:
            // e.g. if there is a close object creating a high slope, better shift it away to reduce the slope:
            // idea is to compare the half heightWidthRatio of the bounding box of the skyline points with the slope (which is also a ratio: k/1)
            // if the slope is greater than the half heightWidthRatio (which will 99% be the case),
            // then add a y-offset to reduce the slope to the same value as the half heightWidthRatio of the bounding box
            const startYOffset: number = 0;
            const endYOffset: number = 0;
            /*if (Math.abs(heightWidthRatio) > 0.001) {
                // 1. start side:
                const startSlopeRatio: number = Math.abs(startLineSlope / (heightWidthRatio * 2));
                const maxLeftYOffset: number = Math.abs(startLineSlope);
                startYOffset = Math.max(0, maxLeftYOffset * (Math.min(10, startSlopeRatio - 1) / 10));
                // slope has to be adapted now due to the y-offset:
                startLineSlope -= startYOffset;
                // 2. end side:
                const endSlopeRatio: number = Math.abs(endLineSlope / (heightWidthRatio * 2));
                const maxRightYOffset: number = Math.abs(endLineSlope);
                endYOffset = Math.max(0, maxRightYOffset * (Math.min(10, endSlopeRatio - 1) / 10));
                // slope has to be adapted now due to the y-offset:
                endLineSlope += endYOffset;
            } */

            // calculate tangent Lines Angles
            // (using the calculated Slopes and the Ratio from the IntersectionPoint's distance to the MaxPoint in the SkyLine)
            let startAngle: number = minAngle;
            let endAngle: number = -minAngle;
            // if the calculated Slopes (start and end) are equal, then Angles have fixed values
            if (!sameSlope) {
                const result: {startAngle: number, endAngle: number} =
                    this.calculateAngles(minAngle, startLineSlope, endLineSlope, maxAngle);
                startAngle = result.startAngle;
                endAngle = result.endAngle;
            }

            // calculate Curve's Control Points
            const controlPoints: {startControlPoint: PointF2D, endControlPoint: PointF2D} =
                this.calculateControlPoints(end2.x, startAngle, endAngle, transformedPoints, heightWidthRatio, startY, endY);
            let startControlPoint: PointF2D = controlPoints.startControlPoint;
            let endControlPoint: PointF2D = controlPoints.endControlPoint;

            // transform ControlPoints to original Coordinate System
            // (rotate back and translate back)
            startControlPoint = transposeMatrix.vectorMultiplication(startControlPoint);
            startControlPoint.x += startX;
            startControlPoint.y += startY;
            endControlPoint = transposeMatrix.vectorMultiplication(endControlPoint);
            endControlPoint.x += startX;
            endControlPoint.y += startY;

            // set private members
            this.bezierStartPt = new PointF2D(startX, startY + startYOffset);
            this.bezierStartControlPt = new PointF2D(startControlPoint.x, startControlPoint.y + startYOffset);
            this.bezierEndControlPt = new PointF2D(endControlPoint.x, endControlPoint.y + endYOffset);
            this.bezierEndPt = new PointF2D(endX, endY + endYOffset);
            this.applySystemBreakTangents(Boolean(slurStartNote), Boolean(slurEndNote));

            /* for DEBUG only */
            // this.intersection = transposeMatrix.vectorMultiplication(intersectionPoint);
            // this.intersection.x += startX;
            // this.intersection.y += startY;
            /* for DEBUG only */

            // calculate CurvePoints
            const length: number = staffLine.BottomLine.length;
            const startIndex: number = skyBottomLineCalculator.getLeftIndexForPointX(this.bezierStartPt.x, length);
            const endIndex: number = skyBottomLineCalculator.getLeftIndexForPointX(this.bezierEndPt.x, length);
            const distance: number = this.bezierEndPt.x - this.bezierStartPt.x;
            const samplingUnit: number = skyBottomLineCalculator.SamplingUnit;
            for (let i: number = startIndex; rules.SlurLayoutMode === "legacy" && i < endIndex; i++) {
                // get the right distance ratio and index on the curve
                const diff: number = i / samplingUnit - this.bezierStartPt.x;
                const curvePoint: PointF2D = this.calculateCurvePointAtIndex(Math.abs(diff) / distance);

                // update start- and endIndex for better accuracy
                let index: number = skyBottomLineCalculator.getLeftIndexForPointX(curvePoint.x, length);
                // update BottomLine with final slur curve:
                if (index >= startIndex) {
                    staffLine.BottomLine[index] = Math.max(staffLine.BottomLine[index], curvePoint.y);
                }
                index++;
                if (index < length) {
                    staffLine.BottomLine[index] = Math.max(staffLine.BottomLine[index], curvePoint.y);
                }
            }
        }
        this.finalizeLayout(rules, staffLine);
    }

    private createLayoutContext(
        startNote: GraphicalNote,
        endNote: GraphicalNote,
        staffLine: StaffLine,
        startX: number,
        startY: number,
        endX: number,
        endY: number,
        mode: SlurLayoutMode,
    ): SlurLayoutContext {
        const endpoint: (
            side: "start" | "end",
            note: GraphicalNote,
            x: number,
            y: number,
            attachment: SlurEndpointAttachment,
            notehead: GraphicalSlurBoundsDiagnostics,
        ) => SlurEndpointContext = (side, note, x, y, attachment, notehead): SlurEndpointContext => {
            const rendered: RenderedSlurEndpointGeometry = note
                ? this.renderedEndpointGeometry(note, staffLine)
                : undefined;
            const vexflowNote: VexFlowGraphicalNote = note as VexFlowGraphicalNote;
            return {
                side,
                present: Boolean(note),
                sourceNoteId: vexflowNote?.getSVGId?.(),
                stemDirection: note?.parentVoiceEntry?.parentVoiceEntry?.StemDirection,
                notehead,
                stem: rendered?.stem,
                beams: (rendered?.beamPolygons ?? []).map((polygon): SlurBounds => ({
                    left: Math.min(...polygon.map((point): number => point.x)),
                    right: Math.max(...polygon.map((point): number => point.x)),
                    top: Math.min(...polygon.map((point): number => point.y)),
                    bottom: Math.max(...polygon.map((point): number => point.y)),
                })),
                articulations: (rendered?.articulations ?? []).map((articulation, index) => {
                    const id: string = `${side}-articulation-${index}`;
                    this.candidateArticulationBindings.set(id, {
                        modifier: articulation.modifier,
                        note,
                        staffLine,
                        endpoint: side,
                        type: articulation.type,
                    });
                    return {
                        id,
                        sourceType: articulation.modifier?.osmdArticulationEnum,
                        glyphType: articulation.type,
                        classification: this.classifyArticulation(articulation.modifier?.osmdArticulationEnum),
                        position: articulation.position,
                        bounds: articulation.bounds,
                        outwardShift: articulation.modifier?.getOutwardShift?.() ?? 0,
                    };
                }),
                legacyAnchor: new PointF2D(x, y),
                legacyAttachment: attachment,
                tiedEndpoint: Boolean(note?.sourceNote?.NoteTie),
                chordSize: note?.parentVoiceEntry?.notes?.length ?? 0,
                grace: side === "start" ? Boolean(this.graceStart) : Boolean(this.graceEnd),
                systemBoundary: !note,
            };
        };
        const measureNumber: number = this.staffEntries[0]?.parentMeasure?.MeasureNumber;
        return {
            id: `slur-m${measureNumber ?? "unknown"}-s${this.diagnostics.segmentIndex}`,
            mode,
            direction: this.placement,
            start: endpoint(
                "start",
                startNote,
                startX,
                startY,
                this.diagnostics.startAttachment,
                this.diagnostics.startNotehead,
            ),
            end: endpoint(
                "end",
                endNote,
                endX,
                endY,
                this.diagnostics.endAttachment,
                this.diagnostics.endNotehead,
            ),
            obstacles: this.collectObstacles(staffLine, startNote, endNote, startX, endX),
            envelope: {
                samplingUnit: staffLine.SkyBottomLineCalculator.SamplingUnit,
                skyline: staffLine.SkyLine.slice(),
                bottomline: staffLine.BottomLine.slice(),
                topLineOffset: staffLine.TopLineOffset,
                bottomLineOffset: staffLine.BottomLineOffset,
                width: staffLine.PositionAndShape.Size.width,
            },
            segmentIndex: this.diagnostics.segmentIndex,
            segmentCount: this.diagnostics.segmentCount,
            isCrossStaff: this.slur.isCrossed(),
            isCrossSystem: this.diagnostics.segmentCount > 1,
            isNested: this.slur.startNoteHasMoreStartingSlurs() || this.slur.endNoteHasMoreEndingSlurs(),
        };
    }

    private classifyArticulation(sourceType: ArticulationEnum): SlurArticulationClass {
        switch (sourceType) {
            case ArticulationEnum.staccato:
            case ArticulationEnum.staccatissimo:
            case ArticulationEnum.spiccato:
            case ArticulationEnum.tenuto:
            case ArticulationEnum.detachedlegato:
                return "duration";
            case ArticulationEnum.accent:
            case ArticulationEnum.softaccent:
            case ArticulationEnum.strongaccent:
            case ArticulationEnum.marcatoup:
            case ArticulationEnum.marcatodown:
            case ArticulationEnum.invertedstrongaccent:
                return "force";
            case ArticulationEnum.stress:
            case ArticulationEnum.unstress:
                return "stress";
            default:
                return "other";
        }
    }

    private collectObstacles(
        staffLine: StaffLine,
        startNote: GraphicalNote,
        endNote: GraphicalNote,
        startX: number,
        endX: number,
    ): SlurObstacle[] {
        const obstacles: SlurObstacle[] = [];
        const seen: Set<string> = new Set();
        const addBounds: (
            type: SlurObstacle["type"],
            bounds: GraphicalSlurBoundsDiagnostics,
            id: string,
            endpoint?: "start" | "end",
            articulationClass?: SlurArticulationClass,
            polygon?: PointF2D[],
        ) => void = (type, bounds, id, endpoint, articulationClass, polygon): void => {
            if (!bounds
                || ![bounds.left, bounds.right, bounds.top, bounds.bottom].every(Number.isFinite)
                || bounds.right < startX - 1
                || bounds.left > endX + 1) {return;}
            const key: string = `${type}:${bounds.left.toFixed(3)}:${bounds.top.toFixed(3)}:`
                + `${bounds.right.toFixed(3)}:${bounds.bottom.toFixed(3)}`;
            if (seen.has(key)) {return;}
            seen.add(key);
            obstacles.push({
                id,
                type,
                bounds: {...bounds},
                endpoint,
                articulationClass,
                clearance: this.rules.SlurObstacleClearance,
                polygon,
            });
        };
        let noteIndex: number = 0;
        for (const staffEntry of this.staffEntries) {
            for (const graphicalTie of staffEntry.GraphicalTies) {
                const referenceNote: VexFlowGraphicalNote =
                    (graphicalTie.StartNote ?? graphicalTie.EndNote) as VexFlowGraphicalNote;
                const vfNote: any = referenceNote?.vfnote?.[0];
                const stave: any = vfNote?.getStave?.();
                const curves: any[] = (graphicalTie.vfTie as any)?.getRenderedTieCurves?.() ?? [];
                if (!stave || curves.length === 0) {
                    continue;
                }
                const measureX: number = referenceNote.parentVoiceEntry.parentStaffEntry.parentMeasure
                    .PositionAndShape.RelativePosition.x;
                const staveX: number = stave.getX?.() ?? 0;
                const staffTopY: number = stave.getYForLine?.(0) ?? stave.getY?.() ?? 0;
                const convert: (point: {x: number, y: number}) => PointF2D =
                    (point): PointF2D => new PointF2D(
                        measureX + (point.x - staveX) / vexflowUnitInPixels,
                        staffLine.TopLineOffset + (point.y - staffTopY) / vexflowUnitInPixels,
                    );
                curves.forEach((tieCurve, tieIndex): void => {
                    const start: PointF2D = convert(tieCurve.start);
                    const end: PointF2D = convert(tieCurve.end);
                    const topControl: PointF2D = convert(tieCurve.topControl);
                    const bottomControl: PointF2D = convert(tieCurve.bottomControl);
                    const quadraticControl: PointF2D = new PointF2D(
                        (topControl.x + bottomControl.x) / 2,
                        (topControl.y + bottomControl.y) / 2,
                    );
                    const curve: SlurCurveGeometry = {
                        p0: start,
                        p1: new PointF2D(
                            start.x + (quadraticControl.x - start.x) * 2 / 3,
                            start.y + (quadraticControl.y - start.y) * 2 / 3,
                        ),
                        p2: new PointF2D(
                            end.x + (quadraticControl.x - end.x) * 2 / 3,
                            end.y + (quadraticControl.y - end.y) * 2 / 3,
                        ),
                        p3: end,
                    };
                    const xs: number[] = [start.x, end.x, topControl.x, bottomControl.x];
                    const ys: number[] = [start.y, end.y, topControl.y, bottomControl.y];
                    const endpoint: "start" | "end" | undefined =
                        graphicalTie.StartNote === startNote || graphicalTie.EndNote === startNote
                            ? "start"
                            : graphicalTie.StartNote === endNote || graphicalTie.EndNote === endNote
                                ? "end"
                                : undefined;
                    addBounds("tie", {
                        left: Math.min(...xs),
                        right: Math.max(...xs),
                        top: Math.min(...ys),
                        bottom: Math.max(...ys),
                    }, `tie-${noteIndex}-${tieIndex}`, endpoint);
                    const obstacle: SlurObstacle = obstacles[obstacles.length - 1];
                    if (obstacle?.type === "tie") {
                        obstacle.curve = curve;
                    }
                });
            }
            for (const voiceEntry of staffEntry.graphicalVoiceEntries) {
                for (const note of voiceEntry.notes) {
                    const geometry: RenderedSlurEndpointGeometry = this.renderedEndpointGeometry(note, staffLine);
                    if (!geometry) {continue;}
                    // A chord endpoint can be laid out against an outer notehead
                    // other than the source GraphicalNote. Treat the complete
                    // chord as the endpoint group so that its selected outer head
                    // is not immediately reintroduced as a forbidden obstacle.
                    const endpoint: "start" | "end" | undefined =
                        note?.parentVoiceEntry === startNote?.parentVoiceEntry
                        ? "start"
                        : note?.parentVoiceEntry === endNote?.parentVoiceEntry ? "end" : undefined;
                    const prefix: string = `note-${noteIndex++}`;
                    addBounds(note.sourceNote?.ParentVoiceEntry?.IsGrace ? "grace-note" : "notehead",
                        geometry.notehead, `${prefix}-head`, endpoint);
                    if (geometry.stem) {addBounds("stem", geometry.stem, `${prefix}-stem`, endpoint);}
                    geometry.accidentals.forEach((bounds, accidentalIndex): void => {
                        addBounds("accidental", bounds, `${prefix}-accidental-${accidentalIndex}`);
                    });
                    geometry.tuplets.forEach((bounds, tupletIndex): void => {
                        addBounds("tuplet", bounds, `${prefix}-tuplet-${tupletIndex}`);
                    });
                    geometry.beamPolygons.forEach((polygon, beamIndex): void => {
                        const xs: number[] = polygon.map((point): number => point.x);
                        const ys: number[] = polygon.map((point): number => point.y);
                        addBounds("beam", {
                            left: Math.min(...xs),
                            right: Math.max(...xs),
                            top: Math.min(...ys),
                            bottom: Math.max(...ys),
                        }, `${prefix}-beam-${beamIndex}`, undefined, undefined, polygon);
                    });
                    geometry.articulations.forEach((articulation, articulationIndex): void => {
                        const classification: SlurArticulationClass = this.classifyArticulation(
                            articulation.modifier?.osmdArticulationEnum,
                        );
                        addBounds(
                            classification === "other" ? "other" : `${classification}-articulation`,
                            articulation.bounds,
                            `${prefix}-articulation-${articulationIndex}`,
                            endpoint,
                            classification,
                        );
                    });
                }
            }
        }
        for (const selectedSlur of staffLine.GraphicalSlurs) {
            const geometry: SlurCurveGeometry = selectedSlur === this
                ? undefined
                : selectedSlur.layoutResult?.geometry;
            if (!geometry) {
                continue;
            }
            const xs: number[] = [geometry.p0.x, geometry.p1.x, geometry.p2.x, geometry.p3.x];
            const ys: number[] = [geometry.p0.y, geometry.p1.y, geometry.p2.y, geometry.p3.y];
            addBounds("slur", {
                left: Math.min(...xs),
                right: Math.max(...xs),
                top: Math.min(...ys),
                bottom: Math.max(...ys),
            }, `selected-slur-${obstacles.length}`);
            const obstacle: SlurObstacle = obstacles[obstacles.length - 1];
            if (obstacle?.type === "slur") {
                obstacle.curve = geometry;
            }
        }
        return obstacles;
    }

    private finalizeLayout(rules: EngravingRules, staffLine: StaffLine): void {
        if (rules.SlurLayoutMode === "legacy" || !this.layoutContext) {
            this.captureLayoutResult(rules.SlurLayoutMode, "normal");
            return;
        }
        const seed: SlurCurveGeometry = {
            p0: new PointF2D(this.bezierStartPt.x, this.bezierStartPt.y),
            p1: new PointF2D(this.bezierStartControlPt.x, this.bezierStartControlPt.y),
            p2: new PointF2D(this.bezierEndControlPt.x, this.bezierEndControlPt.y),
            p3: new PointF2D(this.bezierEndPt.x, this.bezierEndPt.y),
        };
        this.layoutResult = calculateCandidateSlurLayout(this.layoutContext, seed, {
            candidateLimit: rules.SlurCandidateLimit,
            diagnosticsLevel: rules.SlurDiagnosticsLevel,
            maximumPreferredClearance: rules.SlurMaximumPreferredClearance,
            obstacleClearance: rules.SlurObstacleClearance,
            scoreWeights: rules.SlurCandidateScoreWeights,
        });
        this.applyCandidateArticulationAdjustments();
        const geometry: SlurCurveGeometry = this.layoutResult.geometry;
        this.bezierStartPt = cloneSlurPoint(geometry.p0);
        this.bezierStartControlPt = cloneSlurPoint(geometry.p1);
        this.bezierEndControlPt = cloneSlurPoint(geometry.p2);
        this.bezierEndPt = cloneSlurPoint(geometry.p3);
        for (const update of this.layoutResult.skylineUpdates) {
            if (update.index >= 0 && update.index < staffLine.SkyLine.length) {
                staffLine.SkyLine[update.index] = Math.min(staffLine.SkyLine[update.index], update.value);
            }
        }
        for (const update of this.layoutResult.bottomlineUpdates) {
            if (update.index >= 0 && update.index < staffLine.BottomLine.length) {
                staffLine.BottomLine[update.index] = Math.max(staffLine.BottomLine[update.index], update.value);
            }
        }
        this.diagnostics.selectedCandidateId = this.layoutResult.selectedCandidateId;
        this.diagnostics.candidateCount = this.layoutResult.candidates.length;
        const selected: SlurCurveCandidate = this.layoutResult.candidates.find(
            (candidate): boolean => candidate.id === this.layoutResult.selectedCandidateId,
        );
        this.diagnostics.faults = selected?.rejected
            ? [`no-valid-candidate:${selected.rejectionReason ?? "unknown"}`]
            : [];
        this.diagnostics.startAttachment = selected?.startAnchor?.type
            ?? this.diagnostics.startAttachment;
        this.diagnostics.endAttachment = selected?.endAnchor?.type
            ?? this.diagnostics.endAttachment;
    }

    private applyCandidateArticulationAdjustments(): void {
        for (const adjustment of this.layoutResult?.articulationAdjustments ?? []) {
            const binding: CandidateArticulationBinding =
                this.candidateArticulationBindings.get(adjustment.articulationId);
            if (!binding) {
                continue;
            }
            const previousShiftPx: number = binding.modifier.getOutwardShift?.() ?? 0;
            binding.modifier.setOutwardShift?.(adjustment.outwardShift);
            binding.modifier.layout?.();
            const finalGeometry: RenderedSlurEndpointGeometry =
                this.renderedEndpointGeometry(binding.note, binding.staffLine);
            const finalArticulation: RenderedSlurEndpointGeometry["articulations"][number] =
                finalGeometry?.articulations.find(
                (candidate): boolean => candidate.modifier === binding.modifier,
            );
            if (!finalArticulation) {
                continue;
            }
            if (this.placement === PlacementEnum.Above) {
                binding.staffLine.SkyBottomLineCalculator.updateSkyLineInRange(
                    finalArticulation.bounds.left,
                    finalArticulation.bounds.right,
                    finalArticulation.bounds.top,
                );
            } else {
                binding.staffLine.SkyBottomLineCalculator.updateBottomLineInRange(
                    finalArticulation.bounds.left,
                    finalArticulation.bounds.right,
                    finalArticulation.bounds.bottom,
                );
            }
            this.diagnostics.articulationShifts.push({
                baseline: finalArticulation.baseline,
                endpoint: binding.endpoint,
                glyph: String(binding.modifier.getText?.() ?? ""),
                type: binding.type,
                previousShiftPx,
                finalShiftPx: adjustment.outwardShift,
                bounds: finalArticulation.bounds,
            });
        }
    }

    private captureLayoutResult(mode: SlurLayoutMode, family: "normal"): void {
        const geometry: SlurCurveGeometry = {
            p0: new PointF2D(this.bezierStartPt.x, this.bezierStartPt.y),
            p1: new PointF2D(this.bezierStartControlPt.x, this.bezierStartControlPt.y),
            p2: new PointF2D(this.bezierEndControlPt.x, this.bezierEndControlPt.y),
            p3: new PointF2D(this.bezierEndPt.x, this.bezierEndPt.y),
        };
        const makeAnchor: (side: "start" | "end", point: PointF2D) => SlurAnchorCandidate =
            (side, point): SlurAnchorCandidate => ({
                id: `${this.layoutContext?.id ?? "slur"}-${side}-legacy`,
                x: point.x,
                y: point.y,
                type: side === "start"
                    ? this.diagnostics.startAttachment ?? "voice-entry"
                    : this.diagnostics.endAttachment ?? "voice-entry",
                side,
                direction: this.placement,
                penalties: {
                    displacement: 0,
                    articulationRelationship: 0,
                    stemRelationship: 0,
                    tieConflict: 0,
                },
                generationIndex: 0,
            });
        const startAnchor: SlurAnchorCandidate = makeAnchor("start", geometry.p0);
        const endAnchor: SlurAnchorCandidate = makeAnchor("end", geometry.p3);
        const candidate: SlurCurveCandidate = {
            id: `${this.layoutContext?.id ?? "slur"}-legacy-normal`,
            startAnchor,
            endAnchor,
            geometry,
            family,
            rejected: false,
            generationIndex: 0,
            articulationAdjustments: [],
        };
        this.layoutResult = {
            mode,
            geometry,
            selectedCandidateId: candidate.id,
            family,
            candidates: [candidate],
            articulationAdjustments: [],
            skylineUpdates: [],
            bottomlineUpdates: [],
        };
        this.diagnostics.selectedCandidateId = candidate.id;
        this.diagnostics.candidateCount = 1;
    }

    private applySystemBreakTangents(hasStartNote: boolean, hasEndNote: boolean): void {
        if (!hasStartNote) {
            this.bezierStartControlPt.y = this.bezierStartPt.y;
        }
        if (!hasEndNote) {
            this.bezierEndControlPt.y = this.bezierEndPt.y;
        }
    }


    /**
     * Calculates the bezier curve for a slur that crosses between two staves (e.g. left hand to right hand),
     * where the start and end notes lie on different stafflines that are stacked vertically within the same
     * MusicSystem. Unlike [[calculateCurve]], this runs from the post-system-layout calculator hook, because
     * it needs the final vertical positions of both stafflines after calculateSlurs().
     *
     * The resulting bezier points are stored relative to the start note's staffline, so the regular drawSlur()
     * (which adds that staffline's absolute position) renders them at the correct absolute location.
     * @returns true if the curve was calculated and can be drawn, false otherwise (e.g. missing notes, or the
     * two staves are not in the same MusicSystem - a cross-staff plus cross-system slur is not supported).
     */
    public calculateCurveCrossStaff(rules: EngravingRules): boolean {
        this.candidateArticulationBindings.clear();
        if (rules.SlurLayoutMode === "candidate") {
            this.diagnostics.articulationShifts = [];
        }
        const slurStartNote: GraphicalNote = rules.GNote(this.slur.StartNote);
        const slurEndNote: GraphicalNote = rules.GNote(this.slur.EndNote);
        if (!slurStartNote || !slurEndNote) {
            return false;
        }
        const startStaffLine: StaffLine = slurStartNote.parentVoiceEntry?.parentStaffEntry?.parentMeasure?.ParentStaffLine;
        const endStaffLine: StaffLine = slurEndNote.parentVoiceEntry?.parentStaffEntry?.parentMeasure?.ParentStaffLine;
        if (!startStaffLine || !endStaffLine) {
            return false;
        }
        // Only handle staves stacked within the same MusicSystem (the regular cross-staff case).
        if (startStaffLine.ParentMusicSystem !== endStaffLine.ParentMusicSystem) {
            this.markUnsupportedCrossStaffSystemBreak();
            return false;
        }
        const systemBox: BoundingBox = startStaffLine.ParentMusicSystem.PositionAndShape;

        // notehead positions of both notes, relative to the common MusicSystem
        const startPos: PointF2D = this.positionRelativeToBox(slurStartNote.PositionAndShape, systemBox);
        const endPos: PointF2D = this.positionRelativeToBox(slurEndNote.PositionAndShape, systemBox);

        // Express everything relative to the start note's staffline, since drawSlur() adds that staffline's
        // absolute position to the bezier points.
        const staffLineOffset: PointF2D = startStaffLine.PositionAndShape.RelativePosition;
        const startX: number = startPos.x - staffLineOffset.x;
        const endX: number = endPos.x - staffLineOffset.x;
        const startNoteY: number = startPos.y - staffLineOffset.y;
        const endNoteY: number = endPos.y - staffLineOffset.y;

        const noteHeadHalfHeight: number = 0.5;
        const yGap: number = rules.SlurNoteHeadYOffset; // gap between notehead and slur tip
        // Piano cross-staff gestures conventionally remain one upward-bowing
        // phrase. Approaching either endpoint from below makes one end look
        // inverted and attaches it beneath the destination notehead.
        const startY: number = startNoteY - noteHeadHalfHeight - yGap;
        const endY: number = endNoteY - noteHeadHalfHeight - yGap;
        this.placement = PlacementEnum.Above;

        // The curve bows out (vertically) from the line connecting the two notes.
        const dx: number = endX - startX;
        const dy: number = endY - startY;
        const distance: number = Math.sqrt(dx * dx + dy * dy);
        const bow: number = Math.max(rules.SlurCrossStaffMinBow,
                                     Math.min(rules.SlurCrossStaffMaxBow, distance * rules.SlurCrossStaffBowFactor));
        const bowSign: number = -1; // upwards (smaller y)

        this.bezierStartPt = new PointF2D(startX, startY);
        this.bezierStartControlPt = new PointF2D(startX + dx * 0.25, startY + dy * 0.25 + bowSign * bow);
        this.bezierEndControlPt = new PointF2D(startX + dx * 0.75, startY + dy * 0.75 + bowSign * bow);
        this.bezierEndPt = new PointF2D(endX, endY);
        this.diagnostics.mode = rules.SlurLayoutMode;
        this.diagnostics.startAttachment = "notehead";
        this.diagnostics.endAttachment = "notehead";
        if (rules.SlurLayoutMode === "candidate") {
            this.layoutContext = this.createCrossStaffLayoutContext(
                slurStartNote,
                slurEndNote,
                startStaffLine,
                endStaffLine,
            );
            const seed: SlurCurveGeometry = {
                p0: cloneSlurPoint(this.bezierStartPt),
                p1: cloneSlurPoint(this.bezierStartControlPt),
                p2: cloneSlurPoint(this.bezierEndControlPt),
                p3: cloneSlurPoint(this.bezierEndPt),
            };
            this.layoutResult = calculateCandidateSlurLayout(this.layoutContext, seed, {
                candidateLimit: rules.SlurCandidateLimit,
                diagnosticsLevel: rules.SlurDiagnosticsLevel,
                maximumPreferredClearance: rules.SlurMaximumPreferredClearance,
                obstacleClearance: rules.SlurObstacleClearance,
                scoreWeights: rules.SlurCandidateScoreWeights,
            });
            this.applyCandidateArticulationAdjustments();
            this.bezierStartPt = cloneSlurPoint(this.layoutResult.geometry.p0);
            this.bezierStartControlPt = cloneSlurPoint(this.layoutResult.geometry.p1);
            this.bezierEndControlPt = cloneSlurPoint(this.layoutResult.geometry.p2);
            this.bezierEndPt = cloneSlurPoint(this.layoutResult.geometry.p3);
            this.diagnostics.selectedCandidateId = this.layoutResult.selectedCandidateId;
            this.diagnostics.candidateCount = this.layoutResult.candidates.length;
            const selected: SlurCurveCandidate = this.layoutResult.candidates.find(
                (candidate): boolean => candidate.id === this.layoutResult.selectedCandidateId,
            );
            this.diagnostics.faults = selected?.rejected
                ? [`no-valid-candidate:${selected.rejectionReason ?? "unknown"}`]
                : [];
            this.diagnostics.startAttachment = selected?.startAnchor.type ?? "notehead";
            this.diagnostics.endAttachment = selected?.endAnchor.type ?? "notehead";
        } else {
            this.captureLayoutResult(rules.SlurLayoutMode, "normal");
        }
        return true;
    }

    private createCrossStaffLayoutContext(
        startNote: GraphicalNote,
        endNote: GraphicalNote,
        startStaffLine: StaffLine,
        endStaffLine: StaffLine,
    ): SlurLayoutContext {
        const startGeometry: RenderedSlurEndpointGeometry =
            this.renderedEndpointGeometry(startNote, startStaffLine);
        const rawEndGeometry: RenderedSlurEndpointGeometry =
            this.renderedEndpointGeometry(endNote, endStaffLine);
        const yOffset: number = endStaffLine.PositionAndShape.RelativePosition.y
            - startStaffLine.PositionAndShape.RelativePosition.y;
        const translateBounds: (
            bounds: GraphicalSlurBoundsDiagnostics,
            offset: number,
        ) => GraphicalSlurBoundsDiagnostics = (bounds, offset): GraphicalSlurBoundsDiagnostics => bounds
            ? {left: bounds.left, right: bounds.right, top: bounds.top + offset, bottom: bounds.bottom + offset}
            : undefined;
        const endGeometry: RenderedSlurEndpointGeometry = rawEndGeometry
            ? {
                notehead: translateBounds(rawEndGeometry.notehead, yOffset),
                stem: translateBounds(rawEndGeometry.stem, yOffset),
                articulations: rawEndGeometry.articulations.map((articulation) => ({
                    ...articulation,
                    baseline: new PointF2D(articulation.baseline.x, articulation.baseline.y + yOffset),
                    bounds: translateBounds(articulation.bounds, yOffset),
                })),
                beamPolygons: rawEndGeometry.beamPolygons.map((polygon): PointF2D[] =>
                    polygon.map((point): PointF2D => new PointF2D(point.x, point.y + yOffset)),
                ),
                accidentals: rawEndGeometry.accidentals.map(
                    (bounds): GraphicalSlurBoundsDiagnostics => translateBounds(bounds, yOffset),
                ),
                tuplets: rawEndGeometry.tuplets.map(
                    (bounds): GraphicalSlurBoundsDiagnostics => translateBounds(bounds, yOffset),
                ),
            }
            : undefined;
        const makeEndpoint: (
            side: "start" | "end",
            note: GraphicalNote,
            geometry: RenderedSlurEndpointGeometry,
            point: PointF2D,
        ) => SlurEndpointContext = (side, note, geometry, point): SlurEndpointContext => ({
            side,
            present: true,
            sourceNoteId: (note as VexFlowGraphicalNote)?.getSVGId?.(),
            stemDirection: note?.parentVoiceEntry?.parentVoiceEntry?.StemDirection,
            notehead: geometry?.notehead,
            stem: geometry?.stem,
            beams: (geometry?.beamPolygons ?? []).map((polygon): SlurBounds => ({
                left: Math.min(...polygon.map((candidate): number => candidate.x)),
                right: Math.max(...polygon.map((candidate): number => candidate.x)),
                top: Math.min(...polygon.map((candidate): number => candidate.y)),
                bottom: Math.max(...polygon.map((candidate): number => candidate.y)),
            })),
            articulations: (geometry?.articulations ?? []).map((articulation, index) => {
                const id: string = `${side}-articulation-${index}`;
                this.candidateArticulationBindings.set(id, {
                    modifier: articulation.modifier,
                    note,
                    staffLine: side === "start" ? startStaffLine : endStaffLine,
                    endpoint: side,
                    type: articulation.type,
                });
                return {
                    id,
                    sourceType: articulation.modifier?.osmdArticulationEnum,
                    glyphType: articulation.type,
                    classification: this.classifyArticulation(articulation.modifier?.osmdArticulationEnum),
                    position: articulation.position,
                    bounds: articulation.bounds,
                    outwardShift: articulation.modifier?.getOutwardShift?.() ?? 0,
                };
            }),
            legacyAnchor: cloneSlurPoint(point),
            legacyAttachment: "notehead",
            tiedEndpoint: Boolean(note?.sourceNote?.NoteTie),
            chordSize: note?.parentVoiceEntry?.notes?.length ?? 0,
            grace: side === "start" ? Boolean(this.graceStart) : Boolean(this.graceEnd),
            systemBoundary: false,
        });
        const samplingUnit: number = startStaffLine.SkyBottomLineCalculator.SamplingUnit;
        const width: number = startStaffLine.PositionAndShape.Size.width;
        const sampleLength: number = Math.max(1, Math.ceil(width * samplingUnit));
        const baseline: number[] = Array(sampleLength);
        for (let index: number = 0; index < sampleLength; index++) {
            baseline[index] = lineValueAtX(this.bezierStartPt, this.bezierEndPt, index / samplingUnit);
        }
        const obstacles: SlurObstacle[] = [];
        if (startGeometry?.notehead) {
            obstacles.push({
                id: "cross-staff-start-head",
                type: "notehead",
                bounds: {...startGeometry.notehead},
                endpoint: "start",
                clearance: this.rules.SlurObstacleClearance,
            });
        }
        if (endGeometry?.notehead) {
            obstacles.push({
                id: "cross-staff-end-head",
                type: "notehead",
                bounds: {...endGeometry.notehead},
                endpoint: "end",
                clearance: this.rules.SlurObstacleClearance,
            });
        }
        return {
            id: `slur-cross-staff-m${this.staffEntries[0]?.parentMeasure?.MeasureNumber ?? "unknown"}`,
            mode: "candidate",
            direction: PlacementEnum.Above,
            start: makeEndpoint("start", startNote, startGeometry, this.bezierStartPt),
            end: makeEndpoint("end", endNote, endGeometry, this.bezierEndPt),
            obstacles,
            envelope: {
                samplingUnit,
                skyline: baseline,
                bottomline: baseline,
                topLineOffset: Math.max(this.bezierStartPt.y, this.bezierEndPt.y) + 100,
                bottomLineOffset: Math.min(this.bezierStartPt.y, this.bezierEndPt.y) - 100,
                width,
            },
            segmentIndex: this.diagnostics.segmentIndex,
            segmentCount: this.diagnostics.segmentCount,
            isCrossStaff: true,
            isCrossSystem: false,
            isNested: false,
        };
    }

    /**
     * Sums the relative positions from box up to (but not including) the given ancestor box, giving box's
     * position in the ancestor's coordinate system.
     */
    private positionRelativeToBox(box: BoundingBox, ancestor: BoundingBox): PointF2D {
        let x: number = 0;
        let y: number = 0;
        let current: BoundingBox = box;
        while (current && current !== ancestor) {
            x += current.RelativePosition.x;
            y += current.RelativePosition.y;
            current = current.Parent;
        }
        return new PointF2D(x, y);
    }

    /**
     * This method calculates the Start and End Positions of the Slur Curve.
     * @param slurStartNote
     * @param slurEndNote
     * @param staffLine
     * @param startX
     * @param startY
     * @param endX
     * @param endY
     * @param rules
     * @param skyBottomLineCalculator
     */
    private calculateStartAndEnd(
        slurStartNote: GraphicalNote,
        slurEndNote: GraphicalNote,
        staffLine: StaffLine,
        rules: EngravingRules,
    ): {startX: number, startY: number, endX: number, endY: number} {
        const continuationY: number = this.placement === PlacementEnum.Above
            ? staffLine.TopLineOffset - 1.5
            : staffLine.BottomLineOffset + 1.5;
        let startX: number = this.staffEntries[0].parentMeasure.beginInstructionsWidth;
        let startY: number = continuationY;
        let endX: number = staffLine.PositionAndShape.Size.width;
        let endY: number = continuationY;

        if (slurStartNote) {
            const startVoiceEntry: GraphicalVoiceEntry = slurStartNote.parentVoiceEntry;
            const startStaffEntry: GraphicalStaffEntry = startVoiceEntry.parentStaffEntry;
            startX = startStaffEntry.parentMeasure.PositionAndShape.RelativePosition.x
                + startStaffEntry.PositionAndShape.RelativePosition.x
                + slurStartNote.PositionAndShape.RelativePosition.x;
            if (this.graceStart) {
                startX += startStaffEntry.staffEntryParent.PositionAndShape.RelativePosition.x;
            }
            startY = startVoiceEntry.PositionAndShape.RelativePosition.y
                + (this.placement === PlacementEnum.Above
                    ? startVoiceEntry.PositionAndShape.BorderTop
                    : startVoiceEntry.PositionAndShape.BorderBottom);
            if (this.rules.SlurPlacementUseSkyBottomLine) {
                startY = this.placement === PlacementEnum.Above
                    ? Math.min(startY, startStaffEntry.getSkylineMin())
                    : Math.max(startY, startStaffEntry.getBottomlineMax());
            }

            const chordEndpoint: boolean = startVoiceEntry.notes.length > 1;
            const geometry: RenderedSlurEndpointGeometry = chordEndpoint
                ? this.renderedOuterChordGeometry(slurStartNote, staffLine)
                : this.renderedEndpointGeometry(slurStartNote, staffLine);
            if (geometry) {
                this.diagnostics.startNotehead = geometry.notehead;
            }

            const stemSide: boolean =
                (startVoiceEntry.parentVoiceEntry.StemDirection === StemDirectionType.Up
                    && this.placement === PlacementEnum.Above)
                || (startVoiceEntry.parentVoiceEntry.StemDirection === StemDirectionType.Down
                    && this.placement === PlacementEnum.Below);
            const tieFallback: boolean = slurStartNote.sourceNote !== this.slur.StartNote;
            if (geometry && (chordEndpoint || !stemSide) && !tieFallback) {
                startX = geometry.notehead.right;
                startY = this.placement === PlacementEnum.Above
                    ? geometry.notehead.top
                    : geometry.notehead.bottom;
                this.diagnostics.startAttachment = "notehead";
            } else if (stemSide) {
                startX += startVoiceEntry.parentVoiceEntry.StemDirection === StemDirectionType.Up ? 0.5 : -0.5;
                this.diagnostics.startAttachment = "stem";
            } else {
                this.diagnostics.startAttachment = "voice-entry";
            }
        } else {
            this.diagnostics.startAttachment = "system-edge";
        }

        if (slurEndNote) {
            const endVoiceEntry: GraphicalVoiceEntry = slurEndNote.parentVoiceEntry;
            const endStaffEntry: GraphicalStaffEntry = endVoiceEntry.parentStaffEntry;
            endX = endStaffEntry.parentMeasure.PositionAndShape.RelativePosition.x
                + endStaffEntry.PositionAndShape.RelativePosition.x
                + slurEndNote.PositionAndShape.RelativePosition.x;
            if (this.graceEnd) {
                endX += endStaffEntry.staffEntryParent.PositionAndShape.RelativePosition.x;
            }
            endY = endVoiceEntry.PositionAndShape.RelativePosition.y
                + (this.placement === PlacementEnum.Above
                    ? endVoiceEntry.PositionAndShape.BorderTop
                    : endVoiceEntry.PositionAndShape.BorderBottom);
            if (this.rules.SlurPlacementUseSkyBottomLine) {
                endY = this.placement === PlacementEnum.Above
                    ? Math.min(endY, endStaffEntry.getSkylineMin())
                    : Math.max(endY, endStaffEntry.getBottomlineMax());
            }

            const chordEndpoint: boolean = endVoiceEntry.notes.length > 1;
            const geometry: RenderedSlurEndpointGeometry = chordEndpoint
                ? this.renderedOuterChordGeometry(slurEndNote, staffLine)
                : this.renderedEndpointGeometry(slurEndNote, staffLine);
            if (geometry) {
                this.diagnostics.endNotehead = geometry.notehead;
            }

            const stemSide: boolean =
                (endVoiceEntry.parentVoiceEntry.StemDirection === StemDirectionType.Up
                    && this.placement === PlacementEnum.Above)
                || (endVoiceEntry.parentVoiceEntry.StemDirection === StemDirectionType.Down
                    && this.placement === PlacementEnum.Below);
            const tieFallback: boolean = slurEndNote.sourceNote !== this.slur.EndNote;
            if (geometry && (chordEndpoint || !stemSide) && !tieFallback) {
                endX = geometry.notehead.left;
                endY = this.placement === PlacementEnum.Above
                    ? geometry.notehead.top
                    : geometry.notehead.bottom;
                this.diagnostics.endAttachment = "notehead";
            } else if (stemSide) {
                endX += endVoiceEntry.parentVoiceEntry.StemDirection === StemDirectionType.Up ? 0.5 : -0.5;
                this.diagnostics.endAttachment = "stem";
            } else {
                this.diagnostics.endAttachment = "voice-entry";
            }
        } else {
            this.diagnostics.endAttachment = "system-edge";
        }

        // if two slurs start/end at the same GraphicalNote, then the second gets an offset
        if (this.slur.startNoteHasMoreStartingSlurs() && this.slur.isSlurLonger()) {
            if (this.placement === PlacementEnum.Above) {
                startY -= rules.SlursStartingAtSameStaffEntryYOffset;
            } else { startY += rules.SlursStartingAtSameStaffEntryYOffset; }
        }
        if (this.slur.endNoteHasMoreEndingSlurs() && this.slur.isSlurLonger()) {
            if (this.placement === PlacementEnum.Above) {
                endY -= rules.SlursStartingAtSameStaffEntryYOffset;
            } else { endY += rules.SlursStartingAtSameStaffEntryYOffset; }
        }

        if (this.placement === PlacementEnum.Above) {
            if (this.diagnostics.startAttachment !== "notehead") {
                startY = Math.min(startY, 1.5);
            }
            if (this.diagnostics.endAttachment !== "notehead") {
                endY = Math.min(endY, 1.5);
            }
        } else {
            if (this.diagnostics.startAttachment !== "notehead") {
                startY = Math.max(startY, staffLine.StaffHeight - 1.5);
            }
            if (this.diagnostics.endAttachment !== "notehead") {
                endY = Math.max(endY, staffLine.StaffHeight - 1.5);
            }
        }

        return {startX, startY, endX, endY};
    }

    /**
     * This method calculates the placement of the Curve.
     * @param skyBottomLineCalculator
     * @param staffLine
     */
    private calculatePlacement(skyBottomLineCalculator: SkyBottomLineCalculator, staffLine: StaffLine): void {
        // old version: when lyrics are given place above:
        // if ( !this.slur.StartNote.ParentVoiceEntry.LyricsEntries.isEmpty || (this.slur.EndNote
        //                                     && !this.slur.EndNote.ParentVoiceEntry.LyricsEntries.isEmpty) ) {
        //     this.placement = PlacementEnum.Above;
        //     return;
        // }

        if (this.rules.SlurPlacementFromXML && this.slur.PlacementXml !== PlacementEnum.NotYetDefined) {
            this.placement = this.slur.PlacementXml;
            return;
        }

        // if any StaffEntry belongs to a Measure with multiple Voices, than
        // if Slur's Start- or End-Note belongs to a LinkedVoice Below else Above
        for (let idx: number = 0, len: number = this.staffEntries.length; idx < len; ++idx) {
            const graphicalStaffEntry: GraphicalStaffEntry = this.staffEntries[idx];
            if (graphicalStaffEntry.parentMeasure.hasMultipleVoices()) {
                if (this.slur.StartNote.ParentVoiceEntry.ParentVoice instanceof LinkedVoice ||
                    this.slur.EndNote.ParentVoiceEntry.ParentVoice instanceof LinkedVoice) {
                    this.placement = PlacementEnum.Below;
                } else { this.placement = PlacementEnum.Above; }
                return;
            }
        }

        // when lyrics are given place above:
        for (let idx: number = 0, len: number = this.staffEntries.length; idx < len; ++idx) {
            const graphicalStaffEntry: GraphicalStaffEntry = this.staffEntries[idx];
            if (graphicalStaffEntry.LyricsEntries.length > 0) {
                this.placement = PlacementEnum.Above;
                return;
            }
        }
        const startStaffEntry: GraphicalStaffEntry = this.staffEntries[0];
        const endStaffEntry: GraphicalStaffEntry = this.staffEntries[this.staffEntries.length - 1];

        // single Voice, opposite to StemDirection
        // here should only be one voiceEntry, so we can take graphicalVoiceEntries[0]:
        const startStemDirection: StemDirectionType = startStaffEntry.graphicalVoiceEntries[0].parentVoiceEntry.StemDirection;
        const endStemDirection: StemDirectionType = endStaffEntry.graphicalVoiceEntries[0].parentVoiceEntry.StemDirection;
        if (startStemDirection  ===
            endStemDirection) {
            this.placement = (startStemDirection === StemDirectionType.Up) ? PlacementEnum.Below : PlacementEnum.Above;
            if (this.rules.SlurPlacementAtStems) {
                this.placement = (startStemDirection === StemDirectionType.Up) ? PlacementEnum.Above : PlacementEnum.Below;
            }
        } else {
            // Placement at the side with the minimum border
            let sX: number = startStaffEntry.PositionAndShape.BorderLeft + startStaffEntry.PositionAndShape.RelativePosition.x
                        + startStaffEntry.parentMeasure.PositionAndShape.RelativePosition.x;
            let eX: number = endStaffEntry.PositionAndShape.BorderRight + endStaffEntry.PositionAndShape.RelativePosition.x
                        + endStaffEntry.parentMeasure.PositionAndShape.RelativePosition.x;

            if (this.graceStart) {
                sX += endStaffEntry.PositionAndShape.RelativePosition.x;
            }
            if (this.graceEnd) {
                eX += endStaffEntry.staffEntryParent.PositionAndShape.RelativePosition.x;
            }

            // get SkyBottomLine borders
            const minAbove: number = skyBottomLineCalculator.getSkyLineMinInRange(sX, eX) * -1;
            const maxBelow: number = skyBottomLineCalculator.getBottomLineMaxInRange(sX, eX) - staffLine.StaffHeight;

            if (maxBelow > minAbove) {
                this.placement = PlacementEnum.Above;
            } else { this.placement = PlacementEnum.Below; }
        }
    }

    /**
     * This method calculates the Points between Start- and EndPoint (case above).
     * @param start
     * @param end
     * @param staffLine
     * @param skyBottomLineCalculator
     */
    private calculateTopPoints(start: PointF2D, end: PointF2D, staffLine: StaffLine, skyBottomLineCalculator: SkyBottomLineCalculator): PointF2D[] {
        const points: PointF2D[] = [];
        let startIndex: number = skyBottomLineCalculator.getRightIndexForPointX(start.x, staffLine.SkyLine.length);
        let endIndex: number = skyBottomLineCalculator.getLeftIndexForPointX(end.x, staffLine.SkyLine.length);

        if (startIndex < 0) {
            startIndex = 0;
        }
        if (endIndex >= staffLine.SkyLine.length) {
            endIndex = staffLine.SkyLine.length - 1;
        }

        for (let i: number = startIndex; i < endIndex; i++) {
            const skylineValue: number = staffLine.SkyLine[i];
            // ignore default value (= 0) which is upper border of staffline
            if (skylineValue !== 0) {
                const point: PointF2D = new PointF2D((0.5 + i) / skyBottomLineCalculator.SamplingUnit, skylineValue);
                points.push(point);
            }
        }

        return points;
    }

    /**
     * This method calculates the Points between Start- and EndPoint (case below).
     * @param start
     * @param end
     * @param staffLine
     * @param skyBottomLineCalculator
     */
    private calculateBottomPoints(start: PointF2D, end: PointF2D, staffLine: StaffLine, skyBottomLineCalculator: SkyBottomLineCalculator): PointF2D[] {
        const points: PointF2D[] = [];

        // get BottomLine indices
        let startIndex: number = skyBottomLineCalculator.getRightIndexForPointX(start.x, staffLine.BottomLine.length);
        let endIndex: number = skyBottomLineCalculator.getLeftIndexForPointX(end.x, staffLine.BottomLine.length);
        if (startIndex < 0) {
            startIndex = 0;
        }
        if (endIndex >= staffLine.BottomLine.length) {
            endIndex = staffLine.BottomLine.length - 1;
        }

        for (let i: number = startIndex; i < endIndex; i++) {
            const bottomLineValue: number = staffLine.BottomLine[i];

            // ignore default value (= 4) which is lower border of staffline
            if (bottomLineValue !== 0) {
                const point: PointF2D = new PointF2D((0.5 + i) / skyBottomLineCalculator.SamplingUnit, bottomLineValue);
                points.push(point);
            }
        }

        return points;
    }

    /**
     * This method calculates the maximum slope between StartPoint and BetweenPoints.
     * @param points
     * @param start
     * @param end
     */
    private calculateMaxLeftSlope(points: PointF2D[], start: PointF2D, end: PointF2D): number {
        let slope: number = -Number.MAX_VALUE;
        const x: number = start.x;
        const y: number = start.y;

        for (let i: number = 0; i < points.length; i++) {
            if (Math.abs(points[i].y - Number.MAX_VALUE) < 0.0001 || Math.abs(points[i].y - (-Number.MAX_VALUE)) < 0.0001) {
                continue;
            }
            const pointSlope: number = (points[i].y - y) / (points[i].x - x);
            if (!Number.isNaN(pointSlope)) { // NaN if a point coincides with the start point (0/0)
                slope = Math.max(slope, pointSlope);
            }
        }

        // in case all Points don't have a meaningful value or the slope between Start- and EndPoint is just bigger
        const startEndSlope: number = Math.abs(end.y - y) / (end.x - x);
        if (!Number.isNaN(startEndSlope)) { // NaN if start and end point coincide (0/0)
            slope = Math.max(slope, startEndSlope);
        }
        //limit to 80 degrees
        slope = Math.min(slope, 5.6713);

        return slope;
    }

    /**
     * This method calculates the maximum slope between EndPoint and BetweenPoints.
     * @param points
     * @param start
     * @param end
     */
    private calculateMaxRightSlope(points: PointF2D[], start: PointF2D, end: PointF2D): number {
        let slope: number = Number.MAX_VALUE;
        const x: number = end.x;
        const y: number = end.y;

        for (let i: number = 0; i < points.length; i++) {
            if (Math.abs(points[i].y - Number.MAX_VALUE) < 0.0001 || Math.abs(points[i].y - (-Number.MAX_VALUE)) < 0.0001) {
                continue;
            }
            const pointSlope: number = (y - points[i].y) / (x - points[i].x);
            if (!Number.isNaN(pointSlope)) { // NaN if a point coincides with the end point (0/0)
                slope = Math.min(slope, pointSlope);
            }
        }

        // in case no Point has a meaningful value or the slope between Start- and EndPoint is just smaller
        const startEndSlope: number = (y - start.y) / (x - start.x);
        if (!Number.isNaN(startEndSlope)) { // NaN if start and end point coincide (0/0)
            slope = Math.min(slope, startEndSlope);
        }
        //limit to 80 degrees
        slope = Math.max(slope, -5.6713);

        return slope;
    }

    /**
     * This method returns the maximum (meaningful) points.Y.
     * @param points
     */
    private getPointListMaxY(points: PointF2D[]): number {
        let max: number = -Number.MAX_VALUE;

        for (let idx: number = 0, len: number = points.length; idx < len; ++idx) {
            const point: PointF2D = points[idx];
            if (Math.abs(point.y - (-Number.MAX_VALUE)) < 0.0001 || Math.abs(point.y - Number.MAX_VALUE) < 0.0001) {
                continue;
            }
            max = Math.max(max, point.y);
        }

        return max;
    }

    /**
     * This method calculates the translated and rotated PointsList (case above).
     * @param points
     * @param startX
     * @param startY
     * @param rotationMatrix
     */
    private calculateTranslatedAndRotatedPointListAbove(points: PointF2D[], startX: number, startY: number, rotationMatrix: Matrix2D): PointF2D[] {
        const transformedPoints: PointF2D[] = [];
        for (let i: number = 0; i < points.length; i++) {
            if (Math.abs(points[i].y - Number.MAX_VALUE) < 0.0001 || Math.abs(points[i].y - (-Number.MAX_VALUE)) < 0.0001) {
                continue;
            }

            let point: PointF2D = new PointF2D(points[i].x - startX, -(points[i].y - startY));
            point = rotationMatrix.vectorMultiplication(point);
            transformedPoints.push(point);
        }

        return transformedPoints;
    }

    /**
     * This method calculates the translated and rotated PointsList (case below).
     * @param points
     * @param startX
     * @param startY
     * @param rotationMatrix
     */
    private calculateTranslatedAndRotatedPointListBelow(points: PointF2D[], startX: number, startY: number, rotationMatrix: Matrix2D): PointF2D[] {
        const transformedPoints: PointF2D[] = [];
        for (let i: number = 0; i < points.length; i++) {
            if (Math.abs(points[i].y - Number.MAX_VALUE) < 0.0001 || Math.abs(points[i].y - (-Number.MAX_VALUE)) < 0.0001) {
                continue;
            }
            let point: PointF2D = new PointF2D(points[i].x - startX, points[i].y - startY);
            point = rotationMatrix.vectorMultiplication(point);
            transformedPoints.push(point);
        }

        return transformedPoints;
    }

    /**
     * This method calculates the HeightWidthRatio between the MaxYpoint (from the points between StartPoint and EndPoint)
     * and the X-distance from StartPoint to EndPoint.
     * @param endX
     * @param points
     */
    private calculateHeightWidthRatio(endX: number, points: PointF2D[]): number {
        if (points.length === 0) {
            return 0;
        }

        // in case of negative points
        const max: number = Math.max(0, this.getPointListMaxY(points));

        return max / endX;
    }

    /**
     * This method calculates the 2 ControlPoints of the SlurCurve.
     * @param endX
     * @param startAngle
     * @param endAngle
     * @param points
     */
    private calculateControlPoints(endX: number, startAngle: number, endAngle: number,
                                   points: PointF2D[], heightWidthRatio: number,
                                   startY: number, endY: number
    ): { startControlPoint: PointF2D, endControlPoint: PointF2D } {
        let heightFactor: number = this.rules.SlurHeightFactor;
        let widthFlattenFactor: number = 1;
        const cutoffAngle: number = this.rules.SlurHeightFlattenLongSlursCutoffAngle;
        const cutoffWidth: number = this.rules.SlurHeightFlattenLongSlursCutoffWidth;
        // console.log("width: " + endX);
        if (startAngle > cutoffAngle && endX > cutoffWidth) { // steep and wide slurs
            // console.log("steep angle: " + startAngle);
            widthFlattenFactor += endX / 70 * this.rules.SlurHeightFlattenLongSlursFactorByWidth; // double flattening for width = 70, factorByWidth = 1
            widthFlattenFactor *= 1 + (startAngle / 30 * this.rules.SlurHeightFlattenLongSlursFactorByAngle); // flatten more for higher angles.
            // TODO use sin or cos instead of startAngle directly
            heightFactor /= widthFlattenFactor; // flatten long slurs more
        }
        // TODO also offer a widthFlattenFactor for smaller slurs?

        // debug:
        // const measureNumber: number = this.staffEntries[0].parentMeasure.MeasureNumber; // debug
        // if (measureNumber === 10) {
        //     console.log("endX: " + endX);
        //     console.log("widthFlattenFactor: " + widthFlattenFactor);
        //     console.log("heightFactor: " + heightFactor);
        //     console.log("startAngle: " + startAngle);
        //     console.log("heightWidthRatio: " + heightWidthRatio);
        // }

        // calculate HeightWidthRatio between the MaxYpoint (from the points between StartPoint and EndPoint)
        // and the X-distance from StartPoint to EndPoint
        // use this HeightWidthRatio to get a "normalized" Factor (based on tested parameters)
        // this Factor denotes the Length of the TangentLine of the Curve (a proportion of the X-distance from StartPoint to EndPoint)
        // finally from this Length and the calculated Angles we get the coordinates of the Control Points
        const factorStart: number = Math.min(0.5, Math.max(0.1, 1.7 * startAngle / 80 * heightFactor * Math.pow(Math.max(heightWidthRatio, 0.05), 0.4)));
        const factorEnd: number = Math.min(0.5, Math.max(0.1, 1.7 * (-endAngle) / 80 * heightFactor * Math.pow(Math.max(heightWidthRatio, 0.05), 0.4)));

        const startControlPoint: PointF2D = new PointF2D();
        startControlPoint.x = endX * factorStart * Math.cos(startAngle * GraphicalSlur.degreesToRadiansFactor);
        startControlPoint.y = endX * factorStart * Math.sin(startAngle * GraphicalSlur.degreesToRadiansFactor);

        const endControlPoint: PointF2D = new PointF2D();
        endControlPoint.x = endX - (endX * factorEnd * Math.cos(endAngle * GraphicalSlur.degreesToRadiansFactor));
        endControlPoint.y = -(endX * factorEnd * Math.sin(endAngle * GraphicalSlur.degreesToRadiansFactor));
        // Flatten long/steep slurs so they don't arc far higher than the notes/objects they actually span
        // (issue #1466). The cubic bezier's apex (its highest point above the start-end line) is determined by the
        // control point heights; cap it to a small margin above the highest spanned object, keeping the start/end
        // angles (so the slur still leaves the notes at the same steep angle, but flattens quickly after).
        if (this.rules.SlurFlattenToObstacle) {
            const requiredHeight: number = Math.max(0, this.getPointListMaxY(points)); // highest object above the start-end line
            // graceful minimum arc so slurs over flat passages aren't flattened into near-straight lines.
            // Grows with sqrt(width) (not linearly) so that WIDE slurs stay proportionally flat instead of
            // ballooning: a linear floor let e.g. a system-spanning slur over flat notes arc ~8 units high.
            const minArc: number = Math.min(this.rules.SlurFlattenMaxMinArcHeight, this.rules.SlurFlattenMinArcWidthFactor * Math.sqrt(endX));
            const targetApex: number = Math.max(requiredHeight + this.rules.SlurFlattenToObstacleMargin, minArc);
            let apex: number = 0;
            // the bezier's y at parameter t only depends on the control points' y (start/end points are on the x-axis here)
            for (let t: number = 0.1; t <= 0.9; t += 0.1) {
                const mt: number = 1 - t;
                apex = Math.max(apex, 3 * mt * mt * t * startControlPoint.y + 3 * mt * t * t * endControlPoint.y);
            }
            if (apex > targetApex && apex > 0.0001) {
                const scale: number = targetApex / apex; // apex scales linearly with the control point heights
                startControlPoint.x *= scale;
                startControlPoint.y *= scale;
                endControlPoint.x = endX - (endX - endControlPoint.x) * scale;
                endControlPoint.y *= scale;
            }
        }
        //Soften the slur in a "brute-force" way
        let controlPointYDiff: number = startControlPoint.y - endControlPoint.y;
        while (this.rules.SlurMaximumYControlPointDistance &&
               Math.abs(controlPointYDiff) > this.rules.SlurMaximumYControlPointDistance) {
            if (controlPointYDiff < 0) {
                startControlPoint.y += 1;
                endControlPoint.y -= 1;
            } else {
                startControlPoint.y -= 1;
                endControlPoint.y += 1;
            }
            controlPointYDiff = startControlPoint.y - endControlPoint.y;
        }
        return {startControlPoint: startControlPoint, endControlPoint: endControlPoint};
    }

    /**
     * This method calculates the angles for the Curve's Tangent Lines.
     * @param leftAngle
     * @param rightAngle
     * @param startLineSlope
     * @param endLineSlope
     * @param maxAngle
     */
    private calculateAngles(minAngle: number, startLineSlope: number, endLineSlope: number, maxAngle: number):
    {startAngle: number, endAngle: number} {
        // calculate Angles from the calculated Slopes, adding also a given angle
        const angle: number = 20;

        let calculatedStartAngle: number = Math.atan(startLineSlope) / GraphicalSlur.degreesToRadiansFactor;
        if (startLineSlope > 0) {
            calculatedStartAngle += angle;
        } else {
            calculatedStartAngle -= angle;
        }

        let calculatedEndAngle: number = Math.atan(endLineSlope) / GraphicalSlur.degreesToRadiansFactor;
        if (endLineSlope < 0) {
            calculatedEndAngle -= angle;
        } else {
            calculatedEndAngle += angle;
        }

        // +/- 80 is the max/min allowed Angle
        const leftAngle: number = Math.min(Math.max(minAngle, calculatedStartAngle), maxAngle);
        const rightAngle: number = Math.max(Math.min(-minAngle, calculatedEndAngle), -maxAngle);
        return {"startAngle": leftAngle, "endAngle": rightAngle};
    }

    private static degreesToRadiansFactor: number = Math.PI / 180;
}
