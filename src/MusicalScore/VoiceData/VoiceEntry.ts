export class VoiceEntry {
    constructor(timestamp: Fraction, parentVoice: Voice, parentSourceStaffEntry: SourceStaffEntry) {
        this.timestamp = timestamp;
        this.parentVoice = parentVoice;
        this.parentSourceStaffEntry = parentSourceStaffEntry;
    }
    public GraceVoiceEntriesBefore: List<VoiceEntry>;
    public GraceVoiceEntriesAfter: List<VoiceEntry>;
    private parentVoice: Voice;
    private parentSourceStaffEntry: SourceStaffEntry;
    private timestamp: Fraction;
    private notes: List<Note> = new List<Note>();
    private articulations: List<ArticulationEnum> = new List<ArticulationEnum>();
    private technicalInstructions: List<TechnicalInstruction> = new List<TechnicalInstruction>();
    private lyricsEntries: Dictionary<number, LyricsEntry> = new Dictionary<number, LyricsEntry>();
    private arpeggiosNotesIndices: List<number> = new List<number>();
    private ornamentContainer: OrnamentContainer;
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
    public get Notes(): List<Note> {
        return this.notes;
    }
    public get Articulations(): List<ArticulationEnum> {
        return this.articulations;
    }
    public get TechnicalInstructions(): List<TechnicalInstruction> {
        return this.technicalInstructions;
    }
    public get LyricsEntries(): Dictionary<number, LyricsEntry> {
        return this.lyricsEntries;
    }
    public set LyricsEntries(value: Dictionary<number, LyricsEntry>) {
        this.lyricsEntries = value;
    }
    public get ArpeggiosNotesIndices(): List<number> {
        return this.arpeggiosNotesIndices;
    }
    public set ArpeggiosNotesIndices(value: List<number>) {
        this.arpeggiosNotesIndices = value;
    }
    public get OrnamentContainer(): OrnamentContainer {
        return this.ornamentContainer;
    }
    public set OrnamentContainer(value: OrnamentContainer) {
        this.ornamentContainer = value;
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
        for (var idx: number = 0, len = this.Notes.Count; idx < len; ++idx) {
            var note: Note = this.Notes[idx];
            if (note.NoteTie != null)
                return true;
        }
        return false;
    }
    public hasSlur(): boolean {
        for (var idx: number = 0, len = this.Notes.Count; idx < len; ++idx) {
            var note: Note = this.Notes[idx];
            if (note.NoteSlurs.Count > 0)
                return true;
        }
        return false;
    }
    public isStaccato(): boolean {
        for (var idx: number = 0, len = this.Articulations.Count; idx < len; ++idx) {
            var articulation: ArticulationEnum = this.Articulations[idx];
            if (articulation == ArticulationEnum.staccato)
                return true;
        }
        return false;
    }
    public isAccent(): boolean {
        for (var idx: number = 0, len = this.Articulations.Count; idx < len; ++idx) {
            var articulation: ArticulationEnum = this.Articulations[idx];
            if (articulation == ArticulationEnum.accent || articulation == ArticulationEnum.strongaccent)
                return true;
        }
        return false;
    }
    public getVerseNumberForLyricEntry(lyricsEntry: LyricsEntry): number {
        var key: number = 1;
        var lyricsEntriesArr: KeyValuePair<number, LyricsEntry>[] = this.lyricsEntries.ToArray();
        for (var idx: number = 0, len = lyricsEntriesArr.length; idx < len; ++idx) {
            var keyValuePair: KeyValuePair<number, LyricsEntry> = lyricsEntriesArr[idx];
            if (lyricsEntry == keyValuePair.Value)
                key = keyValuePair.Key;
        }
        return key;
    }
    public createVoiceEntriesForOrnament(activeKey: KeyInstruction): List<VoiceEntry> {
        return this.createVoiceEntriesForOrnament(this, activeKey);
    }
    public createVoiceEntriesForOrnament(voiceEntryWithOrnament: VoiceEntry,
        activeKey: KeyInstruction): List<VoiceEntry> {
        var voiceEntries: List<VoiceEntry> = new List<VoiceEntry>();
        if (voiceEntryWithOrnament.ornamentContainer == null)
            return null;
        var baseNote: Note = this.notes[0];
        var baselength: Fraction = baseNote.calculateNoteLengthWithoutTie();
        var baseVoice: Voice = voiceEntryWithOrnament.ParentVoice;
        var baseTimestamp: Fraction = voiceEntryWithOrnament.Timestamp;
        var currentTimestamp: Fraction = new Fraction(baseTimestamp);
        var length: Fraction;
        switch (voiceEntryWithOrnament.ornamentContainer.GetOrnament) {
            case OrnamentEnum.Trill:
                {
                    length = new Fraction(baselength.Numerator, baselength.Denominator * 8);
                    var higherPitch: Pitch = baseNote.Pitch.getTransposedPitch(1);
                    var alteration: AccidentalEnum = activeKey.getAlterationForPitch(higherPitch);
                    if (voiceEntryWithOrnament.OrnamentContainer.AccidentalAbove != AccEnum.NONE)
                        alteration = <AccidentalEnum><number>voiceEntryWithOrnament.ornamentContainer.AccidentalAbove;
                    for (var i: number = 0; i < 8; i++) {
                        if ((i % 2) == 0) {
                            currentTimestamp = baseTimestamp + new Fraction(i * length.Numerator, length.Denominator);
                            this.createBaseVoiceEntry(currentTimestamp, length, baseVoice, baseNote, voiceEntries);
                        }
                        else {
                            currentTimestamp = baseTimestamp + new Fraction(i * length.Numerator, length.Denominator);
                            this.createAlteratedVoiceEntry(currentTimestamp, length, baseVoice, higherPitch, alteration,
                                voiceEntries);
                        }
                    }
                    break;
                }
            case OrnamentEnum.Turn:
                {
                    length = new Fraction(baselength.Numerator, baselength.Denominator * 4);
                    var lowerPitch: Pitch = baseNote.Pitch.getTransposedPitch(-1);
                    var lowerAlteration: AccidentalEnum = activeKey.getAlterationForPitch(lowerPitch);
                    var higherPitch: Pitch = baseNote.Pitch.getTransposedPitch(1);
                    var higherAlteration: AccidentalEnum = activeKey.getAlterationForPitch(higherPitch);
                    this.createAlteratedVoiceEntry(currentTimestamp, length, baseVoice, higherPitch, higherAlteration,
                        voiceEntries);
                    currentTimestamp += length;
                    this.createBaseVoiceEntry(currentTimestamp, length, baseVoice, baseNote, voiceEntries);
                    currentTimestamp += length;
                    this.createAlteratedVoiceEntry(currentTimestamp, length, baseVoice, lowerPitch, lowerAlteration,
                        voiceEntries);
                    currentTimestamp += length;
                    this.createBaseVoiceEntry(currentTimestamp, length, baseVoice, baseNote, voiceEntries);
                    break;
                }
            case OrnamentEnum.InvertedTurn:
                {
                    length = new Fraction(baselength.Numerator, baselength.Denominator * 4);
                    var lowerPitch: Pitch = baseNote.Pitch.getTransposedPitch(-1);
                    var lowerAlteration: AccidentalEnum = activeKey.getAlterationForPitch(lowerPitch);
                    var higherPitch: Pitch = baseNote.Pitch.getTransposedPitch(1);
                    var higherAlteration: AccidentalEnum = activeKey.getAlterationForPitch(higherPitch);
                    this.createAlteratedVoiceEntry(currentTimestamp, length, baseVoice, lowerPitch, lowerAlteration,
                        voiceEntries);
                    currentTimestamp += length;
                    this.createBaseVoiceEntry(currentTimestamp, length, baseVoice, baseNote, voiceEntries);
                    currentTimestamp += length;
                    this.createAlteratedVoiceEntry(currentTimestamp, length, baseVoice, higherPitch, higherAlteration,
                        voiceEntries);
                    currentTimestamp += length;
                    this.createBaseVoiceEntry(currentTimestamp, length, baseVoice, baseNote, voiceEntries);
                    break;
                }
            case OrnamentEnum.DelayedTurn:
                {
                    length = new Fraction(baselength.Numerator, baselength.Denominator * 2);
                    var lowerPitch: Pitch = baseNote.Pitch.getTransposedPitch(-1);
                    var lowerAlteration: AccidentalEnum = activeKey.getAlterationForPitch(lowerPitch);
                    var higherPitch: Pitch = baseNote.Pitch.getTransposedPitch(1);
                    var higherAlteration: AccidentalEnum = activeKey.getAlterationForPitch(higherPitch);
                    this.createBaseVoiceEntry(currentTimestamp, length, baseVoice, baseNote, voiceEntries);
                    currentTimestamp = baseTimestamp + new Fraction(length);
                    length.Denominator = baselength.Denominator * 8;
                    this.createAlteratedVoiceEntry(currentTimestamp, length, baseVoice, higherPitch, higherAlteration,
                        voiceEntries);
                    currentTimestamp += length;
                    this.createBaseVoiceEntry(currentTimestamp, length, baseVoice, baseNote, voiceEntries);
                    currentTimestamp += length;
                    this.createAlteratedVoiceEntry(currentTimestamp, length, baseVoice, lowerPitch, lowerAlteration,
                        voiceEntries);
                    currentTimestamp += length;
                    this.createBaseVoiceEntry(currentTimestamp, length, baseVoice, baseNote, voiceEntries);
                    break;
                }
            case OrnamentEnum.DelayedInvertedTurn:
                {
                    length = new Fraction(baselength.Numerator, baselength.Denominator * 2);
                    var lowerPitch: Pitch = baseNote.Pitch.getTransposedPitch(-1);
                    var lowerAlteration: AccidentalEnum = activeKey.getAlterationForPitch(lowerPitch);
                    var higherPitch: Pitch = baseNote.Pitch.getTransposedPitch(1);
                    var higherAlteration: AccidentalEnum = activeKey.getAlterationForPitch(higherPitch);
                    this.createBaseVoiceEntry(currentTimestamp, length, baseVoice, baseNote, voiceEntries);
                    currentTimestamp = baseTimestamp + new Fraction(length);
                    length.Denominator = baselength.Denominator * 8;
                    this.createAlteratedVoiceEntry(currentTimestamp, length, baseVoice, lowerPitch, lowerAlteration,
                        voiceEntries);
                    currentTimestamp += length;
                    this.createBaseVoiceEntry(currentTimestamp, length, baseVoice, baseNote, voiceEntries);
                    currentTimestamp += length;
                    this.createAlteratedVoiceEntry(currentTimestamp, length, baseVoice, higherPitch, higherAlteration,
                        voiceEntries);
                    currentTimestamp += length;
                    this.createBaseVoiceEntry(currentTimestamp, length, baseVoice, baseNote, voiceEntries);
                    break;
                }
            case OrnamentEnum.Mordent:
                {
                    length = new Fraction(baselength.Numerator, baselength.Denominator * 4);
                    var higherPitch: Pitch = baseNote.Pitch.getTransposedPitch(1);
                    var alteration: AccidentalEnum = activeKey.getAlterationForPitch(higherPitch);
                    this.createBaseVoiceEntry(currentTimestamp, length, baseVoice, baseNote, voiceEntries);
                    currentTimestamp += length;
                    this.createAlteratedVoiceEntry(currentTimestamp, length, baseVoice, higherPitch, alteration,
                        voiceEntries);
                    length.Denominator = baselength.Denominator * 2;
                    currentTimestamp = baseTimestamp + length;
                    this.createBaseVoiceEntry(currentTimestamp, length, baseVoice, baseNote, voiceEntries);
                    break;
                }
            case OrnamentEnum.InvertedMordent:
                {
                    length = new Fraction(baselength.Numerator, baselength.Denominator * 4);
                    var lowerPitch: Pitch = baseNote.Pitch.getTransposedPitch(-1);
                    var alteration: AccidentalEnum = activeKey.getAlterationForPitch(lowerPitch);
                    this.createBaseVoiceEntry(currentTimestamp, length, baseVoice, baseNote, voiceEntries);
                    currentTimestamp += length;
                    this.createAlteratedVoiceEntry(currentTimestamp, length, baseVoice, lowerPitch, alteration, voiceEntries);
                    length.Denominator = baselength.Denominator * 2;
                    currentTimestamp = baseTimestamp + length;
                    this.createBaseVoiceEntry(currentTimestamp, length, baseVoice, baseNote, voiceEntries);
                    break;
                }
            default:
                throw new ArgumentOutOfRangeException();
        }
        return voiceEntries;
    }
    private createBaseVoiceEntry(currentTimestamp: Fraction, length: Fraction, baseVoice: Voice, baseNote: Note,
        voiceEntries: List<VoiceEntry>): void {
        var voiceEntry: VoiceEntry = new VoiceEntry(currentTimestamp, baseVoice, baseNote.ParentStaffEntry);
        var pitch: Pitch = new Pitch(baseNote.Pitch.FundamentalNote, baseNote.Pitch.Octave, baseNote.Pitch.Accidental);
        var note: Note = new Note(voiceEntry, null, length, pitch);
        voiceEntry.Notes.Add(note);
        voiceEntries.Add(voiceEntry);
    }
    private createAlteratedVoiceEntry(currentTimestamp: Fraction, length: Fraction, baseVoice: Voice,
        higherPitch: Pitch, alteration: AccidentalEnum, voiceEntries: List<VoiceEntry>): void {
        var voiceEntry: VoiceEntry = new VoiceEntry(currentTimestamp, baseVoice, null);
        var pitch: Pitch = new Pitch(higherPitch.FundamentalNote, higherPitch.Octave, alteration);
        var note: Note = new Note(voiceEntry, null, length, pitch);
        voiceEntry.Notes.Add(note);
        voiceEntries.Add(voiceEntry);
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