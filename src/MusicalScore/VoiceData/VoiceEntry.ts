import {Fraction} from "../../Common/DataObjects/Fraction";
import {Voice} from "./Voice";
import {SourceStaffEntry} from "./SourceStaffEntry";
import {Note} from "./Note";
import {Pitch} from "../../Common/DataObjects/Pitch";
import {LyricsEntry} from "./Lyrics/LyricsEntry";
import {TechnicalInstruction} from "./Instructions/TechnicalInstruction";
import {OrnamentContainer} from "./OrnamentContainer";
import {KeyInstruction} from "./Instructions/KeyInstruction";
import {OrnamentEnum} from "./OrnamentContainer";
import {AccidentalEnum} from "../../Common/DataObjects/Pitch";
import Dictionary from "typescript-collections/dist/lib/Dictionary";

/**
 * A [[VoiceEntry]] contains the notes in a voice at a timestamp.
 */
export class VoiceEntry {
    /**
     *
     * @param timestamp - The relative timestamp within the source measure.
     * @param parentVoice
     * @param parentSourceStaffEntry
     */
    constructor(timestamp: Fraction, parentVoice: Voice, parentSourceStaffEntry: SourceStaffEntry) {
        this.timestamp = timestamp;
        this.parentVoice = parentVoice;
        this.parentSourceStaffEntry = parentSourceStaffEntry;
    }

    public graceVoiceEntriesBefore: VoiceEntry[];
    public graceVoiceEntriesAfter: VoiceEntry[];

    private parentVoice: Voice;
    private parentSourceStaffEntry: SourceStaffEntry;
    private timestamp: Fraction;
    private notes: Note[] = [];
    private articulations: ArticulationEnum[] = [];
    private technicalInstructions: TechnicalInstruction[] = [];
    private lyricsEntries: Dictionary<number, LyricsEntry> = new Dictionary<number, LyricsEntry>();
    private arpeggiosNotesIndices: number[] = [];
    private ornamentContainer: OrnamentContainer;
    private stemDirection: StemDirectionType = StemDirectionType.Undefined;

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
    public get Articulations(): ArticulationEnum[] {
        return this.articulations;
    }
    public get TechnicalInstructions(): TechnicalInstruction[] {
        return this.technicalInstructions;
    }
    public get LyricsEntries(): Dictionary<number, LyricsEntry> {
        return this.lyricsEntries;
    }
    public get ArpeggiosNotesIndices(): number[] {
        return this.arpeggiosNotesIndices;
    }
    public set ArpeggiosNotesIndices(value: number[]) {
        this.arpeggiosNotesIndices = value;
    }
    public get OrnamentContainer(): OrnamentContainer {
        return this.ornamentContainer;
    }
    public set OrnamentContainer(value: OrnamentContainer) {
        this.ornamentContainer = value;
    }

    public get StemDirection(): StemDirectionType {
        return this.stemDirection;
    }
    public set StemDirection(value: StemDirectionType) {
        this.stemDirection = value;
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
                return true;
            default:
                return false;
        }
    }
    public hasTie(): boolean {
        for (let idx: number = 0, len: number = this.Notes.length; idx < len; ++idx) {
            const note: Note = this.Notes[idx];
            if (note.NoteTie !== undefined) { return true; }
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
        for (let idx: number = 0, len: number = this.Articulations.length; idx < len; ++idx) {
            const articulation: ArticulationEnum = this.Articulations[idx];
            if (articulation === ArticulationEnum.staccato) { return true; }
        }
        return false;
    }
    public isAccent(): boolean {
        for (let idx: number = 0, len: number = this.Articulations.length; idx < len; ++idx) {
            const articulation: ArticulationEnum = this.Articulations[idx];
            if (articulation === ArticulationEnum.accent || articulation === ArticulationEnum.strongaccent) {
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
    //public createVoiceEntriesForOrnament(activeKey: KeyInstruction): VoiceEntry[] {
    //    return this.createVoiceEntriesForOrnament(this, activeKey);
    //}
    public createVoiceEntriesForOrnament(voiceEntryWithOrnament: VoiceEntry, activeKey: KeyInstruction): VoiceEntry[] {
        if (voiceEntryWithOrnament === undefined) {
            voiceEntryWithOrnament = this;
        }
        const voiceEntries: VoiceEntry[] = [];
        if (voiceEntryWithOrnament.ornamentContainer === undefined) {
            return;
        }
        const baseNote: Note = this.notes[0];
        const baselength: Fraction = baseNote.Length;
        const baseVoice: Voice = voiceEntryWithOrnament.ParentVoice;
        const baseTimestamp: Fraction = voiceEntryWithOrnament.Timestamp;
        let currentTimestamp: Fraction = Fraction.createFromFraction(baseTimestamp);
        //let length: Fraction;
        switch (voiceEntryWithOrnament.ornamentContainer.GetOrnament) {
            case OrnamentEnum.Trill: {
                const length: Fraction = new Fraction(baselength.Numerator, baselength.Denominator * 8);
                const higherPitch: Pitch = baseNote.Pitch.getTransposedPitch(1);
                let alteration: AccidentalEnum = activeKey.getAlterationForPitch(higherPitch);
                if (voiceEntryWithOrnament.OrnamentContainer.AccidentalAbove !== AccidentalEnum.NONE) {
                    alteration = <AccidentalEnum><number>voiceEntryWithOrnament.ornamentContainer.AccidentalAbove;
                }
                for (let i: number = 0; i < 8; i++) {
                    currentTimestamp = Fraction.plus(baseTimestamp, new Fraction(i * length.Numerator, length.Denominator));
                    if ((i % 2) === 0) {
                        this.createBaseVoiceEntry(currentTimestamp, length, baseVoice, baseNote, voiceEntries);
                    } else {
                        this.createAlteratedVoiceEntry(currentTimestamp, length, baseVoice, higherPitch, alteration, voiceEntries);
                    }
                }
                break;
            }
            case OrnamentEnum.Turn: {
                const length: Fraction = new Fraction(baselength.Numerator, baselength.Denominator * 4);
                const lowerPitch: Pitch = baseNote.Pitch.getTransposedPitch(-1);
                const lowerAlteration: AccidentalEnum = activeKey.getAlterationForPitch(lowerPitch);
                const higherPitch: Pitch = baseNote.Pitch.getTransposedPitch(1);
                const higherAlteration: AccidentalEnum = activeKey.getAlterationForPitch(higherPitch);
                this.createAlteratedVoiceEntry(
                    currentTimestamp, length, baseVoice, higherPitch, higherAlteration, voiceEntries
                );
                currentTimestamp.Add(length);
                this.createBaseVoiceEntry(currentTimestamp, length, baseVoice, baseNote, voiceEntries);
                currentTimestamp.Add(length);
                this.createAlteratedVoiceEntry(
                    currentTimestamp, length, baseVoice, lowerPitch, lowerAlteration, voiceEntries
                );
                currentTimestamp.Add(length);
                this.createBaseVoiceEntry(currentTimestamp, length, baseVoice, baseNote, voiceEntries);
                break;
            }
            case OrnamentEnum.InvertedTurn: {
                const length: Fraction = new Fraction(baselength.Numerator, baselength.Denominator * 4);
                const lowerPitch: Pitch = baseNote.Pitch.getTransposedPitch(-1);
                const lowerAlteration: AccidentalEnum = activeKey.getAlterationForPitch(lowerPitch);
                const higherPitch: Pitch = baseNote.Pitch.getTransposedPitch(1);
                const higherAlteration: AccidentalEnum = activeKey.getAlterationForPitch(higherPitch);
                this.createAlteratedVoiceEntry(
                    currentTimestamp, length, baseVoice, lowerPitch, lowerAlteration, voiceEntries
                );
                currentTimestamp.Add(length);
                this.createBaseVoiceEntry(currentTimestamp, length, baseVoice, baseNote, voiceEntries);
                currentTimestamp.Add(length);
                this.createAlteratedVoiceEntry(
                    currentTimestamp, length, baseVoice, higherPitch, higherAlteration, voiceEntries
                );
                currentTimestamp.Add(length);
                this.createBaseVoiceEntry(currentTimestamp, length, baseVoice, baseNote, voiceEntries);
                break;
            }
            case OrnamentEnum.DelayedTurn: {
                const length: Fraction = new Fraction(baselength.Numerator, baselength.Denominator * 2);
                const lowerPitch: Pitch = baseNote.Pitch.getTransposedPitch(-1);
                const lowerAlteration: AccidentalEnum = activeKey.getAlterationForPitch(lowerPitch);
                const higherPitch: Pitch = baseNote.Pitch.getTransposedPitch(1);
                const higherAlteration: AccidentalEnum = activeKey.getAlterationForPitch(higherPitch);
                this.createBaseVoiceEntry(currentTimestamp, length, baseVoice, baseNote, voiceEntries);
                currentTimestamp = Fraction.plus(baseTimestamp, length);
                length.Denominator = baselength.Denominator * 8;
                this.createAlteratedVoiceEntry(currentTimestamp, length, baseVoice, higherPitch, higherAlteration, voiceEntries);
                currentTimestamp.Add(length);
                this.createBaseVoiceEntry(currentTimestamp, length, baseVoice, baseNote, voiceEntries);
                currentTimestamp.Add(length);
                this.createAlteratedVoiceEntry(currentTimestamp, length, baseVoice, lowerPitch, lowerAlteration, voiceEntries);
                currentTimestamp.Add(length);
                this.createBaseVoiceEntry(currentTimestamp, length, baseVoice, baseNote, voiceEntries);
                break;
            }
            case OrnamentEnum.DelayedInvertedTurn: {
                const length: Fraction = new Fraction(baselength.Numerator, baselength.Denominator * 2);
                const lowerPitch: Pitch = baseNote.Pitch.getTransposedPitch(-1);
                const lowerAlteration: AccidentalEnum = activeKey.getAlterationForPitch(lowerPitch);
                const higherPitch: Pitch = baseNote.Pitch.getTransposedPitch(1);
                const higherAlteration: AccidentalEnum = activeKey.getAlterationForPitch(higherPitch);
                this.createBaseVoiceEntry(currentTimestamp, length, baseVoice, baseNote, voiceEntries);
                currentTimestamp = Fraction.plus(baseTimestamp, length);
                length.Denominator = baselength.Denominator * 8;
                this.createAlteratedVoiceEntry(currentTimestamp, length, baseVoice, lowerPitch, lowerAlteration, voiceEntries);
                currentTimestamp.Add(length);
                this.createBaseVoiceEntry(currentTimestamp, length, baseVoice, baseNote, voiceEntries);
                currentTimestamp.Add(length);
                this.createAlteratedVoiceEntry(currentTimestamp, length, baseVoice, higherPitch, higherAlteration, voiceEntries);
                currentTimestamp.Add(length);
                this.createBaseVoiceEntry(currentTimestamp, length, baseVoice, baseNote, voiceEntries);
                break;
            }
            case OrnamentEnum.Mordent: {
                const length: Fraction = new Fraction(baselength.Numerator, baselength.Denominator * 4);
                const higherPitch: Pitch = baseNote.Pitch.getTransposedPitch(1);
                const alteration: AccidentalEnum = activeKey.getAlterationForPitch(higherPitch);
                this.createBaseVoiceEntry(currentTimestamp, length, baseVoice, baseNote, voiceEntries);
                currentTimestamp.Add(length);
                this.createAlteratedVoiceEntry(currentTimestamp, length, baseVoice, higherPitch, alteration, voiceEntries);
                length.Denominator = baselength.Denominator * 2;
                currentTimestamp = Fraction.plus(baseTimestamp, length);
                this.createBaseVoiceEntry(currentTimestamp, length, baseVoice, baseNote, voiceEntries);
                break;
            }
            case OrnamentEnum.InvertedMordent: {
                const length: Fraction = new Fraction(baselength.Numerator, baselength.Denominator * 4);
                const lowerPitch: Pitch = baseNote.Pitch.getTransposedPitch(-1);
                const alteration: AccidentalEnum = activeKey.getAlterationForPitch(lowerPitch);
                this.createBaseVoiceEntry(currentTimestamp, length, baseVoice, baseNote, voiceEntries);
                currentTimestamp.Add(length);
                this.createAlteratedVoiceEntry(currentTimestamp, length, baseVoice, lowerPitch, alteration, voiceEntries);
                length.Denominator = baselength.Denominator * 2;
                currentTimestamp = Fraction.plus(baseTimestamp, length);
                this.createBaseVoiceEntry(currentTimestamp, length, baseVoice, baseNote, voiceEntries);
                break;
            }
            default:
                throw new RangeError();
        }
        return voiceEntries;
    }
    private createBaseVoiceEntry(
        currentTimestamp: Fraction, length: Fraction, baseVoice: Voice, baseNote: Note, voiceEntries: VoiceEntry[]
    ): void {
        const voiceEntry: VoiceEntry = new VoiceEntry(currentTimestamp, baseVoice, baseNote.ParentStaffEntry);
        const pitch: Pitch = new Pitch(baseNote.Pitch.FundamentalNote, baseNote.Pitch.Octave, baseNote.Pitch.Accidental);
        const note: Note = new Note(voiceEntry, undefined, length, pitch);
        voiceEntry.Notes.push(note);
        voiceEntries.push(voiceEntry);
    }
    private createAlteratedVoiceEntry(
        currentTimestamp: Fraction, length: Fraction, baseVoice: Voice, higherPitch: Pitch,
        alteration: AccidentalEnum, voiceEntries: VoiceEntry[]
    ): void {
        const voiceEntry: VoiceEntry = new VoiceEntry(currentTimestamp, baseVoice, undefined);
        const pitch: Pitch = new Pitch(higherPitch.FundamentalNote, higherPitch.Octave, alteration);
        const note: Note = new Note(voiceEntry, undefined, length, pitch);
        voiceEntry.Notes.push(note);
        voiceEntries.push(voiceEntry);
    }

}

export enum ArticulationEnum {
    accent,
    strongaccent,
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
    otherarticulation
}

export enum StemDirectionType {
    Undefined = -1,
    Up = 0,
    Down = 1,
    None = 2
}
