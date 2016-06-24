import Vex = require("vexflow");
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
import {Beam} from "../../VoiceData/Beam";
import {GraphicalNote} from "../GraphicalNote";
import {GraphicalStaffEntry} from "../GraphicalStaffEntry";

export class VexFlowMeasure extends StaffMeasure {
    constructor(staff: Staff, staffLine: StaffLine = undefined, sourceMeasure: SourceMeasure = undefined) {
        super(staff, sourceMeasure, staffLine);
        this.minimumStaffEntriesWidth = -1;
        this.stave = new Vex.Flow.Stave(0, 0, 0);
        this.vfVoices = {};
        //this.duration = this.parentSourceMeasure.Duration;
    }

    public octaveOffset: number = 3; // FIXME
    public vfVoices: { [voiceID: number]: Vex.Flow.Voice; };
    public formatVoices: (width: number) => void;
    public unit: number = 10.0;

    private stave: Vex.Flow.Stave;
    private vfclef: string;

    private beams: { [voiceID: number]: [Beam, VexFlowStaffEntry[]][]; } = {};
    private vfbeams: { [voiceID: number]: Vex.Flow.Beam[]; } = {};

    public setAbsoluteCoordinates(x: number, y: number): void {
        this.stave.setX(x);
        this.stave.setY(y);
    }

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
        this.octaveOffset = clef.OctaveOffset;
        this.vfclef = VexFlowConverter.Clef(clef);
        this.stave.addClef(this.vfclef, undefined, undefined, Vex.Flow.Modifier.Position.BEGIN);
        this.increaseBeginInstructionWidth();
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
        this.stave.addModifier(keySig, Vex.Flow.Modifier.Position.BEGIN);
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
            Vex.Flow.Modifier.Position.BEGIN
        );
        this.increaseBeginInstructionWidth();
    }

    /**
     * adds the given clef to the end of the measure.
     * This has to update/increase EndInstructionsWidth.
     * @param clef
     */
    public addClefAtEnd(clef: ClefInstruction): void {
        let vfclef: string = VexFlowConverter.Clef(clef);
        this.stave.setEndClef(vfclef, undefined, undefined);
        this.increaseEndInstructionWidth();
    }

    /**
     * Sets the overall x-width of the measure.
     * @param width
     */
    public setWidth(width: number): void {
        // Widths in PS and VexFlow work differently.
        // In VexFlow, width is only the width of the actual voices, without considering
        // modifiers like clefs. In PS, width is the total width of the stave.
        // @Andrea: The following could be improved by storing the values in this object.
        //          Now it calls .format() implicitly.
        //
        super.setWidth(width);
        this.stave.setWidth(width * this.unit);
        if (this.formatVoices) {
            this.formatVoices((width - this.beginInstructionsWidth - this.endInstructionsWidth) * this.unit);
            this.formatVoices = undefined;
        }
    }

    /**
     * This method is called after the StaffEntriesScaleFactor has been set.
     * Here the final x-positions of the staff entries have to be set.
     * (multiply the minimal positions with the scaling factor, considering the BeginInstructionsWidth)
     */
    public layoutSymbols(): void {
        this.stave.format();
    }

    public addGraphicalStaffEntry(entry: VexFlowStaffEntry): void {
        super.addGraphicalStaffEntry(entry);
    }

    public addGraphicalStaffEntryAtTimestamp(entry: VexFlowStaffEntry): void {
        super.addGraphicalStaffEntryAtTimestamp(entry);
        // TODO
    }

    public draw(ctx: Vex.Flow.CanvasContext): void {
        this.stave.setContext(ctx).draw();
        for (let voiceID in this.vfVoices) {
            if (this.vfVoices.hasOwnProperty(voiceID)) {
                this.vfVoices[voiceID].draw(ctx, this.stave);
            }
        }
        for (let voiceID in this.vfbeams) {
            if (this.vfbeams.hasOwnProperty(voiceID)) {
                for (let beam of this.vfbeams[voiceID]) {
                    beam.setContext(ctx).draw();
                }
            }
        }
    }

    public handleBeam(graphicalNote: GraphicalNote, beam: Beam): void {
        let voiceID: number = graphicalNote.sourceNote.ParentVoiceEntry.ParentVoice.VoiceId;
        let beams: [Beam, VexFlowStaffEntry[]][] = this.beams[voiceID];
        if (beams === undefined) {
            beams = this.beams[voiceID] = [];
        }
        let data: [Beam, VexFlowStaffEntry[]];
        for (let mybeam of beams) {
            if (mybeam[0] === beam) {
                data = mybeam;
            }
        }
        if (data === undefined) {
            data = [beam, []];
            beams.push(data);
        }
        let parent: VexFlowStaffEntry = graphicalNote.parentStaffEntry as VexFlowStaffEntry;
        if (data[1].indexOf(parent) === -1) {
            data[1].push(parent);
        }
    }

    public finalizeBeams(): void {
        for (let voiceID in this.beams) {
            if (this.beams.hasOwnProperty(voiceID)) {
                let vfbeams: Vex.Flow.Beam[] = this.vfbeams[voiceID];
                if (vfbeams === undefined) {
                    vfbeams = this.vfbeams[voiceID] = [];
                }
                for (let beam of this.beams[voiceID]) {
                    let notes: Vex.Flow.StaveNote[] = [];
                    for (let entry of beam[1]) {
                        notes.push((entry as VexFlowStaffEntry).vfNotes[voiceID]);
                    }
                    vfbeams.push(new Vex.Flow.Beam(notes));
                }
            }
        }
    }

    public layoutStaffEntry(graphicalStaffEntry: GraphicalStaffEntry): void {
        let gnotes: { [voiceID: number]: GraphicalNote[]; } = (graphicalStaffEntry as VexFlowStaffEntry).graphicalNotes;
        let vfVoices: { [voiceID: number]: Vex.Flow.Voice; } = this.vfVoices;
        for (let voiceID in gnotes) {
            if (gnotes.hasOwnProperty(voiceID)) {
                if (!(voiceID in vfVoices)) {
                    vfVoices[voiceID] = new Vex.Flow.Voice({
                        beat_value: this.parentSourceMeasure.Duration.Denominator,
                        num_beats: this.parentSourceMeasure.Duration.Numerator,
                        resolution: Vex.Flow.RESOLUTION,
                    }).setMode(Vex.Flow.Voice.Mode.SOFT);
                }
                let vfnote: Vex.Flow.StaveNote = VexFlowConverter.StaveNote(gnotes[voiceID], this.vfclef);
                (graphicalStaffEntry as VexFlowStaffEntry).vfNotes[voiceID] = vfnote;
                vfVoices[voiceID].addTickable(vfnote);
            }
        }
    }

    private increaseBeginInstructionWidth(): void {
        let modifiers: Vex.Flow.StaveModifier[] = this.stave.getModifiers();
        let modifier: Vex.Flow.StaveModifier = modifiers[modifiers.length - 1];
        //let padding: number = modifier.getCategory() === "keysignatures" ? modifier.getPadding(2) : 0;
        let padding: number = modifier.getPadding(20);
        //modifier.getPadding(this.begModifiers);
        let width: number = modifier.getWidth();
        this.beginInstructionsWidth += (padding + width) / this.unit;
    }

    private increaseEndInstructionWidth(): void {
        let modifiers: Vex.Flow.StaveModifier[] = this.stave.getModifiers();
        let modifier: Vex.Flow.StaveModifier = modifiers[modifiers.length - 1];
        let padding: number = 0; //modifier.getPadding(this.endModifiers++);
        let width: number = modifier.getWidth();
        this.endInstructionsWidth += (padding + width) / this.unit;
    }
}
