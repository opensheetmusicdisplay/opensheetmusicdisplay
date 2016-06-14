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
    constructor(staff: Staff, staffLine: StaffLine = undefined, sourceMeasure: SourceMeasure = undefined) {
        super(staff, staffLine, sourceMeasure);

    }
    public resetLayout(): void {

    }
    public getLineWidth(line: SystemLinesEnum): number {
        return SystemLinesEnum.SingleThin;
    }
    public addClefAtBegin(clef: ClefInstruction): void {

    }
    public addKeyAtBegin(currentKey: KeyInstruction, previousKey: KeyInstruction, currentClef: ClefInstruction): void {

    }
    public addRhythmAtBegin(rhythm: RhythmInstruction): void {

    }
    public addClefAtEnd(clef: ClefInstruction): void {

    }
    public setPositionInStaffline(xPos: number): void {

    }
    public setWidth(width: number): void {

    }
    public layoutSymbols(): void {

    }
}