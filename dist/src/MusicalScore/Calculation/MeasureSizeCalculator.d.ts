import Vex = require("vexflow");
import StaveNote = Vex.Flow.StaveNote;
export declare type PositionAndShapeInfo = any;
export declare class MeasureSizeCalculator {
    private stave;
    private voices;
    private formatter;
    private offsetLeft;
    private offsetRight;
    private voicesWidth;
    private topBorder;
    private bottomBorder;
    constructor(stave: Vex.Flow.Stave, voices: Vex.Flow.Voice[], formatter: Vex.Flow.Formatter);
    static getVexFlowStaveNoteShape(note: StaveNote): PositionAndShapeInfo;
    static getClefBoundingBox(clef: Vex.Flow.Clef): Vex.Flow.BoundingBox;
    static getKeySignatureBoundingBox(sig: any): Vex.Flow.BoundingBox;
    getWidth(): number;
    getHeight(): number;
    getTopBorder(): number;
    getBottomBorder(): number;
    private format();
}
