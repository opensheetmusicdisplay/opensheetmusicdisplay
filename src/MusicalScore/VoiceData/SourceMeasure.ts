export class SourceMeasure {
    constructor(completeNumberOfStaves: number) {
        this.completeNumberOfStaves = completeNumberOfStaves;
        this.initialize();
    }
    public MeasureListIndex: number;
    public EndsPiece: boolean;
    private measureNumber: number;
    private parentMusicPart: SourceMusicPart;
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
        if (this.MeasureListIndex + 1 < measures.Count)
            return measures[this.MeasureListIndex + 1];
        return null;
    }
    public getPreviousMeasure(measures: List<SourceMeasure>): SourceMeasure {
        if (this.MeasureListIndex - 1 > 0)
            return measures[this.MeasureListIndex - 1];
        return null;
    }
    public findOrCreateStaffEntry(inMeasureTimestamp: Fraction, inSourceMeasureStaffIndex: number, staff: Staff, createdNewContainer: boolean): SourceStaffEntry {
        var staffEntry: SourceStaffEntry = null;
        createdNewContainer = false;
        var existingVerticalSourceStaffEntryContainer: VerticalSourceStaffEntryContainer = this.verticalSourceStaffEntryContainers.Find(o => o.Timestamp == inMeasureTimestamp);
        if (existingVerticalSourceStaffEntryContainer != null) {
            if (existingVerticalSourceStaffEntryContainer[inSourceMeasureStaffIndex] != null)
                return existingVerticalSourceStaffEntryContainer[inSourceMeasureStaffIndex];
            else {
                staffEntry = new SourceStaffEntry(existingVerticalSourceStaffEntryContainer, staff);
                existingVerticalSourceStaffEntryContainer[inSourceMeasureStaffIndex] = staffEntry;
                return staffEntry;
            }
        }
        createdNewContainer = true;
        if (this.verticalSourceStaffEntryContainers.Count == 0 || this.verticalSourceStaffEntryContainers.Last().Timestamp < inMeasureTimestamp) {
            var container: VerticalSourceStaffEntryContainer = new VerticalSourceStaffEntryContainer(this, new Fraction(inMeasureTimestamp), this.completeNumberOfStaves);
            this.verticalSourceStaffEntryContainers.Add(container);
            staffEntry = new SourceStaffEntry(container, staff);
            container[inSourceMeasureStaffIndex] = staffEntry;
        }
        else {
            for (var i: number = this.verticalSourceStaffEntryContainers.Count - 1; i >= 0; i--) {
                if (this.verticalSourceStaffEntryContainers[i].Timestamp < inMeasureTimestamp) {
                    var container: VerticalSourceStaffEntryContainer = new VerticalSourceStaffEntryContainer(this, new Fraction(inMeasureTimestamp), this.completeNumberOfStaves);
                    this.verticalSourceStaffEntryContainers.Insert(i + 1, container);
                    staffEntry = new SourceStaffEntry(container, staff);
                    container[inSourceMeasureStaffIndex] = staffEntry;
                    return staffEntry;
                }
                if (i == 0) {
                    var container: VerticalSourceStaffEntryContainer = new VerticalSourceStaffEntryContainer(this, new Fraction(inMeasureTimestamp), this.completeNumberOfStaves);
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
        var ve: VoiceEntry = null;
        for (var idx: number = 0, len = sse.VoiceEntries.Count; idx < len; ++idx) {
            var voiceEntry: VoiceEntry = sse.VoiceEntries[idx];
            if (voiceEntry.ParentVoice == voice) {
                ve = voiceEntry;
                break;
            }
        }
        if (ve == null) {
            ve = new VoiceEntry(sse.Timestamp, voice, sse);
            sse.VoiceEntries.Add(ve);
            createdNewVoiceEntry = true;
        }
        else {
            createdNewVoiceEntry = false;
        }
        return ve;
    }
    public getPreviousSourceStaffEntryFromIndex(verticalIndex: number, horizontalIndex: number): SourceStaffEntry {
        for (var i: number = horizontalIndex - 1; i >= 0; i--)
            if (this.verticalSourceStaffEntryContainers[i][verticalIndex] != null)
                return this.verticalSourceStaffEntryContainers[i][verticalIndex];
        return null;
    }
    public getVerticalContainerIndexByTimestamp(musicTimestamp: Fraction): number {
        var index: number = -1;
        for (var idx: number = 0, len = this.VerticalSourceStaffEntryContainers.Count; idx < len; ++idx) {
            var verticalSourceStaffEntryContainer: VerticalSourceStaffEntryContainer = this.VerticalSourceStaffEntryContainers[idx];
            if (verticalSourceStaffEntryContainer.Timestamp == musicTimestamp)
                return this.verticalSourceStaffEntryContainers.IndexOf(verticalSourceStaffEntryContainer);
        }
        return index;
    }
    public getVerticalContainerByTimestamp(musicTimestamp: Fraction): VerticalSourceStaffEntryContainer {
        for (var idx: number = 0, len = this.VerticalSourceStaffEntryContainers.Count; idx < len; ++idx) {
            var verticalSourceStaffEntryContainer: VerticalSourceStaffEntryContainer = this.VerticalSourceStaffEntryContainers[idx];
            if (verticalSourceStaffEntryContainer.Timestamp == musicTimestamp)
                return verticalSourceStaffEntryContainer;
        }
        return null;
    }
    public checkForEmptyVerticalContainer(index: number): void {
        var nullCounter: number = 0;
        for (var i: number = 0; i < this.completeNumberOfStaves; i++)
            if (this.verticalSourceStaffEntryContainers[index][i] == null)
                nullCounter++;
        if (nullCounter == this.completeNumberOfStaves)
            this.verticalSourceStaffEntryContainers.Remove(this.verticalSourceStaffEntryContainers[index]);
    }
    public reverseCheck(musicSheet: MusicSheet, maxInstDuration: Fraction): Fraction {
        var maxDuration: Fraction = new Fraction(0, 1);
        var instrumentsDurations: List<Fraction> = new List<Fraction>();
        for (var i: number = 0; i < musicSheet.Instruments.Count; i++) {
            var instrumentDuration: Fraction = new Fraction(0, 1);
            var inSourceMeasureInstrumentIndex: number = musicSheet.getGlobalStaffIndexOfFirstStaff(musicSheet.Instruments[i]);
            for (var j: number = 0; j < musicSheet.Instruments[i].Staves.Count; j++) {
                var lastStaffEntry: SourceStaffEntry = this.getLastSourceStaffEntryForInstrument(inSourceMeasureInstrumentIndex + j);
                if (lastStaffEntry != null && !lastStaffEntry.hasTie()) {
                    var verticalContainerIndex: number = this.verticalSourceStaffEntryContainers.IndexOf(lastStaffEntry.VerticalContainerParent);
                    for (var m: number = verticalContainerIndex - 1; m >= 0; m--) {
                        var previousStaffEntry: SourceStaffEntry = this.verticalSourceStaffEntryContainers[m][inSourceMeasureInstrumentIndex + j];
                        if (previousStaffEntry != null && previousStaffEntry.hasTie()) {
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
        for (var idx: number = 0, len = instrumentsDurations.Count; idx < len; ++idx) {
            var instrumentsDuration: Fraction = instrumentsDurations[idx];
            if (maxDuration < instrumentsDuration)
                maxDuration = instrumentsDuration;
        }
        if (maxDuration > maxInstDuration)
            return maxDuration;
        return maxInstDuration;
    }
    public calculateInstrumentsDuration(musicSheet: MusicSheet, instrumentMaxTieNoteFractions: List<Fraction>): List<Fraction> {
        var instrumentsDurations: List<Fraction> = new List<Fraction>();
        for (var i: number = 0; i < musicSheet.Instruments.Count; i++) {
            var instrumentDuration: Fraction = new Fraction(0, 1);
            var inSourceMeasureInstrumentIndex: number = musicSheet.getGlobalStaffIndexOfFirstStaff(musicSheet.Instruments[i]);
            for (var j: number = 0; j < musicSheet.Instruments[i].Staves.Count; j++) {
                var lastStaffEntry: SourceStaffEntry = this.getLastSourceStaffEntryForInstrument(inSourceMeasureInstrumentIndex + j);
                if (lastStaffEntry != null && lastStaffEntry.Timestamp != null) {
                    if (instrumentDuration < lastStaffEntry.Timestamp + lastStaffEntry.calculateMaxNoteLength())
                        instrumentDuration = new Fraction(lastStaffEntry.Timestamp + lastStaffEntry.calculateMaxNoteLength());
                }
            }
            if (instrumentDuration < instrumentMaxTieNoteFractions[i])
                instrumentDuration = instrumentMaxTieNoteFractions[i];
            instrumentsDurations.Add(instrumentDuration);
        }
        return instrumentsDurations;
    }
    public getEntriesPerStaff(staffIndex: number): List<SourceStaffEntry> {
        var sourceStaffEntries: List<SourceStaffEntry> = new List<SourceStaffEntry>();
        for (var idx: number = 0, len = this.VerticalSourceStaffEntryContainers.Count; idx < len; ++idx) {
            var container: VerticalSourceStaffEntryContainer = this.VerticalSourceStaffEntryContainers[idx];
            var sse: SourceStaffEntry = container[staffIndex];
            if (sse != null)
                sourceStaffEntries.Add(sse);
        }
        return sourceStaffEntries;
    }
    private initialize(): void {
        for (var i: number = 0; i < this.completeNumberOfStaves; i++) {
            this.firstInstructionsStaffEntries.Add(null);
            this.lastInstructionsStaffEntries.Add(null);
            this.staffMeasureErrors.Add(false);
            this.staffLinkedExpressions.Add(new List<MultiExpression>());
        }
        this.implicitMeasure = false;
        this.breakSystemAfter = false;
        this.EndsPiece = false;
    }
    private getLastSourceStaffEntryForInstrument(instrumentIndex: number): SourceStaffEntry {
        for (var i: number = this.verticalSourceStaffEntryContainers.Count - 1; i >= 0; i--)
            if (this.verticalSourceStaffEntryContainers[i][instrumentIndex] != null)
                return this.verticalSourceStaffEntryContainers[i][instrumentIndex];
        return null;
    }
}