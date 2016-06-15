import {Fraction} from "../../Common/DataObjects/fraction";
import {VerticalSourceStaffEntryContainer} from "./VerticalSourceStaffEntryContainer";
import {SourceStaffEntry} from "./SourceStaffEntry";
import {RepetitionInstruction} from "./Instructions/RepetitionInstruction";
import {Staff} from "./Staff";
import {VoiceEntry} from "./VoiceEntry";
import {Voice} from "./Voice";
import {MusicSheet} from "../MusicSheet";
import {MultiExpression} from "./Expressions/multiExpression";
import {MultiTempoExpression} from "./Expressions/multiTempoExpression";
import {KeyInstruction} from "./Instructions/KeyInstruction";
import {AbstractNotationInstruction} from "./Instructions/AbstractNotationInstruction";
import {Repetition} from "../MusicSource/Repetition";

export class SourceMeasure {
    constructor(completeNumberOfStaves: number) {
        this.completeNumberOfStaves = completeNumberOfStaves;
        this.implicitMeasure = false;
        this.breakSystemAfter = false;
        this.endsPiece = false;
        this.firstInstructionsStaffEntries = new Array(completeNumberOfStaves);
        this.lastInstructionsStaffEntries = new Array(completeNumberOfStaves);
        for (let i: number = 0; i < completeNumberOfStaves; i++) {
            this.staffMeasureErrors.push(false);
            this.staffLinkedExpressions.push([]);
        }
    }

    public measureListIndex: number;
    public endsPiece: boolean;

    private measureNumber: number;
    //private parentMusicPart: SourceMusicPart;
    private absoluteTimestamp: Fraction;
    private completeNumberOfStaves: number;
    private duration: Fraction;
    private staffLinkedExpressions: MultiExpression[][] = [];
    private tempoExpressions: MultiTempoExpression[] = [];
    private verticalSourceStaffEntryContainers: VerticalSourceStaffEntryContainer[] = [];
    private implicitMeasure: boolean;
    private breakSystemAfter: boolean;
    private staffMeasureErrors: boolean[] = [];
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
        return this.staffMeasureErrors[staffIndex];
    }

    public setErrorInStaffMeasure(staffIndex: number, hasError: boolean): void {
        this.staffMeasureErrors[staffIndex] = hasError;
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

    public findOrCreateStaffEntry(inMeasureTimestamp: Fraction, inSourceMeasureStaffIndex: number,
                                  staff: Staff): {createdNewContainer: boolean, staffEntry: SourceStaffEntry} {
        // FIXME Andrea: debug & Test
        let staffEntry: SourceStaffEntry = undefined;
        // Find:
        let existingVerticalSourceStaffEntryContainer: VerticalSourceStaffEntryContainer;
        for (let container of this.verticalSourceStaffEntryContainers) {
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
        let last: VerticalSourceStaffEntryContainer = this.verticalSourceStaffEntryContainers[this.verticalSourceStaffEntryContainers.length - 1];
        if (this.verticalSourceStaffEntryContainers.length === 0 || last.Timestamp.lt(inMeasureTimestamp)) {
            let container: VerticalSourceStaffEntryContainer = new VerticalSourceStaffEntryContainer(
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
                    let container: VerticalSourceStaffEntryContainer = new VerticalSourceStaffEntryContainer(
                        this, inMeasureTimestamp.clone(), this.completeNumberOfStaves
                    );
                    this.verticalSourceStaffEntryContainers.splice(i + 1, 0, container);
                    staffEntry = new SourceStaffEntry(container, staff);
                    container.StaffEntries[inSourceMeasureStaffIndex] = staffEntry;
                    break;
                }
                if (i === 0) {
                    let container: VerticalSourceStaffEntryContainer = new VerticalSourceStaffEntryContainer(
                        this, inMeasureTimestamp.clone(), this.completeNumberOfStaves
                    );
                    this.verticalSourceStaffEntryContainers.splice(i, 0, container);
                    staffEntry = new SourceStaffEntry(container, staff);
                    container.StaffEntries[inSourceMeasureStaffIndex] = staffEntry;
                    break;
                }
            }
        }
        //Logging.debug("created new container: ", staffEntry, this.verticalSourceStaffEntryContainers);
        return {createdNewContainer: true, staffEntry: staffEntry};
    }

    public findOrCreateVoiceEntry(sse: SourceStaffEntry, voice: Voice): { createdVoiceEntry: boolean, voiceEntry: VoiceEntry } {
        let ve: VoiceEntry = undefined;
        let createdNewVoiceEntry: boolean = false;
        for (let voiceEntry of sse.VoiceEntries) {
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

    public getPreviousSourceStaffEntryFromIndex(verticalIndex: number, horizontalIndex: number): SourceStaffEntry {
        for (let i: number = horizontalIndex - 1; i >= 0; i--) {
            if (this.verticalSourceStaffEntryContainers[i][verticalIndex] !== undefined) {
                return this.verticalSourceStaffEntryContainers[i][verticalIndex];
            }
        }
        return undefined;
    }

    public getVerticalContainerIndexByTimestamp(musicTimestamp: Fraction): number {
        for (let idx: number = 0, len: number = this.VerticalSourceStaffEntryContainers.length; idx < len; ++idx) {
            if (this.VerticalSourceStaffEntryContainers[idx].Timestamp.Equals(musicTimestamp)) {
                return idx; // this.verticalSourceStaffEntryContainers.indexOf(verticalSourceStaffEntryContainer);
            }
        }
        return -1;
    }

    public getVerticalContainerByTimestamp(musicTimestamp: Fraction): VerticalSourceStaffEntryContainer {
        for (let idx: number = 0, len: number = this.VerticalSourceStaffEntryContainers.length; idx < len; ++idx) {
            let verticalSourceStaffEntryContainer: VerticalSourceStaffEntryContainer = this.VerticalSourceStaffEntryContainers[idx];
            if (verticalSourceStaffEntryContainer.Timestamp.Equals(musicTimestamp)) {
                return verticalSourceStaffEntryContainer;
            }
        }
        return undefined;
    }

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

    public reverseCheck(musicSheet: MusicSheet, maxInstDuration: Fraction): Fraction {
        let maxDuration: Fraction = new Fraction(0, 1);
        let instrumentsDurations: Fraction[] = [];
        for (let i: number = 0; i < musicSheet.Instruments.length; i++) {
            let instrumentDuration: Fraction = new Fraction(0, 1);
            let inSourceMeasureInstrumentIndex: number = musicSheet.getGlobalStaffIndexOfFirstStaff(musicSheet.Instruments[i]);
            for (let j: number = 0; j < musicSheet.Instruments[i].Staves.length; j++) {
                let lastStaffEntry: SourceStaffEntry = this.getLastSourceStaffEntryForInstrument(inSourceMeasureInstrumentIndex + j);
                if (lastStaffEntry !== undefined && !lastStaffEntry.hasTie()) {
                    let verticalContainerIndex: number = this.verticalSourceStaffEntryContainers.indexOf(lastStaffEntry.VerticalContainerParent);
                    for (let m: number = verticalContainerIndex - 1; m >= 0; m--) {
                        let previousStaffEntry: SourceStaffEntry = this.verticalSourceStaffEntryContainers[m][inSourceMeasureInstrumentIndex + j];
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
            let instrumentsDuration: Fraction = instrumentsDurations[idx];
            if (maxDuration.lt(instrumentsDuration)) {
                maxDuration = instrumentsDuration;
            }
        }
        return Fraction.max(maxDuration, maxInstDuration);
    }

    public calculateInstrumentsDuration(musicSheet: MusicSheet, instrumentMaxTieNoteFractions: Fraction[]): Fraction[] {
        let instrumentsDurations: Fraction[] = [];
        for (let i: number = 0; i < musicSheet.Instruments.length; i++) {
            let instrumentDuration: Fraction = new Fraction(0, 1);
            let inSourceMeasureInstrumentIndex: number = musicSheet.getGlobalStaffIndexOfFirstStaff(musicSheet.Instruments[i]);
            for (let j: number = 0; j < musicSheet.Instruments[i].Staves.length; j++) {
                let lastStaffEntry: SourceStaffEntry = this.getLastSourceStaffEntryForInstrument(inSourceMeasureInstrumentIndex + j);
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
        let sourceStaffEntries: SourceStaffEntry[] = [];
        for (let container of this.VerticalSourceStaffEntryContainers) {
            let sse: SourceStaffEntry = container.StaffEntries[staffIndex];
            if (sse !== undefined) {
                sourceStaffEntries.push(sse);
            }
        }
        return sourceStaffEntries;
    }

    public hasBeginInstructions(): boolean {
        for (let staffIndex: number = 0, len: number = this.FirstInstructionsStaffEntries.length; staffIndex < len; staffIndex++) {
            let beginInstructionsStaffEntry: SourceStaffEntry = this.FirstInstructionsStaffEntries[staffIndex];
            if (beginInstructionsStaffEntry !== undefined && beginInstructionsStaffEntry.Instructions.length > 0) {
                return true;
            }
        }
        return false;
    }

    public beginsWithLineRepetition(): boolean {
        for (let idx: number = 0, len: number = this.FirstRepetitionInstructions.length; idx < len; ++idx) {
            let instr: RepetitionInstruction = this.FirstRepetitionInstructions[idx];
            if (instr.parentRepetition !== undefined && instr === instr.parentRepetition.startMarker && !instr.parentRepetition.FromWords) {
                return true;
            }
        }
        return false;
    }

    public endsWithLineRepetition(): boolean {
        for (let idx: number = 0, len: number = this.LastRepetitionInstructions.length; idx < len; ++idx) {
            let instruction: RepetitionInstruction = this.LastRepetitionInstructions[idx];
            let rep: Repetition = instruction.parentRepetition;
            if (rep === undefined) {
                continue;
            }
            if (rep.FromWords) {
                continue;
            }
            for (let idx2: number = 0, len2: number = rep.BackwardJumpInstructions.length; idx2 < len2; ++idx2) {
                let backJumpInstruction: RepetitionInstruction = rep.BackwardJumpInstructions[idx2];
                if (instruction === backJumpInstruction) {
                    return true;
                }
            }
        }
        return false;
    }

    public beginsWithWordRepetition(): boolean {
        for (let idx: number = 0, len: number = this.FirstRepetitionInstructions.length; idx < len; ++idx) {
            let instruction: RepetitionInstruction = this.FirstRepetitionInstructions[idx];
            if (instruction.parentRepetition !== undefined &&
                instruction === instruction.parentRepetition.startMarker && instruction.parentRepetition.FromWords) {
                return true;
            }
        }
        return false;
    }

    public endsWithWordRepetition(): boolean {
        for (let idx: number = 0, len: number = this.LastRepetitionInstructions.length; idx < len; ++idx) {
            let instruction: RepetitionInstruction = this.LastRepetitionInstructions[idx];
            let rep: Repetition = instruction.parentRepetition;
            if (rep === undefined) {
                continue;
            }
            if (!rep.FromWords) {
                continue;
            }
            for (let idx2: number = 0, len2: number = rep.BackwardJumpInstructions.length; idx2 < len2; ++idx2) {
                let backJumpInstruction: RepetitionInstruction = rep.BackwardJumpInstructions[idx2];
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

    public getKeyInstruction(staffIndex: number): KeyInstruction {
        if (this.FirstInstructionsStaffEntries[staffIndex] !== undefined) {
            let sourceStaffEntry: SourceStaffEntry = this.FirstInstructionsStaffEntries[staffIndex];
            for (let idx: number = 0, len: number = sourceStaffEntry.Instructions.length; idx < len; ++idx) {
                let abstractNotationInstruction: AbstractNotationInstruction = sourceStaffEntry.Instructions[idx];
                if (abstractNotationInstruction instanceof KeyInstruction) {
                    return <KeyInstruction>abstractNotationInstruction;
                }
            }
        }
        return undefined;
    }

    private getLastSourceStaffEntryForInstrument(instrumentIndex: number): SourceStaffEntry {
        for (let i: number = this.verticalSourceStaffEntryContainers.length - 1; i >= 0; i--) {
            if (this.verticalSourceStaffEntryContainers[i][instrumentIndex] !== undefined) {
                return this.verticalSourceStaffEntryContainers[i][instrumentIndex];
            }
        }
        //return undefined;
    }
}
