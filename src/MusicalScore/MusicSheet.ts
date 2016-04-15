export class MusicSheet implements ISettableMusicSheet, IComparable<MusicSheet>
{
    constructor() {
        try {
            this.Rules = EngravingRules.Rules;
        }
        catch (ex) {

        }

        this.playbackSettings = this.SheetPlaybackSetting = new PlaybackSettings(new Fraction(4, 4, false), 100);
        this.UserStartTempoInBPM = 100;
        this.PageWidth = 120;
        this.MusicPartManager = new MusicPartManager(this);
    }
    private idString: string = "kjgdfuilhsdaöoihfsvjh";
    private sourceMeasures: List<SourceMeasure> = new List<SourceMeasure>();
    private repetitions: List<Repetition> = new List<Repetition>();
    private dynListStaves: List<List<DynamicsContainer>> = new List<List<DynamicsContainer>>();
    private timestampSortedDynamicExpressionsList: List<DynamicsContainer> = new List<DynamicsContainer>();
    private timestampSortedTempoExpressionsList: List<MultiTempoExpression> = new List<MultiTempoExpression>();
    private instrumentalGroups: List<InstrumentalGroup> = new List<InstrumentalGroup>();
    private instruments: List<Instrument> = new List<Instrument>();
    private playbackSettings: PlaybackSettings;
    private path: string;
    private title: Label;
    private subtitle: Label;
    private composer: Label;
    private lyricist: Label;
    private languages: List<Language> = new List<Language>();
    private activeLanguage: Language;
    private musicPartManager: MusicPartManager = null;
    private musicSheetErrors: MusicSheetErrors = new MusicSheetErrors();
    private staves: List<Staff> = new List<Staff>();
    private selectionStart: Fraction;
    private selectionEnd: Fraction;
    private transpose: number = 0;
    private defaultStartTempoInBpm: number = 0;
    private drawErroneousMeasures: boolean = false;
    private hasBeenOpenedForTheFirstTime: boolean = false;
    private currentEnrolledPosition: Fraction = new Fraction(0, 1);
    private musicSheetParameterObject: MusicSheetParameterObject = null;
    private engravingRules: EngravingRules;
    private phonicScoreInterface: IPhonicScoreInterface;
    private musicSheetParameterChangedDelegate: MusicSheetParameterChangedDelegate;
    public static defaultTitle: string = "[kein Titel]";
    public get PhonicScoreInterface(): IPhonicScoreInterface {
        return this.phonicScoreInterface;
    }
    public set PhonicScoreInterface(value: IPhonicScoreInterface) {
        this.phonicScoreInterface = value;
    }
    public get SourceMeasures(): List<SourceMeasure> {
        return this.sourceMeasures;
    }
    public set SourceMeasures(value: List<SourceMeasure>) {
        this.sourceMeasures = value;
    }
    public get Repetitions(): List<Repetition> {
        return this.repetitions;
    }
    public set Repetitions(value: List<Repetition>) {
        this.repetitions = value;
    }
    public get DynListStaves(): List<List<DynamicsContainer>> {
        return this.dynListStaves;
    }
    public get TimestampSortedTempoExpressionsList(): List<MultiTempoExpression> {
        return this.timestampSortedTempoExpressionsList;
    }
    public get TimestampSortedDynamicExpressionsList(): List<DynamicsContainer> {
        return this.timestampSortedDynamicExpressionsList;
    }
    public get InstrumentalGroups(): List<InstrumentalGroup> {
        return this.instrumentalGroups;
    }
    public get Instruments(): List<Instrument> {
        return this.instruments;
    }
    public get SheetPlaybackSetting(): PlaybackSettings {
        return this.playbackSettings;
    }
    public set SheetPlaybackSetting(value: PlaybackSettings) {
        this.playbackSettings = value;
    }
    public get DrawErroneousMeasures(): boolean {
        return this.drawErroneousMeasures;
    }
    public set DrawErroneousMeasures(value: boolean) {
        this.drawErroneousMeasures = value;
    }
    public get HasBeenOpenedForTheFirstTime(): boolean {
        return this.hasBeenOpenedForTheFirstTime;
    }
    public set HasBeenOpenedForTheFirstTime(value: boolean) {
        this.hasBeenOpenedForTheFirstTime = value;
    }
    public InitializeStartTempoInBPM(startTempo: number): void {
        this.playbackSettings.BeatsPerMinute = startTempo;
        this.UserStartTempoInBPM = startTempo;
    }
    public UserStartTempoInBPM: number;
    public get DefaultStartTempoInBpm(): number {
        return this.defaultStartTempoInBpm;
    }
    public set DefaultStartTempoInBpm(value: number) {
        this.defaultStartTempoInBpm = value;
        this.InitializeStartTempoInBPM(value);
    }
    public PageWidth: number;
    public get Path(): string {
        return this.path;
    }
    public set Path(value: string) {
        this.path = value;
    }
    public get Staves(): List<Staff> {
        return this.staves;
    }
    public get TitleString(): string {
        if (this.title != null)
            return this.title.Text;
        else return string.Empty;
    }
    public get SubtitleString(): string {
        if (this.subtitle != null)
            return this.subtitle.Text;
        else return string.Empty;
    }
    public get ComposerString(): string {
        if (this.composer != null)
            return this.composer.Text;
        else return string.Empty;
    }
    public get LyricistString(): string {
        if (this.lyricist != null)
            return this.lyricist.Text;
        else return string.Empty;
    }
    public get Title(): Label {
        return this.title;
    }
    public set Title(value: Label) {
        this.title = value;
    }
    public get Subtitle(): Label {
        return this.subtitle;
    }
    public set Subtitle(value: Label) {
        this.subtitle = value;
    }
    public get Composer(): Label {
        return this.composer;
    }
    public set Composer(value: Label) {
        this.composer = value;
    }
    public get Lyricist(): Label {
        return this.lyricist;
    }
    public set Lyricist(value: Label) {
        this.lyricist = value;
    }
    public get Rules(): EngravingRules {
        return this.engravingRules;
    }
    public set Rules(value: EngravingRules) {
        this.engravingRules = value;
    }
    public get SheetErrors(): MusicSheetErrors {
        return this.musicSheetErrors;
    }
    public get SelectionStart(): Fraction {
        return this.selectionStart;
    }
    public set SelectionStart(value: Fraction) {
        this.selectionStart = value;
        this.currentEnrolledPosition = new Fraction(this.selectionStart);
    }
    public get SelectionEnd(): Fraction {
        return this.selectionEnd;
    }
    public set SelectionEnd(value: Fraction) {
        this.selectionEnd = value;
    }
    public get MusicSheetParameterObject(): MusicSheetParameterObject {
        return this.musicSheetParameterObject;
    }
    public set MusicSheetParameterObject(value: MusicSheetParameterObject) {
        this.musicSheetParameterObject = value;
        this.Title = new Label(this.musicSheetParameterObject.Title);
        this.Composer = new Label(this.musicSheetParameterObject.Composer);
    }
    public addMeasure(measure: SourceMeasure): void {
        this.SourceMeasures.Add(measure);
        measure.MeasureListIndex = this.SourceMeasures.Count - 1;
    }
    public checkForInstrumentWithNoVoice(): void {
        for (var idx: number = 0, len = this.instruments.Count; idx < len; ++idx) {
            var instrument: Instrument = this.instruments[idx];
            if (instrument.Voices.Count == 0) {
                var voice: Voice = new Voice(instrument, 1);
                instrument.Voices.Add(voice);
            }
        }
    }
    public getStaffFromIndex(staffIndexInMusicSheet: number): Staff {
        if (this.staves.Count > staffIndexInMusicSheet)
            return this.staves[staffIndexInMusicSheet];
        else return null;
    }
    public getIndexFromStaff(staff: Staff): number {
        return staff.IdInMusicSheet;
    }
    public fillStaffList(): void {
        var i: number = 0;
        for (var idx: number = 0, len = this.instruments.Count; idx < len; ++idx) {
            var instrument: Instrument = this.instruments[idx];
            for (var idx2: number = 0, len2 = instrument.Staves.Count; idx2 < len2; ++idx2) {
                var staff: Staff = instrument.Staves[idx2];
                staff.IdInMusicSheet = i;
                this.staves.Add(staff);
                i++;
            }
        }
    }
    public get MusicPartManager(): MusicPartManager {
        return this.musicPartManager;
    }
    public set MusicPartManager(value: MusicPartManager) {
        this.musicPartManager = value;
    }
    public getCompleteNumberOfStaves(): number {
        var number: number = 0;
        for (var idx: number = 0, len = this.instruments.Count; idx < len; ++idx) {
            var instrument: Instrument = this.instruments[idx];
            number += instrument.Staves.Count;
        }
        return number;
    }
    public getListOfMeasuresFromIndeces(start: number, end: number): List<SourceMeasure> {
        var measures: List<SourceMeasure> = new List<SourceMeasure>();
        for (var i: number = start; i <= end; i++)
            measures.Add(this.sourceMeasures[i]);
        return measures;
    }
    public getNextSourceMeasure(measure: SourceMeasure): SourceMeasure {
        var index: number = this.sourceMeasures.IndexOf(measure);
        if (index == this.sourceMeasures.Count - 1)
            return measure;
        return this.sourceMeasures[index + 1];
    }
    public getFirstSourceMeasure(): SourceMeasure {
        return this.sourceMeasures[0];
    }
    public getLastSourceMeasure(): SourceMeasure {
        return this.sourceMeasures[this.sourceMeasures.Count - 1];
    }
    public resetAllNoteStates(): void {
        var iterator: MusicPartManagerIterator = this.MusicPartManager.getIterator();
        while (!iterator.EndReached && iterator.CurrentVoiceEntries != null) {
            for (var idx: number = 0, len = iterator.CurrentVoiceEntries.Count; idx < len; ++idx) {
                var voiceEntry: VoiceEntry = iterator.CurrentVoiceEntries[idx];
                for (var idx2: number = 0, len2 = voiceEntry.Notes.Count; idx2 < len2; ++idx2) {
                    var note: Note = voiceEntry.Notes[idx2];
                    note.State = NoteState.Normal;
                }
            }
            iterator.moveToNext();
        }
    }
    public getMusicSheetInstrumentIndex(instrument: Instrument): number {
        return this.Instruments.IndexOf(instrument);
    }
    public getGlobalStaffIndexOfFirstStaff(instrument: Instrument): number {
        var instrumentIndex: number = this.getMusicSheetInstrumentIndex(instrument);
        var staffLineIndex: number = 0;
        for (var i: number = 0; i < instrumentIndex; i++)
            staffLineIndex += this.Instruments[i].Staves.Count;
        return staffLineIndex;
    }
    public setRepetitionNewUserNumberOfRepetitions(index: number, value: number): void {
        var repIndex: number = 0;
        for (var i: number = 0; i < this.repetitions.Count; i++) {
            if (this.repetitions[i] instanceof Repetition) {
                if (index == repIndex) {
                    (<Repetition>this.repetitions[i]).UserNumberOfRepetitions = value;
                    break;
                }
                else repIndex++;
            }
        }
    }
    public getRepetitionByIndex(index: number): Repetition {
        var repIndex: number = 0;
        for (var i: number = 0; i < this.repetitions.Count; i++) {
            if (this.repetitions[i] instanceof Repetition) {
                if (index == repIndex)
                    return <Repetition>this.repetitions[i];
                repIndex++;
            }
        }
        return null;
    }
    public CompareTo(other: MusicSheet): number {
        return this.Title.Text.CompareTo(other.Title.Text);
    }
    public get IInstruments(): List<IInstrument> {
        var list: List<IInstrument> = new List<IInstrument>();
        for (var idx: number = 0, len = this.instruments.Count; idx < len; ++idx) {
            var instr: Instrument = this.instruments[idx];
            list.Add(instr);
        }
        return list;
    }
    public get IInitializableInstruments(): List<ISettableInstrument> {
        var list: List<ISettableInstrument> = new List<ISettableInstrument>();
        for (var idx: number = 0, len = this.instruments.Count; idx < len; ++idx) {
            var instr: Instrument = this.instruments[idx];
            list.Add(instr);
        }
        return list;
    }
    public get IRepetitions(): List<IRepetition> {
        try {
            var repetitions: List<IRepetition> = new List<IRepetition>();
            for (var idx: number = 0, len = this.repetitions.Count; idx < len; ++idx) {
                var partListEntry: PartListEntry = this.repetitions[idx];
                if (partListEntry instanceof Repetition) {
                    repetitions.Add(<Repetition>partListEntry);
                }
            }
            return repetitions;
        }
        catch (ex) {
            Logger.DefaultLogger.LogError(LogLevel.NORMAL, "MusicSheet.IRepetitions get: ", ex);
            return null;
        }

    }
    public GetExpressionsStartTempoInBPM(): number {
        if (this.TimestampSortedTempoExpressionsList.Count > 0) {
            var me: MultiTempoExpression = this.TimestampSortedTempoExpressionsList[0];
            if (me.InstantaniousTempo != null) {
                return me.InstantaniousTempo.TempoInBpm;
            }
            else if (me.ContinuousTempo != null) {
                return me.ContinuousTempo.StartTempo;
            }
        }
        return this.UserStartTempoInBPM;
    }
    public get Errors(): Dictionary<number, List<string>> {
        try {
            return this.musicSheetErrors.MeasureErrors;
        }
        catch (ex) {
            Logger.DefaultLogger.LogError(LogLevel.NORMAL, "MusicSheet.Errors get: ", ex);
            return null;
        }

    }
    public get FirstMeasureNumber(): number {
        try {
            return this.getFirstSourceMeasure().MeasureNumber;
        }
        catch (ex) {
            Logger.DefaultLogger.LogError(LogLevel.NORMAL, "MusicSheet.FirstMeasureNumber: ", ex);
            return 0;
        }

    }
    public get LastMeasureNumber(): number {
        try {
            return this.getLastSourceMeasure().MeasureNumber;
        }
        catch (ex) {
            Logger.DefaultLogger.LogError(LogLevel.NORMAL, "MusicSheet.LastMeasureNumber: ", ex);
            return 0;
        }

    }
    public get CurrentEnrolledPosition(): Fraction {
        return this.currentEnrolledPosition;
    }
    public set CurrentEnrolledPosition(value: Fraction) {
        this.currentEnrolledPosition = new Fraction(value);
    }
    public get Transpose(): number {
        return this.transpose;
    }
    public set Transpose(value: number) {
        this.transpose = value;
    }
    public SetMusicSheetParameter(parameter: MusicSheetParameters, value: Object): void {
        if (this.PhonicScoreInterface != null)
            this.PhonicScoreInterface.RequestMusicSheetParameter(parameter, value);
        else {
            var oldValue: Object = 0;
            if (parameter == MusicSheetParameters.MusicSheetTranspose) {
                oldValue = this.Transpose;
                this.Transpose = <number>value;
            }
            if (parameter == MusicSheetParameters.StartTempoInBPM) {
                oldValue = this.UserStartTempoInBPM;
                this.UserStartTempoInBPM = <number>value;
            }
            if (parameter == MusicSheetParameters.HighlightErrors) {
                oldValue = value;
            }
            if (this.MusicSheetParameterChanged != null)
                MusicSheetParameterChanged(null, parameter, value, oldValue);
        }
    }
    public get MusicSheetParameterChanged(): MusicSheetParameterChangedDelegate {
        return this.musicSheetParameterChangedDelegate;
    }
    public set MusicSheetParameterChanged(value: MusicSheetParameterChangedDelegate) {
        this.musicSheetParameterChangedDelegate = value;
    }
    public get FullNameString(): string {
        return this.ComposerString + " " + this.TitleString;
    }
    public get IdString(): string {
        return this.idString;
    }
    public set IdString(value: string) {
        this.idString = value;
    }
    public Dispose(): void {
        this.MusicSheetParameterChanged = null;
        for (var idx: number = 0, len = this.IInstruments.Count; idx < len; ++idx) {
            var instrument: IInstrument = this.IInstruments[idx];
            instrument.Dispose();
        }
    }
    public getEnrolledSelectionStartTimeStampWorkaround(): Fraction {
        var iter: MusicPartManagerIterator = this.MusicPartManager.getIterator(this.SelectionStart);
        return new Fraction(iter.CurrentEnrolledTimestamp);
    }
    public get SheetEndTimestamp(): Fraction {
        var lastMeasure: SourceMeasure = this.getLastSourceMeasure();
        return lastMeasure.AbsoluteTimestamp + lastMeasure.Duration;
    }
    public getSourceMeasureFromTimeStamp(timeStamp: Fraction): SourceMeasure {
        for (var idx: number = 0, len = this.SourceMeasures.Count; idx < len; ++idx) {
            var sm: SourceMeasure = this.SourceMeasures[idx];
            for (var idx2: number = 0, len2 = sm.VerticalSourceStaffEntryContainers.Count; idx2 < len2; ++idx2) {
                var vssec: VerticalSourceStaffEntryContainer = sm.VerticalSourceStaffEntryContainers[idx2];
                if (timeStamp == vssec.getAbsoluteTimestamp()) {
                    return sm;
                }
            }
        }
        return this.findSourceMeasureFromTimeStamp(timeStamp);
    }
    public findSourceMeasureFromTimeStamp(timeStamp: Fraction): SourceMeasure {
        for (var idx: number = 0, len = this.SourceMeasures.Count; idx < len; ++idx) {
            var sm: SourceMeasure = this.SourceMeasures[idx];
            if (sm.AbsoluteTimestamp >= timeStamp && timeStamp < sm.AbsoluteTimestamp + sm.Duration)
                return sm;
        }
        return null;
    }
}