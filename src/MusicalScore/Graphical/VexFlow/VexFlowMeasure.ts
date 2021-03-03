import Vex from "vexflow";
import {GraphicalMeasure} from "../GraphicalMeasure";
import {SourceMeasure} from "../../VoiceData/SourceMeasure";
import {Staff} from "../../VoiceData/Staff";
import {StaffLine} from "../StaffLine";
import {SystemLinesEnum} from "../SystemLinesEnum";
import {ClefInstruction, ClefEnum} from "../../VoiceData/Instructions/ClefInstruction";
import {KeyInstruction} from "../../VoiceData/Instructions/KeyInstruction";
import {RhythmInstruction} from "../../VoiceData/Instructions/RhythmInstruction";
import {VexFlowConverter} from "./VexFlowConverter";
import {VexFlowStaffEntry} from "./VexFlowStaffEntry";
import {Beam} from "../../VoiceData/Beam";
import {GraphicalNote} from "../GraphicalNote";
import {GraphicalStaffEntry} from "../GraphicalStaffEntry";
import StaveConnector = Vex.Flow.StaveConnector;
import StaveNote = Vex.Flow.StaveNote;
import StemmableNote = Vex.Flow.StemmableNote;
import NoteSubGroup = Vex.Flow.NoteSubGroup;
import log from "loglevel";
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
import {VexFlowGraphicalNote} from "./VexFlowGraphicalNote";
import {AutoBeamOptions} from "../../../OpenSheetMusicDisplay/OSMDOptions";
import {SkyBottomLineCalculator} from "../SkyBottomLineCalculator";
import { NoteType } from "../../VoiceData/NoteType";
import { Arpeggio } from "../../VoiceData/Arpeggio";

// type StemmableNote = Vex.Flow.StemmableNote;

export class VexFlowMeasure extends GraphicalMeasure {
    constructor(staff: Staff, sourceMeasure: SourceMeasure = undefined, staffLine: StaffLine = undefined) {
        super(staff, sourceMeasure, staffLine);
        this.minimumStaffEntriesWidth = -1;

        /*
         * There is no case in which `staffLine === undefined && sourceMeasure === undefined` holds.
         * Hence, it is not necessary to specify an `else` case.
         * One can verify this through a usage search for this constructor.
         */
        if (staffLine) {
            this.rules = staffLine.ParentMusicSystem.rules;
        } else if (sourceMeasure) {
            this.rules = sourceMeasure.Rules;
        }

        this.resetLayout();
    }

    public isTabMeasure: boolean = false;
    /** octaveOffset according to active clef */
    public octaveOffset: number = 3;
    /** The VexFlow Voices in the measure */
    public vfVoices: { [voiceID: number]: Vex.Flow.Voice } = {};
    /** Call this function (if present) to x-format all the voices in the measure */
    public formatVoices: (width: number, parent: VexFlowMeasure) => void;
    /** The VexFlow Ties in the measure */
    public vfTies: Vex.Flow.StaveTie[] = [];
    /** The repetition instructions given as words or symbols (coda, dal segno..) */
    public vfRepetitionWords: Vex.Flow.Repetition[] = [];
    /** The VexFlow Stave (= one measure in a staffline) */
    protected stave: Vex.Flow.Stave;
    /** VexFlow StaveConnectors (vertical lines) */
    protected connectors: Vex.Flow.StaveConnector[] = [];
    /** Intermediate object to construct beams */
    private beams: { [voiceID: number]: [Beam, VexFlowVoiceEntry[]][] } = {};
    /** Beams created by (optional) autoBeam function. */
    private autoVfBeams: Vex.Flow.Beam[];
    /** Beams of tuplet notes created by (optional) autoBeam function. */
    private autoTupletVfBeams: Vex.Flow.Beam[];
    /** VexFlow Beams */
    private vfbeams: { [voiceID: number]: Vex.Flow.Beam[] };
    /** Intermediate object to construct tuplets */
    protected tuplets: { [voiceID: number]: [Tuplet, VexFlowVoiceEntry[]][] } = {};
    /** VexFlow Tuplets */
    private vftuplets: { [voiceID: number]: Vex.Flow.Tuplet[] } = {};
    // The engraving rules of OSMD.
    public rules: EngravingRules;

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

        // TODO save beginning and end bar type, set these again after new stave.

        this.stave = new Vex.Flow.Stave(0, 0, 0, {
            fill_style: this.rules.StaffLineColor,
            space_above_staff_ln: 0,
            space_below_staff_ln: 0
        });
        (this.stave as any).MeasureNumber = this.MeasureNumber; // for debug info. vexflow automatically uses stave.measure for rendering measure numbers
        // also see VexFlowMusicSheetDrawer.drawSheet() for some other vexflow default value settings (like default font scale)

        if (this.ParentStaff) {
            this.setLineNumber(this.ParentStaff.StafflineCount);
        }
        // constructor sets beginning and end bar type to standard

        this.stave.setBegBarType(Vex.Flow.Barline.type.NONE); // technically not correct, but we'd need to set the next measure's beginning bar type
        if (this.parentSourceMeasure && this.parentSourceMeasure.endingBarStyleEnum === SystemLinesEnum.None) {
            // fix for vexflow ignoring ending barline style after new stave, apparently
            this.stave.setEndBarType(Vex.Flow.Barline.type.NONE);
        }
        // the correct bar types seem to be set later

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
        if (clef.ClefType === ClefEnum.TAB) {
            this.stave.addClef("tab", undefined, undefined, undefined);
        } else {
        const vfclef: { type: string, size: string, annotation: string } = VexFlowConverter.Clef(clef, "default");
        this.stave.addClef(vfclef.type, vfclef.size, vfclef.annotation, Vex.Flow.StaveModifier.Position.BEGIN);
        }
        this.updateInstructionWidth();
    }

    /**
     * Sets the number of stafflines that are rendered, so that they are centered properly
     * @param lineNumber
     */
    public setLineNumber(lineNumber: number): void {
        if (lineNumber !== 5) {
            if (lineNumber === 0) {
                (this.stave as any).setNumLines(0);
                this.stave.getBottomLineY = function(): number {
                    return this.getYForLine(this.options.num_lines);
                };
            } else if (lineNumber === 1) {
                // Vex.Flow.Stave.setNumLines hides all but the top line.
                // this is better
                (this.stave.options as any).line_config = [
                    { visible: false },
                    { visible: false },
                    { visible: true }, // show middle
                    { visible: false },
                    { visible: false },
                ];
                //quick fix to see if this matters for calculation. Doesn't seem to
                this.stave.getBottomLineY = function(): number {
                    return this.getYForLine(2);
                };
                //lines (which isn't this case here)
                //this.stave.options.num_lines = parseInt(lines, 10);
            } else if (lineNumber === 2) {
                (this.stave.options as any).line_config = [
                    { visible: false },
                    { visible: false },
                    { visible: true }, // show middle
                    { visible: true },
                    { visible: false },
                ];
                this.stave.getBottomLineY = function(): number {
                    return this.getYForLine(3);
                };
            } else if (lineNumber === 3) {
                (this.stave.options as any).line_config = [
                    { visible: false },
                    { visible: true },
                    { visible: true }, // show middle
                    { visible: true },
                    { visible: false },
                ];
                this.stave.getBottomLineY = function(): number {
                    return this.getYForLine(2);
                };
            } else {
                (this.stave as any).setNumLines(lineNumber);
                this.stave.getBottomLineY = function(): number {
                    return this.getYForLine(this.options.num_lines);
                };
            }
        }
    }

    /**
     * adds the given key to the begin of the measure.
     * This has to update/increase BeginInstructionsWidth.
     * @param currentKey the new valid key.
     * @param previousKey the old cancelled key. Needed to show which accidentals are not valid any more.
     * @param currentClef the valid clef. Needed to put the accidentals on the right y-positions.
     */
    public addKeyAtBegin(currentKey: KeyInstruction, previousKey: KeyInstruction, currentClef: ClefInstruction): void {
        if (!this.rules.RenderKeySignatures) {
            return;
        }
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
            Vex.Flow.StaveModifier.Position.BEGIN
        );
        this.updateInstructionWidth();
    }

    /**
     * adds the given clef to the end of the measure.
     * This has to update/increase EndInstructionsWidth.
     * @param clef
     */
    public addClefAtEnd(clef: ClefInstruction, visible: boolean = true): void {
        const vfclef: { type: string, size: string, annotation: string } = VexFlowConverter.Clef(clef, "small");
        if (!visible && (this.stave as any).endClef) {
            return; // don't overwrite existing clef with invisible clef
        }
        this.stave.setEndClef(vfclef.type, vfclef.size, vfclef.annotation);
        for (const modifier of this.stave.getModifiers()) {
            if (!visible) {
                // make clef invisible in vexflow. (only rendered to correct layout and staffentry boundingbox)
                if (modifier.getCategory() === "clefs" && modifier.getPosition() === Vex.Flow.StaveModifier.Position.END) {
                    if ((modifier as any).type === vfclef.type) { // any = Vex.Flow.Clef
                        const transparentStyle: string = "#12345600";
                        const originalStyle: any = (modifier as any).getStyle();
                        if (originalStyle) {
                            (modifier as any).originalStrokeStyle = originalStyle.strokeStyle;
                            (modifier as any).originalFillStyle = originalStyle.fillStyle;
                        }
                        (modifier as any).setStyle({strokeStyle: transparentStyle, fillStyle: transparentStyle});
                    }
                }
            } else {
                // reset invisible style
                const originalStrokeStyle: any = (modifier as any).originalStrokeStyle;
                const originalFillStyle: any = (modifier as any).originalFillStyle;
                if ((modifier as any).getStyle()) {
                    if (originalStrokeStyle && originalFillStyle) {
                        ((modifier as any).getStyle() as any).strokeStyle = originalStrokeStyle;
                        ((modifier as any).getStyle() as any).fillStyle = originalFillStyle;
                    } else {
                        ((modifier as any).getStyle() as any).strokeStyle = null;
                        ((modifier as any).getStyle() as any).fillStyle = null;
                    }
                }
            }
        }
        this.parentSourceMeasure.hasEndClef = true;
        return this.updateInstructionWidth();
    }

    // Render initial line is whether or not to render a single bar line at the beginning (if the repeat line we are drawing is
    // offset by a clef, for ex.)
    public addMeasureLine(lineType: SystemLinesEnum, linePosition: SystemLinePosition, renderInitialLine: boolean = true): void {
        switch (linePosition) {
            case SystemLinePosition.MeasureBegin:
                switch (lineType) {
                    case SystemLinesEnum.BoldThinDots:
                        //customize the barline draw function if repeat is beginning of system
                        if (!renderInitialLine) {
                            (this.stave as any).modifiers[0].draw = function(stave: Vex.Flow.Stave): void {
                                (stave as any).checkContext();
                                this.setRendered();
                                switch (this.type) {
                                    case Vex.Flow.Barline.type.SINGLE:
                                    this.drawVerticalBar(stave, this.x, false);
                                    break;
                                    case Vex.Flow.Barline.type.DOUBLE:
                                    this.drawVerticalBar(stave, this.x, true);
                                    break;
                                    case Vex.Flow.Barline.type.END:
                                    this.drawVerticalEndBar(stave, this.x);
                                    break;
                                    case Vex.Flow.Barline.type.REPEAT_BEGIN:
                                    //removed the vertical line rendering that exists in VF codebase
                                    this.drawRepeatBar(stave, this.x, true);
                                    break;
                                    case Vex.Flow.Barline.type.REPEAT_END:
                                    this.drawRepeatBar(stave, this.x, false);
                                    break;
                                    case Vex.Flow.Barline.type.REPEAT_BOTH:
                                    this.drawRepeatBar(stave, this.x, false);
                                    this.drawRepeatBar(stave, this.x, true);
                                    break;
                                    default:
                                    // Default is NONE, so nothing to draw
                                    break;
                                }
                            };
                        }
                        this.stave.setBegBarType(Vex.Flow.Barline.type.REPEAT_BEGIN);
                        break;
                    default:
                        //this.stave.setBegBarType(Vex.Flow.Barline.type.NONE); // not necessary, it seems
                        break;
                }
                break;
            case SystemLinePosition.MeasureEnd:
                switch (lineType) {
                    case SystemLinesEnum.DotsBoldBoldDots:
                        this.stave.setEndBarType(Vex.Flow.Barline.type.REPEAT_BOTH);
                        break;
                    case SystemLinesEnum.DotsThinBold:
                        this.stave.setEndBarType(Vex.Flow.Barline.type.REPEAT_END);
                        break;
                    case SystemLinesEnum.DoubleThin:
                        this.stave.setEndBarType(Vex.Flow.Barline.type.DOUBLE);
                        break;
                    case SystemLinesEnum.ThinBold:
                        this.stave.setEndBarType(Vex.Flow.Barline.type.END);
                        break;
                    case SystemLinesEnum.None:
                        this.stave.setEndBarType(Vex.Flow.Barline.type.NONE);
                        break;
                    // TODO: Add support for additional Barline types when VexFlow supports them
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
        let instruction: Vex.Flow.Repetition.type = undefined;
        let position: any = Vex.Flow.StaveModifier.Position.END;
        const xShift: number = this.beginInstructionsWidth;
        switch (repetitionInstruction.type) {
          case RepetitionInstructionEnum.Segno:
            // create Segno Symbol:
            instruction = Vex.Flow.Repetition.type.SEGNO_LEFT;
            position = Vex.Flow.StaveModifier.Position.LEFT;
            break;
          case RepetitionInstructionEnum.Coda:
            // create Coda Symbol:
            instruction = Vex.Flow.Repetition.type.CODA_LEFT;
            position = Vex.Flow.StaveModifier.Position.LEFT;
            break;
          case RepetitionInstructionEnum.DaCapo:
            instruction = Vex.Flow.Repetition.type.DC;
            break;
          case RepetitionInstructionEnum.DalSegno:
            instruction = Vex.Flow.Repetition.type.DS;
            break;
          case RepetitionInstructionEnum.Fine:
            instruction = Vex.Flow.Repetition.type.FINE;
            break;
          case RepetitionInstructionEnum.ToCoda:
            instruction = (Vex.Flow.Repetition as any).type.TO_CODA;
            break;
          case RepetitionInstructionEnum.DaCapoAlFine:
            instruction = Vex.Flow.Repetition.type.DC_AL_FINE;
            break;
          case RepetitionInstructionEnum.DaCapoAlCoda:
            instruction = Vex.Flow.Repetition.type.DC_AL_CODA;
            break;
          case RepetitionInstructionEnum.DalSegnoAlFine:
            instruction = Vex.Flow.Repetition.type.DS_AL_FINE;
            break;
          case RepetitionInstructionEnum.DalSegnoAlCoda:
            instruction = Vex.Flow.Repetition.type.DS_AL_CODA;
            break;
          default:
            break;
        }
        if (instruction) {
            const repetition: Vex.Flow.Repetition = new Vex.Flow.Repetition(instruction, xShift, -this.rules.RepetitionSymbolsYOffset);
            this.stave.addModifier(repetition, position);
            return;
        }

        this.addVolta(repetitionInstruction);
    }

    protected addVolta(repetitionInstruction: RepetitionInstruction): void {
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

            const skyBottomLineCalculator: SkyBottomLineCalculator = this.ParentStaffLine.SkyBottomLineCalculator;
            //Because of loss of accuracy when sampling (see SkyBottomLineCalculator.updateInRange), measures tend to overlap
            //This causes getSkyLineMinInRange to return an incorrect min value (one from the previous measure, which has been modified)
            //We need to offset the end of what we are measuring by a bit to prevent this, otherwise volta pairs step up
            const start: number = this.PositionAndShape.AbsolutePosition.x + this.PositionAndShape.BorderMarginLeft + 0.4;
            const end: number = Math.max(this.PositionAndShape.AbsolutePosition.x + this.PositionAndShape.BorderMarginRight, start + 0.4);
            //2 unit gap, since volta is positioned from y center it seems.
            //This prevents cases where the volta is rendered over another element
            const skylineMinForMeasure: number = skyBottomLineCalculator.getSkyLineMinInRange( start, end ) - 2;
            //-6 OSMD units is the 0 value that the volta is placed on. .1 extra so the skyline goes above the volta
            //instead of on the line itself
            let newSkylineValueForMeasure: number = -6.1 + this.rules.VoltaOffset;
            let vexFlowVoltaHeight: number = this.rules.VoltaOffset;
            //EngravingRules default offset is 2.5, can be user set.
            //2.5 gives us a good default value to work with.

            //if we calculate that the minimum skyline allowed by elements is above the default volta position, need to adjust volta up further
            if (skylineMinForMeasure < newSkylineValueForMeasure) {
                const skylineDifference: number = skylineMinForMeasure - newSkylineValueForMeasure;
                vexFlowVoltaHeight += skylineDifference;
                newSkylineValueForMeasure = skylineMinForMeasure;
            }

            let prevMeasure: VexFlowMeasure = undefined;
            //if we already have a volta in the prev measure, should match it's height, or if we are higher, it should match ours
            //find previous sibling measure that may have volta
            const currentMeasureNumber: number = this.parentSourceMeasure.MeasureNumber;
            for (let i: number = 0; i < this.ParentStaffLine.Measures.length; i++) {
                const tempMeasure: GraphicalMeasure = this.ParentStaffLine.Measures[i];
                if (!(tempMeasure instanceof VexFlowMeasure)) {
                    // can happen for MultipleRestMeasures
                    continue;
                }
                if (tempMeasure.MeasureNumber === currentMeasureNumber - 1 ||
                    tempMeasure.MeasureNumber + tempMeasure.parentSourceMeasure?.multipleRestMeasures === currentMeasureNumber) {
                    //We found the previous top measure
                    prevMeasure = tempMeasure as VexFlowMeasure;
                }
            }

            if (prevMeasure) {
                const prevStaveModifiers: Vex.Flow.StaveModifier[] = prevMeasure.stave.getModifiers();
                for (let i: number = 0; i < prevStaveModifiers.length; i++) {
                    const nextStaveModifier: Vex.Flow.StaveModifier = prevStaveModifiers[i];
                    if (nextStaveModifier.hasOwnProperty("volta")) {
                        const prevskyBottomLineCalculator: SkyBottomLineCalculator = prevMeasure.ParentStaffLine.SkyBottomLineCalculator;
                        const prevStart: number = prevMeasure.PositionAndShape.AbsolutePosition.x + prevMeasure.PositionAndShape.BorderMarginLeft + 0.4;
                        const prevEnd: number = Math.max(
                            prevMeasure.PositionAndShape.AbsolutePosition.x + prevMeasure.PositionAndShape.BorderMarginRight,
                            prevStart + 0.4);
                        const prevMeasureSkyline: number = prevskyBottomLineCalculator.getSkyLineMinInRange(prevStart, prevEnd);
                        //if prev skyline is higher, use it
                        if (prevMeasureSkyline <= newSkylineValueForMeasure) {
                            const skylineDifference: number = prevMeasureSkyline - newSkylineValueForMeasure;
                            vexFlowVoltaHeight += skylineDifference;
                            newSkylineValueForMeasure = prevMeasureSkyline;
                        } else { //otherwise, we are higher. Need to adjust prev
                            (nextStaveModifier as any).y_shift = vexFlowVoltaHeight * unitInPixels;
                            prevMeasure.ParentStaffLine.SkyBottomLineCalculator.updateSkyLineInRange(prevStart, prevEnd, newSkylineValueForMeasure);
                        }
                    }
                }
            }

            //convert to VF units (pixels)
            vexFlowVoltaHeight *= 10;
            this.stave.setVoltaType(voltaType, repetitionInstruction.endingIndices[0], vexFlowVoltaHeight);
            skyBottomLineCalculator.updateSkyLineInRange(start, end, newSkylineValueForMeasure);
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
    public draw(ctx: Vex.IRenderContext): void {

        // Draw stave lines
        this.stave.setContext(ctx).draw();
        // Draw all voices
        for (const voiceID in this.vfVoices) {
            if (this.vfVoices.hasOwnProperty(voiceID)) {
                ctx.save();
                this.vfVoices[voiceID].draw(ctx, this.stave);
                ctx.restore();
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
        // Draw auto-generated beams from Beam.generateBeams()
        if (this.autoVfBeams) {
            for (const beam of this.autoVfBeams) {
                beam.setContext(ctx).draw();
            }
        }
        if (!this.isTabMeasure || this.rules.TupletNumbersInTabs) {
            if (this.autoTupletVfBeams) {
                for (const beam of this.autoTupletVfBeams) {
                    beam.setContext(ctx).draw();
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
        }

        // Draw ties
        for (const tie of this.vfTies) {
            tie.setContext(ctx).draw();
        }

        // Draw vertical lines
        for (const connector of this.connectors) {
            connector.setContext(ctx).draw();
        }
        this.correctNotePositions();
    }

    // this currently formats multiple measures, see VexFlowMusicSheetCalculator.formatMeasures()
    public format(): void {
        // If this is the first stave in the vertical measure, call the format
        // method to set the width of all the voices
        if (this.formatVoices) {
            // set the width of the voices to the current measure width:
            // (The width of the voices does not include the instructions (StaveModifiers))
            this.formatVoices((this.PositionAndShape.Size.width - this.beginInstructionsWidth - this.endInstructionsWidth) * unitInPixels, this);
        }

        // this.correctNotePositions(); // now done at the end of draw()
    }

    // correct position / bounding box (note.setIndex() needs to have been called)
    public correctNotePositions(): void {
        if (this.isTabMeasure) {
            return;
        }
        for (const voice of this.getVoicesWithinMeasure()) {
            for (const ve of voice.VoiceEntries) {
                for (const note of ve.Notes) {
                    const gNote: VexFlowGraphicalNote = this.rules.GNote(note) as VexFlowGraphicalNote;
                    if (!gNote.vfnote) { // can happen were invisible, then multi rest measure. TODO fix multi rest measure not removed
                        return;
                    }
                    const vfnote: Vex.Flow.StemmableNote = gNote.vfnote[0];
                    // if (note.isRest()) // TODO somehow there are never rest notes in ve.Notes
                    // TODO also, grace notes are not included here, need to be fixed as well. (and a few triple beamed notes in Bach Air)
                    let relPosY: number = 0;
                    if (gNote.parentVoiceEntry.parentVoiceEntry.StemDirection === StemDirectionType.Up) {
                        relPosY += 3.5; // about 3.5 lines too high. this seems to be related to the default stem height, not actual stem height.
                        // alternate calculation using actual stem height: somehow wildly varying.
                        // if (ve.Notes.length > 1) {
                        //     const stemHeight: number = vfnote.getStem().getHeight();
                        //     // relPosY += shortFactor * stemHeight / unitInPixels - 3.5;
                        //     relPosY += stemHeight / unitInPixels - 3.5; // for some reason this varies in its correctness between similar notes
                        // } else {
                        //     relPosY += 3.5;
                        // }
                    } else {
                        relPosY += 0.5; // center-align bbox
                    }
                    const line: any = -gNote.notehead(vfnote).line; // vexflow y direction is opposite of osmd's
                    relPosY += line + (gNote.parentVoiceEntry.notes.last() as VexFlowGraphicalNote).notehead().line; // don't move for first note: - (-vexline)
                    gNote.PositionAndShape.RelativePosition.y = relPosY;
                }
            }
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
    protected getRestFilledVexFlowStaveNotesPerVoice(voice: Voice): GraphicalVoiceEntry[] {
        let latestVoiceTimestamp: Fraction = undefined;
        const gvEntries: GraphicalVoiceEntry[] = this.getGraphicalVoiceEntriesPerVoice(voice);
        for (let idx: number = 0, len: number = gvEntries.length; idx < len; ++idx) {
            const gve: GraphicalVoiceEntry = gvEntries[idx];
            const gNotesStartTimestamp: Fraction = gve.notes[0].sourceNote.getAbsoluteTimestamp();
            // find the voiceEntry end timestamp:
            let gNotesEndTimestamp: Fraction = new Fraction();
            for (const graphicalNote of gve.notes) {
                const noteEnd: Fraction  = Fraction.plus(graphicalNote.sourceNote.getAbsoluteTimestamp(), graphicalNote.sourceNote.Length);
                if (gNotesEndTimestamp.lt(noteEnd)) {
                    gNotesEndTimestamp = noteEnd;
                }
            }

            // check if this voice has just been found the first time:
            if (!latestVoiceTimestamp) {
                // if this voice is new, check for a gap from measure start to the start of the current voice entry:
                const gapFromMeasureStart: Fraction = Fraction.minus(gNotesStartTimestamp, this.parentSourceMeasure.AbsoluteTimestamp);
                if (gapFromMeasureStart.RealValue > 0) {
                    log.trace(`Ghost Found at start (measure ${this.MeasureNumber})`); // happens too often for valid measures to be logged to debug
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
                    log.trace(`Ghost Found in between (measure ${this.MeasureNumber})`); // happens too often for valid measures to be logged to debug
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
            log.trace(`Ghost Found at end (measure ${this.MeasureNumber})`); // happens too often for valid measures to be logged to debug
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
        if (!beams) {
            beams = this.beams[voiceID] = [];
        }
        let data: [Beam, VexFlowVoiceEntry[]];
        for (const mybeam of beams) {
            if (mybeam[0] === beam) {
                data = mybeam;
            }
        }
        if (!data) {
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
        if (!tuplets) {
            tuplets = this.tuplets[voiceID] = [];
        }
        let currentTupletBuilder: [Tuplet, VexFlowVoiceEntry[]];
        for (const t of tuplets) {
            if (t[0] === tuplet) {
                currentTupletBuilder = t;
            }
        }
        if (!currentTupletBuilder) {
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
        const beamedNotes: StaveNote[] = []; // already beamed notes, will be ignored by this.autoBeamNotes()
        for (const voiceID in this.beams) {
            if (this.beams.hasOwnProperty(voiceID)) {
                let vfbeams: Vex.Flow.Beam[] = this.vfbeams[voiceID];
                if (!vfbeams) {
                    vfbeams = this.vfbeams[voiceID] = [];
                }
                for (const beam of this.beams[voiceID]) {
                    let beamHasQuarterNoteOrLonger: boolean = false;
                    for (const note of beam[0].Notes) {
                        if (note.Length.RealValue >= new Fraction(1, 4).RealValue
                            // check whether the note has a TypeLength that's also not suitable for a beam (bigger than an eigth)
                            && (!note.TypeLength || note.TypeLength.RealValue > 0.125)) {
                            beamHasQuarterNoteOrLonger = true;
                            break;
                        }
                    }
                    if (beamHasQuarterNoteOrLonger) {
                        log.debug("Beam between note >= quarter, likely tremolo, currently unsupported. continuing.");
                        continue;
                    }

                    const notes: Vex.Flow.StaveNote[] = [];
                    const psBeam: Beam = beam[0];
                    const voiceEntries: VexFlowVoiceEntry[] = beam[1];

                    let autoStemBeam: boolean = true;
                    for (const gve of voiceEntries) {
                        if (gve.parentVoiceEntry.ParentVoice === psBeam.Notes[0].ParentVoiceEntry.ParentVoice) {
                            autoStemBeam = gve.parentVoiceEntry.WantedStemDirection === StemDirectionType.Undefined;
                            // if (psBeam.Notes[0].NoteTuplet) {
                            //     autoStemBeam = true;
                            //     // this fix seemed temporarily necessary for tuplets with beams, see test_drum_tublet_beams
                            //     break;
                            // }
                        }
                    }

                    let isGraceBeam: boolean = false;
                    let beamColor: string;
                    const stemColors: string[] = [];
                    for (const entry of voiceEntries) {
                        const note: Vex.Flow.StaveNote = ((<VexFlowVoiceEntry>entry).vfStaveNote as StaveNote);
                        if (note) {
                          notes.push(note);
                          beamedNotes.push(note);
                        }
                        if (entry.parentVoiceEntry.IsGrace) {
                            isGraceBeam = true;
                        }
                        if (entry.parentVoiceEntry.StemColor && this.rules.ColoringEnabled) {
                            stemColors.push(entry.parentVoiceEntry.StemColor);
                        }
                    }
                    if (notes.length > 1) {
                        const vfBeam: Vex.Flow.Beam = new Vex.Flow.Beam(notes, autoStemBeam);
                        if (isGraceBeam) {
                            // smaller beam, as in Vexflow.GraceNoteGroup.beamNotes()
                            (<any>vfBeam).render_options.beam_width = 3;
                            (<any>vfBeam).render_options.partial_beam_length = 4;
                        }
                        if (stemColors.length >= 2 && this.rules.ColorBeams) {
                            beamColor = stemColors[0];
                            for (const stemColor of stemColors) {
                                if (stemColor !== beamColor) {
                                    beamColor = undefined;
                                    break;
                                }
                            }
                            vfBeam.setStyle({ fillStyle: beamColor, strokeStyle: beamColor });
                        }
                        if (this.rules.FlatBeams) {
                            (<any>vfBeam).render_options.flat_beams = true;
                            (<any>vfBeam).render_options.flat_beam_offset = this.rules.FlatBeamOffset;
                            (<any>vfBeam).render_options.flat_beam_offset_per_beam = this.rules.FlatBeamOffsetPerBeam;
                        }
                        vfbeams.push(vfBeam);
                    } else {
                        log.debug("Warning! Beam with no notes!");
                    }
                }
            }
        }
        if (this.rules.AutoBeamNotes) {
            this.autoBeamNotes(beamedNotes); // try to autobeam notes except those that are already beamed (beamedNotes).
        }
    }

    /** Automatically creates beams for notes except beamedNotes, using Vexflow's Beam.generateBeams().
     *  Takes options from this.rules.AutoBeamOptions.
     * @param beamedNotes notes that will not be autobeamed (usually because they are already beamed)
     */
    private autoBeamNotes(beamedNotes: StemmableNote[]): void {
        let notesToAutoBeam: StemmableNote[] = [];
        let consecutiveBeamableNotes: StemmableNote[] = [];
        let currentTuplet: Tuplet;
        let tupletNotesToAutoBeam: StaveNote[] = [];
        this.autoTupletVfBeams = [];
        const separateAutoBeams: StemmableNote[][] = []; // a set of separate beams, each having a set of notes (StemmableNote[]).
        this.autoVfBeams = []; // final Vex.Flow.Beams will be pushed/collected into this
        let timeSignature: Fraction = this.parentSourceMeasure.ActiveTimeSignature;
        if (!timeSignature) { // this doesn't happen in OSMD, but maybe in a SourceGenerator
            timeSignature = this.parentSourceMeasure.Duration; // suboptimal, can be 1/1 in a 4/4 time signature
        }
        /*if (this.parentSourceMeasure.FirstInstructionsStaffEntries[0]) {
            for (const instruction of this.parentSourceMeasure.FirstInstructionsStaffEntries[0].Instructions) {
                if (instruction instanceof RhythmInstruction) { // there is not always a RhythmInstruction, but this could be useful some time.
                    timeSignature = (instruction as RhythmInstruction).Rhythm;
                }
            }
        }*/

        for (const staffEntry of this.staffEntries) {
            for (const gve of staffEntry.graphicalVoiceEntries) {
                const vfStaveNote: StaveNote = <StaveNote> (gve as VexFlowVoiceEntry).vfStaveNote;
                const gNote: GraphicalNote = gve.notes[0]; // TODO check for all notes within the graphical voice entry
                const isOnBeat: boolean = staffEntry.relInMeasureTimestamp.isOnBeat(timeSignature);
                const haveTwoOrMoreNotesToBeamAlready: boolean = consecutiveBeamableNotes.length >= 2;
                //const noteIsQuarterOrLonger: boolean = gNote.sourceNote.Length.CompareTo(new Fraction(1, 4)) >= 0; // trusting Fraction class, no float check
                const noteIsQuarterOrLonger: boolean = gNote.sourceNote.Length.RealValue - new Fraction(1, 4).RealValue > (-Fraction.FloatInaccuracyTolerance);
                const unbeamableNote: boolean =
                    gve.parentVoiceEntry.IsGrace || // don't beam grace notes
                    noteIsQuarterOrLonger || // don't beam quarter or longer notes
                    beamedNotes.contains(vfStaveNote);
                if (unbeamableNote || isOnBeat) { // end beam
                    if (haveTwoOrMoreNotesToBeamAlready) {
                        // if we already have at least 2 notes to beam, beam them. don't beam notes surrounded by quarter notes etc.
                        for (const note of consecutiveBeamableNotes) {
                            notesToAutoBeam.push(note); // "flush" already beamed notes
                        }
                        separateAutoBeams.push(notesToAutoBeam.slice()); // copy array, otherwise this beam gets the next notes of next beam later
                        notesToAutoBeam = []; // reset notesToAutoBeam, otherwise the next beam includes the previous beam's notes too
                    }
                    consecutiveBeamableNotes = []; // reset notes to beam

                    if (unbeamableNote) {
                        continue;
                    }
                    // else, note will be pushed to consecutiveBeamableNotes after tuplet check, also for note on new beat
                }

                // create beams for tuplets separately
                const noteTuplet: Tuplet = gve.notes[0].sourceNote.NoteTuplet;
                if (noteTuplet) {
                    // check if there are quarter notes or longer in the tuplet, then don't beam.
                    // (TODO: check for consecutiveBeamableNotes inside tuplets like for non-tuplet notes above
                    //   e.g quarter eigth eighth -> beam the two eigth notes)
                    let tupletContainsUnbeamableNote: boolean = false;
                    for (const notes of noteTuplet.Notes) {
                        for (const note of notes) {
                            //const stavenote: StemmableNote = (gve as VexFlowVoiceEntry).vfStaveNote;
                            //console.log("note " + note.ToString() + ", stavenote type: " + stavenote.getNoteType());
                            if (note.NoteTypeXml >= NoteType.QUARTER || // quarter note or longer: don't beam
                            // TODO: don't take Note (head) type from XML, but from current model,
                            //   so that rendering can react dynamically to changes compared to the XML.
                            //   however, taking the note length as fraction is tricky because of tuplets.
                            //   a quarter in a triplet has length < quarter, but quarter note head, which Vexflow can't beam.
                                note.ParentVoiceEntry.IsGrace ||
                                note.isRest() && !this.rules.AutoBeamOptions.beam_rests) {
                                tupletContainsUnbeamableNote = true;
                                break;
                            }
                        }
                        if (tupletContainsUnbeamableNote) {
                            break;
                        }
                    }

                    if (!currentTuplet) {
                        currentTuplet = noteTuplet;
                    } else {
                        if (currentTuplet !== noteTuplet) { // new tuplet, finish old one
                            if (tupletNotesToAutoBeam.length > 1) {
                                const vfBeam: Vex.Flow.Beam = new Vex.Flow.Beam(tupletNotesToAutoBeam, true);
                                if (this.rules.FlatBeams) {
                                    (<any>vfBeam).render_options.flat_beams = true;
                                    (<any>vfBeam).render_options.flat_beam_offset = this.rules.FlatBeamOffset;
                                    (<any>vfBeam).render_options.flat_beam_offset_per_beam = this.rules.FlatBeamOffsetPerBeam;
                                }
                                this.autoTupletVfBeams.push(vfBeam);
                            }
                            tupletNotesToAutoBeam = [];
                            currentTuplet = noteTuplet;
                        }
                    }
                    if (!tupletContainsUnbeamableNote) {
                        tupletNotesToAutoBeam.push(vfStaveNote);
                    }
                    continue;
                } else {
                    currentTuplet = undefined;
                }

                consecutiveBeamableNotes.push(vfStaveNote); // also happens on new beat
            }
        }
        if (tupletNotesToAutoBeam.length >= 2) {
            const vfBeam: Vex.Flow.Beam = new Vex.Flow.Beam(tupletNotesToAutoBeam, true);
            if (this.rules.FlatBeams) {
                (<any>vfBeam).render_options.flat_beams = true;
                (<any>vfBeam).render_options.flat_beam_offset = this.rules.FlatBeamOffset;
                (<any>vfBeam).render_options.flat_beam_offset_per_beam = this.rules.FlatBeamOffsetPerBeam;
            }
            this.autoTupletVfBeams.push(vfBeam);
        }
        if (consecutiveBeamableNotes.length >= 2) {
            for (const note of consecutiveBeamableNotes) {
                notesToAutoBeam.push(note);
            }
            separateAutoBeams.push(notesToAutoBeam);
        }

        // create options for generateBeams
        const autoBeamOptions: AutoBeamOptions = this.rules.AutoBeamOptions;
        const generateBeamOptions: any = {
            beam_middle_only: autoBeamOptions.beam_middle_rests_only,
            beam_rests: autoBeamOptions.beam_rests,
            maintain_stem_directions: autoBeamOptions.maintain_stem_directions,
        };
        if (autoBeamOptions.groups && autoBeamOptions.groups.length) {
            const groups: Vex.Flow.Fraction[] = [];
            for (const fraction of autoBeamOptions.groups) {
                groups.push(new Vex.Flow.Fraction(fraction[0], fraction[1]));
            }
            generateBeamOptions.groups = groups;
        }

        for (const notesForSeparateAutoBeam of separateAutoBeams) {
            const newBeams: Vex.Flow.Beam[] = Vex.Flow.Beam.generateBeams(notesForSeparateAutoBeam, generateBeamOptions);
            for (const vfBeam of newBeams) {
                if (this.rules.FlatBeams) {
                    (<any>vfBeam).render_options.flat_beams = true;
                    (<any>vfBeam).render_options.flat_beam_offset = this.rules.FlatBeamOffset;
                    (<any>vfBeam).render_options.flat_beam_offset_per_beam = this.rules.FlatBeamOffsetPerBeam;
                }
                this.autoVfBeams.push(vfBeam);
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
                if (!vftuplets) {
                    vftuplets = this.vftuplets[voiceID] = [];
                }
                for (const tupletBuilder of this.tuplets[voiceID]) {
                    const tupletStaveNotes: Vex.Flow.StaveNote[] = [];
                    const tupletVoiceEntries: VexFlowVoiceEntry[] = tupletBuilder[1];
                    for (const tupletVoiceEntry of tupletVoiceEntries) {
                      tupletStaveNotes.push(((tupletVoiceEntry).vfStaveNote as StaveNote));
                    }
                    if (tupletStaveNotes.length > 1) {
                      const tuplet: Tuplet = tupletBuilder[0];
                      const notesOccupied: number = tuplet.Notes[0][0].NormalNotes;
                      const bracketed: boolean = tuplet.Bracket ||
                        (tuplet.TupletLabelNumber === 3 && this.rules.TripletsBracketed) ||
                        (tuplet.TupletLabelNumber !== 3 && this.rules.TupletsBracketed);
                      let location: number = Vex.Flow.Tuplet.LOCATION_TOP;
                      if (tuplet.tupletLabelNumberPlacement === PlacementEnum.Below) {
                          location = Vex.Flow.Tuplet.LOCATION_BOTTOM;
                      }
                      vftuplets.push(new Vex.Flow.Tuplet( tupletStaveNotes,
                                                          {
                                                            bracketed: bracketed,
                                                            location: location,
                                                            notes_occupied: notesOccupied,
                                                            num_notes: tuplet.TupletLabelNumber, //, location: -1, ratioed: true
                                                            ratioed: this.rules.TupletsRatioed,
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
        let graceGVoiceEntriesBefore: GraphicalVoiceEntry[] = [];
        const graveGVoiceEntriesAdded: GraphicalVoiceEntry[] = [];
        for (const graphicalStaffEntry of this.staffEntries as VexFlowStaffEntry[]) {
            graceSlur = false;
            graceGVoiceEntriesBefore = [];
            // create vex flow Stave Notes:
            for (const gve of graphicalStaffEntry.graphicalVoiceEntries) {
                if (gve.parentVoiceEntry.IsGrace) {
                    // save grace notes for the next non-grace note
                    graceGVoiceEntriesBefore.push(gve);
                    graveGVoiceEntriesAdded.push(gve);
                    if (!graceSlur) {
                        graceSlur = gve.parentVoiceEntry.GraceSlur;
                    }
                    continue;
                }
                if (gve.notes[0].sourceNote.PrintObject) {
                    (gve as VexFlowVoiceEntry).vfStaveNote = VexFlowConverter.StaveNote(gve);
                } else {
                    // note can now also be added as StaveNote instead of GhostNote, because we set it to transparent
                    (gve as VexFlowVoiceEntry).vfStaveNote = VexFlowConverter.StaveNote(gve);

                    // previous method: add as GhostNote instead of StaveNote. Can cause formatting issues if critical notes are missing in the measure
                    // don't render note. add ghost note, otherwise Vexflow can have issues with layouting when voices not complete.
                    //(gve as VexFlowVoiceEntry).vfStaveNote = VexFlowConverter.GhostNote(gve.notes[0].sourceNote.Length);
                    //graceGVoiceEntriesBefore = []; // if note is not rendered, its grace notes shouldn't be rendered, might need to be removed
                    //continue;
                }
                if (graceGVoiceEntriesBefore.length > 0) {
                    // add grace notes that came before this main note to a GraceNoteGroup in Vexflow, attached to the main note
                    const graceNotes: Vex.Flow.GraceNote[] = [];
                    for (let i: number = 0; i < graceGVoiceEntriesBefore.length; i++) {
                        const gveGrace: VexFlowVoiceEntry = <VexFlowVoiceEntry>graceGVoiceEntriesBefore[i];
                        //if (gveGrace.notes[0].sourceNote.PrintObject) {
                        // grace notes should generally be rendered independently of main note instead of skipped if main note is invisible
                        // could be an option to make grace notes transparent if main note is transparent. set grace notes' PrintObject to false then.
                        const vfStaveNote: StaveNote = VexFlowConverter.StaveNote(gveGrace);
                        gveGrace.vfStaveNote = vfStaveNote;
                        graceNotes.push(vfStaveNote);
                    }
                    const graceNoteGroup: Vex.Flow.GraceNoteGroup = new Vex.Flow.GraceNoteGroup(graceNotes, graceSlur);
                    ((gve as VexFlowVoiceEntry).vfStaveNote as StaveNote).addModifier(0, graceNoteGroup);
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

        // const t0: number = performance.now();
        this.finalizeBeams();
        // const t1: number = performance.now();
        // console.log("Call to finalizeBeams in VexFlowMeasure took " + (t1 - t0) + " milliseconds.");

        this.finalizeTuplets();

        const voices: Voice[] = this.getVoicesWithinMeasure();

        // Calculate offsets for fingerings
        if (this.rules.RenderFingerings) {
            for (const graphicalStaffEntry of this.staffEntries as VexFlowStaffEntry[]) {
                graphicalStaffEntry.setModifierXOffsets();
            }
        }

        for (const voice of voices) {
            if (!voice) {
                continue;
            }
            const isMainVoice: boolean = !(voice instanceof LinkedVoice);

            // add a vexFlow voice for this voice:
            this.vfVoices[voice.VoiceId] = new Vex.Flow.Voice({
                        beat_value: this.parentSourceMeasure.Duration.Denominator,
                        num_beats: this.parentSourceMeasure.Duration.Numerator,
                        resolution: Vex.Flow.RESOLUTION,
                    }).setMode(Vex.Flow.Voice.Mode.SOFT);

            const restFilledEntries: GraphicalVoiceEntry[] = this.getRestFilledVexFlowStaveNotesPerVoice(voice);
                    // .sort((a,b) => a.)
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
                    if (vfse && vfse.vfClefBefore) {
                        // add clef as NoteSubGroup so that we get modifier layouting
                        const clefModifier: NoteSubGroup = new NoteSubGroup( [vfse.vfClefBefore] );
                        // The cast is necesary because...vexflow -> see types
                        if (vexFlowVoiceEntry.vfStaveNote.getCategory && vexFlowVoiceEntry.vfStaveNote.getCategory() === "stavenotes") {
                            // GhostNotes and other StemmableNotes don't have this function
                            (vexFlowVoiceEntry.vfStaveNote as Vex.Flow.StaveNote).addModifier(0, clefModifier);
                        }
                    }
                }

                // add fingering
                if (voiceEntry.parentVoiceEntry && this.rules.RenderFingerings) {
                    this.createFingerings(voiceEntry);
                    this.createStringNumber(voiceEntry);
                }

                // add Arpeggio
                this.createArpeggio(voiceEntry);

                this.vfVoices[voice.VoiceId].addTickable(vexFlowVoiceEntry.vfStaveNote);
            }
        }
        for (const graceGVoiceEntry of graveGVoiceEntriesAdded) {
            this.createFingerings(graceGVoiceEntry);
            this.createStringNumber(graceGVoiceEntry);
            this.createArpeggio(graceGVoiceEntry);
        }
        this.createArticulations();
        this.createOrnaments();
        this.setStemDirectionFromVexFlow();
    }

    private createArpeggio(voiceEntry: GraphicalVoiceEntry): void {
        if (voiceEntry.parentVoiceEntry && voiceEntry.parentVoiceEntry.Arpeggio) {
            const arpeggio: Arpeggio = voiceEntry.parentVoiceEntry.Arpeggio;
            // TODO right now our arpeggio object has all arpeggio notes from arpeggios across all voices.
            // see VoiceGenerator. Doesn't matter for Vexflow for now though
            if (voiceEntry.notes && voiceEntry.notes.length > 1) {
                const type: Vex.Flow.Stroke.Type = VexFlowConverter.StrokeTypeFromArpeggioType(arpeggio.type);
                const stroke: Vex.Flow.Stroke = new Vex.Flow.Stroke(type, {
                    all_voices: this.rules.ArpeggiosGoAcrossVoices
                    // default: false. This causes arpeggios to always go across all voices, which is often unwanted.
                    // also, this can cause infinite height of stroke, see #546
                });
                //if (arpeggio.notes.length === vexFlowVoiceEntry.notes.length) { // different workaround for endless y bug
                if (this.rules.RenderArpeggios) {
                    (voiceEntry as VexFlowVoiceEntry).vfStaveNote.addStroke(0, stroke);
                }
            } else {
                log.debug(`[OSMD] arpeggio in measure ${this.MeasureNumber} could not be drawn.
                voice entry had less than two notes, arpeggio is likely between voice entries, not currently supported in Vexflow.`);
                // TODO: create new arpeggio with all the arpeggio's notes (arpeggio.notes), perhaps with GhostNotes in a new vfStaveNote. not easy.
            }
        }
    }

    /**
     * Copy the stem directions chosen by VexFlow to the StemDirection variable of the graphical notes
     */
    private setStemDirectionFromVexFlow(): void {
        //if StemDirection was not set then read out what VexFlow has chosen
        for ( const vfStaffEntry of this.staffEntries ) {
            for ( const gVoiceEntry of vfStaffEntry.graphicalVoiceEntries) {
                for ( const gnote of gVoiceEntry.notes) {
                    const vfnote: [StemmableNote , number] = (gnote as VexFlowGraphicalNote).vfnote;
                    if (!vfnote || !vfnote[0]) {
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
    protected createArticulations(): void {
        for (let idx: number = 0, len: number = this.staffEntries.length; idx < len; ++idx) {
            const graphicalStaffEntry: VexFlowStaffEntry = (this.staffEntries[idx] as VexFlowStaffEntry);

            // create vex flow articulation:
            const graphicalVoiceEntries: GraphicalVoiceEntry[] = graphicalStaffEntry.graphicalVoiceEntries;
            for (const gve of graphicalVoiceEntries) {
                const vfStaveNote: StemmableNote = (gve as VexFlowVoiceEntry).vfStaveNote;
                VexFlowConverter.generateArticulations(vfStaveNote, gve.notes[0].sourceNote.ParentVoiceEntry.Articulations, this.rules);
            }
        }
    }

    /**
     * Create the ornaments for all notes of the current staff entry
     */
    protected createOrnaments(): void {
        for (let idx: number = 0, len: number = this.staffEntries.length; idx < len; ++idx) {
            const graphicalStaffEntry: VexFlowStaffEntry = (this.staffEntries[idx] as VexFlowStaffEntry);
            const gvoices: { [voiceID: number]: GraphicalVoiceEntry } = graphicalStaffEntry.graphicalVoiceEntries;

            for (const voiceID in gvoices) {
                if (gvoices.hasOwnProperty(voiceID)) {
                    const vfStaveNote: StemmableNote = (gvoices[voiceID] as VexFlowVoiceEntry).vfStaveNote;
                    const ornamentContainer: OrnamentContainer = gvoices[voiceID].notes[0].sourceNote.ParentVoiceEntry.OrnamentContainer;
                    if (ornamentContainer) {
                        VexFlowConverter.generateOrnaments(vfStaveNote, ornamentContainer);
                    }
                }
            }
        }
    }

    protected createFingerings(voiceEntry: GraphicalVoiceEntry): void {
        const vexFlowVoiceEntry: VexFlowVoiceEntry = voiceEntry as VexFlowVoiceEntry;
        let numberOfFingerings: number = 0;
        // count total number of fingerings
        for (const note of voiceEntry.notes) {
            const fingering: TechnicalInstruction = note.sourceNote.Fingering;
            if (fingering) {
                numberOfFingerings++;
            }
        }
        let fingeringIndex: number = -1;
        for (const note of voiceEntry.notes) {
            const fingering: TechnicalInstruction = note.sourceNote.Fingering;
            if (!fingering) {
                fingeringIndex++;
                continue;
            }
            fingeringIndex++; // 0 for first fingering
            let fingeringPosition: PlacementEnum = this.rules.FingeringPosition;
            if (fingering.placement !== PlacementEnum.NotYetDefined) {
                fingeringPosition = fingering.placement;
            }
            let offsetX: number = this.rules.FingeringOffsetX;
            let modifierPosition: number; // Vex.Flow.Stavemodifier.Position
            switch (fingeringPosition) {
                default:
                case PlacementEnum.Left:
                    modifierPosition = Vex.Flow.StaveModifier.Position.LEFT;
                    offsetX -= note.baseFingeringXOffset * unitInPixels;
                    break;
                case PlacementEnum.Right:
                    modifierPosition = Vex.Flow.StaveModifier.Position.RIGHT;
                    offsetX += note.baseFingeringXOffset * unitInPixels;
                    break;
                case PlacementEnum.Above:
                    modifierPosition = Vex.Flow.StaveModifier.Position.ABOVE;
                    break;
                case PlacementEnum.Below:
                    modifierPosition = Vex.Flow.StaveModifier.Position.BELOW;
                    break;
                case PlacementEnum.NotYetDefined: // automatic fingering placement, could be more complex/customizable
                    const sourceStaff: Staff = voiceEntry.parentStaffEntry.sourceStaffEntry.ParentStaff;
                    if (voiceEntry.notes.length > 1 || voiceEntry.parentStaffEntry.graphicalVoiceEntries.length > 1) {
                        modifierPosition = Vex.Flow.StaveModifier.Position.LEFT;
                    } else if (sourceStaff.idInMusicSheet === 0) {
                        modifierPosition = Vex.Flow.StaveModifier.Position.ABOVE;
                        fingeringPosition = PlacementEnum.Above;
                    } else {
                        modifierPosition = Vex.Flow.StaveModifier.Position.BELOW;
                        fingeringPosition = PlacementEnum.Below;
                    }
            }

            const fretFinger: Vex.Flow.FretHandFinger = new Vex.Flow.FretHandFinger(fingering.value);
            fretFinger.setPosition(modifierPosition);
            fretFinger.setOffsetX(offsetX);
            if (fingeringPosition === PlacementEnum.Above || fingeringPosition === PlacementEnum.Below) {
                const offsetYSign: number = fingeringPosition === PlacementEnum.Above ? -1 : 1; // minus y is up
                const ordering: number = fingeringPosition === PlacementEnum.Above ? fingeringIndex :
                    numberOfFingerings - 1 - fingeringIndex; // reverse order for fingerings below staff
                if (this.rules.FingeringInsideStafflines && numberOfFingerings > 1) { // y-shift for single fingering is ok
                    // experimental, bounding boxes wrong for fretFinger above/below, better would be creating Labels
                    // set y-shift. vexflow fretfinger simply places directly above/below note
                    const perFingeringShift: number = fretFinger.getWidth() / 2;
                    const shiftCount: number = numberOfFingerings * 2.5;
                    fretFinger.setOffsetY(offsetYSign * (ordering + shiftCount) * perFingeringShift);
                } else if (!this.rules.FingeringInsideStafflines) { // use StringNumber for placement above/below stafflines
                    const stringNumber: Vex.Flow.StringNumber = new Vex.Flow.StringNumber(fingering.value);
                    (<any>stringNumber).radius = 0; // hack to remove the circle around the number
                    stringNumber.setPosition(modifierPosition);
                    stringNumber.setOffsetY(offsetYSign * ordering * stringNumber.getWidth() * 2 / 3);
                    // Vexflow made a mess with the addModifier signature that changes through each class so we just cast to any :(
                    vexFlowVoiceEntry.vfStaveNote.addModifier((fingeringIndex as any), (stringNumber as any));
                    continue;
                }
            }
            // if (vexFlowVoiceEntry.vfStaveNote.getCategory() === "tabnotes") {
              // TODO this doesn't work yet for tabnotes. don't add fingering for tabs for now.
              // vexFlowVoiceEntry.vfStaveNote.addModifier(fretFinger, fingeringIndex);

            // Vexflow made a mess with the addModifier signature that changes through each class so we just cast to any :(
            vexFlowVoiceEntry.vfStaveNote.addModifier((fingeringIndex as any), (fretFinger as any));
        }
    }

    protected createStringNumber(voiceEntry: GraphicalVoiceEntry): void {
        if (!this.rules.RenderStringNumbersClassical) {
            return;
        }
        const vexFlowVoiceEntry: VexFlowVoiceEntry = voiceEntry as VexFlowVoiceEntry;
        voiceEntry.notes.forEach((note, stringIndex) => {
            const stringInstruction: TechnicalInstruction = note.sourceNote.StringInstruction;
            if (stringInstruction) {
                let stringNumber: string = stringInstruction.value;
                switch (stringNumber) {
                    case "1":
                        stringNumber = "I";
                        break;
                    case "2":
                        stringNumber = "II";
                        break;
                    case "3":
                        stringNumber = "III";
                        break;
                    case "4":
                        stringNumber = "IV";
                        break;
                    case "5":
                        stringNumber = "V";
                        break;
                    case "6":
                        stringNumber = "VI";
                        break;
                    default:
                        // log.warn("stringNumber > 6 not supported"); // TODO do we need to support more?
                        // leave stringNumber as is, warning not really necessary
                }
                const vfStringNumber: Vex.Flow.StringNumber = new Vex.Flow.StringNumber(stringNumber);
                // Remove circle from string number. Not needed for
                // disambiguation from fingerings since we use Roman
                // Numerals for RenderStringNumbersClassical
                (<any>vfStringNumber).radius = 0;
                const offsetY: number = -this.rules.StringNumberOffsetY;
                // if (note.sourceNote.halfTone < 50) { // place string number a little higher for notes with ledger lines below staff
                //     // TODO also check for treble clef (adjust for viola, cello, etc)
                //     offsetY += 10;
                // }
                if (voiceEntry.notes.length > 1 || voiceEntry.parentStaffEntry.graphicalVoiceEntries.length > 1) {
                    vfStringNumber.setOffsetX(note.baseStringNumberXOffset * 13);
                    vfStringNumber.setPosition(Vex.Flow.Modifier.Position.RIGHT);
                } else {
                    vfStringNumber.setPosition(Vex.Flow.Modifier.Position.ABOVE);
                }
                vfStringNumber.setOffsetY(offsetY);

                vexFlowVoiceEntry.vfStaveNote.addModifier((stringIndex as any), (vfStringNumber as any)); // see addModifier() above
            }
        });
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
    protected updateInstructionWidth(): void {
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

        this.beginInstructionsWidth = (vfBeginInstructionsWidth ?? 0) / unitInPixels;
        this.endInstructionsWidth = (vfEndInstructionsWidth ?? 0) / unitInPixels;
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
