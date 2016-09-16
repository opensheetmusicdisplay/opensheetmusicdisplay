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
import StaveConnector = Vex.Flow.StaveConnector;
import StaveNote = Vex.Flow.StaveNote;
import {Logging} from "../../../Common/Logging";
import {unitInPixels} from "./VexFlowMusicSheetDrawer";
import {Tuplet} from "../../VoiceData/Tuplet";

export class VexFlowMeasure extends StaffMeasure {
    constructor(staff: Staff, staffLine: StaffLine = undefined, sourceMeasure: SourceMeasure = undefined) {
        super(staff, sourceMeasure, staffLine);
        this.minimumStaffEntriesWidth = -1;
        this.resetLayout();
    }

    // octaveOffset according to active clef
    public octaveOffset: number = 3;
    // The VexFlow Voices in the measure
    public vfVoices: { [voiceID: number]: Vex.Flow.Voice; } = {};
    // Call this function (if present) to x-format all the voices in the measure
    public formatVoices: (width: number) => void;
    // The VexFlow Ties in the measure
    public vfTies: Vex.Flow.StaveTie[] = [];

    // The VexFlow Stave (one measure in one line)
    private stave: Vex.Flow.Stave;
    // VexFlow StaveConnectors (vertical lines)
    private connectors: Vex.Flow.StaveConnector[] = [];
    // Intermediate object to construct beams
    private beams: { [voiceID: number]: [Beam, VexFlowStaffEntry[]][]; } = {};
    // VexFlow Beams
    private vfbeams: { [voiceID: number]: Vex.Flow.Beam[]; };
    // Intermediate object to construct tuplets
    private tuplets: { [voiceID: number]: [Tuplet, VexFlowStaffEntry[]][]; } = {};
    // VexFlow Tuplets
    private vftuplets: { [voiceID: number]: Vex.Flow.Tuplet[]; } = {};

    // Sets the absolute coordinates of the VFStave on the canvas
    public setAbsoluteCoordinates(x: number, y: number): void {
        this.stave.setX(x).setY(y);
    }

    /**
     * Reset all the geometric values and parameters of this measure and put it in an initialized state.
     * This is needed to evaluate a measure a second time by system builder.
     */
    public resetLayout(): void {
        // Take into account some space for the begin and end lines of the stave
        // Will be changed when repetitions will be implemented
        //this.beginInstructionsWidth = 20 / UnitInPixels;
        //this.endInstructionsWidth = 20 / UnitInPixels;
        this.stave = new Vex.Flow.Stave(0, 0, 0, {
            space_above_staff_ln: 0,
            space_below_staff_ln: 0,
        });
        this.updateInstructionWidth();
    }

    public clean(): void {
        this.vfTies.length = 0;
        this.connectors = [];
        // Clean up instructions
        this.resetLayout();
    }

    /**
     * returns the x-width of a given measure line.
     * @param line
     * @returns {SystemLinesEnum} the x-width
     */
    public getLineWidth(line: SystemLinesEnum): number {
        // FIXME: See values in VexFlow's stavebarline.js
        let vfline: any = VexFlowConverter.line(line);
        switch (vfline) {
            case Vex.Flow.StaveConnector.type.SINGLE:
                return 1.0 / unitInPixels;
            case Vex.Flow.StaveConnector.type.DOUBLE:
                return 3.0 / unitInPixels;
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
        let vfclef: {type: string, annotation: string} = VexFlowConverter.Clef(clef);
        this.stave.addClef(vfclef.type, undefined, vfclef.annotation, Vex.Flow.Modifier.Position.BEGIN);
        this.updateInstructionWidth();
    }

    /**
     * adds the given key to the begin of the measure.
     * This has to update/increase BeginInstructionsWidth.
     * @param currentKey the new valid key.
     * @param previousKey the old cancelled key. Needed to show which accidentals are not valid any more.
     * @param currentClef the valid clef. Needed to put the accidentals on the right y-positions.
     */
    public addKeyAtBegin(currentKey: KeyInstruction, previousKey: KeyInstruction, currentClef: ClefInstruction): void {
        this.stave.setKeySignature(
            VexFlowConverter.keySignature(currentKey),
            VexFlowConverter.keySignature(previousKey),
            undefined
        );
        this.updateInstructionWidth();
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
        this.updateInstructionWidth();
    }

    /**
     * adds the given clef to the end of the measure.
     * This has to update/increase EndInstructionsWidth.
     * @param clef
     */
    public addClefAtEnd(clef: ClefInstruction): void {
        let vfclef: {type: string, annotation: string} = VexFlowConverter.Clef(clef);
        this.stave.setEndClef(vfclef.type, "small", vfclef.annotation);
        this.updateInstructionWidth();
    }

    /**
     * Sets the overall x-width of the measure.
     * @param width
     */
    public setWidth(width: number): void {
        super.setWidth(width);
        // Set the width of the Vex.Flow.Stave
        this.stave.setWidth(width * unitInPixels);
        // Force the width of the Begin Instructions
        //this.stave.setNoteStartX(this.beginInstructionsWidth * UnitInPixels);

    }

    /**
     * This method is called after the StaffEntriesScaleFactor has been set.
     * Here the final x-positions of the staff entries have to be set.
     * (multiply the minimal positions with the scaling factor, considering the BeginInstructionsWidth)
     */
    public layoutSymbols(): void {
        //this.stave.format();
    }

    //public addGraphicalStaffEntry(entry: VexFlowStaffEntry): void {
    //    super.addGraphicalStaffEntry(entry);
    //}
    //
    //public addGraphicalStaffEntryAtTimestamp(entry: VexFlowStaffEntry): void {
    //    super.addGraphicalStaffEntryAtTimestamp(entry);
    //    // TODO
    //}

    /**
     * Draw this measure on a VexFlow CanvasContext
     * @param ctx
     */
    public draw(ctx: Vex.Flow.CanvasContext): void {
        // If this is the first stave in the vertical measure, call the format
        // method to set the width of all the voices
        if (this.formatVoices) {
            // The width of the voices does not include the instructions (StaveModifiers)
            this.formatVoices((this.PositionAndShape.BorderRight - this.beginInstructionsWidth - this.endInstructionsWidth) * unitInPixels);
        }

        // Force the width of the Begin Instructions
        this.stave.setNoteStartX(this.stave.getX() + unitInPixels * this.beginInstructionsWidth);
        // Draw stave lines
        this.stave.setContext(ctx).draw();
        // Draw all voices
        for (let voiceID in this.vfVoices) {
            if (this.vfVoices.hasOwnProperty(voiceID)) {
                this.vfVoices[voiceID].draw(ctx, this.stave);
            }
        }
        // Draw beams
        for (let voiceID in this.vfbeams) {
            if (this.vfbeams.hasOwnProperty(voiceID)) {
                for (let beam of this.vfbeams[voiceID]) {
                    beam.setContext(ctx).draw();
                }
            }
        }

        // Draw tuplets
        for (let voiceID in this.vftuplets) {
            if (this.vftuplets.hasOwnProperty(voiceID)) {
                for (let tuplet of this.vftuplets[voiceID]) {
                    tuplet.setContext(ctx).draw();
                }
            }
        }

        // Draw ties
        for (let tie of this.vfTies) {
            tie.setContext(ctx).draw();
        }

        // Draw vertical lines
        for (let connector of this.connectors) {
            connector.setContext(ctx).draw();
        }

        // now we can finally set the vexflow x positions back into the osmd object model:
        this.setStaffEntriesXPositions();
    }

    /**
     * Add a note to a beam
     * @param graphicalNote
     * @param beam
     */
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
        if (data[1].indexOf(parent) < 0) {
            data[1].push(parent);
        }
    }

    public handleTuplet(graphicalNote: GraphicalNote, tuplet: Tuplet): void {
        let voiceID: number = graphicalNote.sourceNote.ParentVoiceEntry.ParentVoice.VoiceId;
        let tuplets: [Tuplet, VexFlowStaffEntry[]][] = this.tuplets[voiceID];
        if (tuplets === undefined) {
            tuplets = this.tuplets[voiceID] = [];
        }
        let currentTupletBuilder: [Tuplet, VexFlowStaffEntry[]];
        for (let t of tuplets) {
            if (t[0] === tuplet) {
                currentTupletBuilder = t;
            }
        }
        if (currentTupletBuilder === undefined) {
            currentTupletBuilder = [tuplet, []];
            tuplets.push(currentTupletBuilder);
        }
        let parent: VexFlowStaffEntry = graphicalNote.parentStaffEntry as VexFlowStaffEntry;
        if (currentTupletBuilder[1].indexOf(parent) < 0) {
            currentTupletBuilder[1].push(parent);
        }
    }

    /**
     * Complete the creation of VexFlow Beams in this measure
     */
    public finalizeBeams(): void {
        // The following line resets the created Vex.Flow Beams and
        // created them brand new. Is this needed? And more importantly,
        // should the old beams be removed manually by the notes?
        this.vfbeams = {};
        for (let voiceID in this.beams) {
            if (this.beams.hasOwnProperty(voiceID)) {
                let vfbeams: Vex.Flow.Beam[] = this.vfbeams[voiceID];
                if (vfbeams === undefined) {
                    vfbeams = this.vfbeams[voiceID] = [];
                }
                for (let beam of this.beams[voiceID]) {
                    let notes: Vex.Flow.StaveNote[] = [];
                    for (let entry of beam[1]) {
                        notes.push((<VexFlowStaffEntry>entry).vfNotes[voiceID]);
                    }
                    if (notes.length > 1) {
                        vfbeams.push(new Vex.Flow.Beam(notes, true));
                        // just a test for coloring the notes:
                        // for (let note of notes) {
                        //     (<Vex.Flow.StaveNote> note).setStyle({fillStyle: "green", strokeStyle: "green"});
                        // }
                    } else {
                        Logging.log("Warning! Beam with no notes! Trying to ignore, but this is a serious problem.");
                    }
                }
            }
        }
    }

    /**
     * Complete the creation of VexFlow Tuplets in this measure
     */
    public finalizeTuplets(): void {
        // The following line resets the created Vex.Flow Tuplets and
        // created them brand new. Is this needed? And more importantly,
        // should the old tuplets be removed manually by the notes?
        this.vftuplets = {};
        for (let voiceID in this.tuplets) {
            if (this.tuplets.hasOwnProperty(voiceID)) {
                let vftuplets: Vex.Flow.Tuplet[] = this.vftuplets[voiceID];
                if (vftuplets === undefined) {
                    vftuplets = this.vftuplets[voiceID] = [];
                }
                for (let tuplet of this.tuplets[voiceID]) {
                    let notes: Vex.Flow.StaveNote[] = [];
                    for (let entry of tuplet[1]) {
                        notes.push((<VexFlowStaffEntry>entry).vfNotes[voiceID]);
                    }
                    if (notes.length > 1) {
                        vftuplets.push(new Vex.Flow.Tuplet(notes));
                    } else {
                        Logging.log("Warning! Tuplet with no notes! Trying to ignore, but this is a serious problem.");
                    }
                }
            }
        }
    }

    public layoutStaffEntry(graphicalStaffEntry: GraphicalStaffEntry): void {
        return;
    }

    public staffMeasureCreatedCalculations(): void {
        for (let idx: number = 0, len: number = this.staffEntries.length; idx < len; ++idx) {
            let graphicalStaffEntry: VexFlowStaffEntry = (this.staffEntries[idx] as VexFlowStaffEntry);

            // create vex flow Notes:
            let gnotes: { [voiceID: number]: GraphicalNote[]; } = graphicalStaffEntry.graphicalNotes;
            for (let voiceID in gnotes) {
                if (gnotes.hasOwnProperty(voiceID)) {
                    let vfnote: StaveNote = VexFlowConverter.StaveNote(gnotes[voiceID]);
                    (graphicalStaffEntry as VexFlowStaffEntry).vfNotes[voiceID] = vfnote;
                }
            }
        }

        this.finalizeBeams();
        this.finalizeTuplets();

        for (let idx: number = 0, len: number = this.staffEntries.length; idx < len; ++idx) {
            let graphicalStaffEntry: VexFlowStaffEntry = (this.staffEntries[idx] as VexFlowStaffEntry);
            let gnotes: { [voiceID: number]: GraphicalNote[]; } = graphicalStaffEntry.graphicalNotes;
            // create vex flow voices and add tickables to it:
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

                    vfVoices[voiceID].addTickable(graphicalStaffEntry.vfNotes[voiceID]);
                }
            }
        }
    }

    /**
     * Creates a line from 'top' to this measure, of type 'lineType'
     * @param top
     * @param lineType
     */
    public lineTo(top: VexFlowMeasure, lineType: any): void {
        let connector: StaveConnector = new Vex.Flow.StaveConnector(top.getVFStave(), this.stave);
        connector.setType(lineType);
        this.connectors.push(connector);
    }

    /**
     * Return the VexFlow Stave corresponding to this StaffMeasure
     * @returns {Vex.Flow.Stave}
     */
    public getVFStave(): Vex.Flow.Stave {
        return this.stave;
    }

    //private increaseBeginInstructionWidth(): void {
    //    let modifiers: StaveModifier[] = this.stave.getModifiers();
    //    let modifier: StaveModifier = modifiers[modifiers.length - 1];
    //    //let padding: number = modifier.getCategory() === "keysignatures" ? modifier.getPadding(2) : 0;
    //    let padding: number = modifier.getPadding(20);
    //    let width: number = modifier.getWidth();
    //    this.beginInstructionsWidth += (padding + width) / UnitInPixels;
    //}
    //
    //private increaseEndInstructionWidth(): void {
    //    let modifiers: StaveModifier[] = this.stave.getModifiers();
    //    let modifier: StaveModifier = modifiers[modifiers.length - 1];
    //    let padding: number = 0;
    //    let width: number = modifier.getWidth();
    //    this.endInstructionsWidth += (padding + width) / UnitInPixels;
    //
    //}

    /**
     * After re-running the formatting on the VexFlow Stave, update the
     * space needed by Instructions (in VexFlow: StaveModifiers)
     */
    private updateInstructionWidth(): void {
        this.beginInstructionsWidth = (this.stave.getNoteStartX() - this.stave.getX()) / unitInPixels;
        this.endInstructionsWidth = (this.stave.getX() + this.stave.getWidth() - this.stave.getNoteEndX()) / unitInPixels;
    }

    /**
     * sets the vexflow x positions back into the bounding boxes of the staff entries in the osmd object model.
     * The positions are needed for cursor placement and mouse/tap interactions
     */
    private setStaffEntriesXPositions(): void {
        for (let idx3: number = 0, len3: number = this.staffEntries.length; idx3 < len3; ++idx3) {
            let gse: VexFlowStaffEntry = (<VexFlowStaffEntry> this.staffEntries[idx3]);
            let measure: StaffMeasure = gse.parentMeasure;
            let x: number =
                gse.getX() -
                measure.PositionAndShape.RelativePosition.x -
                measure.ParentStaffLine.PositionAndShape.RelativePosition.x -
                measure.parentMusicSystem.PositionAndShape.RelativePosition.x;
            gse.PositionAndShape.RelativePosition.x = x;
        }
    }
}
