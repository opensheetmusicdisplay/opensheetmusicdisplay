import {Staff} from "../VoiceData/Staff";
import {BoundingBox} from "./BoundingBox";
import {Instrument} from "../Instrument";
import {GraphicalLine} from "./GraphicalLine";
import {GraphicalStaffEntry} from "./GraphicalStaffEntry";
import {GraphicalObject} from "./GraphicalObject";
import {GraphicalMeasure} from "./GraphicalMeasure";
import {MusicSystem} from "./MusicSystem";
import {StaffLineActivitySymbol} from "./StaffLineActivitySymbol";
import {PointF2D} from "../../Common/DataObjects/PointF2D";
import {GraphicalLabel} from "./GraphicalLabel";
import { SkyBottomLineCalculator } from "./SkyBottomLineCalculator";
import { GraphicalOctaveShift } from "./GraphicalOctaveShift";
import { GraphicalSlur } from "./GraphicalSlur";
import { AlignmentManager } from "./AlignmentManager";
import { AbstractGraphicalExpression } from "./AbstractGraphicalExpression";

/**
 * A StaffLine contains the [[Measure]]s in one line of the music sheet
 * (one instrument, one line, until a line break)
 */
export abstract class StaffLine extends GraphicalObject {
    protected measures: GraphicalMeasure[] = [];
    protected staffLines: GraphicalLine[] = new Array(5);
    protected parentMusicSystem: MusicSystem;
    protected parentStaff: Staff;
    protected octaveShifts: GraphicalOctaveShift[] = [];
    protected skyBottomLine: SkyBottomLineCalculator;
    protected alignmentManager: AlignmentManager;
    protected lyricLines: GraphicalLine[] = [];
    protected lyricsDashes: GraphicalLabel[] = [];
    protected abstractExpressions: AbstractGraphicalExpression[] = [];

    // For displaying Slurs
    protected graphicalSlurs: GraphicalSlur[] = [];

    constructor(parentSystem: MusicSystem, parentStaff: Staff) {
        super();
        this.parentMusicSystem = parentSystem;
        this.parentStaff = parentStaff;
        this.boundingBox = new BoundingBox(this, parentSystem.PositionAndShape);
        this.skyBottomLine = new SkyBottomLineCalculator(this);
        this.alignmentManager = new AlignmentManager(this);
    }

    public get Measures(): GraphicalMeasure[] {
        return this.measures;
    }

    public set Measures(value: GraphicalMeasure[]) {
        this.measures = value;
    }

    public get StaffLines(): GraphicalLine[] {
        return this.staffLines;
    }

    public set StaffLines(value: GraphicalLine[]) {
        this.staffLines = value;
    }

    public get NextStaffLine(): StaffLine {
        const idxInParent: number = this.parentMusicSystem.StaffLines.indexOf(this);
        return idxInParent !== this.parentMusicSystem.StaffLines.length ? this.parentMusicSystem.StaffLines[idxInParent + 1] : undefined;
    }

    public get LyricLines(): GraphicalLine[] {
        return this.lyricLines;
    }

    public get AbstractExpressions(): AbstractGraphicalExpression[] {
        return this.abstractExpressions;
    }

    public set AbstractExpressions(value: AbstractGraphicalExpression[]) {
        this.abstractExpressions = value;
    }

    public set LyricLines(value: GraphicalLine[]) {
        this.lyricLines = value;
    }

    public get LyricsDashes(): GraphicalLabel[] {
        return this.lyricsDashes;
    }

    public set LyricsDashes(value: GraphicalLabel[]) {
        this.lyricsDashes = value;
    }

    public get ParentMusicSystem(): MusicSystem {
        return this.parentMusicSystem;
    }

    public set ParentMusicSystem(value: MusicSystem) {
        this.parentMusicSystem = value;
    }

    public get ParentStaff(): Staff {
        return this.parentStaff;
    }

    public set ParentStaff(value: Staff) {
        this.parentStaff = value;
    }

    public get AlignmentManager(): AlignmentManager {
        return this.alignmentManager;
    }

    public get SkyBottomLineCalculator(): SkyBottomLineCalculator {
        return this.skyBottomLine;
    }

    public get SkyLine(): number[] {
        return this.skyBottomLine.SkyLine;
    }

    public get BottomLine(): number[] {
        return this.skyBottomLine.BottomLine;
    }

    public get OctaveShifts(): GraphicalOctaveShift[] {
        return this.octaveShifts;
    }

    public set OctaveShifts(value: GraphicalOctaveShift[]) {
        this.octaveShifts = value;
    }

    // get all Graphical Slurs of a staffline
    public get GraphicalSlurs(): GraphicalSlur[] {
        return this.graphicalSlurs;
    }

    /**
     * Add a given Graphical Slur to the staffline
     * @param gSlur
     */
    public addSlurToStaffline(gSlur: GraphicalSlur): void {
        this.graphicalSlurs.push(gSlur);
    }

    public addActivitySymbolClickArea(): void {
        const activitySymbol: StaffLineActivitySymbol = new StaffLineActivitySymbol(this);
        const staffLinePsi: BoundingBox = this.PositionAndShape;
        activitySymbol.PositionAndShape.RelativePosition =
            new PointF2D(staffLinePsi.RelativePosition.x + staffLinePsi.BorderRight + 0.5, staffLinePsi.RelativePosition.y + 0.5);
        activitySymbol.PositionAndShape.Parent = this.parentMusicSystem.PositionAndShape;
    }

    /**
     * True iff [[StaffLine]] belongs to an [[Instrument]] with more than one [[Staff]].
     * @returns {boolean}
     */
    public isPartOfMultiStaffInstrument(): boolean {
        const instrument: Instrument = this.parentStaff.ParentInstrument;
        if (instrument.Staves.length > 1) {
            return true;
        }
        return false;
    }

    /**
     * Find the [[GraphicalStaffEntry]] closest to the given xPosition.
     * @param xPosition
     * @returns {GraphicalStaffEntry}
     */
    public findClosestStaffEntry(xPosition: number): GraphicalStaffEntry {
        let closestStaffentry: GraphicalStaffEntry = undefined;
        for (let idx: number = 0, len: number = this.Measures.length; idx < len; ++idx) {
            const graphicalMeasure: GraphicalMeasure = this.Measures[idx];
            for (let idx2: number = 0, len2: number = graphicalMeasure.staffEntries.length; idx2 < len2; ++idx2) {
                const graphicalStaffEntry: GraphicalStaffEntry = graphicalMeasure.staffEntries[idx2];
                if (
                    Math.abs(graphicalStaffEntry.PositionAndShape.RelativePosition.x - xPosition + graphicalMeasure.PositionAndShape.RelativePosition.x) < 5.0
                ) {
                    closestStaffentry = graphicalStaffEntry;
                }
            }
        }
        return closestStaffentry;
    }
}
