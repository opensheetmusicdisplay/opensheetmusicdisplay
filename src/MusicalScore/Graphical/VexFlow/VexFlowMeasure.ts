import {StaffMeasure} from "../StaffMeasure";
import {SourceMeasure} from "../../VoiceData/SourceMeasure";
import {Staff} from "../../VoiceData/Staff";
import {StaffLine} from "../StaffLine";
import {SystemLinesEnum} from "../SystemLinesEnum";
import {ClefInstruction} from "../../VoiceData/Instructions/ClefInstruction";
import {KeyInstruction} from "../../VoiceData/Instructions/KeyInstruction";
import {RhythmInstruction} from "../../VoiceData/Instructions/RhythmInstruction";
import {ClefEnum} from "../../VoiceData/Instructions/ClefInstruction";
import {RhythmSymbolEnum} from "../../VoiceData/Instructions/RhythmInstruction";
import {KeyEnum} from "../../VoiceData/Instructions/KeyInstruction";

export class VexFlowMeasure extends StaffMeasure {
    constructor(staff: Staff, staffLine: StaffLine = undefined, sourceMeasure: SourceMeasure = undefined) {
        super(staff, sourceMeasure, staffLine);
        // this.MinimumStaffEntriesWidth =
    }

    private static majorMap: {[_: number]: string; } = {
        "0": "C", 1: "G", 2: "D", 3: "A", 4: "E", 5: "B", 6: "F#", 7: "C#",
        8: "G#", "-1": "F", "-8": "Fb", "-7": "Cb", "-6": "Gb", "-5": "Db", "-4": "Ab", "-3": "Eb", "-2": "Bb",
    };
    private static minorMap: {[_: number]: string; } = {
        "1": "E", "7": "A#", "0": "A", "6": "D#", "3": "F#", "-5": "Bb", "-4": "F", "-7": "Ab", "-6": "Eb",
        "-1": "D", "4": "C#", "-3": "C", "-2": "G", "2": "B", "5": "G#", "-8": "Db", "8": "E#",
    };

    private stave: Vex.Flow.Stave;


    private static toVexFlowClef(clef: ClefInstruction): Vex.Flow.Clef {
        let type: string;
        switch (clef.ClefType) {
            case ClefEnum.G:
                type = "treble";
                break;
            case ClefEnum.F:
                type = "bass";
                break;
            case ClefEnum.C:
                type = "baritone-c";
                break;
            case ClefEnum.percussion:
                type = "percussion";
                break;
            case ClefEnum.TAB:
                type = "tab";
                break;
            default:
        }
        return new Vex.Flow.Clef(type);
    }

    private static toVexFlowTimeSignature(rhythm: RhythmInstruction): Vex.Flow.TimeSignature {
        let timeSpec: string;
        switch (rhythm.SymbolEnum) {
            case RhythmSymbolEnum.NONE:
                timeSpec = rhythm.Rhythm.Numerator + "/" + rhythm.Rhythm.Denominator;
                break;
            case RhythmSymbolEnum.COMMON:
                timeSpec = "C";
                break;
            case RhythmSymbolEnum.CUT:
                timeSpec = "C|";
                break;
            default:
        }
        return new Vex.Flow.TimeSignature(timeSpec);
    }

    private static toKeySignatureString(key: KeyInstruction): string {
        switch (key.Mode) {
            case KeyEnum.none:
                return undefined;
            case KeyEnum.minor:
                return VexFlowMeasure.minorMap[key.Key];
            case KeyEnum.major:
                return VexFlowMeasure.majorMap[key.Key] + "m";
            default:
        }
    }

    /**
     * Reset all the geometric values and parameters of this measure and put it in an initialized state.
     * This is needed to evaluate a measure a second time by system builder.
     */
    public resetLayout(): void {
        this.beginInstructionsWidth = 0;

    }

    /**
     * returns the x-width of a given measure line.
     * @param line
     * @returns {SystemLinesEnum} the x-width
     */
    public getLineWidth(line: SystemLinesEnum): number {
        // FIXME: See values in VexFlow's stavebarline.js
        switch (line) {
            case SystemLinesEnum.SingleThin:
                return 5;
            case SystemLinesEnum.DoubleThin:
                return 5;
            case SystemLinesEnum.ThinBold:
                return 5;
            case SystemLinesEnum.BoldThinDots:
                return 5;
            case SystemLinesEnum.DotsThinBold:
                return 5;
            case SystemLinesEnum.DotsBoldBoldDots:
                return 5;
            case SystemLinesEnum.None:
                return 0;
            default:
                return 0;
        }
    }

    /**
     * adds the given clef to the begin of the measure.
     * This has to update/increase BeginInstructionsWidth.
     * @param clef
     */
    public addClefAtBegin(clef: ClefInstruction): void {
        let vfclef: Vex.Flow.Clef = VexFlowMeasure.toVexFlowClef(clef);
        this.stave.addClef(vfclef, undefined, undefined, Vex.Flow.StaveModifier.Position.BEGIN);
        this.increaseBeginInstructionWidth(vfclef);
    }

    /**
     * adds the given key to the begin of the measure.
     * This has to update/increase BeginInstructionsWidth.
     * @param currentKey the new valid key.
     * @param previousKey the old cancelled key. Needed to show which accidentals are not valid any more.
     * @param currentClef the valid clef. Needed to put the accidentals on the right y-positions.
     */
    public addKeyAtBegin(currentKey: KeyInstruction, previousKey: KeyInstruction, currentClef: ClefInstruction): void {
        let keySig: Vex.Flow.KeySignature = new Vex.Flow.KeySignature(
            VexFlowMeasure.toKeySignatureString(currentKey),
            VexFlowMeasure.toKeySignatureString(previousKey)
        );
        this.stave.addModifier(keySig, Vex.Flow.StaveModifier.Position.BEGIN);
    }

    /**
     * adds the given rhythm to the begin of the measure.
     * This has to update/increase BeginInstructionsWidth.
     * @param rhythm
     */
    public addRhythmAtBegin(rhythm: RhythmInstruction): void {
        let timeSig: Vex.Flow.TimeSignature = VexFlowMeasure.toVexFlowTimeSignature(rhythm);
        this.stave.addModifier(
            timeSig,
            Vex.Flow.StaveModifier.Position.BEGIN
        );
        this.increaseBeginInstructionWidth(timeSig);
    }

    /**
     * adds the given clef to the end of the measure.
     * This has to update/increase EndInstructionsWidth.
     * @param clef
     */
    public addClefAtEnd(clef: ClefInstruction): void {
        let vfclef: Vex.Flow.Clef = VexFlowMeasure.toVexFlowClef(clef);
        this.stave.addClef(vfclef, undefined, undefined, Vex.Flow.StaveModifier.Position.END);
        this.increaseBeginInstructionWidth(vfclef);
    }

    /**
     * This method sets the x-position relative to the staffline. (y-Position is always 0 relative to the staffline)
     * @param x
     */
    public setPositionInStaffline(x: number): void {
        this.stave.setX(x);
    }

    /**
     * Sets the overall x-width of the measure.
     * @param width
     */
    public setWidth(width: number): void {
        // FIXME: this should consider modifiers!
        this.stave.setWidth(width);
    }

    /**
     * This method is called after the StaffEntriesScaleFactor has been set.
     * Here the final x-positions of the staff entries have to be set.
     * (multiply the minimal positions with the scaling factor, considering the BeginInstructionsWidth)
     */
    public layoutSymbols(): void {
        let min: number = 0;
        this.setWidth(min * this.staffEntriesScaleFactor);
        this.stave.format();
        this.stave.draw();
    }

    private increaseBeginInstructionWidth(modifier: any): void {
        // FIXME: Check possible paddings
        //this.beginInstructionsWidth += modifier.getWidth();
        this.beginInstructionsWidth = this.stave.getNoteStartX();
    }
}
