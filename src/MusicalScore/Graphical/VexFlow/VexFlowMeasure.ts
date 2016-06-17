import {StaffMeasure} from "../StaffMeasure";
import {SourceMeasure} from "../../VoiceData/SourceMeasure";
import {Staff} from "../../VoiceData/Staff";
import {StaffLine} from "../StaffLine";
import {SystemLinesEnum} from "../SystemLinesEnum";
import {ClefInstruction} from "../../VoiceData/Instructions/ClefInstruction";
import {KeyInstruction} from "../../VoiceData/Instructions/KeyInstruction";
import {RhythmInstruction} from "../../VoiceData/Instructions/RhythmInstruction";
import {VexFlowConverter} from "./VexFlowConverter";

export class VexFlowMeasure extends StaffMeasure {
    constructor(staff: Staff, staffLine: StaffLine = undefined, sourceMeasure: SourceMeasure = undefined) {
        super(staff, sourceMeasure, staffLine);
        // this.MinimumStaffEntriesWidth =
    }

    public stave: Vex.Flow.Stave;

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

    public getVexFlowVoices(): { [id: number]: Vex.Flow.Voice; } {
        let notes: { [id: number]: Vex.Flow.StaveNote[]; } = {};
        for (let entry of this.staffEntries) {
            for (let voiceEntry of entry.sourceStaffEntry.VoiceEntries) {
                let id: number = voiceEntry.ParentVoice.VoiceId;
                if (!(id in notes)) {
                    notes[id] = [];
                }
                notes[id].push(VexFlowConverter.StaveNote(voiceEntry));
            }
        }
        let voices: { [id: number]: Vex.Flow.Voice; } = {};
        let num: number = this.parentSourceMeasure.Duration.Numerator;
        let den: number = this.parentSourceMeasure.Duration.Denominator;
        for (let id in notes) {
            if (notes.hasOwnProperty(id)) {
                let voice: Vex.Flow.Voice = new Vex.Flow.Voice({
                    beat_value: den,
                    num_beats: num,
                    resolution: Vex.Flow.RESOLUTION,
                });
                voice.addTickables(notes[id]);
                voices[id] = voice;
            }
        }
        return voices;
    }

    private increaseBeginInstructionWidth(modifier: any): void {
        // FIXME: Check possible paddings...
        //this.beginInstructionsWidth += modifier.getWidth();
        this.beginInstructionsWidth = this.stave.getNoteStartX();
    }
}
