import Vex = require("vexflow");
import {StaffMeasure} from "../StaffMeasure";
import {SourceMeasure} from "../../VoiceData/SourceMeasure";
import {Staff} from "../../VoiceData/Staff";
import {StaffLine} from "../StaffLine";
import {SystemLinesEnum} from "../SystemLinesEnum";
import {ClefInstruction} from "../../VoiceData/Instructions/ClefInstruction";
import {KeyInstruction} from "../../VoiceData/Instructions/KeyInstruction";
import {RhythmInstruction} from "../../VoiceData/Instructions/RhythmInstruction";
import {VexFlowConverter, VexFlowRepetitionType, VexFlowBarlineType} from "./VexFlowConverter";
import {VexFlowStaffEntry} from "./VexFlowStaffEntry";
import {Beam} from "../../VoiceData/Beam";
import {GraphicalNote} from "../GraphicalNote";
import {GraphicalStaffEntry} from "../GraphicalStaffEntry";
import StaveConnector = Vex.Flow.StaveConnector;
import StaveNote = Vex.Flow.StaveNote;
import {Logging} from "../../../Common/Logging";
import {unitInPixels} from "./VexFlowMusicSheetDrawer";
import {Tuplet} from "../../VoiceData/Tuplet";
import { RepetitionInstructionEnum } from "../../VoiceData/Instructions/RepetitionInstruction";
import { SystemLinePosition } from "../SystemLinePosition";
import { StemDirectionType } from "../../VoiceData/VoiceEntry";

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
    // The repetition instructions given as words or symbols (coda, dal segno..)
    public vfRepetitionWords: Vex.Flow.Repetition[] = [];

    // The VexFlow Stave (= one measure in a staffline)
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
     * returns the x-width (in units) of a given measure line {SystemLinesEnum}.
     * @param line
     * @returns the x-width in osmd units
     */
    public getLineWidth(line: SystemLinesEnum): number {
        switch (line) {
            // return 0 for the normal lines, as the line width will be considered at the updateInstructionWidth() method using the stavemodifiers.
            // case SystemLinesEnum.SingleThin:
            //     return 5.0 / unitInPixels;
            // case SystemLinesEnum.DoubleThin:
            //     return 5.0 / unitInPixels;
            //     case SystemLinesEnum.ThinBold:
            //     return 5.0 / unitInPixels;
            // but just add a little extra space for repetitions (cosmetics):
            case SystemLinesEnum.BoldThinDots:
            case SystemLinesEnum.DotsThinBold:
                return 10.0 / unitInPixels;
            case SystemLinesEnum.DotsBoldBoldDots:
                return 10.0 / unitInPixels;
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
        const vfclef: { type: string, size: string, annotation: string } = VexFlowConverter.Clef(clef, "default");
        this.stave.addClef(vfclef.type, vfclef.size, vfclef.annotation, Vex.Flow.Modifier.Position.BEGIN);
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
        const timeSig: Vex.Flow.TimeSignature = VexFlowConverter.TimeSignature(rhythm);
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
        const vfclef: { type: string, size: string, annotation: string } = VexFlowConverter.Clef(clef, "small");
        this.stave.setEndClef(vfclef.type, vfclef.size, vfclef.annotation);
        this.updateInstructionWidth();
    }

    public addMeasureLine(lineType: SystemLinesEnum, linePosition: SystemLinePosition): void {
        switch (linePosition) {
            case SystemLinePosition.MeasureBegin:
                switch (lineType) {
                    case SystemLinesEnum.BoldThinDots:
                        this.stave.setBegBarType(VexFlowBarlineType.REPEAT_BEGIN);
                        break;
                    default:
                        break;
                }
                break;
            case SystemLinePosition.MeasureEnd:
                switch (lineType) {
                    case SystemLinesEnum.DotsBoldBoldDots:
                        this.stave.setEndBarType(VexFlowBarlineType.REPEAT_BOTH);
                        break;
                    case SystemLinesEnum.DotsThinBold:
                        this.stave.setEndBarType(VexFlowBarlineType.REPEAT_END);
                        break;
                    case SystemLinesEnum.DoubleThin:
                        this.stave.setEndBarType(VexFlowBarlineType.DOUBLE);
                        break;
                    case SystemLinesEnum.ThinBold:
                        this.stave.setEndBarType(VexFlowBarlineType.END);
                        break;
                    default:
                        break;
                }
                break;
            default:
                break;
        }
    }

    /**
     * Adds a measure number to the top left corner of the measure
     * This method is not used currently in favor of the calculateMeasureNumberPlacement
     * method in the MusicSheetCalculator.ts
     */
    public addMeasureNumber(): void {
        const text: string = this.MeasureNumber.toString();
        const position: number = Vex.Flow.StaveModifier.Position.ABOVE;
        const options: any = {
            justification: 1,
            shift_x: 0,
            shift_y: 0,
          };

        this.stave.setText(text, position, options);
    }

    public addWordRepetition(repetitionInstruction: RepetitionInstructionEnum): void {
        let instruction: VexFlowRepetitionType = undefined;
        let position: any = Vex.Flow.Modifier.Position.END;
        switch (repetitionInstruction) {
          case RepetitionInstructionEnum.Segno:
            // create Segno Symbol:
            instruction = VexFlowRepetitionType.SEGNO_LEFT;
            position = Vex.Flow.Modifier.Position.BEGIN;
            break;
          case RepetitionInstructionEnum.Coda:
            // create Coda Symbol:
            instruction = VexFlowRepetitionType.CODA_LEFT;
            position = Vex.Flow.Modifier.Position.BEGIN;
            break;
          case RepetitionInstructionEnum.DaCapo:
            instruction = VexFlowRepetitionType.DC;
            break;
          case RepetitionInstructionEnum.DalSegno:
            instruction = VexFlowRepetitionType.DS;
            break;
          case RepetitionInstructionEnum.Fine:
            instruction = VexFlowRepetitionType.FINE;
            break;
          case RepetitionInstructionEnum.ToCoda:
            //instruction = "To Coda";
            break;
          case RepetitionInstructionEnum.DaCapoAlFine:
            instruction = VexFlowRepetitionType.DC_AL_FINE;
            break;
          case RepetitionInstructionEnum.DaCapoAlCoda:
            instruction = VexFlowRepetitionType.DC_AL_CODA;
            break;
          case RepetitionInstructionEnum.DalSegnoAlFine:
            instruction = VexFlowRepetitionType.DS_AL_FINE;
            break;
          case RepetitionInstructionEnum.DalSegnoAlCoda:
            instruction = VexFlowRepetitionType.DS_AL_CODA;
            break;
          default:
            break;
        }
        if (instruction !== undefined) {
            this.stave.addModifier(new Vex.Flow.Repetition(instruction, 0, 0), position);
        }
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
    public draw(ctx: Vex.Flow.RenderContext): void {

        // Draw stave lines
        this.stave.setContext(ctx).draw();
        // Draw all voices
        for (const voiceID in this.vfVoices) {
            if (this.vfVoices.hasOwnProperty(voiceID)) {
                this.vfVoices[voiceID].draw(ctx, this.stave);
            }
        }
        // Draw beams
        for (const voiceID in this.vfbeams) {
            if (this.vfbeams.hasOwnProperty(voiceID)) {
                for (const beam of this.vfbeams[voiceID]) {
                    beam.setContext(ctx).draw();
                }
            }
        }

        // Draw tuplets
        for (const voiceID in this.vftuplets) {
            if (this.vftuplets.hasOwnProperty(voiceID)) {
                for (const tuplet of this.vftuplets[voiceID]) {
                    tuplet.setContext(ctx).draw();
                }
            }
        }

        // Draw ties
        for (const tie of this.vfTies) {
            tie.setContext(ctx).draw();
        }

        // Draw vertical lines
        for (const connector of this.connectors) {
            connector.setContext(ctx).draw();
        }
    }

    public format(): void {
        // If this is the first stave in the vertical measure, call the format
        // method to set the width of all the voices
        if (this.formatVoices) {
            // The width of the voices does not include the instructions (StaveModifiers)
            this.formatVoices((this.PositionAndShape.BorderRight - this.beginInstructionsWidth - this.endInstructionsWidth) * unitInPixels);
        }

        // Force the width of the Begin Instructions
        this.stave.setNoteStartX(this.stave.getX() + unitInPixels * this.beginInstructionsWidth);
    }

    /**
     * Add a note to a beam
     * @param graphicalNote
     * @param beam
     */
    public handleBeam(graphicalNote: GraphicalNote, beam: Beam): void {
        const voiceID: number = graphicalNote.sourceNote.ParentVoiceEntry.ParentVoice.VoiceId;
        let beams: [Beam, VexFlowStaffEntry[]][] = this.beams[voiceID];
        if (beams === undefined) {
            beams = this.beams[voiceID] = [];
        }
        let data: [Beam, VexFlowStaffEntry[]];
        for (const mybeam of beams) {
            if (mybeam[0] === beam) {
                data = mybeam;
            }
        }
        if (data === undefined) {
            data = [beam, []];
            beams.push(data);
        }
        const parent: VexFlowStaffEntry = graphicalNote.parentStaffEntry as VexFlowStaffEntry;
        if (data[1].indexOf(parent) < 0) {
            data[1].push(parent);
        }
    }

    public handleTuplet(graphicalNote: GraphicalNote, tuplet: Tuplet): void {
        const voiceID: number = graphicalNote.sourceNote.ParentVoiceEntry.ParentVoice.VoiceId;
        tuplet = graphicalNote.sourceNote.NoteTuplet;
        let tuplets: [Tuplet, VexFlowStaffEntry[]][] = this.tuplets[voiceID];
        if (tuplets === undefined) {
            tuplets = this.tuplets[voiceID] = [];
        }
        let currentTupletBuilder: [Tuplet, VexFlowStaffEntry[]];
        for (const t of tuplets) {
            if (t[0] === tuplet) {
                currentTupletBuilder = t;
            }
        }
        if (currentTupletBuilder === undefined) {
            currentTupletBuilder = [tuplet, []];
            tuplets.push(currentTupletBuilder);
        }
        const parent: VexFlowStaffEntry = graphicalNote.parentStaffEntry as VexFlowStaffEntry;
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
        for (const voiceID in this.beams) {
            if (this.beams.hasOwnProperty(voiceID)) {
                let vfbeams: Vex.Flow.Beam[] = this.vfbeams[voiceID];
                if (vfbeams === undefined) {
                    vfbeams = this.vfbeams[voiceID] = [];
                }
                for (const beam of this.beams[voiceID]) {
                    const notes: Vex.Flow.StaveNote[] = [];
                    const staffEntries: VexFlowStaffEntry[] = beam[1];
                    const autoStemBeam: boolean = staffEntries[0].graphicalNotes[voiceID][0].sourceNote.
                                                    ParentVoiceEntry.StemDirection === StemDirectionType.Undefined;
                    for (const entry of staffEntries) {
                        const note: Vex.Flow.StaveNote = (<VexFlowStaffEntry>entry).vfNotes[voiceID];
                        if (note !== undefined) {
                          notes.push(note);
                        }
                    }
                    if (notes.length > 1) {
                        const vfBeam: Vex.Flow.Beam = new Vex.Flow.Beam(notes, autoStemBeam);
                        vfbeams.push(vfBeam);
                        // just a test for coloring the notes:
                        // for (let note of notes) {
                        //     (<Vex.Flow.StaveNote> note).setStyle({fillStyle: "green", strokeStyle: "green"});
                        // }
                    } else {
                        Logging.log("Warning! Beam with no notes!");
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
        // should the old tuplets be removed manually from the notes?
        this.vftuplets = {};
        for (const voiceID in this.tuplets) {
            if (this.tuplets.hasOwnProperty(voiceID)) {
                let vftuplets: Vex.Flow.Tuplet[] = this.vftuplets[voiceID];
                if (vftuplets === undefined) {
                    vftuplets = this.vftuplets[voiceID] = [];
                }
                for (const tupletBuilder of this.tuplets[voiceID]) {
                    const tupletStaveNotes: Vex.Flow.StaveNote[] = [];
                    const tupletStaffEntries: VexFlowStaffEntry[] = tupletBuilder[1];
                    for (const tupletStaffEntry of tupletStaffEntries) {
                      tupletStaveNotes.push((tupletStaffEntry).vfNotes[voiceID]);
                    }
                    if (tupletStaveNotes.length > 1) {
                      const notesOccupied: number = 2;
                      vftuplets.push(new Vex.Flow.Tuplet( tupletStaveNotes,
                                                          {
                                                            notes_occupied: notesOccupied,
                                                            num_notes: tupletStaveNotes.length //, location: -1, ratioed: true
                                                          }));
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
            const graphicalStaffEntry: VexFlowStaffEntry = (this.staffEntries[idx] as VexFlowStaffEntry);

            // create vex flow Notes:
            const gnotes: { [voiceID: number]: GraphicalNote[]; } = graphicalStaffEntry.graphicalNotes;
            for (const voiceID in gnotes) {
                if (gnotes.hasOwnProperty(voiceID)) {
                    const vfnote: StaveNote = VexFlowConverter.StaveNote(gnotes[voiceID]);
                    (graphicalStaffEntry as VexFlowStaffEntry).vfNotes[voiceID] = vfnote;
                }
            }
        }

        this.finalizeBeams();
        this.finalizeTuplets();

        for (let idx: number = 0, len: number = this.staffEntries.length; idx < len; ++idx) {
            const graphicalStaffEntry: VexFlowStaffEntry = (this.staffEntries[idx] as VexFlowStaffEntry);
            const gnotes: { [voiceID: number]: GraphicalNote[]; } = graphicalStaffEntry.graphicalNotes;
            // create vex flow voices and add tickables to it:
            const vfVoices: { [voiceID: number]: Vex.Flow.Voice; } = this.vfVoices;
            for (const voiceID in gnotes) {
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
        this.createArticulations();
    }

    private createArticulations(): void {
        for (let idx: number = 0, len: number = this.staffEntries.length; idx < len; ++idx) {
            const graphicalStaffEntry: VexFlowStaffEntry = (this.staffEntries[idx] as VexFlowStaffEntry);

            // create vex flow Notes:
            const gnotes: { [voiceID: number]: GraphicalNote[]; } = graphicalStaffEntry.graphicalNotes;
            for (const voiceID in gnotes) {
                if (gnotes.hasOwnProperty(voiceID)) {
                    const vfnote: StaveNote = (graphicalStaffEntry as VexFlowStaffEntry).vfNotes[voiceID];
                    VexFlowConverter.generateArticulations(vfnote, gnotes[voiceID][0].sourceNote.ParentVoiceEntry.Articulations);
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
        const connector: StaveConnector = new Vex.Flow.StaveConnector(top.getVFStave(), this.stave);
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

    /**
     * After re-running the formatting on the VexFlow Stave, update the
     * space needed by Instructions (in VexFlow: StaveModifiers)
     */
    private updateInstructionWidth(): void {
        let beginInstructionsWidth: number = 0;
        let endInstructionsWidth: number = 0;
        const modifiers: Vex.Flow.StaveModifier[] = this.stave.getModifiers();
        for (const mod of modifiers) {
            if (mod.getPosition() === Vex.Flow.StaveModifier.Position.BEGIN) {
                beginInstructionsWidth += mod.getWidth() + mod.getPadding(undefined);
            } else if (mod.getPosition() === Vex.Flow.StaveModifier.Position.END) {
                endInstructionsWidth += mod.getWidth() + mod.getPadding(undefined);
            }
        }

        this.beginInstructionsWidth = beginInstructionsWidth / unitInPixels;
        this.endInstructionsWidth = endInstructionsWidth / unitInPixels;
        //this.beginInstructionsWidth =  (this.stave.getNoteStartX() - this.stave.getX()) / unitInPixels;
        //this.endInstructionsWidth = (this.stave.getX() + this.stave.getWidth() - this.stave.getNoteEndX()) / unitInPixels;
    }
}
