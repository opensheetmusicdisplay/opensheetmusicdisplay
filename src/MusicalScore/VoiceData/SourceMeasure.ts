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
import {RehearsalExpression} from "./Expressions/RehearsalExpression";
import {AbstractNotationInstruction} from "./Instructions/AbstractNotationInstruction";
import {ClefInstruction} from "./Instructions/ClefInstruction";
import {KeyInstruction} from "./Instructions/KeyInstruction";
import {Repetition} from "../MusicSource/Repetition";
import {SystemLinesEnum} from "../Graphical/SystemLinesEnum";
import {EngravingRules} from "../Graphical/EngravingRules";
import {GraphicalMeasure} from "../Graphical/GraphicalMeasure";
//import {BaseIdClass} from "../../Util/BaseIdClass"; // SourceMeasure originally extended BaseIdClass, but ids weren't used.

/**
 * The Source Measure represents the source data of a unique measure, including all instruments with their staves.
 * There exists one source measure per XML measure or per paper sheet measure (e.g. the source measures are not doubled in repetitions)
 */
export class SourceMeasure {
    /**
     * The data entries and data lists will be filled with null values according to the total number of staves,
     * so that existing objects can be referred to by staff index.
     * @param completeNumberOfStaves
     * @param rules
     */
    constructor(completeNumberOfStaves: number, rules: EngravingRules) {
        this.completeNumberOfStaves = completeNumberOfStaves;
        this.implicitMeasure = false;
        this.hasEndLine = false;
        this.endingBarStyleXml = "";
        this.endingBarStyleEnum = SystemLinesEnum.SingleThin;
        this.firstInstructionsStaffEntries = new Array(completeNumberOfStaves);
        this.lastInstructionsStaffEntries = new Array(completeNumberOfStaves);
        this.rules = rules;
        this.TempoInBPM = 0;
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
     * The style of the ending bar line.
     */
    public endingBarStyleXml: string;
    public endingBarStyleEnum: SystemLinesEnum;
    /** Whether the MusicXML says to print a new system (line break). See OSMDOptions.newSystemFromXML */
    public printNewSystemXml: boolean = false;
    /** Whether the MusicXML says to print a new page (page break). See OSMDOptions.newPageFromXML */
    public printNewPageXml: boolean = false;
    public IsSystemStartMeasure: boolean = false;

    private measureNumber: number;
    public MeasureNumberXML: number;
    public MeasureNumberPrinted: number; // measureNumber if MeasureNumberXML undefined or NaN. Set in getPrintedMeasureNumber()
    public RhythmPrinted: boolean = false; // whether this measure prints a rhythm on the score
    public multipleRestMeasures: number; // usually undefined (0), unless "multiple-rest" given in XML (e.g. 4 measure rest)
    // public multipleRestMeasuresPerStaff: Dictionary<number, number>; // key: staffId. value: how many rest measures
    private absoluteTimestamp: Fraction;
    private completeNumberOfStaves: number;
    private duration: Fraction;
    private activeTimeSignature: Fraction;
    public hasLyrics: boolean = false;
    public hasMoodExpressions: boolean = false;
    /** Whether the SourceMeasure only has rests, no other entries.
     *  Not the same as GraphicalMeasure.hasOnlyRests, because one SourceMeasure can have many GraphicalMeasures (staffs).
     */
    public allRests: boolean = false;
    public isReducedToMultiRest: boolean = false;
    /** If this measure is a MultipleRestMeasure, this is the number of the measure in that sequence of measures. */
    public multipleRestMeasureNumber: number = 0;
    private staffLinkedExpressions: MultiExpression[][] = [];
    private tempoExpressions: MultiTempoExpression[] = [];
    public rehearsalExpression: RehearsalExpression;
    private verticalSourceStaffEntryContainers: VerticalSourceStaffEntryContainer[] = [];
    private implicitMeasure: boolean;
    private hasEndLine: boolean;
    public hasEndClef: boolean;
    private graphicalMeasureErrors: boolean[] = [];
    private firstInstructionsStaffEntries: SourceStaffEntry[];
    private lastInstructionsStaffEntries: SourceStaffEntry[];
    private firstRepetitionInstructions: RepetitionInstruction[] = [];
    private lastRepetitionInstructions: RepetitionInstruction[] = [];
    private rules: EngravingRules;
    private tempoInBPM: number;
    private verticalMeasureList: GraphicalMeasure[]; // useful, see GraphicalMusicSheet.GetGraphicalFromSourceStaffEntry

    public get MeasureNumber(): number {
        return this.measureNumber;
    }

    public set MeasureNumber(value: number) {
        this.measureNumber = value;
    }

    public getPrintedMeasureNumber(): number {
        if (this.rules.UseXMLMeasureNumbers) {
            if (Number.isInteger(this.MeasureNumberXML)) { // false for NaN, undefined, null, "5" (string)
                this.MeasureNumberPrinted = this.MeasureNumberXML;
                return this.MeasureNumberPrinted;
            }
        }
        this.MeasureNumberPrinted = this.MeasureNumber;
        return this.MeasureNumberPrinted;
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
        return this.duration; // can be 1/1 in a 4/4 measure
    }

    public set Duration(value: Fraction) {
        this.duration = value;
    }

    public get ActiveTimeSignature(): Fraction {
        return this.activeTimeSignature;
    }

    public set ActiveTimeSignature(value: Fraction) {
        this.activeTimeSignature = value;
    }

    public get ImplicitMeasure(): boolean {
        return this.implicitMeasure;
    }

    public set ImplicitMeasure(value: boolean) {
        this.implicitMeasure = value;
    }

    public get HasEndLine(): boolean {
        return this.hasEndLine;
    }

    public set HasEndLine(value: boolean) {
        this.hasEndLine = value;
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

    public get Rules(): EngravingRules {
        return this.rules;
    }

    public get VerticalMeasureList(): GraphicalMeasure[] {
        return this.verticalMeasureList;
    }

    public set VerticalMeasureList(value: GraphicalMeasure[]) {
        this.verticalMeasureList = value;
    }

    public get TempoInBPM(): number {
        return this.tempoInBPM;
    }

    public set TempoInBPM(value: number) {
        this.tempoInBPM = value;
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
        if (existingVerticalSourceStaffEntryContainer) {
            if (existingVerticalSourceStaffEntryContainer.StaffEntries[inSourceMeasureStaffIndex]) {
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
        if (!ve) {
            ve = new VoiceEntry(sse.Timestamp, voice, sse);
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
            if (this.verticalSourceStaffEntryContainers[i][verticalIndex]) {
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
            if (!this.verticalSourceStaffEntryContainers[index][i]) {
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
                if (lastStaffEntry !== undefined && lastStaffEntry.Timestamp) {
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
            if (sse) {
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
            if (!rep) {
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
            if (!rep) {
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
        if (this.FirstInstructionsStaffEntries[staffIndex]) {
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

    public canBeReducedToMultiRest(): boolean {
        let allRestsOrInvisible: boolean = true;
        let visibleLyrics: boolean = false;
        for (const container of this.verticalSourceStaffEntryContainers) {
            if (!container) {
                continue;
            }
            for (const staffEntry of container.StaffEntries) {
                if (!staffEntry || !staffEntry.ParentStaff.ParentInstrument.Visible) {
                    continue; // ignore notes in invisible instruments (instruments not shown)
                }
                if (staffEntry.ParentStaff.hasLyrics) {
                    visibleLyrics = true;
                }
                for (const voiceEntry of staffEntry.VoiceEntries) {
                    for (const note of voiceEntry.Notes) {
                        if (!note.isRest()) {
                            allRestsOrInvisible = false;
                            break;
                        }
                    }
                    if (!allRestsOrInvisible) {
                        break;
                    }
                }
            }
        }
        if (!allRestsOrInvisible || visibleLyrics || this.hasMoodExpressions || this.tempoExpressions.length > 0) {
            return false;
        }
        // check for StaffLinkedExpressions (e.g. MultiExpression, StaffText) (per staff)
        for (const multiExpressions of this.staffLinkedExpressions) {
            if (multiExpressions.length > 0) {
                return false;
            }
        }
        // check for clef instruction for next measure
        for (const lastStaffEntry of this.lastInstructionsStaffEntries) {
            for (let idx: number = 0, len: number = lastStaffEntry?.Instructions.length; idx < len; ++idx) {
                const abstractNotationInstruction: AbstractNotationInstruction = lastStaffEntry.Instructions[idx];
                if (abstractNotationInstruction instanceof ClefInstruction) {
                    return false;
                }
            }
        }
        // don't auto-rest pickup measures that aren't whole measure rests
        return this.Duration?.RealValue === this.ActiveTimeSignature?.RealValue;
        // if adding further checks, replace the above line with this:
        // if (this.Duration?.RealValue !== this.ActiveTimeSignature?.RealValue) {
        //     return false;
        // }
        // // TODO further checks?
        // return true;
    }
}
