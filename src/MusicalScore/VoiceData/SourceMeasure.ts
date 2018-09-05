import {Fraction} from "../../Common/DataObjects/Fraction";
import {VerticalSourceStaffEntryContainer} from "./VerticalSourceStaffEntryContainer";
import {SourceStaffEntry} from "./SourceStaffEntry";
import {RepetitionInstruction, RepetitionInstructionEnum, AlignmentType} from "./Instructions/RepetitionInstruction";
import {Staff} from "./Staff";
import {VoiceEntry} from "./VoiceEntry";
import {Voice} from "./Voice";
import {MusicSheet} from "../MusicSheet";
import {MultiExpression} from "./Expressions/MultiExpression";
import {MultiTempoExpression} from "./Expressions/MultiTempoExpression";
import {KeyInstruction} from "./Instructions/KeyInstruction";
import {AbstractNotationInstruction} from "./Instructions/AbstractNotationInstruction";
import {Repetition} from "../MusicSource/Repetition";
import {BaseIdClass} from "../../Util/BaseIdClass";

/**
 * The Source Measure represents the source data of a unique measure, including all instruments with their staves.
 * There exists one source measure per XML measure or per paper sheet measure (e.g. the source measures are not doubled in repetitions)
 */
export class SourceMeasure extends BaseIdClass {

    /**
     * The data entries and data lists will be filled with null values according to the total number of staves,
     * so that existing objects can be referred to by staff index.
     * @param completeNumberOfStaves
     */
    constructor(completeNumberOfStaves: number) {
        super();
        this.completeNumberOfStaves = completeNumberOfStaves;
        this.implicitMeasure = false;
        this.breakSystemAfter = false;
        this.endsPiece = false;
        this.firstInstructionsStaffEntries = new Array(completeNumberOfStaves);
        this.lastInstructionsStaffEntries = new Array(completeNumberOfStaves);
        for (let i: number = 0; i < completeNumberOfStaves; i++) {
            this.graphicalMeasureErrors.push(false);
            this.staffLinkedExpressions.push([]);
        }
    }

    /**
     * The unique measure list index starting with 0.
     */
    public measureListIndex: number;
    /**
     * The measure number for showing on the music sheet. Typically starts with 1.
     */
    public endsPiece: boolean;

    private measureNumber: number;
    private absoluteTimestamp: Fraction;
    private completeNumberOfStaves: number;
    private duration: Fraction;
    private staffLinkedExpressions: MultiExpression[][] = [];
    private tempoExpressions: MultiTempoExpression[] = [];
    private verticalSourceStaffEntryContainers: VerticalSourceStaffEntryContainer[] = [];
    private implicitMeasure: boolean;
    private breakSystemAfter: boolean;
    private graphicalMeasureErrors: boolean[] = [];
    private firstInstructionsStaffEntries: SourceStaffEntry[];
    private lastInstructionsStaffEntries: SourceStaffEntry[];
    private firstRepetitionInstructions: RepetitionInstruction[] = [];
    private lastRepetitionInstructions: RepetitionInstruction[] = [];

    public get MeasureNumber(): number {
        return this.measureNumber;
    }

    public set MeasureNumber(value: number) {
        this.measureNumber = value;
    }

    public get AbsoluteTimestamp(): Fraction {
        return this.absoluteTimestamp;
    }

    public set AbsoluteTimestamp(value: Fraction) {
        this.absoluteTimestamp = value;
    }

    public get CompleteNumberOfStaves(): number {
        return this.completeNumberOfStaves;
    }

    public get Duration(): Fraction {
        return this.duration;
    }

    public set Duration(value: Fraction) {
        this.duration = value;
    }

    public get ImplicitMeasure(): boolean {
        return this.implicitMeasure;
    }

    public set ImplicitMeasure(value: boolean) {
        this.implicitMeasure = value;
    }

    public get BreakSystemAfter(): boolean {
        return this.breakSystemAfter;
    }

    public set BreakSystemAfter(value: boolean) {
        this.breakSystemAfter = value;
    }

    public get StaffLinkedExpressions(): MultiExpression[][] {
        return this.staffLinkedExpressions;
    }

    public get TempoExpressions(): MultiTempoExpression[] {
        return this.tempoExpressions;
    }

    public get VerticalSourceStaffEntryContainers(): VerticalSourceStaffEntryContainer[] {
        return this.verticalSourceStaffEntryContainers;
    }

    public get FirstInstructionsStaffEntries(): SourceStaffEntry[] {
        return this.firstInstructionsStaffEntries;
    }

    public get LastInstructionsStaffEntries(): SourceStaffEntry[] {
        return this.lastInstructionsStaffEntries;
    }

    public get FirstRepetitionInstructions(): RepetitionInstruction[] {
        return this.firstRepetitionInstructions;
    }

    public get LastRepetitionInstructions(): RepetitionInstruction[] {
        return this.lastRepetitionInstructions;
    }

    public getErrorInMeasure(staffIndex: number): boolean {
        return this.graphicalMeasureErrors[staffIndex];
    }

    public setErrorInGraphicalMeasure(staffIndex: number, hasError: boolean): void {
        this.graphicalMeasureErrors[staffIndex] = hasError;
    }

    public getNextMeasure(measures: SourceMeasure[]): SourceMeasure {
        return measures[this.measureListIndex + 1];
    }

    public getPreviousMeasure(measures: SourceMeasure[]): SourceMeasure {
        if (this.measureListIndex > 1) {
            return measures[this.measureListIndex - 1];
        }
        return undefined;
    }

    /**
     * Check at the given timestamp if a VerticalContainer exists, if not creates a new, timestamp-ordered one,
     * and at the given index, if a [[SourceStaffEntry]] exists, and if not, creates a new one.
     * @param inMeasureTimestamp
     * @param inSourceMeasureStaffIndex
     * @param staff
     * @returns {{createdNewContainer: boolean, staffEntry: SourceStaffEntry}}
     */
    public findOrCreateStaffEntry(inMeasureTimestamp: Fraction, inSourceMeasureStaffIndex: number,
                                  staff: Staff): {createdNewContainer: boolean, staffEntry: SourceStaffEntry} {
        let staffEntry: SourceStaffEntry = undefined;
        // Find:
        let existingVerticalSourceStaffEntryContainer: VerticalSourceStaffEntryContainer;
        for (const container of this.verticalSourceStaffEntryContainers) {
            if (container.Timestamp.Equals(inMeasureTimestamp)) {
                existingVerticalSourceStaffEntryContainer = container;
                break;
            }
        }
        if (existingVerticalSourceStaffEntryContainer !== undefined) {
            if (existingVerticalSourceStaffEntryContainer.StaffEntries[inSourceMeasureStaffIndex] !== undefined) {
                staffEntry = existingVerticalSourceStaffEntryContainer.StaffEntries[inSourceMeasureStaffIndex];
            } else {
                staffEntry = new SourceStaffEntry(existingVerticalSourceStaffEntryContainer, staff);
                existingVerticalSourceStaffEntryContainer.StaffEntries[inSourceMeasureStaffIndex] = staffEntry;
            }
            return {createdNewContainer: false, staffEntry: staffEntry};
        }
        const last: VerticalSourceStaffEntryContainer = this.verticalSourceStaffEntryContainers[this.verticalSourceStaffEntryContainers.length - 1];
        if (this.verticalSourceStaffEntryContainers.length === 0 || last.Timestamp.lt(inMeasureTimestamp)) {
            const container: VerticalSourceStaffEntryContainer = new VerticalSourceStaffEntryContainer(
                this, inMeasureTimestamp.clone(), this.completeNumberOfStaves
            );
            this.verticalSourceStaffEntryContainers.push(container);
            staffEntry = new SourceStaffEntry(container, staff);
            container.StaffEntries[inSourceMeasureStaffIndex] = staffEntry;
        } else {
            for (
                let i: number = this.verticalSourceStaffEntryContainers.length - 1;
                i >= 0; i--
            ) {
                if (this.verticalSourceStaffEntryContainers[i].Timestamp.lt(inMeasureTimestamp)) {
                    const container: VerticalSourceStaffEntryContainer = new VerticalSourceStaffEntryContainer(
                        this, inMeasureTimestamp.clone(), this.completeNumberOfStaves
                    );
                    this.verticalSourceStaffEntryContainers.splice(i + 1, 0, container);
                    staffEntry = new SourceStaffEntry(container, staff);
                    container.StaffEntries[inSourceMeasureStaffIndex] = staffEntry;
                    break;
                }
                if (i === 0) {
                    const container: VerticalSourceStaffEntryContainer = new VerticalSourceStaffEntryContainer(
                        this, inMeasureTimestamp.clone(), this.completeNumberOfStaves
                    );
                    this.verticalSourceStaffEntryContainers.splice(i, 0, container);
                    staffEntry = new SourceStaffEntry(container, staff);
                    container.StaffEntries[inSourceMeasureStaffIndex] = staffEntry;
                    break;
                }
            }
        }
        return {createdNewContainer: true, staffEntry: staffEntry};
    }

    /**
     * Check if a VerticalContainer, a staffEntry and a voiceEntry exist at the given timestamp.
     * If not, create the necessary entries.
     * @param sse
     * @param voice
     * @returns {{createdVoiceEntry: boolean, voiceEntry: VoiceEntry}}
     */
    public findOrCreateVoiceEntry(sse: SourceStaffEntry, voice: Voice): { createdVoiceEntry: boolean, voiceEntry: VoiceEntry } {
        let ve: VoiceEntry = undefined;
        let createdNewVoiceEntry: boolean = false;
        for (const voiceEntry of sse.VoiceEntries) {
            if (voiceEntry.ParentVoice === voice) {
                ve = voiceEntry;
                break;
            }
        }
        if (ve === undefined) {
            ve = new VoiceEntry(sse.Timestamp, voice, sse);
            sse.VoiceEntries.push(ve);
            createdNewVoiceEntry = true;
        }
        return {createdVoiceEntry: createdNewVoiceEntry, voiceEntry: ve};
    }

    /**
     * Search for a non-null [[SourceStaffEntry]] at the given verticalIndex,
     * starting from the given horizontalIndex and moving backwards. If none is found, then return undefined.
     * @param verticalIndex
     * @param horizontalIndex
     * @returns {any}
     */
    public getPreviousSourceStaffEntryFromIndex(verticalIndex: number, horizontalIndex: number): SourceStaffEntry {
        for (let i: number = horizontalIndex - 1; i >= 0; i--) {
            if (this.verticalSourceStaffEntryContainers[i][verticalIndex] !== undefined) {
                return this.verticalSourceStaffEntryContainers[i][verticalIndex];
            }
        }
        return undefined;
    }

    /**
     * Return the index of the existing VerticalContainer at the given timestamp.
     * @param musicTimestamp
     * @returns {number}
     */
    public getVerticalContainerIndexByTimestamp(musicTimestamp: Fraction): number {
        for (let idx: number = 0, len: number = this.VerticalSourceStaffEntryContainers.length; idx < len; ++idx) {
            if (this.VerticalSourceStaffEntryContainers[idx].Timestamp.Equals(musicTimestamp)) {
                return idx; // this.verticalSourceStaffEntryContainers.indexOf(verticalSourceStaffEntryContainer);
            }
        }
        return -1;
    }

    /**
     * Return the existing VerticalContainer at the given timestamp.
     * @param musicTimestamp
     * @returns {any}
     */
    public getVerticalContainerByTimestamp(musicTimestamp: Fraction): VerticalSourceStaffEntryContainer {
        for (let idx: number = 0, len: number = this.VerticalSourceStaffEntryContainers.length; idx < len; ++idx) {
            const verticalSourceStaffEntryContainer: VerticalSourceStaffEntryContainer = this.VerticalSourceStaffEntryContainers[idx];
            if (verticalSourceStaffEntryContainer.Timestamp.Equals(musicTimestamp)) {
                return verticalSourceStaffEntryContainer;
            }
        }
        return undefined;
    }

    /**
     * Check the [[SourceMeasure]] for a possible VerticalContainer with all of its [[StaffEntry]]s undefined,
     * and if found, remove the VerticalContainer from the [[SourceMeasure]].
     * @param index
     */
    public checkForEmptyVerticalContainer(index: number): void {
        let undefinedCounter: number = 0;
        for (let i: number = 0; i < this.completeNumberOfStaves; i++) {
            if (this.verticalSourceStaffEntryContainers[index][i] === undefined) {
                undefinedCounter++;
            }
        }
        if (undefinedCounter === this.completeNumberOfStaves) {
            this.verticalSourceStaffEntryContainers.splice(index, 1);
        }
    }

    /**
     * This method is used for handling a measure with the following error (in the procedure of finding out the Instrument's Duration):
     * If the LastStaffEntry is missing (implied restNote or error), then go back the StaffEntries until you find a TiedNote (tie Start),
     * which gives the correct MeasureDuration.
     * @param musicSheet
     * @param maxInstDuration
     * @returns {Fraction}
     */
    public reverseCheck(musicSheet: MusicSheet, maxInstDuration: Fraction): Fraction {
        let maxDuration: Fraction = new Fraction(0, 1);
        const instrumentsDurations: Fraction[] = [];
        for (let i: number = 0; i < musicSheet.Instruments.length; i++) {
            let instrumentDuration: Fraction = new Fraction(0, 1);
            const inSourceMeasureInstrumentIndex: number = musicSheet.getGlobalStaffIndexOfFirstStaff(musicSheet.Instruments[i]);
            for (let j: number = 0; j < musicSheet.Instruments[i].Staves.length; j++) {
                const lastStaffEntry: SourceStaffEntry = this.getLastSourceStaffEntryForInstrument(inSourceMeasureInstrumentIndex + j);
                if (lastStaffEntry !== undefined && !lastStaffEntry.hasTie()) {
                    const verticalContainerIndex: number = this.verticalSourceStaffEntryContainers.indexOf(lastStaffEntry.VerticalContainerParent);
                    for (let m: number = verticalContainerIndex - 1; m >= 0; m--) {
                        const previousStaffEntry: SourceStaffEntry = this.verticalSourceStaffEntryContainers[m][inSourceMeasureInstrumentIndex + j];
                        if (previousStaffEntry !== undefined && previousStaffEntry.hasTie()) {
                            if (instrumentDuration.lt(Fraction.plus(previousStaffEntry.Timestamp, previousStaffEntry.calculateMaxNoteLength()))) {
                                instrumentDuration = Fraction.plus(previousStaffEntry.Timestamp, previousStaffEntry.calculateMaxNoteLength());
                                break;
                            }
                        }
                    }
                }
            }
            instrumentsDurations.push(instrumentDuration);
        }
        for (let idx: number = 0, len: number = instrumentsDurations.length; idx < len; ++idx) {
            const instrumentsDuration: Fraction = instrumentsDurations[idx];
            if (maxDuration.lt(instrumentsDuration)) {
                maxDuration = instrumentsDuration;
            }
        }

        return Fraction.max(maxDuration, maxInstDuration);
    }

    /**
     * Calculate all the [[Instrument]]'s NotesDurations for this Measures.
     * @param musicSheet
     * @param instrumentMaxTieNoteFractions
     * @returns {Fraction[]}
     */
    public calculateInstrumentsDuration(musicSheet: MusicSheet, instrumentMaxTieNoteFractions: Fraction[]): Fraction[] {
        const instrumentsDurations: Fraction[] = [];
        for (let i: number = 0; i < musicSheet.Instruments.length; i++) {
            let instrumentDuration: Fraction = new Fraction(0, 1);
            const inSourceMeasureInstrumentIndex: number = musicSheet.getGlobalStaffIndexOfFirstStaff(musicSheet.Instruments[i]);
            for (let j: number = 0; j < musicSheet.Instruments[i].Staves.length; j++) {
                const lastStaffEntry: SourceStaffEntry = this.getLastSourceStaffEntryForInstrument(inSourceMeasureInstrumentIndex + j);
                if (lastStaffEntry !== undefined && lastStaffEntry.Timestamp !== undefined) {
                    if (instrumentDuration.lt(Fraction.plus(lastStaffEntry.Timestamp, lastStaffEntry.calculateMaxNoteLength()))) {
                        instrumentDuration = Fraction.plus(lastStaffEntry.Timestamp, lastStaffEntry.calculateMaxNoteLength());
                    }
                }
            }
            if (instrumentDuration.lt(instrumentMaxTieNoteFractions[i])) {
                instrumentDuration = instrumentMaxTieNoteFractions[i];
            }
            instrumentsDurations.push(instrumentDuration);
        }
        return instrumentsDurations;
    }

    public getEntriesPerStaff(staffIndex: number): SourceStaffEntry[] {
        const sourceStaffEntries: SourceStaffEntry[] = [];
        for (const container of this.VerticalSourceStaffEntryContainers) {
            const sse: SourceStaffEntry = container.StaffEntries[staffIndex];
            if (sse !== undefined) {
                sourceStaffEntries.push(sse);
            }
        }
        return sourceStaffEntries;
    }

    /**
     *
     * @returns {boolean} true iff some measure begin instructions have been found for at least one staff
     */
    public hasBeginInstructions(): boolean {
        for (let staffIndex: number = 0, len: number = this.FirstInstructionsStaffEntries.length; staffIndex < len; staffIndex++) {
            const beginInstructionsStaffEntry: SourceStaffEntry = this.FirstInstructionsStaffEntries[staffIndex];
            if (beginInstructionsStaffEntry !== undefined && beginInstructionsStaffEntry.Instructions.length > 0) {
                return true;
            }
        }
        return false;
    }

    public beginsWithLineRepetition(): boolean {
        for (let idx: number = 0, len: number = this.FirstRepetitionInstructions.length; idx < len; ++idx) {
            const instr: RepetitionInstruction = this.FirstRepetitionInstructions[idx];
            if (instr.type === RepetitionInstructionEnum.StartLine) {
                return true;
            }
            if (instr.parentRepetition !== undefined && instr === instr.parentRepetition.startMarker && !instr.parentRepetition.FromWords) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if this measure is a Repetition Ending.
     * @returns {boolean}
     */
    public endsWithLineRepetition(): boolean {
        for (let idx: number = 0, len: number = this.LastRepetitionInstructions.length; idx < len; ++idx) {
            const instruction: RepetitionInstruction = this.LastRepetitionInstructions[idx];
            if (instruction.type === RepetitionInstructionEnum.BackJumpLine) {
                return true;
            }

            const rep: Repetition = instruction.parentRepetition;
            if (rep === undefined) {
                continue;
            }
            if (rep.FromWords) {
                continue;
            }
            for (let idx2: number = 0, len2: number = rep.BackwardJumpInstructions.length; idx2 < len2; ++idx2) {
                const backJumpInstruction: RepetitionInstruction = rep.BackwardJumpInstructions[idx2];
                if (instruction === backJumpInstruction) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Check if a Repetition starts at the next Measure.
     * @returns {boolean}
     */
    public beginsWithWordRepetition(): boolean {
        for (let idx: number = 0, len: number = this.FirstRepetitionInstructions.length; idx < len; ++idx) {
            const instruction: RepetitionInstruction = this.FirstRepetitionInstructions[idx];
            if (instruction.parentRepetition !== undefined &&
                instruction === instruction.parentRepetition.startMarker && instruction.parentRepetition.FromWords) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if this Measure ends a Repetition.
     * @returns {boolean}
     */
    public endsWithWordRepetition(): boolean {
        for (let idx: number = 0, len: number = this.LastRepetitionInstructions.length; idx < len; ++idx) {
            const instruction: RepetitionInstruction = this.LastRepetitionInstructions[idx];
            const rep: Repetition = instruction.parentRepetition;
            if (rep === undefined) {
                continue;
            }
            if (!rep.FromWords) {
                continue;
            }
            for (let idx2: number = 0, len2: number = rep.BackwardJumpInstructions.length; idx2 < len2; ++idx2) {
                const backJumpInstruction: RepetitionInstruction = rep.BackwardJumpInstructions[idx2];
                if (instruction === backJumpInstruction) {
                    return true;
                }
            }
            if (instruction === rep.forwardJumpInstruction) {
                return true;
            }
        }
        return false;
    }

    public beginsRepetitionEnding(): boolean {
        for (const instruction of this.FirstRepetitionInstructions) {
            if (instruction.type === RepetitionInstructionEnum.Ending &&
                instruction.alignment === AlignmentType.Begin) {
                return true;
            }
        }
        return false;
    }

    public endsRepetitionEnding(): boolean {
        for (const instruction of this.LastRepetitionInstructions) {
            if (instruction.type === RepetitionInstructionEnum.Ending &&
                instruction.alignment === AlignmentType.End) {
                return true;
            }
        }
        return false;
    }

    public getKeyInstruction(staffIndex: number): KeyInstruction {
        if (this.FirstInstructionsStaffEntries[staffIndex] !== undefined) {
            const sourceStaffEntry: SourceStaffEntry = this.FirstInstructionsStaffEntries[staffIndex];
            for (let idx: number = 0, len: number = sourceStaffEntry.Instructions.length; idx < len; ++idx) {
                const abstractNotationInstruction: AbstractNotationInstruction = sourceStaffEntry.Instructions[idx];
                if (abstractNotationInstruction instanceof KeyInstruction) {
                    return <KeyInstruction>abstractNotationInstruction;
                }
            }
        }
        return undefined;
    }

    /**
     * Return the first non-null [[SourceStaffEntry]] at the given InstrumentIndex.
     * @param instrumentIndex
     * @returns {SourceStaffEntry}
     */
    private getLastSourceStaffEntryForInstrument(instrumentIndex: number): SourceStaffEntry {
        let entry: SourceStaffEntry;
        for (let i: number = this.verticalSourceStaffEntryContainers.length - 1; i >= 0; i--) {
            entry = this.verticalSourceStaffEntryContainers[i].StaffEntries[instrumentIndex];
            if (entry) {
                break;
            }
        }
        return entry;
    }
}
