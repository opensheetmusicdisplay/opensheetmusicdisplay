import Vex = require("vexflow");
import { StaffMeasure } from "../StaffMeasure";
import { SourceMeasure } from "../../VoiceData/SourceMeasure";
import { Staff } from "../../VoiceData/Staff";
import { StaffLine } from "../StaffLine";
import { SystemLinesEnum } from "../SystemLinesEnum";
import { ClefInstruction } from "../../VoiceData/Instructions/ClefInstruction";
import { KeyInstruction } from "../../VoiceData/Instructions/KeyInstruction";
import { RhythmInstruction } from "../../VoiceData/Instructions/RhythmInstruction";
import { Beam } from "../../VoiceData/Beam";
import { GraphicalNote } from "../GraphicalNote";
import { GraphicalStaffEntry } from "../GraphicalStaffEntry";
export declare class VexFlowMeasure extends StaffMeasure {
    constructor(staff: Staff, staffLine?: StaffLine, sourceMeasure?: SourceMeasure);
    octaveOffset: number;
    vfVoices: {
        [voiceID: number]: Vex.Flow.Voice;
    };
    formatVoices: (width: number) => void;
    private stave;
    private connectors;
    private beams;
    private vfbeams;
    setAbsoluteCoordinates(x: number, y: number): void;
    /**
     * Reset all the geometric values and parameters of this measure and put it in an initialized state.
     * This is needed to evaluate a measure a second time by system builder.
     */
    resetLayout(): void;
    clean(): void;
    /**
     * returns the x-width of a given measure line.
     * @param line
     * @returns {SystemLinesEnum} the x-width
     */
    getLineWidth(line: SystemLinesEnum): number;
    /**
     * adds the given clef to the begin of the measure.
     * This has to update/increase BeginInstructionsWidth.
     * @param clef
     */
    addClefAtBegin(clef: ClefInstruction): void;
    /**
     * adds the given key to the begin of the measure.
     * This has to update/increase BeginInstructionsWidth.
     * @param currentKey the new valid key.
     * @param previousKey the old cancelled key. Needed to show which accidentals are not valid any more.
     * @param currentClef the valid clef. Needed to put the accidentals on the right y-positions.
     */
    addKeyAtBegin(currentKey: KeyInstruction, previousKey: KeyInstruction, currentClef: ClefInstruction): void;
    /**
     * adds the given rhythm to the begin of the measure.
     * This has to update/increase BeginInstructionsWidth.
     * @param rhythm
     */
    addRhythmAtBegin(rhythm: RhythmInstruction): void;
    /**
     * adds the given clef to the end of the measure.
     * This has to update/increase EndInstructionsWidth.
     * @param clef
     */
    addClefAtEnd(clef: ClefInstruction): void;
    /**
     * Sets the overall x-width of the measure.
     * @param width
     */
    setWidth(width: number): void;
    /**
     * This method is called after the StaffEntriesScaleFactor has been set.
     * Here the final x-positions of the staff entries have to be set.
     * (multiply the minimal positions with the scaling factor, considering the BeginInstructionsWidth)
     */
    layoutSymbols(): void;
    /**
     * Draw this measure on a VexFlow CanvasContext
     * @param ctx
     */
    draw(ctx: Vex.Flow.CanvasContext): void;
    /**
     * Add a note to a beam
     * @param graphicalNote
     * @param beam
     */
    handleBeam(graphicalNote: GraphicalNote, beam: Beam): void;
    /**
     * Complete the creation of VexFlow Beams in this measure
     */
    finalizeBeams(): void;
    layoutStaffEntry(graphicalStaffEntry: GraphicalStaffEntry): void;
    /**
     * Creates a line from 'top' to this measure, of type 'lineType'
     * @param top
     * @param lineType
     */
    lineTo(top: VexFlowMeasure, lineType: any): void;
    getVFStave(): Vex.Flow.Stave;
    private updateInstructionWidth();
}
