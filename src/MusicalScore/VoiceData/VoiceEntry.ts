import { Fraction } from "../../Common/DataObjects/Fraction";
import {Voice} from "./Voice";
import {SourceStaffEntry} from "./SourceStaffEntry";
import {Note} from "./Note";
import {LyricsEntry} from "./Lyrics/LyricsEntry";
import {TechnicalInstruction} from "./Instructions/TechnicalInstruction";
import {OrnamentContainer} from "./OrnamentContainer";
import { Dictionary } from "typescript-collections";
import {Arpeggio} from "./Arpeggio";
import { Articulation } from "./Articulation";
import { IPlaybackEntry } from "../../Common/Interfaces/IPlaybackEntry";
import { IPlaybackFactory } from "../../Common/Interfaces/IPlaybackFactory";

/**
 * A [[VoiceEntry]] contains the notes in a voice at a timestamp.
 */
export class VoiceEntry {
    public static playbackFactory: IPlaybackFactory = undefined;

    /**
     *
     * @param timestamp The relative timestamp within the source measure.
     * @param parentVoice
     * @param parentSourceStaffEntry
     * @param isGrace States whether the VoiceEntry has (only) grace notes.
     * @param graceNoteSlash States whether the grace note(s) have a slash (Acciaccatura, played before the beat)
     */
    constructor(timestamp: Fraction, parentVoice: Voice, parentSourceStaffEntry: SourceStaffEntry, addToStaffEntry: boolean = true,
                isGrace: boolean = false, graceNoteSlash: boolean = false, graceSlur: boolean = false) {
        this.timestamp = timestamp;
        this.parentVoice = parentVoice;
        this.parentSourceStaffEntry = parentSourceStaffEntry;
        this.isGrace = isGrace;
        this.graceAfterMainNote = false;
        this.graceNoteSlash = graceNoteSlash;
        this.graceSlur = graceSlur;

        if (!isGrace) {
            parentVoice.VoiceEntries.push(this);
        }

        // add currentVoiceEntry to staff entry:
        if (addToStaffEntry && parentSourceStaffEntry !== undefined) {
            const list: VoiceEntry[] = parentSourceStaffEntry.VoiceEntries;
            if (list.indexOf(this) === -1) {
                list.push(this);
            }
        }

        if(VoiceEntry.playbackFactory){
            // ToDo: at this moment there are no notes added to the voice entry
            this.mainPlaybackEntry = VoiceEntry.playbackFactory.createPlaybackEntry(this);
            this.PlaybackEntries.push(this.mainPlaybackEntry);
        }
    }

    private parentVoice: Voice;
    private parentSourceStaffEntry: SourceStaffEntry;
    private timestamp: Fraction;
    private notes: Note[] = [];

    private graceVoiceEntriesBefore: VoiceEntry[] = [];
    private graceVoiceEntriesAfter: VoiceEntry[] = [];
    private isGrace: boolean;
    /** States whether the grace notes come after a main note (at end of measure). */
    private graceAfterMainNote: boolean;
    private graceNoteSlash: boolean;
    private graceSlur: boolean; // TODO grace slur system could be refined to be non-binary
    private articulations: Articulation[] = [];
    private playbackEntries: IPlaybackEntry[] = [];
    private fermata: Articulation;
    private technicalInstructions: TechnicalInstruction[] = [];
    private lyricsEntries: Dictionary<number, LyricsEntry> = new Dictionary<number, LyricsEntry>();
    /** The Arpeggio consisting of this VoiceEntry's notes. Undefined if no arpeggio exists. */
    private arpeggio: Arpeggio;
    private ornamentContainer: OrnamentContainer;
    private wantedStemDirection: StemDirectionType = StemDirectionType.Undefined;
    /** Stem direction specified in the xml stem element. */
    private stemDirectionXml: StemDirectionType = StemDirectionType.Undefined;
    private stemDirection: StemDirectionType = StemDirectionType.Undefined;
    /** Color of the stem given in XML. RGB Hexadecimal, like #00FF00. */
    private stemColorXml: string;
    /** Color of the stem currently set. RGB Hexadecimal, like #00FF00. */
    private stemColor: string;

    private mainPlaybackEntry: IPlaybackEntry;
    private volumeModifier: Articulation;
    private durationModifier: Articulation;

    public get ParentSourceStaffEntry(): SourceStaffEntry {
        return this.parentSourceStaffEntry;
    }

    public get ParentVoice(): Voice {
        return this.parentVoice;
    }
    public get Timestamp(): Fraction {
        return this.timestamp;
    }
    public set Timestamp(value: Fraction) {
        this.timestamp = value;
    }
    public get Notes(): Note[] {
        return this.notes;
    }

    public addNote(note: Note): void {
        this.notes.push(note);
        // only add playback notes when these are no rests and are not tied notes (besides the first note of a tie)
        if (!note.isRest() && VoiceEntry.playbackFactory &&
            (note.NoteTie === undefined || note.NoteTie.StartNote === note)) {
            this.MainPlaybackEntry.Notes.push(VoiceEntry.playbackFactory.createPlaybackNote(this.MainPlaybackEntry, note));
        }
    }

    public get GraceVoiceEntriesBefore(): VoiceEntry[] {
        return this.graceVoiceEntriesBefore;
    }
    public set GraceVoiceEntriesBefore(value: VoiceEntry[] ) {
        this.graceVoiceEntriesBefore = value;
        for (const ve of this.graceVoiceEntriesBefore) {
            ve.parentSourceStaffEntry = this.ParentSourceStaffEntry;
        }
    }

    public get GraceVoiceEntriesAfter(): VoiceEntry[] {
        return this.graceVoiceEntriesAfter;
    }
    public set GraceVoiceEntriesAfter(value: VoiceEntry[] ) {
        this.graceVoiceEntriesAfter = value;
        for (const ve of this.graceVoiceEntriesAfter) {
            ve.parentSourceStaffEntry = this.ParentSourceStaffEntry;
        }
    }

    public get IsGrace(): boolean {
        return this.isGrace;
    }
    public set IsGrace(value: boolean) {
        this.isGrace = value;
    }
    public get GraceAfterMainNote(): boolean {
        return this.graceAfterMainNote;
    }
    public set GraceAfterMainNote(value: boolean) {
        this.graceAfterMainNote = value;
    }
    public get GraceNoteSlash(): boolean {
        return this.graceNoteSlash;
    }
    public set GraceNoteSlash(value: boolean) {
        this.graceNoteSlash = value;
    }
    public get GraceSlur(): boolean {
        return this.graceSlur;
    }
    public set GraceSlur(value: boolean) {
        this.graceSlur = value;
    }
    public get Articulations(): Articulation[] {
        return this.articulations;
    }
    /** Stores all playback entries (e.g. extra grace and ornament entries).
     * Also holds the main playback entry.
     * The entries are sorted in ascending timestamp.
     */
    public get PlaybackEntries(): IPlaybackEntry[] {
        return this.playbackEntries;
    }
    public get Fermata(): Articulation {
        return this.fermata;
    }
    public get MainPlaybackEntry(): IPlaybackEntry {
        return this.mainPlaybackEntry;
    }

    public set MainPlaybackEntry(value: IPlaybackEntry)  {
        this.mainPlaybackEntry = value;
    }

    public removeMainPlaybackEntry(): void {
        if (this.mainPlaybackEntry !== undefined) {
            this.removePlaybackEntry(this.mainPlaybackEntry);
        }
    }

    public removePlaybackEntry(value: IPlaybackEntry): void {
        if (this.mainPlaybackEntry === value) {
            this.mainPlaybackEntry = undefined;
        }

        const index: number = this.playbackEntries.indexOf(value);
        if (index > -1) {
            this.playbackEntries.splice(index, 1);
        }
    }

    public get TechnicalInstructions(): TechnicalInstruction[] {
        return this.technicalInstructions;
    }
    public get LyricsEntries(): Dictionary<number, LyricsEntry> {
        return this.lyricsEntries;
    }
    public get Arpeggio(): Arpeggio {
        return this.arpeggio;
    }
    public set Arpeggio(value: Arpeggio) {
        this.arpeggio = value;
    }
    public get OrnamentContainer(): OrnamentContainer {
        return this.ornamentContainer;
    }
    public set OrnamentContainer(value: OrnamentContainer) {
        this.ornamentContainer = value;
    }

    // WantedStemDirection provides the stem direction to VexFlow in case of more than 1 voice
    // for optimal graphical appearance
    public set WantedStemDirection(value: StemDirectionType) {
        this.wantedStemDirection = value;
    }
    public get WantedStemDirection(): StemDirectionType {
        return this.wantedStemDirection;
    }
    public set StemDirectionXml(value: StemDirectionType) {
        this.stemDirectionXml = value;
    }
    public get StemDirectionXml(): StemDirectionType {
        return this.stemDirectionXml;
    }
    // StemDirection holds the actual value of the stem
    public set StemDirection(value: StemDirectionType) {
        this.stemDirection = value;
    }
    public get StemDirection(): StemDirectionType {
        return this.stemDirection;
    }
    public get StemColorXml(): string {
        return this.stemColorXml;
    }
    public set StemColorXml(value: string) {
        this.stemColorXml = value;
    }
    public get StemColor(): string {
        return this.stemColor;
    }
    public set StemColor(value: string) {
        this.stemColor = value;
    }
    public get VolumeModifier(): Articulation {
        return this.volumeModifier;
    }
    public set VolumeModifier(value: Articulation) {
        this.volumeModifier = value;
    }
    public get DurationModifier(): Articulation {
        return this.durationModifier;
    }
    public set DurationModifier(value: Articulation) {
        this.durationModifier = value;
    }

    public hasArticulation(articulation: Articulation): boolean {
        for (const existingArticulation of this.articulations) {
            if (existingArticulation.Equals(articulation)) {
                return true;
            }
        }
        return false;
    }
    public static isSupportedArticulation(articulation: ArticulationEnum): boolean {
        switch (articulation) {
            case ArticulationEnum.accent:
            case ArticulationEnum.strongaccent:
            case ArticulationEnum.invertedstrongaccent:
            case ArticulationEnum.staccato:
            case ArticulationEnum.staccatissimo:
            case ArticulationEnum.spiccato:
            case ArticulationEnum.tenuto:
            case ArticulationEnum.fermata:
            case ArticulationEnum.invertedfermata:
            case ArticulationEnum.breathmark:
            case ArticulationEnum.caesura:
            case ArticulationEnum.lefthandpizzicato:
            case ArticulationEnum.naturalharmonic:
            case ArticulationEnum.snappizzicato:
            case ArticulationEnum.upbow:
            case ArticulationEnum.downbow:
            case ArticulationEnum.bend:
                return true;
            default:
                return false;
        }
    }
    public hasTie(): boolean {
        for (let idx: number = 0, len: number = this.Notes.length; idx < len; ++idx) {
            const note: Note = this.Notes[idx];
            if (note.NoteTie) { return true; }
        }
        return false;
    }
    public hasSlur(): boolean {
        for (let idx: number = 0, len: number = this.Notes.length; idx < len; ++idx) {
            const note: Note = this.Notes[idx];
            if (note.NoteSlurs.length > 0) { return true; }
        }
        return false;
    }
    public isStaccato(): boolean {
        for (const articulation of this.Articulations) {
            if (articulation.articulationEnum === ArticulationEnum.staccato) {
                return true;
        }
        }
        return false;
    }
    public isAccent(): boolean {
        for (const articulation of this.Articulations) {
            if (articulation.articulationEnum === ArticulationEnum.accent || articulation.articulationEnum === ArticulationEnum.strongaccent) {
                return true;
            }
        }
        return false;
    }
    public getVerseNumberForLyricEntry(lyricsEntry: LyricsEntry): number {
        let verseNumber: number = 1;
        this.lyricsEntries.forEach((key: number, value: LyricsEntry): void => {
            if (lyricsEntry === value) {
                verseNumber = key;
            }
        });
        return verseNumber;
    }
}

export enum ArticulationEnum {
    accent,
    strongaccent,
    marcatoup,
    marcatodown,
    invertedstrongaccent,
    staccato,
    staccatissimo,
    spiccato,
    tenuto,
    fermata,
    invertedfermata,
    breathmark,
    caesura,
    lefthandpizzicato,
    naturalharmonic,
    snappizzicato,
    upbow,
    downbow,
    scoop,
    plop,
    doit,
    falloff,
    stress,
    unstress,
    detachedlegato,
    otherarticulation,
    bend
}

export enum StemDirectionType {
    Undefined = -1,
    Up = 0,
    Down = 1,
    None = 2,
    Double = 3
}
