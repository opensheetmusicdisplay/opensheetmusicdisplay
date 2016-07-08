import { Fraction } from "../../Common/DataObjects/fraction";
import { Voice } from "./Voice";
import { SourceStaffEntry } from "./SourceStaffEntry";
import { Note } from "./Note";
import { LyricsEntry } from "./Lyrics/LyricsEntry";
import { TechnicalInstruction } from "./Instructions/TechnicalInstruction";
import { OrnamentContainer } from "./OrnamentContainer";
import { KeyInstruction } from "./Instructions/KeyInstruction";
import Dictionary from "typescript-collections/dist/lib/Dictionary";
export declare class VoiceEntry {
    constructor(timestamp: Fraction, parentVoice: Voice, parentSourceStaffEntry: SourceStaffEntry);
    graceVoiceEntriesBefore: VoiceEntry[];
    graceVoiceEntriesAfter: VoiceEntry[];
    private parentVoice;
    private parentSourceStaffEntry;
    private timestamp;
    private notes;
    private articulations;
    private technicalInstructions;
    private lyricsEntries;
    private arpeggiosNotesIndices;
    private ornamentContainer;
    ParentSourceStaffEntry: SourceStaffEntry;
    ParentVoice: Voice;
    Timestamp: Fraction;
    Notes: Note[];
    Articulations: ArticulationEnum[];
    TechnicalInstructions: TechnicalInstruction[];
    LyricsEntries: Dictionary<number, LyricsEntry>;
    ArpeggiosNotesIndices: number[];
    OrnamentContainer: OrnamentContainer;
    static isSupportedArticulation(articulation: ArticulationEnum): boolean;
    hasTie(): boolean;
    hasSlur(): boolean;
    isStaccato(): boolean;
    isAccent(): boolean;
    getVerseNumberForLyricEntry(lyricsEntry: LyricsEntry): number;
    createVoiceEntriesForOrnament(voiceEntryWithOrnament: VoiceEntry, activeKey: KeyInstruction): VoiceEntry[];
    private createBaseVoiceEntry(currentTimestamp, length, baseVoice, baseNote, voiceEntries);
    private createAlteratedVoiceEntry(currentTimestamp, length, baseVoice, higherPitch, alteration, voiceEntries);
}
export declare enum ArticulationEnum {
    accent = 0,
    strongaccent = 1,
    invertedstrongaccent = 2,
    staccato = 3,
    staccatissimo = 4,
    spiccato = 5,
    tenuto = 6,
    fermata = 7,
    invertedfermata = 8,
    breathmark = 9,
    caesura = 10,
    lefthandpizzicato = 11,
    naturalharmonic = 12,
    snappizzicato = 13,
    upbow = 14,
    downbow = 15,
    scoop = 16,
    plop = 17,
    doit = 18,
    falloff = 19,
    stress = 20,
    unstress = 21,
    detachedlegato = 22,
    otherarticulation = 23,
}
