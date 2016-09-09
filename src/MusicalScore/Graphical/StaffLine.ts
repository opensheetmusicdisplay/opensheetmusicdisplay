import {Staff} from "../VoiceData/Staff";
import {BoundingBox} from "./BoundingBox";
import {Instrument} from "../Instrument";
import {GraphicalLine} from "./GraphicalLine";
import {GraphicalStaffEntry} from "./GraphicalStaffEntry";
import {GraphicalObject} from "./GraphicalObject";
import {StaffMeasure} from "./StaffMeasure";
import {MusicSystem} from "./MusicSystem";
import {StaffLineActivitySymbol} from "./StaffLineActivitySymbol";
import {PointF2D} from "../../Common/DataObjects/PointF2D";

/**
 * A StaffLine contains the [[Measure]]s in one line of the music sheet
 * (one instrument, one line, until a line break)
 */
export abstract class StaffLine extends GraphicalObject {
    protected measures: StaffMeasure[] = [];
    protected staffLines: GraphicalLine[] = new Array(5);
    protected parentMusicSystem: MusicSystem;
    protected parentStaff: Staff;
    protected skyLine: number[];
    protected bottomLine: number[];

    constructor(parentSystem: MusicSystem, parentStaff: Staff) {
        super();
        this.parentMusicSystem = parentSystem;
        this.parentStaff = parentStaff;
        this.boundingBox = new BoundingBox(this, parentSystem.PositionAndShape);
    }

    public get Measures(): StaffMeasure[] {
        return this.measures;
    }

    public set Measures(value: StaffMeasure[]) {
        this.measures = value;
    }

    public get StaffLines(): GraphicalLine[] {
        return this.staffLines;
    }

    public set StaffLines(value: GraphicalLine[]) {
        this.staffLines = value;
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

    public get SkyLine(): number[] {
        return this.skyLine;
    }

    public set SkyLine(value: number[]) {
        this.skyLine = value;
    }

    public get BottomLine(): number[] {
        return this.bottomLine;
    }

    public set BottomLine(value: number[]) {
        this.bottomLine = value;
    }

    public addActivitySymbolClickArea(): void {
        let activitySymbol: StaffLineActivitySymbol = new StaffLineActivitySymbol(this);
        let staffLinePsi: BoundingBox = this.PositionAndShape;
        activitySymbol.PositionAndShape.RelativePosition =
            new PointF2D(staffLinePsi.RelativePosition.x + staffLinePsi.BorderRight + 0.5, staffLinePsi.RelativePosition.y + 0.5);
        this.parentMusicSystem.PositionAndShape.ChildElements.push(activitySymbol.PositionAndShape);
    }

    /**
     * True iff [[StaffLine]] belongs to an [[Instrument]] with more than one [[Staff]].
     * @returns {boolean}
     */
    public isPartOfMultiStaffInstrument(): boolean {
        let instrument: Instrument = this.parentStaff.ParentInstrument;
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
        let difference: number = Number.MAX_VALUE;
        for (let idx: number = 0, len: number = this.Measures.length; idx < len; ++idx) {
            let graphicalMeasure: StaffMeasure = this.Measures[idx];
            for (let idx2: number = 0, len2: number = graphicalMeasure.staffEntries.length; idx2 < len2; ++idx2) {
                let graphicalStaffEntry: GraphicalStaffEntry = graphicalMeasure.staffEntries[idx2];
                if (
                    Math.abs(graphicalStaffEntry.PositionAndShape.RelativePosition.x - xPosition + graphicalMeasure.PositionAndShape.RelativePosition.x) < 5.0
                ) {
                    difference = Math.abs(
                        graphicalStaffEntry.PositionAndShape.RelativePosition.x - xPosition + graphicalMeasure.PositionAndShape.RelativePosition.x
                    );
                    closestStaffentry = graphicalStaffEntry;
                }
            }
        }
        return closestStaffentry;
    }
}
