import Vex = require("vexflow");
import {GraphicalMeasure} from "../GraphicalMeasure";
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
import StemmableNote = Vex.Flow.StemmableNote;
import NoteSubGroup = Vex.Flow.NoteSubGroup;
import * as log from "loglevel";
import {unitInPixels} from "./VexFlowMusicSheetDrawer";
import {Tuplet} from "../../VoiceData/Tuplet";
import {RepetitionInstructionEnum, RepetitionInstruction, AlignmentType} from "../../VoiceData/Instructions/RepetitionInstruction";
import {SystemLinePosition} from "../SystemLinePosition";
import {StemDirectionType} from "../../VoiceData/VoiceEntry";
import {GraphicalVoiceEntry} from "../GraphicalVoiceEntry";
import {VexFlowVoiceEntry} from "./VexFlowVoiceEntry";
import {Fraction} from "../../../Common/DataObjects/Fraction";
import {Voice} from "../../VoiceData/Voice";
import {LinkedVoice} from "../../VoiceData/LinkedVoice";
import {EngravingRules} from "../EngravingRules";
import {OrnamentContainer} from "../../VoiceData/OrnamentContainer";
import {TechnicalInstruction} from "../../VoiceData/Instructions/TechnicalInstruction";
import {PlacementEnum} from "../../VoiceData/Expressions/AbstractExpression";
import {ArpeggioType} from "../../VoiceData/Arpeggio";
import {VexFlowGraphicalNote} from "./VexFlowGraphicalNote";

export class VexFlowMeasure extends GraphicalMeasure {
    constructor(staff: Staff, staffLine: StaffLine = undefined, sourceMeasure: SourceMeasure = undefined) {
        super(staff, sourceMeasure, staffLine);
        this.minimumStaffEntriesWidth = -1;
        this.resetLayout();
    }

    /** octaveOffset according to active clef */
    public octaveOffset: number = 3;
    /** The VexFlow Voices in the measure */
    public vfVoices: { [voiceID: number]: Vex.Flow.Voice; } = {};
    /** Call this function (if present) to x-format all the voices in the measure */
    public formatVoices: (width: number) => void;
    /** The VexFlow Ties in the measure */
    public vfTies: Vex.Flow.StaveTie[] = [];
    /** The repetition instructions given as words or symbols (coda, dal segno..) */
    public vfRepetitionWords: Vex.Flow.Repetition[] = [];
    /** The VexFlow Stave (= one measure in a staffline) */
    private stave: Vex.Flow.Stave;
    /** VexFlow StaveConnectors (vertical lines) */
    private connectors: Vex.Flow.StaveConnector[] = [];
    /** Intermediate object to construct beams */
    private beams: { [voiceID: number]: [Beam, VexFlowVoiceEntry[]][]; } = {};
    /** VexFlow Beams */
    private vfbeams: { [voiceID: number]: Vex.Flow.Beam[]; };
    /** Intermediate object to construct tuplets */
    private tuplets: { [voiceID: number]: [Tuplet, VexFlowVoiceEntry[]][]; } = {};
    /** VexFlow Tuplets */
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
        const position: number = StavePositionEnum.ABOVE;  //Vex.Flow.StaveModifier.Position.ABOVE;
        const options: any = {
            justification: 1,
            shift_x: 0,
            shift_y: 0,
          };

        this.stave.setText(text, position, options);
    }

    public addWordRepetition(repetitionInstruction: RepetitionInstruction): void {
        let instruction: VexFlowRepetitionType = undefined;
        let position: any = Vex.Flow.Modifier.Position.END;
        switch (repetitionInstruction.type) {
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
            return;
        }

        this.addVolta(repetitionInstruction);
    }

    private addVolta(repetitionInstruction: RepetitionInstruction): void {
        let voltaType: number = Vex.Flow.Volta.type.BEGIN;
        if (repetitionInstruction.type === RepetitionInstructionEnum.Ending) {
            switch (repetitionInstruction.alignment) {
                case AlignmentType.Begin:
                    if (this.parentSourceMeasure.endsRepetitionEnding()) {
                        voltaType = Vex.Flow.Volta.type.BEGIN_END;
                    } else {
                        voltaType = Vex.Flow.Volta.type.BEGIN;
                    }
                    break;
                case AlignmentType.End:
                    if (this.parentSourceMeasure.beginsRepetitionEnding()) {
                        //voltaType = Vex.Flow.Volta.type.BEGIN_END;
                        // don't add BEGIN_END volta a second time:
                        return;
                    } else {
                        voltaType = Vex.Flow.Volta.type.END;
                    }
                    break;
                default:
                    break;
            }
            this.stave.setVoltaType(voltaType, repetitionInstruction.endingIndices[0], 0);
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
        // vexflow does the x-layout
    }

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
                // this.vfVoices[voiceID].tickables.forEach(t => t.getBoundingBox().draw(ctx));
                // this.vfVoices[voiceID].tickables.forEach(t => t.getBoundingBox().draw(ctx));
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

    // this currently formats multiple measures, see VexFlowMusicSheetCalculator.formatMeasures()
    public format(): void {
        // If this is the first stave in the vertical measure, call the format
        // method to set the width of all the voices
        if (this.formatVoices) {
            // set the width of the voices to the current measure width:
            // (The width of the voices does not include the instructions (StaveModifiers))
            this.formatVoices((this.PositionAndShape.Size.width - this.beginInstructionsWidth - this.endInstructionsWidth) * unitInPixels);
        }
    }

    /**
     * Returns all the voices that are present in this measure
     */
    public getVoicesWithinMeasure(): Voice[] {
        const voices: Voice[] = [];
        for (const gse of this.staffEntries) {
           for (const gve of gse.graphicalVoiceEntries) {
                if (voices.indexOf(gve.parentVoiceEntry.ParentVoice) === -1) {
                    voices.push(gve.parentVoiceEntry.ParentVoice);
                }
            }
        }
        return voices;
    }

    /**
     * Returns all the graphicalVoiceEntries of a given Voice.
     * @param voice the voice for which the graphicalVoiceEntries shall be returned.
     */
    public getGraphicalVoiceEntriesPerVoice(voice: Voice): GraphicalVoiceEntry[] {
        const voiceEntries: GraphicalVoiceEntry[] = [];
        for (const gse of this.staffEntries) {
           for (const gve of gse.graphicalVoiceEntries) {
                if (gve.parentVoiceEntry.ParentVoice === voice) {
                    voiceEntries.push(gve);
                }
            }
        }
        return voiceEntries;
    }

    /**
     * Finds the gaps between the existing notes within a measure.
     * Problem here is, that the graphicalVoiceEntry does not exist yet and
     * that Tied notes are not present in the normal voiceEntries.
     * To handle this, calculation with absolute timestamps is needed.
     * And the graphical notes have to be analysed directly (and not the voiceEntries, as it actually should be -> needs refactoring)
     * @param voice the voice for which the ghost notes shall be searched.
     */
    private getRestFilledVexFlowStaveNotesPerVoice(voice: Voice): GraphicalVoiceEntry[] {
        let latestVoiceTimestamp: Fraction = undefined;
        const gvEntries: GraphicalVoiceEntry[] = this.getGraphicalVoiceEntriesPerVoice(voice);
        for (let idx: number = 0, len: number = gvEntries.length; idx < len; ++idx) {
            const gve: GraphicalVoiceEntry = gvEntries[idx];
            const gNotesStartTimestamp: Fraction = gve.notes[0].sourceNote.getAbsoluteTimestamp();
            // find the voiceEntry end timestamp:
            let gNotesEndTimestamp: Fraction = new Fraction();
            for (const graphicalNote of gve.notes) {
                const noteEnd: Fraction  = Fraction.plus(graphicalNote.sourceNote.getAbsoluteTimestamp(), graphicalNote.sourceNote.Length);
                if (gNotesEndTimestamp < noteEnd) {
                    gNotesEndTimestamp = noteEnd;
                }
            }

            // check if this voice has just been found the first time:
            if (latestVoiceTimestamp === undefined) {
                // if this voice is new, check for a gap from measure start to the start of the current voice entry:
                const gapFromMeasureStart: Fraction = Fraction.minus(gNotesStartTimestamp, this.parentSourceMeasure.AbsoluteTimestamp);
                if (gapFromMeasureStart.RealValue > 0) {
                    log.debug("Ghost Found at start");
                    const vfghost: Vex.Flow.GhostNote = VexFlowConverter.GhostNote(gapFromMeasureStart);
                    const ghostGve: VexFlowVoiceEntry = new VexFlowVoiceEntry(undefined, undefined);
                    ghostGve.vfStaveNote = vfghost;
                    gvEntries.splice(0, 0, ghostGve);
                    idx++;
                }
            } else {
                // get the length of the empty space between notes:
                const inBetweenLength: Fraction = Fraction.minus(gNotesStartTimestamp, latestVoiceTimestamp);

                if (inBetweenLength.RealValue > 0) {
                    log.debug("Ghost Found in between");
                    const vfghost: Vex.Flow.GhostNote = VexFlowConverter.GhostNote(inBetweenLength);
                    const ghostGve: VexFlowVoiceEntry = new VexFlowVoiceEntry(undefined, undefined);
                    ghostGve.vfStaveNote = vfghost;
                    // add element before current element:
                    gvEntries.splice(idx, 0, ghostGve);
                    // and increase index, as we added an element:
                    idx++;
                }
            }

            // finally set the latest timestamp of this voice to the end timestamp of the longest note in the current voiceEntry:
            latestVoiceTimestamp = gNotesEndTimestamp;


        }

        const measureEndTimestamp: Fraction = Fraction.plus(this.parentSourceMeasure.AbsoluteTimestamp, this.parentSourceMeasure.Duration);
        const restLength: Fraction = Fraction.minus(measureEndTimestamp, latestVoiceTimestamp);
        if (restLength.RealValue > 0) {
            // fill the gap with a rest ghost note
            // starting from lastFraction
            // with length restLength:
            log.debug("Ghost Found at end");
            const vfghost: Vex.Flow.GhostNote = VexFlowConverter.GhostNote(restLength);
            const ghostGve: VexFlowVoiceEntry = new VexFlowVoiceEntry(undefined, undefined);
            ghostGve.vfStaveNote = vfghost;
            gvEntries.push(ghostGve);
        }
        return gvEntries;
    }

    /**
     * Add a note to a beam
     * @param graphicalNote
     * @param beam
     */
    public handleBeam(graphicalNote: GraphicalNote, beam: Beam): void {
        const voiceID: number = graphicalNote.sourceNote.ParentVoiceEntry.ParentVoice.VoiceId;
        let beams: [Beam, VexFlowVoiceEntry[]][] = this.beams[voiceID];
        if (beams === undefined) {
            beams = this.beams[voiceID] = [];
        }
        let data: [Beam, VexFlowVoiceEntry[]];
        for (const mybeam of beams) {
            if (mybeam[0] === beam) {
                data = mybeam;
            }
        }
        if (data === undefined) {
            data = [beam, []];
            beams.push(data);
        }
        const parent: VexFlowVoiceEntry = graphicalNote.parentVoiceEntry as VexFlowVoiceEntry;
        if (data[1].indexOf(parent) < 0) {
            data[1].push(parent);
        }
    }

    public handleTuplet(graphicalNote: GraphicalNote, tuplet: Tuplet): void {
        const voiceID: number = graphicalNote.sourceNote.ParentVoiceEntry.ParentVoice.VoiceId;
        tuplet = graphicalNote.sourceNote.NoteTuplet;
        let tuplets: [Tuplet, VexFlowVoiceEntry[]][] = this.tuplets[voiceID];
        if (tuplets === undefined) {
            tuplets = this.tuplets[voiceID] = [];
        }
        let currentTupletBuilder: [Tuplet, VexFlowVoiceEntry[]];
        for (const t of tuplets) {
            if (t[0] === tuplet) {
                currentTupletBuilder = t;
            }
        }
        if (currentTupletBuilder === undefined) {
            currentTupletBuilder = [tuplet, []];
            tuplets.push(currentTupletBuilder);
        }
        const parent: VexFlowVoiceEntry = graphicalNote.parentVoiceEntry as VexFlowVoiceEntry;
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
                    const psBeam: Beam = beam[0];
                    const voiceEntries: VexFlowVoiceEntry[] = beam[1];

                    let autoStemBeam: boolean = true;
                    for (const gve of voiceEntries) {
                        if (gve.parentVoiceEntry.ParentVoice === psBeam.Notes[0].ParentVoiceEntry.ParentVoice) {
                            autoStemBeam = gve.parentVoiceEntry.WantedStemDirection === StemDirectionType.Undefined;
                        }
                    }

                    let isGraceBeam: boolean = false;
                    for (const entry of voiceEntries) {
                        const note: Vex.Flow.StaveNote = ((<VexFlowVoiceEntry>entry).vfStaveNote as StaveNote);
                        if (note !== undefined) {
                          notes.push(note);
                        }
                        if (entry.parentVoiceEntry.IsGrace) {
                            isGraceBeam = true;
                        }
                    }
                    if (notes.length > 1) {
                        const vfBeam: Vex.Flow.Beam = new Vex.Flow.Beam(notes, autoStemBeam);
                        if (isGraceBeam) {
                            // smaller beam, as in Vexflow.GraceNoteGroup.beamNotes()
                            (<any>vfBeam).render_options.beam_width = 3;
                            (<any>vfBeam).render_options.partial_beam_length = 4;
                        }
                        vfbeams.push(vfBeam);
                        // just a test for coloring the notes:
                        // for (let note of notes) {
                        //     (<Vex.Flow.StaveNote> note).setStyle({fillStyle: "green", strokeStyle: "green"});
                        // }
                    } else {
                        log.debug("Warning! Beam with no notes!");
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
                    const tupletVoiceEntries: VexFlowVoiceEntry[] = tupletBuilder[1];
                    for (const tupletVoiceEntry of tupletVoiceEntries) {
                      tupletStaveNotes.push(((tupletVoiceEntry).vfStaveNote as StaveNote));
                    }
                    if (tupletStaveNotes.length > 1) {
                      const notesOccupied: number = 2;
                      const tuplet: Tuplet = tupletBuilder[0];
                      const bracketed: boolean = tuplet.Bracket ||
                        (tuplet.TupletLabelNumber === 3 && EngravingRules.Rules.TripletsBracketed) ||
                        (tuplet.TupletLabelNumber !== 3 && EngravingRules.Rules.TupletsBracketed);
                      vftuplets.push(new Vex.Flow.Tuplet( tupletStaveNotes,
                                                          {
                                                            bracketed: bracketed,
                                                            notes_occupied: notesOccupied,
                                                            num_notes: tupletStaveNotes.length, //, location: -1, ratioed: true
                                                            ratioed: EngravingRules.Rules.TupletsRatioed,
                                                          }));
                    } else {
                        log.debug("Warning! Tuplet with no notes! Trying to ignore, but this is a serious problem.");
                    }
                }
            }
        }
    }

    public layoutStaffEntry(graphicalStaffEntry: GraphicalStaffEntry): void {
        return;
    }

    public graphicalMeasureCreatedCalculations(): void {
        let graceSlur: boolean;
        let graceGVoiceEntriesBefore: GraphicalVoiceEntry[];
        for (const graphicalStaffEntry of this.staffEntries as VexFlowStaffEntry[]) {
            graceSlur = false;
            graceGVoiceEntriesBefore = [];
            // create vex flow Stave Notes:
            for (const gve of graphicalStaffEntry.graphicalVoiceEntries) {
                if (gve.parentVoiceEntry.IsGrace) {
                    graceGVoiceEntriesBefore.push(gve);
                    if (!graceSlur) {
                        graceSlur = gve.parentVoiceEntry.GraceSlur;
                    }
                    continue;
                }
                if (gve.notes[0].sourceNote.PrintObject) {
                    (gve as VexFlowVoiceEntry).vfStaveNote = VexFlowConverter.StaveNote(gve);
                } else {
                    // don't render note. add ghost note, otherwise Vexflow can have issues with layouting when voices not complete.
                    (gve as VexFlowVoiceEntry).vfStaveNote = VexFlowConverter.GhostNote(gve.notes[0].sourceNote.Length);
                    graceGVoiceEntriesBefore = []; // if note is not rendered, its grace notes might need to be removed
                    continue;
                }
                if (graceGVoiceEntriesBefore.length > 0) {
                    const graceNotes: Vex.Flow.GraceNote[] = [];
                    for (let i: number = 0; i < graceGVoiceEntriesBefore.length; i++) {
                        const gveGrace: VexFlowVoiceEntry = <VexFlowVoiceEntry>graceGVoiceEntriesBefore[i];
                        if (gveGrace.notes[0].sourceNote.PrintObject) {
                            const vfStaveNote: StaveNote = VexFlowConverter.StaveNote(gveGrace);
                            gveGrace.vfStaveNote = vfStaveNote;
                            graceNotes.push(vfStaveNote);
                        }
                    }
                    const graceNoteGroup: Vex.Flow.GraceNoteGroup = new Vex.Flow.GraceNoteGroup(graceNotes, graceSlur);
                    (gve as VexFlowVoiceEntry).vfStaveNote.addModifier(0, graceNoteGroup);
                    graceGVoiceEntriesBefore = [];
                }
            }
        }
        // remaining grace notes at end of measure, turned into stand-alone grace notes:
        if (graceGVoiceEntriesBefore.length > 0) {
            for (const graceGve of graceGVoiceEntriesBefore) {
                (graceGve as VexFlowVoiceEntry).vfStaveNote = VexFlowConverter.StaveNote(graceGve);
                graceGve.parentVoiceEntry.GraceAfterMainNote = true;
            }
        }

        this.finalizeBeams();
        this.finalizeTuplets();

        const voices: Voice[] = this.getVoicesWithinMeasure();

        for (const voice of voices) {
            if (voice === undefined) {
                continue;
            }
            const isMainVoice: boolean = !(voice instanceof LinkedVoice);

            // add a vexFlow voice for this voice:
            this.vfVoices[voice.VoiceId] = new Vex.Flow.Voice({
                        beat_value: this.parentSourceMeasure.Duration.Denominator,
                        num_beats: this.parentSourceMeasure.Duration.Numerator,
                        resolution: Vex.Flow.RESOLUTION,
                    }).setMode(Vex.Flow.Voice.Mode.SOFT);

            const restFilledEntries: GraphicalVoiceEntry[] =  this.getRestFilledVexFlowStaveNotesPerVoice(voice);
            // create vex flow voices and add tickables to it:
            for (const voiceEntry of restFilledEntries) {
                if (voiceEntry.parentVoiceEntry) {
                    if (voiceEntry.parentVoiceEntry.IsGrace && !voiceEntry.parentVoiceEntry.GraceAfterMainNote) {
                        continue;
                    }
                }

                const vexFlowVoiceEntry: VexFlowVoiceEntry = voiceEntry as VexFlowVoiceEntry;
                if (voiceEntry.notes.length === 0 || !voiceEntry.notes[0] || !voiceEntry.notes[0].sourceNote.PrintObject) {
                    // GhostNote, don't add modifiers like in-measure clefs
                    this.vfVoices[voice.VoiceId].addTickable(vexFlowVoiceEntry.vfStaveNote);
                    continue;
                }

                // check for in-measure clefs:
                // only add clefs in main voice (to not add them twice)
                if (isMainVoice) {
                    const vfse: VexFlowStaffEntry = vexFlowVoiceEntry.parentStaffEntry as VexFlowStaffEntry;
                    if (vfse && vfse.vfClefBefore !== undefined) {
                        // add clef as NoteSubGroup so that we get modifier layouting
                        const clefModifier: NoteSubGroup = new NoteSubGroup( [vfse.vfClefBefore] );
                        vexFlowVoiceEntry.vfStaveNote.addModifier(0, clefModifier);
                    }
                }

                // add fingering
                if (voiceEntry.parentVoiceEntry && EngravingRules.Rules.RenderFingerings) {
                    this.createFingerings(voiceEntry);
                }

                // add Arpeggio
                if (voiceEntry.parentVoiceEntry && voiceEntry.parentVoiceEntry.Arpeggio !== undefined) {
                    const type: ArpeggioType = voiceEntry.parentVoiceEntry.Arpeggio.type;
                    vexFlowVoiceEntry.vfStaveNote.addStroke(0, new Vex.Flow.Stroke(type));
                }

                this.vfVoices[voice.VoiceId].addTickable(vexFlowVoiceEntry.vfStaveNote);
            }
        }
        this.createArticulations();
        this.createOrnaments();
        this.setStemDirectionFromVexFlow();
    }

    /**
     * Copy the stem directions chosen by VexFlow to the StemDirection variable of the graphical notes
     */
    private setStemDirectionFromVexFlow(): void {
        //if StemDirection was not set then read out what VexFlow has chosen
        for ( const vfStaffEntry of this.staffEntries ) {
            for ( const gVoiceEntry of vfStaffEntry.graphicalVoiceEntries) {
                for ( const gnote of gVoiceEntry.notes) {
                    const vfnote: [StaveNote, number] = (gnote as VexFlowGraphicalNote).vfnote;
                    if (vfnote === undefined || vfnote[0] === undefined) {
                        continue;
                    }

                    const vfStemDir: number = vfnote[0].getStemDirection();
                    switch (vfStemDir) {
                        case (Vex.Flow.Stem.UP):
                            gVoiceEntry.parentVoiceEntry.StemDirection = StemDirectionType.Up;
                            break;
                        case (Vex.Flow.Stem.DOWN):
                            gVoiceEntry.parentVoiceEntry.StemDirection = StemDirectionType.Down;
                            break;
                        default:
                    }
                }
            }
        }
    }

    /**
     * Create the articulations for all notes of the current staff entry
     */
    private createArticulations(): void {
        for (let idx: number = 0, len: number = this.staffEntries.length; idx < len; ++idx) {
            const graphicalStaffEntry: VexFlowStaffEntry = (this.staffEntries[idx] as VexFlowStaffEntry);

            // create vex flow articulation:
            const graphicalVoiceEntries: GraphicalVoiceEntry[] = graphicalStaffEntry.graphicalVoiceEntries;
            for (const gve of graphicalVoiceEntries) {
                const vfStaveNote: StemmableNote = (gve as VexFlowVoiceEntry).vfStaveNote;
                VexFlowConverter.generateArticulations(vfStaveNote, gve.notes[0].sourceNote.ParentVoiceEntry.Articulations);
            }
        }
    }

    /**
     * Create the ornaments for all notes of the current staff entry
     */
    private createOrnaments(): void {
        for (let idx: number = 0, len: number = this.staffEntries.length; idx < len; ++idx) {
            const graphicalStaffEntry: VexFlowStaffEntry = (this.staffEntries[idx] as VexFlowStaffEntry);
            const gvoices: { [voiceID: number]: GraphicalVoiceEntry; } = graphicalStaffEntry.graphicalVoiceEntries;

            for (const voiceID in gvoices) {
                if (gvoices.hasOwnProperty(voiceID)) {
                    const vfStaveNote: StemmableNote = (gvoices[voiceID] as VexFlowVoiceEntry).vfStaveNote;
                    const ornamentContainer: OrnamentContainer = gvoices[voiceID].notes[0].sourceNote.ParentVoiceEntry.OrnamentContainer;
                    if (ornamentContainer !== undefined) {
                        VexFlowConverter.generateOrnaments(vfStaveNote, ornamentContainer);
                    }
                }
            }
        }
    }

    private createFingerings(voiceEntry: GraphicalVoiceEntry): void {
        const vexFlowVoiceEntry: VexFlowVoiceEntry = voiceEntry as VexFlowVoiceEntry;
        const technicalInstructions: TechnicalInstruction[] = voiceEntry.parentVoiceEntry.TechnicalInstructions;
        const fingeringsCount: number = technicalInstructions.length;
        for (let i: number = 0; i < technicalInstructions.length; i++) {
            const technicalInstruction: TechnicalInstruction = technicalInstructions[i];
            let fingeringPosition: PlacementEnum = EngravingRules.Rules.FingeringPosition;
            if (technicalInstruction.placement !== PlacementEnum.NotYetDefined) {
                fingeringPosition = technicalInstruction.placement;
            }
            let modifierPosition: any; // Vex.Flow.Modifier.Position
            switch (fingeringPosition) {
                default:
                case PlacementEnum.Left:
                    modifierPosition = Vex.Flow.Modifier.Position.LEFT;
                    break;
                case PlacementEnum.Right:
                    modifierPosition = Vex.Flow.Modifier.Position.RIGHT;
                    break;
                case PlacementEnum.Above:
                    modifierPosition = Vex.Flow.Modifier.Position.ABOVE;
                    break;
                case PlacementEnum.Below:
                    modifierPosition = Vex.Flow.Modifier.Position.BELOW;
                    break;
                case PlacementEnum.NotYetDefined: // automatic fingering placement, could be more complex/customizable
                    const sourceStaff: Staff = voiceEntry.parentStaffEntry.sourceStaffEntry.ParentStaff;
                    if (voiceEntry.notes.length > 1 || voiceEntry.parentStaffEntry.graphicalVoiceEntries.length > 1) {
                        modifierPosition = Vex.Flow.Modifier.Position.LEFT;
                    } else if (sourceStaff.idInMusicSheet === 0) {
                        modifierPosition = Vex.Flow.Modifier.Position.ABOVE;
                        fingeringPosition = PlacementEnum.Above;
                    } else {
                        modifierPosition = Vex.Flow.Modifier.Position.BELOW;
                        fingeringPosition = PlacementEnum.Below;
                    }
            }

            const fretFinger: Vex.Flow.FretHandFinger = new Vex.Flow.FretHandFinger(technicalInstruction.value);
            fretFinger.setPosition(modifierPosition);
            if (fingeringPosition === PlacementEnum.Above || fingeringPosition === PlacementEnum.Below) {
                const offsetYSign: number = fingeringPosition === PlacementEnum.Above ? -1 : 1; // minus y is up
                const ordering: number = fingeringPosition === PlacementEnum.Above ? i :
                    technicalInstructions.length - 1 - i; // reverse order for fingerings below staff
                if (EngravingRules.Rules.FingeringInsideStafflines && fingeringsCount > 1) { // y-shift for single fingering is ok
                    // experimental, bounding boxes wrong for fretFinger above/below, better would be creating Labels
                    // set y-shift. vexflow fretfinger simply places directly above/below note
                    const perFingeringShift: number = fretFinger.getWidth() / 2;
                    const shiftCount: number = fingeringsCount * 2.5;
                    (<any>fretFinger).setOffsetY(offsetYSign * (ordering + shiftCount) * perFingeringShift);
                } else if (!EngravingRules.Rules.FingeringInsideStafflines) { // use StringNumber for placement above/below stafflines
                    const stringNumber: Vex.Flow.StringNumber = new Vex.Flow.StringNumber(technicalInstruction.value);
                    (<any>stringNumber).radius = 0; // hack to remove the circle around the number
                    stringNumber.setPosition(modifierPosition);
                    stringNumber.setOffsetY(offsetYSign * ordering * stringNumber.getWidth() * 2 / 3);
                    vexFlowVoiceEntry.vfStaveNote.addModifier(i, stringNumber);
                    continue;
                }
            }
            vexFlowVoiceEntry.vfStaveNote.addModifier(i, fretFinger);
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
     * Return the VexFlow Stave corresponding to this graphicalMeasure
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
        let vfBeginInstructionsWidth: number = 0;
        let vfEndInstructionsWidth: number = 0;
        const modifiers: Vex.Flow.StaveModifier[] = this.stave.getModifiers();
        for (const mod of modifiers) {
            if (mod.getPosition() === StavePositionEnum.BEGIN) {  //Vex.Flow.StaveModifier.Position.BEGIN) {
                vfBeginInstructionsWidth += mod.getWidth() + mod.getPadding(undefined);
            } else if (mod.getPosition() === StavePositionEnum.END) { //Vex.Flow.StaveModifier.Position.END) {
                vfEndInstructionsWidth += mod.getWidth() + mod.getPadding(undefined);
            }
        }

        this.beginInstructionsWidth = vfBeginInstructionsWidth / unitInPixels;
        this.endInstructionsWidth = vfEndInstructionsWidth / unitInPixels;
    }
}

// Gives the position of the Stave - replaces the function get Position() in the description of class StaveModifier in vexflow.d.ts
// The latter gave an error because function cannot be defined in the class descriptions in vexflow.d.ts
export enum StavePositionEnum {
    LEFT = 1,
    RIGHT = 2,
    ABOVE = 3,
    BELOW = 4,
    BEGIN = 5,
    END = 6
}
