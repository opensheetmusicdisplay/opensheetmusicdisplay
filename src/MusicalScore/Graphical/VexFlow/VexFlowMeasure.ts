import {StaffMeasure} from "../StaffMeasure";
import {SourceMeasure} from "../../VoiceData/SourceMeasure";
import {Staff} from "../../VoiceData/Staff";
import {BoundingBox} from "../BoundingBox";
import {StaffLine} from "../StaffLine";
import {SystemLinesEnum} from "../SystemLinesEnum";
import {ClefInstruction} from "../../VoiceData/Instructions/ClefInstruction";
import {KeyInstruction} from "../../VoiceData/Instructions/KeyInstruction";
import {RhythmInstruction} from "../../VoiceData/Instructions/RhythmInstruction";
export class VexFlowMeasure extends StaffMeasure {
    constructor(sourceMeasure: SourceMeasure, staff: Staff) {
        super(staff, sourceMeasure);
        this.PositionAndShape = new BoundingBox(this);
    }
    constructor(staffLine: StaffLine) {
        super(staffLine);
        this.PositionAndShape = new BoundingBox(staffLine.PositionAndShape, this);
    }
    public resetLayout(): void {
        throw new NotImplementedException();
    }
    public getLineWidth(line: SystemLinesEnum): number {
        throw new NotImplementedException();
    }
    public addClefAtBegin(clef: ClefInstruction): void {
        throw new NotImplementedException();
    }
    public addKeyAtBegin(currentKey: KeyInstruction, previousKey: KeyInstruction, currentClef: ClefInstruction): void {
        throw new NotImplementedException();
    }
    public addRhythmAtBegin(rhythm: RhythmInstruction): void {
        throw new NotImplementedException();
    }
    public addClefAtEnd(clef: ClefInstruction): void {
        throw new NotImplementedException();
    }
    public setPositionInStaffline(xPos: number): void {
        throw new NotImplementedException();
    }
    public setWidth(width: number): void {
        throw new NotImplementedException();
    }
    public layoutSymbols(): void {
        throw new NotImplementedException();
    }
}