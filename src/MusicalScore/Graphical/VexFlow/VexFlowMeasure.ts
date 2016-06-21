import {StaffMeasure} from "../StaffMeasure";
import {SourceMeasure} from "../../VoiceData/SourceMeasure";
import {Staff} from "../../VoiceData/Staff";
import {StaffLine} from "../StaffLine";
import {SystemLinesEnum} from "../SystemLinesEnum";
import {ClefInstruction} from "../../VoiceData/Instructions/ClefInstruction";
import {KeyInstruction} from "../../VoiceData/Instructions/KeyInstruction";
import {RhythmInstruction} from "../../VoiceData/Instructions/RhythmInstruction";
import {VexFlowConverter} from "./VexFlowConverter";
import {VexFlowStaffEntry} from "./VexFlowStaffEntry";
//import {Fraction} from "../../../Common/DataObjects/fraction";

export class VexFlowMeasure extends StaffMeasure {
    constructor(staff: Staff, staffLine: StaffLine = undefined, sourceMeasure: SourceMeasure = undefined) {
        super(staff, sourceMeasure, staffLine);
        // this.MinimumStaffEntriesWidth =
        this.stave = new Vex.Flow.Stave(0, 0, 0);
        this.voices = {};
        //this.duration = this.parentSourceMeasure.Duration;
    }

    private stave: Vex.Flow.Stave;
    private voices: { [voiceID: number]: Vex.Flow.Voice; };
    //private duration: Fraction;

    /**
     * Reset all the geometric values and parameters of this measure and put it in an initialized state.
     * This is needed to evaluate a measure a second time by system builder.
     */
    public resetLayout(): void {
        this.beginInstructionsWidth = 0;
        this.endInstructionsWidth = 0;
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
        let vfclef: Vex.Flow.Clef = VexFlowConverter.Clef(clef);
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
            VexFlowConverter.keySignature(currentKey),
            VexFlowConverter.keySignature(previousKey)
        );
        this.stave.addModifier(keySig, Vex.Flow.StaveModifier.Position.BEGIN);
    }

    /**
     * adds the given rhythm to the begin of the measure.
     * This has to update/increase BeginInstructionsWidth.
     * @param rhythm
     */
    public addRhythmAtBegin(rhythm: RhythmInstruction): void {
        let timeSig: Vex.Flow.TimeSignature = VexFlowConverter.TimeSignature(rhythm);
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
        let vfclef: Vex.Flow.Clef = VexFlowConverter.Clef(clef);
        this.stave.addClef(vfclef, undefined, undefined, Vex.Flow.StaveModifier.Position.END);
        this.increaseEndInstructionWidth(vfclef);
    }

    /**
     * Set the x-position relative to the staffline.
     * (y-Position is always 0 relative to the staffline)
     * @param x
     */
    public setPositionInStaffline(x: number): void {
        // Already implemented in VexFlow, it does _not_ call .format()
        this.stave.setX(x);
    }

    /**
     * Sets the overall x-width of the measure.
     * @param width
     */
    public SetWidth(width: number): void {
        // Widths in PS and VexFlow work differently.
        // In VexFlow, width is only the width of the actual voices, without considering
        // modifiers like clefs. In PS, width is the total width of the stave.
        // @Andrea: The following could be improved by storing the values in this object.
        //          Now it calls .format() implicitly.
        this.stave.setWidth(width - this.beginInstructionsWidth - this.endInstructionsWidth);
    }

    /**
     * This method is called after the StaffEntriesScaleFactor has been set.
     * Here the final x-positions of the staff entries have to be set.
     * (multiply the minimal positions with the scaling factor, considering the BeginInstructionsWidth)
     */
    public layoutSymbols(): void {
        // This is already done in the MusicSystemBuilder!
        //this.setWidth(this.minimumStaffEntriesWidth * this.staffEntriesScaleFactor);
        this.stave.format();
        // Set context first!
        this.stave.draw();
    }

    public addGraphicalStaffEntry(entry: VexFlowStaffEntry): void {
        super.addGraphicalStaffEntry(entry);
        let vfnotes: { [voiceID: number]: Vex.Flow.StaveNote; } = entry.vfnotes;
        for (let id in vfnotes) {
            if (vfnotes.hasOwnProperty(id)) {
                if (!(id in this.voices)) {
                    this.voices[id] = new Vex.Flow.Voice({
                        beat_value: this.parentSourceMeasure.Duration.Denominator,
                        num_beats: this.parentSourceMeasure.Duration.Numerator,
                        resolution: Vex.Flow.RESOLUTION,
                    }).setMode(Vex.Flow.Voice.Mode.SOFT);
                }
                this.voices[id].addTickable(vfnotes[id]);
            }
        }
    }

    public addGraphicalStaffEntryAtTimestamp(entry: VexFlowStaffEntry): void {
        super.addGraphicalStaffEntryAtTimestamp(entry);
        // TODO
    }

    private increaseBeginInstructionWidth(modifier: any): void {
        let padding: number = modifier.getCategory("") === "keysignatures" ? modifier.getPadding(2) : 0;
        //modifier.getPadding(this.begModifiers);
        let width: number = modifier.getWidth();
        this.beginInstructionsWidth += padding + width;

        //if (padding + width > 0) {
        //    this.begModifiers += 1;
        //}
    }

    private increaseEndInstructionWidth(modifier: any): void {
        let padding: number = 0; //modifier.getPadding(this.endModifiers++);
        let width: number = modifier.getWidth();
        this.endInstructionsWidth += padding + width;
    }
}
