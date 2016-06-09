import {Staff} from "../VoiceData/Staff";
import {BoundingBox} from "./BoundingBox";
import {Instrument} from "../Instrument";
import {GraphicalLine} from "./GraphicalLine";
import {GraphicalStaffEntry} from "./GraphicalStaffEntry";
import {GraphicalObject} from "./GraphicalObject";
import {StaffMeasure} from "./StaffMeasure";
import {MusicSystem} from "./MusicSystem";
export class StaffLine extends GraphicalObject {
    protected measures: List<StaffMeasure> = new List<StaffMeasure>();
    protected staffLines: GraphicalLine[] = new Array(5);
    protected parentMusicSystem: MusicSystem;
    protected parentStaff: Staff;
    protected skyLine: number[];
    protected bottomLine: number[];
    constructor(parentSystem: MusicSystem, parentStaff: Staff) {
        this.parentMusicSystem = parentSystem;
        this.parentStaff = parentStaff;
        this.boundingBox = new BoundingBox(parentSystem.PositionAndShape, this);
    }
    public get Measures(): List<StaffMeasure> {
        return this.measures;
    }
    public set Measures(value: List<StaffMeasure>) {
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
    public isPartOfMultiStaffInstrument(): boolean {
        var instrument: Instrument = this.parentStaff.ParentInstrument;
        if (instrument.Staves.Count > 1)
            return true;
        return false;
    }
    public findClosestStaffEntry(xPosition: number): GraphicalStaffEntry {
        var closestStaffentry: GraphicalStaffEntry = null;
        var difference: number = number.MaxValue;
        for (var idx: number = 0, len = this.Measures.Count; idx < len; ++idx) {
            var graphicalMeasure: StaffMeasure = this.Measures[idx];
            for (var idx2: number = 0, len2 = graphicalMeasure.StaffEntries.Count; idx2 < len2; ++idx2) {
                var graphicalStaffEntry: GraphicalStaffEntry = graphicalMeasure.StaffEntries[idx2];
                if (Math.Abs(graphicalStaffEntry.PositionAndShape.RelativePosition.X - xPosition + graphicalMeasure.PositionAndShape.RelativePosition.X) < 5.0)
                {
                    difference = Math.Abs(graphicalStaffEntry.PositionAndShape.RelativePosition.X - xPosition + graphicalMeasure.PositionAndShape.RelativePosition.X);
                    closestStaffentry = graphicalStaffEntry;
                }
            }
        }
        return closestStaffentry;
    }
}
