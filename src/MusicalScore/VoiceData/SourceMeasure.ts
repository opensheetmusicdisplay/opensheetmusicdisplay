import {Fraction} from "../../Common/DataObjects/fraction";
import {VerticalSourceStaffEntryContainer} from "./VerticalSourceStaffEntryContainer";
import {SourceStaffEntry} from "./SourceStaffEntry";
import {RepetitionInstruction} from "./Instructions/RepetitionInstruction";
import {Staff} from "./Staff";
import {VoiceEntry} from "./VoiceEntry";
import {Voice} from "./Voice";
import {MusicSheet} from "../MusicSheet";

type MultiExpression = any;
type MultiTempoExpression = any;

export class SourceMeasure {
  constructor(completeNumberOfStaves: number) {
    this.completeNumberOfStaves = completeNumberOfStaves;
    this.initialize();
  }
  public MeasureListIndex: number;
  public EndsPiece: boolean;

  private measureNumber: number;
  //private parentMusicPart: SourceMusicPart;
  private absoluteTimestamp: Fraction;
  private completeNumberOfStaves: number;
  private duration: Fraction;
  private staffLinkedExpressions: MultiExpression[] = [];
  private tempoExpressions: MultiTempoExpression[] = [];
  private verticalSourceStaffEntryContainers: VerticalSourceStaffEntryContainer[] = [];
  private implicitMeasure: boolean;
  private breakSystemAfter: boolean;
  private staffMeasureErrors: boolean[] = [];
  private firstInstructionsStaffEntries: SourceStaffEntry[] = [];
  private lastInstructionsStaffEntries: SourceStaffEntry[] = [];
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
  public get StaffLinkedExpressions(): MultiExpression[] {
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
    if (this.MeasureListIndex + 1 < measures.length) {
      return measures[this.MeasureListIndex + 1];
    }
    return undefined;
  }
  public getPreviousMeasure(measures: SourceMeasure[]): SourceMeasure {
    if (this.MeasureListIndex > 1) {
      return measures[this.MeasureListIndex - 1];
    }
    return undefined;
  }
  public findOrCreateStaffEntry(
      inMeasureTimestamp: Fraction, inSourceMeasureStaffIndex: number, staff: Staff
  ): {createdNewContainer: boolean, staffEntry: SourceStaffEntry} {
    // FIXME Andrea: debug & Test
    let createdNewContainer: boolean = false;
    let staffEntry: SourceStaffEntry = undefined;
    // Find:
    let existingVerticalSourceStaffEntryContainer: VerticalSourceStaffEntryContainer = undefined;
    for (let k: number = 0; k < this.verticalSourceStaffEntryContainers.length; k++) {
      if (this.verticalSourceStaffEntryContainers[k].Timestamp === inMeasureTimestamp) {
        existingVerticalSourceStaffEntryContainer = this.verticalSourceStaffEntryContainers[k];
        break;
      }
    }
    if (existingVerticalSourceStaffEntryContainer !== undefined) {
      if (existingVerticalSourceStaffEntryContainer[inSourceMeasureStaffIndex] !== undefined) {
        staffEntry = existingVerticalSourceStaffEntryContainer[inSourceMeasureStaffIndex];
      } else {
        staffEntry = new SourceStaffEntry(existingVerticalSourceStaffEntryContainer, staff);
        existingVerticalSourceStaffEntryContainer[inSourceMeasureStaffIndex] = staffEntry;
      }
      return {createdNewContainer: createdNewContainer, staffEntry: staffEntry};
    }
    createdNewContainer = true;
    let last: VerticalSourceStaffEntryContainer = this.verticalSourceStaffEntryContainers[this.verticalSourceStaffEntryContainers.length - 1];
    if (this.verticalSourceStaffEntryContainers.length === 0 || last.Timestamp < inMeasureTimestamp) {
      let container: VerticalSourceStaffEntryContainer = new VerticalSourceStaffEntryContainer(
        this, Fraction.CreateFractionFromFraction(inMeasureTimestamp), this.completeNumberOfStaves
      );
      this.verticalSourceStaffEntryContainers.push(container);
      staffEntry = new SourceStaffEntry(container, staff);
      container[inSourceMeasureStaffIndex] = staffEntry;
    } else {
      for (
        let i: number = this.verticalSourceStaffEntryContainers.length - 1;
        i >= 0; i--
      ) {
        if (this.verticalSourceStaffEntryContainers[i].Timestamp < inMeasureTimestamp) {
          let container: VerticalSourceStaffEntryContainer = new VerticalSourceStaffEntryContainer(
            this, Fraction.CreateFractionFromFraction(inMeasureTimestamp), this.completeNumberOfStaves
          );
          this.verticalSourceStaffEntryContainers.splice(i + 1, 0, container);
          staffEntry = new SourceStaffEntry(container, staff);
          container[inSourceMeasureStaffIndex] = staffEntry;
          break;
        }
        if (i === 0) {
          let container: VerticalSourceStaffEntryContainer = new VerticalSourceStaffEntryContainer(
            this, Fraction.CreateFractionFromFraction(inMeasureTimestamp), this.completeNumberOfStaves
          );
          this.verticalSourceStaffEntryContainers.splice(i, 0, container);
          staffEntry = new SourceStaffEntry(container, staff);
          container[inSourceMeasureStaffIndex] = staffEntry;
          break;
        }
      }
    }
    return {createdNewContainer: createdNewContainer, staffEntry: staffEntry};
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
    return { createdVoiceEntry: createdNewVoiceEntry, voiceEntry: ve };
  }
  public getPreviousSourceStaffEntryFromIndex(
    verticalIndex: number, horizontalIndex: number
  ): SourceStaffEntry {
    for (let i: number = horizontalIndex - 1; i >= 0; i--) {
      if (this.verticalSourceStaffEntryContainers[i][verticalIndex] !== undefined) {
        return this.verticalSourceStaffEntryContainers[i][verticalIndex];
      }
    }
    return undefined;
  }
  public getVerticalContainerIndexByTimestamp(musicTimestamp: Fraction): number {
    let index: number = -1;
    for (let idx: number = 0, len: number = this.VerticalSourceStaffEntryContainers.length; idx < len; ++idx) {
      let verticalSourceStaffEntryContainer: VerticalSourceStaffEntryContainer = this.VerticalSourceStaffEntryContainers[idx];
      if (verticalSourceStaffEntryContainer.Timestamp === musicTimestamp) {
        return this.verticalSourceStaffEntryContainers.indexOf(verticalSourceStaffEntryContainer);
      }
    }
    return index;
  }
  public getVerticalContainerByTimestamp(musicTimestamp: Fraction): VerticalSourceStaffEntryContainer {
    for (let idx: number = 0, len: number = this.VerticalSourceStaffEntryContainers.length; idx < len; ++idx) {
      let verticalSourceStaffEntryContainer: VerticalSourceStaffEntryContainer = this.VerticalSourceStaffEntryContainers[idx];
      if (verticalSourceStaffEntryContainer.Timestamp === musicTimestamp) {
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
      if (maxDuration < instrumentsDuration) {
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
      if (instrumentDuration < instrumentMaxTieNoteFractions[i]) {
        instrumentDuration = instrumentMaxTieNoteFractions[i];
      }
      instrumentsDurations.push(instrumentDuration);
    }
    return instrumentsDurations;
  }
  public getEntriesPerStaff(staffIndex: number): SourceStaffEntry[] {
    let sourceStaffEntries: SourceStaffEntry[] = [];
    for (let idx: number = 0, len: number = this.VerticalSourceStaffEntryContainers.length; idx < len; ++idx) {
      let container: VerticalSourceStaffEntryContainer = this.VerticalSourceStaffEntryContainers[idx];
      let sse: SourceStaffEntry = container[staffIndex];
      if (sse !== undefined) { sourceStaffEntries.push(sse); }
    }
    return sourceStaffEntries;
  }
  private initialize(): void {
    for (let i: number = 0; i < this.completeNumberOfStaves; i++) {
      this.firstInstructionsStaffEntries.push(undefined);
      this.lastInstructionsStaffEntries.push(undefined);
      this.staffMeasureErrors.push(false);
      this.staffLinkedExpressions.push([]);
    }
    this.implicitMeasure = false;
    this.breakSystemAfter = false;
    this.EndsPiece = false;
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
