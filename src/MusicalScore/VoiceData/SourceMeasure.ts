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
  private staffLinkedExpressions: List<List<MultiExpression>> = new List<List<MultiExpression>>();
  private tempoExpressions: List<MultiTempoExpression> = new List<MultiTempoExpression>();
  private verticalSourceStaffEntryContainers: List<VerticalSourceStaffEntryContainer> = new List<VerticalSourceStaffEntryContainer>();
  private implicitMeasure: boolean;
  private breakSystemAfter: boolean;
  private staffMeasureErrors: List<boolean> = new List<boolean>();
  private firstInstructionsStaffEntries: List<SourceStaffEntry> = new List<SourceStaffEntry>();
  private lastInstructionsStaffEntries: List<SourceStaffEntry> = new List<SourceStaffEntry>();
  private firstRepetitionInstructions: List<RepetitionInstruction> = new List<RepetitionInstruction>();
  private lastRepetitionInstructions: List<RepetitionInstruction> = new List<RepetitionInstruction>();
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
  public get StaffLinkedExpressions(): List<List<MultiExpression>> {
    return this.staffLinkedExpressions;
  }
  public get TempoExpressions(): List<MultiTempoExpression> {
    return this.tempoExpressions;
  }
  public get VerticalSourceStaffEntryContainers(): List<VerticalSourceStaffEntryContainer> {
    return this.verticalSourceStaffEntryContainers;
  }
  public get FirstInstructionsStaffEntries(): List<SourceStaffEntry> {
    return this.firstInstructionsStaffEntries;
  }
  public get LastInstructionsStaffEntries(): List<SourceStaffEntry> {
    return this.lastInstructionsStaffEntries;
  }
  public get FirstRepetitionInstructions(): List<RepetitionInstruction> {
    return this.firstRepetitionInstructions;
  }
  public get LastRepetitionInstructions(): List<RepetitionInstruction> {
    return this.lastRepetitionInstructions;
  }
  public getErrorInMeasure(staffIndex: number): boolean {
    return this.staffMeasureErrors[staffIndex];
  }
  public setErrorInStaffMeasure(staffIndex: number, hasError: boolean): void {
    this.staffMeasureErrors[staffIndex] = hasError;
  }
  public getNextMeasure(measures: List<SourceMeasure>): SourceMeasure {
    if (this.MeasureListIndex + 1 < measures.Count) {
      return measures[this.MeasureListIndex + 1];
    }
    return undefined;
  }
  public getPreviousMeasure(measures: List<SourceMeasure>): SourceMeasure {
    if (this.MeasureListIndex > 1) {
      return measures[this.MeasureListIndex - 1];
    }
    return undefined;
  }
  public findOrCreateStaffEntry(inMeasureTimestamp: Fraction, inSourceMeasureStaffIndex: number, staff: Staff, createdNewContainer: boolean): SourceStaffEntry {
    let staffEntry: SourceStaffEntry = undefined;
    createdNewContainer = false;
    let existingVerticalSourceStaffEntryContainer: VerticalSourceStaffEntryContainer = this.verticalSourceStaffEntryContainers.Find(
      o => o.Timestamp === inMeasureTimestamp
    );
    if (existingVerticalSourceStaffEntryContainer !== undefined) {
      if (existingVerticalSourceStaffEntryContainer[inSourceMeasureStaffIndex] !== undefined) {
        return existingVerticalSourceStaffEntryContainer[inSourceMeasureStaffIndex];
      } else {
        staffEntry = new SourceStaffEntry(existingVerticalSourceStaffEntryContainer, staff);
        existingVerticalSourceStaffEntryContainer[inSourceMeasureStaffIndex] = staffEntry;
        return staffEntry;
      }
    }
    createdNewContainer = true;
    if (this.verticalSourceStaffEntryContainers.Count === 0 || this.verticalSourceStaffEntryContainers.Last().Timestamp < inMeasureTimestamp) {
      let container: VerticalSourceStaffEntryContainer = new VerticalSourceStaffEntryContainer(
        this, new Fraction(inMeasureTimestamp), this.completeNumberOfStaves
      );
      this.verticalSourceStaffEntryContainers.Add(container);
      staffEntry = new SourceStaffEntry(container, staff);
      container[inSourceMeasureStaffIndex] = staffEntry;
    } else {
      for (
        let i: number = this.verticalSourceStaffEntryContainers.Count - 1;
        i >= 0; i--
      ) {
        if (this.verticalSourceStaffEntryContainers[i].Timestamp < inMeasureTimestamp) {
          let container: VerticalSourceStaffEntryContainer = new VerticalSourceStaffEntryContainer(
            this, new Fraction(inMeasureTimestamp), this.completeNumberOfStaves
          );
          this.verticalSourceStaffEntryContainers.Insert(i + 1, container);
          staffEntry = new SourceStaffEntry(container, staff);
          container[inSourceMeasureStaffIndex] = staffEntry;
          return staffEntry;
        }
        if (i === 0) {
          let container: VerticalSourceStaffEntryContainer = new VerticalSourceStaffEntryContainer(
            this, new Fraction(inMeasureTimestamp), this.completeNumberOfStaves
          );
          this.verticalSourceStaffEntryContainers.Insert(i, container);
          staffEntry = new SourceStaffEntry(container, staff);
          container[inSourceMeasureStaffIndex] = staffEntry;
          return staffEntry;
        }
      }
    }
    return staffEntry;
  }
  public findOrCreateVoiceEntry(sse: SourceStaffEntry, voice: Voice, createdNewVoiceEntry: boolean): VoiceEntry {
    let ve: VoiceEntry = undefined;
    for (let idx: number = 0, len: number = sse.VoiceEntries.Count; idx < len; ++idx) {
      let voiceEntry: VoiceEntry = sse.VoiceEntries[idx];
      if (voiceEntry.ParentVoice === voice) {
        ve = voiceEntry;
        break;
      }
    }
    if (ve === undefined) {
      ve = new VoiceEntry(sse.Timestamp, voice, sse);
      sse.VoiceEntries.Add(ve);
      createdNewVoiceEntry = true;
    } else {
      createdNewVoiceEntry = false;
    }
    return ve;
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
    for (let idx: number = 0, len: number = this.VerticalSourceStaffEntryContainers.Count; idx < len; ++idx) {
      let verticalSourceStaffEntryContainer: VerticalSourceStaffEntryContainer = this.VerticalSourceStaffEntryContainers[idx];
      if (verticalSourceStaffEntryContainer.Timestamp === musicTimestamp) {
        return this.verticalSourceStaffEntryContainers.IndexOf(verticalSourceStaffEntryContainer);
      }
    }
    return index;
  }
  public getVerticalContainerByTimestamp(musicTimestamp: Fraction): VerticalSourceStaffEntryContainer {
    for (let idx: number = 0, len: number = this.VerticalSourceStaffEntryContainers.Count; idx < len; ++idx) {
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
      this.verticalSourceStaffEntryContainers.Remove(this.verticalSourceStaffEntryContainers[index]);
    }
  }
  public reverseCheck(musicSheet: MusicSheet, maxInstDuration: Fraction): Fraction {
    let maxDuration: Fraction = new Fraction(0, 1);
    let instrumentsDurations: List<Fraction> = new List<Fraction>();
    for (let i: number = 0; i < musicSheet.Instruments.Count; i++) {
      let instrumentDuration: Fraction = new Fraction(0, 1);
      let inSourceMeasureInstrumentIndex: number = musicSheet.getGlobalStaffIndexOfFirstStaff(musicSheet.Instruments[i]);
      for (let j: number = 0; j < musicSheet.Instruments[i].Staves.Count; j++) {
        let lastStaffEntry: SourceStaffEntry = this.getLastSourceStaffEntryForInstrument(inSourceMeasureInstrumentIndex + j);
        if (lastStaffEntry !== undefined && !lastStaffEntry.hasTie()) {
          let verticalContainerIndex: number = this.verticalSourceStaffEntryContainers.IndexOf(lastStaffEntry.VerticalContainerParent);
          for (let m: number = verticalContainerIndex - 1; m >= 0; m--) {
            let previousStaffEntry: SourceStaffEntry = this.verticalSourceStaffEntryContainers[m][inSourceMeasureInstrumentIndex + j];
            if (previousStaffEntry !== undefined && previousStaffEntry.hasTie()) {
              if (instrumentDuration < previousStaffEntry.Timestamp + previousStaffEntry.calculateMaxNoteLength()) {
                instrumentDuration = previousStaffEntry.Timestamp + previousStaffEntry.calculateMaxNoteLength();
                break;
              }
            }
          }
        }
      }
      instrumentsDurations.Add(instrumentDuration);
    }
    for (let idx: number = 0, len: number = instrumentsDurations.Count; idx < len; ++idx) {
      let instrumentsDuration: Fraction = instrumentsDurations[idx];
      if (maxDuration < instrumentsDuration) {
        maxDuration = instrumentsDuration;
      }
    }
    return Math.max(maxDuration, maxInstDuration);
  }
  public calculateInstrumentsDuration(musicSheet: MusicSheet, instrumentMaxTieNoteFractions: List<Fraction>): List<Fraction> {
    let instrumentsDurations: List<Fraction> = new List<Fraction>();
    for (let i: number = 0; i < musicSheet.Instruments.Count; i++) {
      let instrumentDuration: Fraction = new Fraction(0, 1);
      let inSourceMeasureInstrumentIndex: number = musicSheet.getGlobalStaffIndexOfFirstStaff(musicSheet.Instruments[i]);
      for (let j: number = 0; j < musicSheet.Instruments[i].Staves.Count; j++) {
        let lastStaffEntry: SourceStaffEntry = this.getLastSourceStaffEntryForInstrument(inSourceMeasureInstrumentIndex + j);
        if (lastStaffEntry !== undefined && lastStaffEntry.Timestamp !== undefined) {
          if (instrumentDuration < lastStaffEntry.Timestamp + lastStaffEntry.calculateMaxNoteLength()) {
            instrumentDuration = new Fraction(lastStaffEntry.Timestamp + lastStaffEntry.calculateMaxNoteLength());
          }
        }
      }
      if (instrumentDuration < instrumentMaxTieNoteFractions[i]) {
        instrumentDuration = instrumentMaxTieNoteFractions[i];
      }
      instrumentsDurations.Add(instrumentDuration);
    }
    return instrumentsDurations;
  }
  public getEntriesPerStaff(staffIndex: number): List<SourceStaffEntry> {
    let sourceStaffEntries: List<SourceStaffEntry> = new List<SourceStaffEntry>();
    for (let idx: number = 0, len: number = this.VerticalSourceStaffEntryContainers.Count; idx < len; ++idx) {
      let container: VerticalSourceStaffEntryContainer = this.VerticalSourceStaffEntryContainers[idx];
      let sse: SourceStaffEntry = container[staffIndex];
      if (sse !== undefined) { sourceStaffEntries.Add(sse); }
    }
    return sourceStaffEntries;
  }
  private initialize(): void {
    for (let i: number = 0; i < this.completeNumberOfStaves; i++) {
      this.firstInstructionsStaffEntries.Add(undefined);
      this.lastInstructionsStaffEntries.Add(undefined);
      this.staffMeasureErrors.Add(false);
      this.staffLinkedExpressions.Add(new List<MultiExpression>());
    }
    this.implicitMeasure = false;
    this.breakSystemAfter = false;
    this.EndsPiece = false;
  }
  private getLastSourceStaffEntryForInstrument(instrumentIndex: number): SourceStaffEntry {
    for (let i: number = this.verticalSourceStaffEntryContainers.Count - 1; i >= 0; i--) {
      if (this.verticalSourceStaffEntryContainers[i][instrumentIndex] !== undefined) {
        return this.verticalSourceStaffEntryContainers[i][instrumentIndex];
      }
    }
    //return undefined;
  }
}
