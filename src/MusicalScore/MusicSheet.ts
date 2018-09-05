import {Fraction} from "../Common/DataObjects/Fraction";
import {MusicPartManager} from "./MusicParts/MusicPartManager";
import {SourceMeasure} from "./VoiceData/SourceMeasure";
import {Repetition} from "./MusicSource/Repetition";
import {DynamicsContainer} from "./VoiceData/HelperObjects/DynamicsContainer";
import {InstrumentalGroup} from "./InstrumentalGroup";
import {Instrument} from "./Instrument";
import {Label} from "./Label";
import {Staff} from "./VoiceData/Staff";
import {MusicPartManagerIterator} from "./MusicParts/MusicPartManagerIterator";
import {VerticalSourceStaffEntryContainer} from "./VoiceData/VerticalSourceStaffEntryContainer";
import {Voice} from "./VoiceData/Voice";
import {MusicSheetErrors} from "../Common/DataObjects/MusicSheetErrors";
import {MultiTempoExpression} from "./VoiceData/Expressions/MultiTempoExpression";
import {EngravingRules} from "./Graphical/EngravingRules";
import {NoteState} from "./Graphical/DrawingEnums";
import {Note} from "./VoiceData/Note";
import {VoiceEntry} from "./VoiceData/VoiceEntry";
import * as log from "loglevel";

// FIXME Andrea: Commented out some unnecessary/not-ported-yet code, have a look at (*)

export class PlaybackSettings {
    public rhythm: Fraction;
}

/**
 * This is the representation of a complete piece of sheet music.
 * It includes the contents of a MusicXML file after the reading.
 * Notes: the musicsheet might not need the Rules, e.g. in the testframework. The EngravingRules Constructor
 * fails when no FontInfo exists, which needs a TextMeasurer
 */
export class MusicSheet /*implements ISettableMusicSheet, IComparable<MusicSheet>*/ {
    constructor() {
        this.rules = EngravingRules.Rules;
        this.playbackSettings = new PlaybackSettings();
        // FIXME?
        // initialize SheetPlaybackSetting with default values
        this.playbackSettings.rhythm = new Fraction(4, 4, 0, false);
        this.userStartTempoInBPM = 100;
        this.pageWidth = 120;
        // create MusicPartManager
        this.MusicPartManager = new MusicPartManager(this);
    }
    public static defaultTitle: string = "[kein Titel]";

    public userStartTempoInBPM: number;
    public pageWidth: number;
    public rules: EngravingRules;

    private idString: string = "kjgdfuilhsdaöoihfsvjh";
    private sourceMeasures: SourceMeasure[] = [];
    private repetitions: Repetition[] = [];
    private dynListStaves: DynamicsContainer[][] = [];
    private timestampSortedDynamicExpressionsList: DynamicsContainer[] = [];
    private timestampSortedTempoExpressionsList: MultiTempoExpression[] = [];
    private instrumentalGroups: InstrumentalGroup[] = [];
    private instruments: Instrument[] = [];
    private playbackSettings: PlaybackSettings;
    private path: string;
    private title: Label;
    private subtitle: Label;
    private composer: Label;
    private lyricist: Label;
    // private languages: Language[] = [];
    // private activeLanguage: Language;
    private musicPartManager: MusicPartManager = undefined;
    private musicSheetErrors: MusicSheetErrors = new MusicSheetErrors();
    private staves: Staff[] = [];
    private selectionStart: Fraction;
    private selectionEnd: Fraction;
    private transpose: number = 0;
    private defaultStartTempoInBpm: number = 0;
    private drawErroneousMeasures: boolean = false;
    private hasBeenOpenedForTheFirstTime: boolean = false;
    private currentEnrolledPosition: Fraction = new Fraction(0, 1);
    // (*) private musicSheetParameterObject: MusicSheetParameterObject = undefined;
    private engravingRules: EngravingRules;
    // (*) private musicSheetParameterChangedDelegate: MusicSheetParameterChangedDelegate;

    /**
     * Get the global index within the music sheet for this staff.
     * @param staff
     * @returns {number}
     */
    public static getIndexFromStaff(staff: Staff): number {
        return staff.idInMusicSheet;
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
        // (*) this.playbackSettings.BeatsPerMinute = startTempo;
        this.userStartTempoInBPM = startTempo;
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
            return this.title.text;
        } else {
            return "";
        }
    }
    public get SubtitleString(): string {
        if (this.subtitle !== undefined) {
            return this.subtitle.text;
        } else {
            return "";
        }
    }
    public get ComposerString(): string {
        if (this.composer !== undefined) {
            return this.composer.text;
        } else {
            return "";
        }
    }
    public get LyricistString(): string {
        if (this.lyricist !== undefined) {
            return this.lyricist.text;
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
        this.selectionStart = value.clone();
        this.currentEnrolledPosition = value.clone();
    }
    public get SelectionEnd(): Fraction {
        return this.selectionEnd;
    }
    public set SelectionEnd(value: Fraction) {
        this.selectionEnd = value;
    }
    // (*) public get MusicSheetParameterObject(): MusicSheetParameterObject {
    //    return this.musicSheetParameterObject;
    //}
    // (*) public set MusicSheetParameterObject(value: MusicSheetParameterObject) {
    //    this.musicSheetParameterObject = value;
    //    this.Title = new Label(this.musicSheetParameterObject.Title);
    //    this.Composer = new Label(this.musicSheetParameterObject.Composer);
    //}
    public addMeasure(measure: SourceMeasure): void {
        this.sourceMeasures.push(measure);
        measure.measureListIndex = this.sourceMeasures.length - 1;
    }
    public checkForInstrumentWithNoVoice(): void {
        for (let idx: number = 0, len: number = this.instruments.length; idx < len; ++idx) {
            const instrument: Instrument = this.instruments[idx];
            if (instrument.Voices.length === 0) {
                const voice: Voice = new Voice(instrument, 1);
                instrument.Voices.push(voice);
            }
        }
    }

    /**
     *
     * @param staffIndexInMusicSheet - The global staff index, iterating through all staves of all instruments.
     * @returns {Staff}
     */
    public getStaffFromIndex(staffIndexInMusicSheet: number): Staff {
        return this.staves[staffIndexInMusicSheet];
    }
    public fillStaffList(): void {
        let i: number = 0;
        for (let idx: number = 0, len: number = this.instruments.length; idx < len; ++idx) {
            const instrument: Instrument = this.instruments[idx];
            for (let idx2: number = 0, len2: number = instrument.Staves.length; idx2 < len2; ++idx2) {
                const staff: Staff = instrument.Staves[idx2];
                staff.idInMusicSheet = i;
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
        let num: number = 0;
        for (let idx: number = 0, len: number = this.instruments.length; idx < len; ++idx) {
            const instrument: Instrument = this.instruments[idx];
            num += instrument.Staves.length;
        }
        return num;
    }

    /**
     * Return a sourceMeasureList, where the given indices correspond to the whole SourceMeasureList of the MusicSheet.
     * @param start
     * @param end
     * @returns {SourceMeasure[]}
     */
    public getListOfMeasuresFromIndeces(start: number, end: number): SourceMeasure[] {
        const measures: SourceMeasure[] = [];
        for (let i: number = start; i <= end; i++) {
            measures.push(this.sourceMeasures[i]);
        }
        return measures;
    }
    /**
     * Returns the next SourceMeasure from a given SourceMeasure.
     * @param measure
     */
    public getNextSourceMeasure(measure: SourceMeasure): SourceMeasure {
        const index: number = this.sourceMeasures.indexOf(measure);
        if (index === this.sourceMeasures.length - 1) {
            return measure;
        }
        return this.sourceMeasures[index + 1];
    }
    /**
     * Returns the first SourceMeasure of MusicSheet.
     */
    public getFirstSourceMeasure(): SourceMeasure {
        return this.sourceMeasures[0];
    }
    /**
     * Returns the last SourceMeasure of MusicSheet.
     */
    public getLastSourceMeasure(): SourceMeasure {
        return this.sourceMeasures[this.sourceMeasures.length - 1];
    }
    public resetAllNoteStates(): void {
       const iterator: MusicPartManagerIterator = this.MusicPartManager.getIterator();
       while (!iterator.EndReached && iterator.CurrentVoiceEntries !== undefined) {
           for (let idx: number = 0, len: number = iterator.CurrentVoiceEntries.length; idx < len; ++idx) {
               const voiceEntry: VoiceEntry = iterator.CurrentVoiceEntries[idx];
               for (let idx2: number = 0, len2: number = voiceEntry.Notes.length; idx2 < len2; ++idx2) {
                   const note: Note = voiceEntry.Notes[idx2];
                   note.state = NoteState.Normal;
               }
           }
           iterator.moveToNext();
       }
    }
    public getMusicSheetInstrumentIndex(instrument: Instrument): number {
        return this.Instruments.indexOf(instrument);
    }
    public getGlobalStaffIndexOfFirstStaff(instrument: Instrument): number {
        const instrumentIndex: number = this.getMusicSheetInstrumentIndex(instrument);
        let staffLineIndex: number = 0;
        for (let i: number = 0; i < instrumentIndex; i++) {
            staffLineIndex += this.Instruments[i].Staves.length;
        }
        return staffLineIndex;
    }

    /**
     * Set to the index-given Repetition a new (set from user) value.
     * @param index
     * @param value
     */
    public setRepetitionNewUserNumberOfRepetitions(index: number, value: number): void {
        let repIndex: number = 0;
        for (let i: number = 0; i < this.repetitions.length; i++) {
            if (this.repetitions[i] instanceof Repetition) { // FIXME
                if (index === repIndex) {
                    this.repetitions[i].UserNumberOfRepetitions = value;
                    break;
                } else {
                    repIndex++;
                }
            }
        }
    }

    /**
     * Return the [[Repetition]] from the given index.
     * @param index
     * @returns {any}
     */
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
        return this.Title.text.localeCompare(other.Title.text);
    }
    // (*)
    //public get IInstruments(): IInstrument[] {
    //    return this.instruments.slice()
    //}
    //public get IInitializableInstruments(): ISettableInstrument[] {
    //    return this.instruments.slice();
    //}
    //public get IRepetitions(): IRepetition[] {
    //    try {
    //        let repetitions: IRepetition[] = [];
    //        for (let idx: number = 0, len: number = this.repetitions.length; idx < len; ++idx) {
    //            let partListEntry: PartListEntry = this.repetitions[idx];
    //            if (partListEntry instanceof Repetition) {
    //                repetitions.push(<Repetition>partListEntry);
    //            }
    //        }
    //        return repetitions;
    //    } catch (ex) {
    //        log.info("MusicSheet.IRepetitions get: ", ex);
    //        return undefined;
    //    }
    //
    //}
    //public GetExpressionsStartTempoInBPM(): number {
    //    if (this.TimestampSortedTempoExpressionsList.length > 0) {
    //        let me: MultiTempoExpression = this.TimestampSortedTempoExpressionsList[0];
    //        if (me.InstantaneousTempo !== undefined) {
    //            return me.InstantaneousTempo.TempoInBpm;
    //        } else if (me.ContinuousTempo !== undefined) {
    //            return me.ContinuousTempo.StartTempo;
    //        }
    //    }
    //    return this.UserStartTempoInBPM;
    //}
    public get Errors(): { [n: number]: string[]; } {
        return this.musicSheetErrors.measureErrors;
    }
    public get FirstMeasureNumber(): number {
        try {
            return this.getFirstSourceMeasure().MeasureNumber;
        } catch (ex) {
            log.info("MusicSheet.FirstMeasureNumber: ", ex);
            return 0;
        }

    }
    public get LastMeasureNumber(): number {
        try {
            return this.getLastSourceMeasure().MeasureNumber;
        } catch (ex) {
            log.info("MusicSheet.LastMeasureNumber: ", ex);
            return 0;
        }

    }
    public get CurrentEnrolledPosition(): Fraction {
        return this.currentEnrolledPosition.clone();
    }
    public set CurrentEnrolledPosition(value: Fraction) {
        this.currentEnrolledPosition = value.clone();
    }
    public get Transpose(): number {
        return this.transpose;
    }
    public set Transpose(value: number) {
        this.transpose = value;
    }
    // (*)
    //public SetMusicSheetParameter(parameter: MusicSheetParameters, value: Object): void {
    //    if (this.PhonicScoreInterface !== undefined) {
    //        this.PhonicScoreInterface.RequestMusicSheetParameter(parameter, value);
    //    } else {
    //        let oldValue: Object = 0;
    //        if (parameter === undefined) { // FIXME MusicSheetParameters.MusicSheetTranspose) {
    //            oldValue = this.Transpose;
    //            this.Transpose = value;
    //        }
    //        if (parameter === undefined) { // FIXME MusicSheetParameters.StartTempoInBPM) {
    //            oldValue = this.UserStartTempoInBPM;
    //            this.UserStartTempoInBPM = value;
    //        }
    //        if (parameter === undefined) { // FIXME MusicSheetParameters.HighlightErrors) {
    //            oldValue = value;
    //        }
    //        if (this.MusicSheetParameterChanged !== undefined) {
    //            this.musicSheetParameterChangedDelegate(undefined, parameter, value, oldValue);
    //        }
    //    }
    //}
    //public get MusicSheetParameterChanged(): MusicSheetParameterChangedDelegate {
    //    return this.musicSheetParameterChangedDelegate;
    //}
    //public set MusicSheetParameterChanged(value: MusicSheetParameterChangedDelegate) {
    //    this.musicSheetParameterChangedDelegate = value;
    //}
    public get FullNameString(): string {
       return this.ComposerString + " " + this.TitleString;
    }
    public get IdString(): string {
       return this.idString;
    }
    public set IdString(value: string) {
       this.idString = value;
    }
    // (*)
    // public Dispose(): void {
    //    this.MusicSheetParameterChanged = undefined;
    //    for (let idx: number = 0, len: number = this.instruments.length; idx < len; ++idx) {
    //        let instrument: Instrument = this.instruments[idx];
    //        instrument.dispose();
    //    }
    // }
    public getEnrolledSelectionStartTimeStampWorkaround(): Fraction {
        const iter: MusicPartManagerIterator = this.MusicPartManager.getIterator(this.SelectionStart);
        return Fraction.createFromFraction(iter.CurrentEnrolledTimestamp);
    }
    public get SheetEndTimestamp(): Fraction {
        const lastMeasure: SourceMeasure = this.getLastSourceMeasure();
        return Fraction.plus(lastMeasure.AbsoluteTimestamp, lastMeasure.Duration);
    }

    /**
     * Works only if the [[SourceMeasure]]s are already filled with VerticalStaffEntryContainers!
     * @param timeStamp
     * @returns {SourceMeasure}
     */
    public getSourceMeasureFromTimeStamp(timeStamp: Fraction): SourceMeasure {
        for (let idx: number = 0, len: number = this.sourceMeasures.length; idx < len; ++idx) {
            const sm: SourceMeasure = this.sourceMeasures[idx];
            for (let idx2: number = 0, len2: number = sm.VerticalSourceStaffEntryContainers.length; idx2 < len2; ++idx2) {
                const vssec: VerticalSourceStaffEntryContainer = sm.VerticalSourceStaffEntryContainers[idx2];
                if (timeStamp.Equals(vssec.getAbsoluteTimestamp())) {
                    return sm;
                }
            }
        }
        return this.findSourceMeasureFromTimeStamp(timeStamp);
    }
    public findSourceMeasureFromTimeStamp(timestamp: Fraction): SourceMeasure {
        for (const sm of this.sourceMeasures) {
            if (sm.AbsoluteTimestamp.lte(timestamp) && timestamp.lt(Fraction.plus(sm.AbsoluteTimestamp, sm.Duration))) {
                return sm;
            }
        }
    }

    public getVisibleInstruments(): Instrument[] {
        const visInstruments: Instrument[] = [];
        for (let idx: number = 0, len: number = this.Instruments.length; idx < len; ++idx) {
            const instrument: Instrument = this.Instruments[idx];
            if (instrument.Voices.length > 0 && instrument.Voices[0].Visible) {
                visInstruments.push(instrument);
            }
        }
        return visInstruments;
    }
}
