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
import {Beam} from "../../VoiceData/Beam";
import {GraphicalNote} from "../GraphicalNote";
import {GraphicalStaffEntry} from "../GraphicalStaffEntry";
import StaveConnector = Vex.Flow.StaveConnector;
import {unitInPixels} from "./VexFlowMusicSheetDrawer";
import {Tuplet} from "../../VoiceData/Tuplet";
import {RepetitionInstructionEnum, RepetitionInstruction, AlignmentType} from "../../VoiceData/Instructions/RepetitionInstruction";
import {SystemLinePosition} from "../SystemLinePosition";
import {GraphicalVoiceEntry} from "../GraphicalVoiceEntry";
import {Voice} from "../../VoiceData/Voice";
import {EngravingRules} from "../EngravingRules";
import {SkyBottomLineCalculator} from "../SkyBottomLineCalculator";
import {VexFlowMeasure} from "./VexFlowMeasure";

// type StemmableNote = Vex.Flow.StemmableNote;

/** A GraphicalMeasure drawing a multiple-rest measure in Vexflow.
 *  Mostly copied from VexFlowMeasure.
 *  Even though most of those functions aren't needed, apparently you can't remove the layoutStaffEntry function.
 */
export class VexFlowMultiRestMeasure extends GraphicalMeasure {
    private multiRestElement: any; // VexFlow: Element

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

        // type note: Vex.Flow.MultiMeasureRest is not in the DefinitelyTyped definitions yet.
        this.multiRestElement = new (Vex.Flow as any).MultiMeasureRest(sourceMeasure.multipleRestMeasures, {
            // number_line: 3
        });
    }

    /** The VexFlow Stave (= one measure in a staffline) */
    protected stave: Vex.Flow.Stave;
    /** VexFlow StaveConnectors (vertical lines) */
    protected connectors: Vex.Flow.StaveConnector[] = [];
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
            space_above_staff_ln: 0,
            space_below_staff_ln: 0,
        });

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
        // this.stave.setKeySignature(
        //     VexFlowConverter.keySignature(currentKey),
        //     VexFlowConverter.keySignature(previousKey),
        //     undefined
        // );
        // this.updateInstructionWidth();
    }

    /**
     * adds the given rhythm to the begin of the measure.
     * This has to update/increase BeginInstructionsWidth.
     * @param rhythm
     */
    public addRhythmAtBegin(rhythm: RhythmInstruction): void {
        // const timeSig: Vex.Flow.TimeSignature = VexFlowConverter.TimeSignature(rhythm);
        // this.stave.addModifier(
        //     timeSig,
        //     Vex.Flow.StaveModifier.Position.BEGIN
        // );
        // this.updateInstructionWidth();
    }

    /**
     * adds the given clef to the end of the measure.
     * This has to update/increase EndInstructionsWidth.
     * @param clef
     */
    public addClefAtEnd(clef: ClefInstruction): void {
        // const vfclef: { type: string, size: string, annotation: string } = VexFlowConverter.Clef(clef, "small");
        // this.stave.setEndClef(vfclef.type, vfclef.size, vfclef.annotation);
        // this.updateInstructionWidth();
    }

    public addMeasureLine(lineType: SystemLinesEnum, linePosition: SystemLinePosition): void {
        switch (linePosition) {
            case SystemLinePosition.MeasureBegin:
                switch (lineType) {
                    case SystemLinesEnum.BoldThinDots:
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
        switch (repetitionInstruction.type) {
          case RepetitionInstructionEnum.Segno:
            // create Segno Symbol:
            instruction = Vex.Flow.Repetition.type.SEGNO_LEFT;
            position = Vex.Flow.StaveModifier.Position.BEGIN;
            break;
          case RepetitionInstructionEnum.Coda:
            // create Coda Symbol:
            instruction = Vex.Flow.Repetition.type.CODA_LEFT;
            position = Vex.Flow.StaveModifier.Position.BEGIN;
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
            //instruction = "To Coda";
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

            const skyBottomLineCalculator: SkyBottomLineCalculator = this.ParentStaffLine.SkyBottomLineCalculator;
            //Because of loss of accuracy when sampling (see SkyBottomLineCalculator.updateInRange), measures tend to overlap
            //This causes getSkyLineMinInRange to return an incorrect min value (one from the previous measure, which has been modified)
            //We need to offset the end of what we are measuring by a bit to prevent this, otherwise volta pairs step up
            const start: number = this.PositionAndShape.AbsolutePosition.x + this.PositionAndShape.BorderMarginLeft + 0.4;
            const end: number = this.PositionAndShape.AbsolutePosition.x + this.PositionAndShape.BorderMarginRight;
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
                    //should never be the case... But check just to be sure
                    continue;
                }
                if (tempMeasure.MeasureNumber === currentMeasureNumber - 1) {
                    //We found the previous top measure
                    prevMeasure = tempMeasure as VexFlowMeasure;
                }
            }

            if (prevMeasure) {
                const prevStaveModifiers: Vex.Flow.StaveModifier[] = (prevMeasure as any).stave?.getModifiers();
                for (let i: number = 0; i < prevStaveModifiers.length; i++) {
                    const nextStaveModifier: Vex.Flow.StaveModifier = prevStaveModifiers[i];
                    if (nextStaveModifier.hasOwnProperty("volta")) {
                        const prevskyBottomLineCalculator: SkyBottomLineCalculator = prevMeasure.ParentStaffLine.SkyBottomLineCalculator;
                        const prevStart: number = prevMeasure.PositionAndShape.AbsolutePosition.x + prevMeasure.PositionAndShape.BorderMarginLeft + 0.4;
                        const prevEnd: number = prevMeasure.PositionAndShape.AbsolutePosition.x + prevMeasure.PositionAndShape.BorderMarginRight;
                        const prevMeasureSkyline: number = prevskyBottomLineCalculator.getSkyLineMinInRange(prevStart, prevEnd);
                        //if prev skyline is higher, use it
                        if (prevMeasureSkyline <= newSkylineValueForMeasure) {
                            const skylineDifference: number = prevMeasureSkyline - newSkylineValueForMeasure;
                            vexFlowVoltaHeight += skylineDifference;
                            newSkylineValueForMeasure = prevMeasureSkyline;
                        } else { //otherwise, we are higher. Need to adjust prev
                            (nextStaveModifier as any).y_shift = vexFlowVoltaHeight * 10;
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

        this.multiRestElement.setStave(this.stave);
        this.multiRestElement.setContext(ctx);
        this.multiRestElement.draw();

        // Draw vertical lines
        for (const connector of this.connectors) {
            connector.setContext(ctx).draw();
        }
    }

    public format(): void {
        // return
    }

    /**
     * Returns all the voices that are present in this measure
     */
    public getVoicesWithinMeasure(): Voice[] {
        return [];
    }

    /**
     * Returns all the graphicalVoiceEntries of a given Voice.
     * @param voice the voice for which the graphicalVoiceEntries shall be returned.
     */
    public getGraphicalVoiceEntriesPerVoice(voice: Voice): GraphicalVoiceEntry[] {
        return [];
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
        return [];
    }

    /**
     * Add a note to a beam
     * @param graphicalNote
     * @param beam
     */
    public handleBeam(graphicalNote: GraphicalNote, beam: Beam): void {
        return;
    }

    public handleTuplet(graphicalNote: GraphicalNote, tuplet: Tuplet): void {
        return;
    }

    /**
     * Complete the creation of VexFlow Beams in this measure
     */
    public finalizeBeams(): void {
        return;
    }

    /**
     * Complete the creation of VexFlow Tuplets in this measure
     */
    public finalizeTuplets(): void {
        return;
    }

    // this needs to exist, for some reason, or it won't be found, even though i can't find the usage.
    public layoutStaffEntry(graphicalStaffEntry: GraphicalStaffEntry): void {
        return;
    }

    public graphicalMeasureCreatedCalculations(): void {
        return;
    }


    /**
     * Create the articulations for all notes of the current staff entry
     */
    protected createArticulations(): void {
        return;
    }

    /**
     * Create the ornaments for all notes of the current staff entry
     */
    protected createOrnaments(): void {
        return;
    }

    protected createFingerings(voiceEntry: GraphicalVoiceEntry): void {
        return;
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
