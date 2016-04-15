export class SourceStaffEntry {
    constructor(verticalContainerParent: VerticalSourceStaffEntryContainer, parentStaff: Staff) {
        this.verticalContainerParent = verticalContainerParent;
        this.parentStaff = parentStaff;
    }
    private parentStaff: Staff;
    private verticalContainerParent: VerticalSourceStaffEntryContainer;
    private voiceEntries: List<VoiceEntry> = new List<VoiceEntry>();
    private staffEntryLink: StaffEntryLink;
    private instructions: List<AbstractNotationInstruction> = new List<AbstractNotationInstruction>();
    private graceVoiceEntriesBefore: List<VoiceEntry> = new List<VoiceEntry>();
    private graceVoiceEntriesAfter: List<VoiceEntry> = new List<VoiceEntry>();
    private chordSymbolContainer: ChordSymbolContainer;
    public get ParentStaff(): Staff {
        return this.parentStaff;
    }
    public get VerticalContainerParent(): VerticalSourceStaffEntryContainer {
        return this.verticalContainerParent;
    }
    public get Timestamp(): Fraction {
        if (this.VerticalContainerParent != null)
            return this.VerticalContainerParent.Timestamp;
        return null;
    }
    public get AbsoluteTimestamp(): Fraction {
        if (this.VerticalContainerParent != null)
            return this.VerticalContainerParent.ParentMeasure.AbsoluteTimestamp + this.VerticalContainerParent.Timestamp;
        return null;
    }
    public get VoiceEntries(): List<VoiceEntry> {
        return this.voiceEntries;
    }
    public set VoiceEntries(value: List<VoiceEntry>) {
        this.voiceEntries = value;
    }
    public get Link(): StaffEntryLink {
        return this.staffEntryLink;
    }
    public set Link(value: StaffEntryLink) {
        this.staffEntryLink = value;
    }
    public get Instructions(): List<AbstractNotationInstruction> {
        return this.instructions;
    }
    public set Instructions(value: List<AbstractNotationInstruction>) {
        this.instructions = value;
    }
    public get ChordContainer(): ChordSymbolContainer {
        return this.chordSymbolContainer;
    }
    public set ChordContainer(value: ChordSymbolContainer) {
        this.chordSymbolContainer = value;
    }
    public removeAllInstructionsOfType<T>(): number {
        var i: number = 0;
        var ret: number = 0;
        while (i < this.instructions.Count) {
            if (this.instructions[i] instanceof T) {
                this.instructions.RemoveAt(i);
                ret++;
            }
            else i++;
        }
        return ret;
    }
    public removeFirstInstructionOfType<T>(): boolean {
        for (var i: number = 0; i < this.instructions.Count; i++) {
            if (this.instructions[i] instanceof T) {
                this.instructions.RemoveAt(i);
                return true;
            }
        }
        return false;
    }
    public calculateMinNoteLength(): Fraction {
        var duration: Fraction = new Fraction(number.MaxValue, 1);
        for (var idx: number = 0, len = this.VoiceEntries.Count; idx < len; ++idx) {
            var voiceEntry: VoiceEntry = this.VoiceEntries[idx];
            for (var idx2: number = 0, len2 = voiceEntry.Notes.Count; idx2 < len2; ++idx2) {
                var note: Note = voiceEntry.Notes[idx2];
                if (note.NoteTie != null) {
                    if (duration > note.calculateNoteLengthWithoutTie())
                        duration = note.calculateNoteLengthWithoutTie();
                }
                else {
                    if (duration > note.Length)
                        duration = note.Length;
                }
            }
        }
        return duration;
    }
    public calculateMaxNoteLength(): Fraction {
        var duration: Fraction = new Fraction(0, 1);
        for (var idx: number = 0, len = this.VoiceEntries.Count; idx < len; ++idx) {
            var voiceEntry: VoiceEntry = this.VoiceEntries[idx];
            for (var idx2: number = 0, len2 = voiceEntry.Notes.Count; idx2 < len2; ++idx2) {
                var note: Note = voiceEntry.Notes[idx2];
                if (note.NoteTie != null) {
                    if (duration < note.calculateNoteLengthWithoutTie()) {
                        duration = note.calculateNoteLengthWithoutTie();
                        for (var idx3: number = 0, len3 = note.NoteTie.Fractions.Count; idx3 < len3; ++idx3) {
                            var fraction: Fraction = note.NoteTie.Fractions[idx3];
                            duration.Add(fraction);
                        }
                    }
                }
                else {
                    if (duration < note.Length)
                        duration = note.Length;
                }
            }
        }
        return duration;
    }
    public hasNotes(): boolean {
        for (var idx: number = 0, len = this.VoiceEntries.Count; idx < len; ++idx) {
            var voiceEntry: VoiceEntry = this.VoiceEntries[idx];
            if (voiceEntry.Notes.Count > 0)
                return true;
        }
        return false;
    }
    public hasTie(): boolean {
        for (var idx: number = 0, len = this.VoiceEntries.Count; idx < len; ++idx) {
            var voiceEntry: VoiceEntry = this.VoiceEntries[idx];
            if (voiceEntry.hasTie())
                return true;
        }
        return false;
    }
    public findLinkedNotes(linkedNotes: List<Note>): void {
        for (var idx: number = 0, len = this.voiceEntries.Count; idx < len; ++idx) {
            var voiceEntry: VoiceEntry = this.voiceEntries[idx];
            for (var idx2: number = 0, len2 = voiceEntry.Notes.Count; idx2 < len2; ++idx2) {
                var note: Note = voiceEntry.Notes[idx2];
                if (note.ParentStaffEntry == this)
                    linkedNotes.Add(note);
            }
        }
    }
}