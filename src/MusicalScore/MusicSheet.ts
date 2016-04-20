import {Fraction} from "../Common/DataObjects/fraction";
import {MusicPartManager} from "./MusicParts/MusicPartManager";
import {SourceMeasure} from "./VoiceData/SourceMeasure";
import {Repetition} from "./MusicSource/Repetition";
import {DynamicsContainer} from "./VoiceData/HelperObjects/DynamicsContainer";
import {InstrumentalGroup} from "./InstrumentalGroup";
import {Instrument} from "./Instrument";
import {Label} from "./Label";
import {Staff} from "./VoiceData/Staff";
import {Note} from "./VoiceData/Note";
import {VoiceEntry} from "./VoiceData/VoiceEntry";
import {MusicPartManagerIterator} from "./MusicParts/MusicPartManagerIterator";
import {PartListEntry} from "./MusicSource/PartListEntry";
import {VerticalSourceStaffEntryContainer} from "./VoiceData/VerticalSourceStaffEntryContainer";
export class MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/ {
    constructor() {
        try {
            this.Rules = EngravingRules.Rules;
        } catch (ex) {
            console.log("MusicSheet Error: EngravingRules"); // FIXME
        }
        this.playbackSettings = this.SheetPlaybackSetting = new PlaybackSettings(new Fraction(4, 4, false), 100);
        this.UserStartTempoInBPM = 100;
        this.PageWidth = 120;
        this.MusicPartManager = new MusicPartManager(this);
    }
    public static defaultTitle: string = "[kein Titel]";
    public UserStartTempoInBPM: number;
    public PageWidth: number;

    private idString: string = "kjgdfuilhsda�oihfsvjh";
    private sourceMeasures: SourceMeasure[] = new Array();
    private repetitions: Repetition[] = new Array();
    private dynListStaves: DynamicsContainer[][] = new Array();
    private timestampSortedDynamicExpressionsList: DynamicsContainer[] = new Array();
    private timestampSortedTempoExpressionsList: MultiTempoExpression[] = new Array();
    private instrumentalGroups: InstrumentalGroup[] = new Array();
    private instruments: Instrument[] = new Array();
    private playbackSettings: PlaybackSettings;
    private path: string;
    private title: Label;
    private subtitle: Label;
    private composer: Label;
    private lyricist: Label;
    // private languages: Language[] = new Array();
    // private activeLanguage: Language;
    private musicPartManager: MusicPartManager = undefined;
    private musicSheetErrors: MusicSheetErrors = new MusicSheetErrors();
    private staves: Staff[] = new Array();
    private selectionStart: Fraction;
    private selectionEnd: Fraction;
    private transpose: number = 0;
    private defaultStartTempoInBpm: number = 0;
    private drawErroneousMeasures: boolean = false;
    private hasBeenOpenedForTheFirstTime: boolean = false;
    private currentEnrolledPosition: Fraction = new Fraction(0, 1);
    private musicSheetParameterObject: MusicSheetParameterObject = undefined;
    private engravingRules: EngravingRules;
    private phonicScoreInterface: IPhonicScoreInterface;
    private musicSheetParameterChangedDelegate: MusicSheetParameterChangedDelegate;

    public get PhonicScoreInterface(): IPhonicScoreInterface {
        return this.phonicScoreInterface;
    }
    public set PhonicScoreInterface(value: IPhonicScoreInterface) {
        this.phonicScoreInterface = value;
    }
    public get SourceMeasures(): SourceMeasure[] {
        return this.sourceMeasures;
    }
    public set SourceMeasures(value: SourceMeasure[]) {
        this.sourceMeasures = value;
    }
    public get Repetitions(): Repetition[] {
        return this.repetitions;
    }
    public set Repetitions(value: Repetition[]) {
        this.repetitions = value;
    }
    public get DynListStaves(): DynamicsContainer[][] {
        return this.dynListStaves;
    }
    public get TimestampSortedTempoExpressionsList(): MultiTempoExpression[] {
        return this.timestampSortedTempoExpressionsList;
    }
    public get TimestampSortedDynamicExpressionsList(): DynamicsContainer[] {
        return this.timestampSortedDynamicExpressionsList;
    }
    public get InstrumentalGroups(): InstrumentalGroup[] {
        return this.instrumentalGroups;
    }
    public get Instruments(): Instrument[] {
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
    public get DefaultStartTempoInBpm(): number {
        return this.defaultStartTempoInBpm;
    }
    public set DefaultStartTempoInBpm(value: number) {
        this.defaultStartTempoInBpm = value;
        this.InitializeStartTempoInBPM(value);
    }
    public get Path(): string {
        return this.path;
    }
    public set Path(value: string) {
        this.path = value;
    }
    public get Staves(): Staff[] {
        return this.staves;
    }
    public get TitleString(): string {
        if (this.title !== undefined) {
            return this.title.Text;
        } else {
            return "";
        }
    }
    public get SubtitleString(): string {
        if (this.subtitle !== undefined) {
            return this.subtitle.Text;
        } else {
            return "";
        }
    }
    public get ComposerString(): string {
        if (this.composer !== undefined) {
            return this.composer.Text;
        } else {
            return "";
        }
    }
    public get LyricistString(): string {
        if (this.lyricist !== undefined) {
            return this.lyricist.Text;
        } else {
            return "";
        }
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
        this.currentEnrolledPosition = Fraction.CreateFractionFromFraction(this.selectionStart);
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
        this.SourceMeasures.push(measure);
        measure.MeasureListIndex = this.SourceMeasures.length - 1;
    }
    public checkForInstrumentWithNoVoice(): void {
        for (let idx: number = 0, len: number = this.instruments.length; idx < len; ++idx) {
            let instrument: Instrument = this.instruments[idx];
            if (instrument.Voices.length === 0) {
                let voice: Voice = new Voice(instrument, 1);
                instrument.Voices.push(voice);
            }
        }
    }
    public getStaffFromIndex(staffIndexInMusicSheet: number): Staff {
        if (this.staves.length > staffIndexInMusicSheet) {
            return this.staves[staffIndexInMusicSheet];
        } else {
            return undefined;
        }
    }
    public getIndexFromStaff(staff: Staff): number {
        return staff.IdInMusicSheet;
    }
    public fillStaffList(): void {
        let i: number = 0;
        for (let idx: number = 0, len: number = this.instruments.length; idx < len; ++idx) {
            let instrument: Instrument = this.instruments[idx];
            for (let idx2: number = 0, len2: number = instrument.Staves.length; idx2 < len2; ++idx2) {
                let staff: Staff = instrument.Staves[idx2];
                staff.IdInMusicSheet = i;
                this.staves.push(staff);
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
        let number: number = 0;
        for (let idx: number = 0, len: number = this.instruments.length; idx < len; ++idx) {
            let instrument: Instrument = this.instruments[idx];
            number += instrument.Staves.length;
        }
        return number;
    }
    public getListOfMeasuresFromIndeces(start: number, end: number): SourceMeasure[] {
        let measures: SourceMeasure[] = new Array();
        for (let i: number = start; i <= end; i++) {
            measures.push(this.sourceMeasures[i]);
        }
        return measures;
    }
    public getNextSourceMeasure(measure: SourceMeasure): SourceMeasure {
        let index: number = this.sourceMeasures.IndexOf(measure);
        if (index === this.sourceMeasures.length - 1) {
            return measure;
        }
        return this.sourceMeasures[index + 1];
    }
    public getFirstSourceMeasure(): SourceMeasure {
        return this.sourceMeasures[0];
    }
    public getLastSourceMeasure(): SourceMeasure {
        return this.sourceMeasures[this.sourceMeasures.length - 1];
    }
    public resetAllNoteStates(): void {
        let iterator: MusicPartManagerIterator = this.MusicPartManager.getIterator();
        while (!iterator.EndReached && iterator.CurrentVoiceEntries !== undefined) {
            for (let idx: number = 0, len: number = iterator.CurrentVoiceEntries.length; idx < len; ++idx) {
                let voiceEntry: VoiceEntry = iterator.CurrentVoiceEntries[idx];
                for (let idx2: number = 0, len2: number = voiceEntry.Notes.length; idx2 < len2; ++idx2) {
                    let note: Note = voiceEntry.Notes[idx2];
                    note.State = NoteState.Normal;
                }
            }
            iterator.moveToNext();
        }
    }
    public getMusicSheetInstrumentIndex(instrument: Instrument): number {
        return this.Instruments.indexOf(instrument);
    }
    public getGlobalStaffIndexOfFirstStaff(instrument: Instrument): number {
        let instrumentIndex: number = this.getMusicSheetInstrumentIndex(instrument);
        let staffLineIndex: number = 0;
        for (let i: number = 0; i < instrumentIndex; i++) {
            staffLineIndex += this.Instruments[i].Staves.length;
        }
        return staffLineIndex;
    }
    public setRepetitionNewUserNumberOfRepetitions(index: number, value: number): void {
        let repIndex: number = 0;
        for (let i: number = 0; i < this.repetitions.length; i++) {
            if (this.repetitions[i] instanceof Repetition) {
                if (index === repIndex) {
                    (<Repetition>this.repetitions[i]).UserNumberOfRepetitions = value;
                    break;
                } else {
                    repIndex++;
                }
            }
        }
    }
    public getRepetitionByIndex(index: number): Repetition {
        let repIndex: number = 0;
        for (let i: number = 0; i < this.repetitions.length; i++) {
            if (this.repetitions[i] instanceof Repetition) {
                if (index === repIndex) {
                    return <Repetition>this.repetitions[i];
                }
                repIndex++;
            }
        }
        return undefined;
    }
    public CompareTo(other: MusicSheet): number {
        return this.Title.Text.localeCompare(other.Title.Text);
    }
    public get IInstruments(): IInstrument[] {
        let list: IInstrument[] = new Array();
        for (let idx: number = 0, len: number = this.instruments.length; idx < len; ++idx) {
            let instr: Instrument = this.instruments[idx];
            list.push(instr);
        }
        return list;
    }
    public get IInitializableInstruments(): ISettableInstrument[] {
        let list: ISettableInstrument[] = new Array();
        for (let idx: number = 0, len: number = this.instruments.length; idx < len; ++idx) {
            let instr: Instrument = this.instruments[idx];
            list.push(instr);
        }
        return list;
    }
    public get IRepetitions(): IRepetition[] {
        try {
            let repetitions: IRepetition[] = new Array();
            for (let idx: number = 0, len: number = this.repetitions.length; idx < len; ++idx) {
                let partListEntry: PartListEntry = this.repetitions[idx];
                if (partListEntry instanceof Repetition) {
                    repetitions.push(<Repetition>partListEntry);
                }
            }
            return repetitions;
        } catch (ex) {
            //Logger.DefaultLogger.LogError(LogLevel.NORMAL, "MusicSheet.IRepetitions get: ", ex);
            // FIXME logger
            return undefined;
        }

    }
    public GetExpressionsStartTempoInBPM(): number {
        if (this.TimestampSortedTempoExpressionsList.length > 0) {
            let me: MultiTempoExpression = this.TimestampSortedTempoExpressionsList[0];
            if (me.InstantaniousTempo !== undefined) {
                return me.InstantaniousTempo.TempoInBpm;
            } else if (me.ContinuousTempo !== undefined) {
                return me.ContinuousTempo.StartTempo;
            }
        }
        return this.UserStartTempoInBPM;
    }
    public get Errors(): Dictionary<number, string[]> {
        try {
            return this.musicSheetErrors.MeasureErrors;
        } catch (ex) {
            // FIXME Logger.DefaultLogger.LogError(LogLevel.NORMAL, "MusicSheet.Errors get: ", ex);
            return undefined;
        }

    }
    public get FirstMeasureNumber(): number {
        try {
            return this.getFirstSourceMeasure().MeasureNumber;
        } catch (ex) {
            // Logger.DefaultLogger.LogError(LogLevel.NORMAL, "MusicSheet.FirstMeasureNumber: ", ex); // FIXME
            return 0;
        }

    }
    public get LastMeasureNumber(): number {
        try {
            return this.getLastSourceMeasure().MeasureNumber;
        } catch (ex) {
            // Logger.DefaultLogger.LogError(LogLevel.NORMAL, "MusicSheet.LastMeasureNumber: ", ex); // FIXME
            return 0;
        }

    }
    public get CurrentEnrolledPosition(): Fraction {
        return this.currentEnrolledPosition;
    }
    public set CurrentEnrolledPosition(value: Fraction) {
        this.currentEnrolledPosition = Fraction.CreateFractionFromFraction(value);
    }
    public get Transpose(): number {
        return this.transpose;
    }
    public set Transpose(value: number) {
        this.transpose = value;
    }
    public SetMusicSheetParameter(parameter: MusicSheetParameters, value: Object): void {
        if (this.PhonicScoreInterface !== undefined) {
            this.PhonicScoreInterface.RequestMusicSheetParameter(parameter, value);
        } else {
            let oldValue: Object = 0;
            if (parameter === MusicSheetParameters.MusicSheetTranspose) {
                oldValue = this.Transpose;
                this.Transpose = <number>value;
            }
            if (parameter === MusicSheetParameters.StartTempoInBPM) {
                oldValue = this.UserStartTempoInBPM;
                this.UserStartTempoInBPM = <number>value;
            }
            if (parameter === MusicSheetParameters.HighlightErrors) {
                oldValue = value;
            }
            if (this.MusicSheetParameterChanged !== undefined) {
                this.MusicSheetParameterChanged(undefined, parameter, value, oldValue);
            }
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
        this.MusicSheetParameterChanged = undefined;
        for (let idx: number = 0, len: number = this.IInstruments.length; idx < len; ++idx) {
            let instrument: IInstrument = this.IInstruments[idx];
            instrument.Dispose();
        }
    }
    public getEnrolledSelectionStartTimeStampWorkaround(): Fraction {
        let iter: MusicPartManagerIterator = this.MusicPartManager.getIterator(this.SelectionStart);
        return Fraction.CreateFractionFromFraction(iter.CurrentEnrolledTimestamp);
    }
    public get SheetEndTimestamp(): Fraction {
        let lastMeasure: SourceMeasure = this.getLastSourceMeasure();
        return lastMeasure.AbsoluteTimestamp + lastMeasure.Duration;
    }
    public getSourceMeasureFromTimeStamp(timeStamp: Fraction): SourceMeasure {
        for (let idx: number = 0, len: number = this.SourceMeasures.length; idx < len; ++idx) {
            let sm: SourceMeasure = this.SourceMeasures[idx];
            for (let idx2: number = 0, len2: number = sm.VerticalSourceStaffEntryContainers.length; idx2 < len2; ++idx2) {
                let vssec: VerticalSourceStaffEntryContainer = sm.VerticalSourceStaffEntryContainers[idx2];
                if (timeStamp === vssec.getAbsoluteTimestamp()) {
                    return sm;
                }
            }
        }
        return this.findSourceMeasureFromTimeStamp(timeStamp);
    }
    public findSourceMeasureFromTimeStamp(timeStamp: Fraction): SourceMeasure {
        for (let idx: number = 0, len: number = this.SourceMeasures.length; idx < len; ++idx) {
            let sm: SourceMeasure = this.SourceMeasures[idx];
            if (sm.AbsoluteTimestamp >= timeStamp && timeStamp < sm.AbsoluteTimestamp + sm.Duration) {
                return sm;
            }
        }
        return undefined;
    }
}
