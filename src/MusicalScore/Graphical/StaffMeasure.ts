module PhonicScore.MusicalScore.Graphical.SheetData {
    export class StaffMeasure extends GraphicalObject {
        protected firstInstructionStaffEntry: GraphicalStaffEntry;
        protected lastInstructionStaffEntry: GraphicalStaffEntry;
        private staff: Staff;
        private measureNumber: number = -1;
        private parentStaffLine: StaffLine;
        constructor(staff: Staff, parentSourceMeasure: SourceMeasure) {
            this.staff = staff;
            this.ParentSourceMeasure = parentSourceMeasure;
            this.StaffEntries = new List<GraphicalStaffEntry>();
            if (this.ParentSourceMeasure != null)
                this.measureNumber = this.ParentSourceMeasure.MeasureNumber;
        }
        constructor(staffLine: StaffLine) {
            this.parentStaffLine = staffLine;
            this.staff = staffLine.ParentStaff;
            this.StaffEntries = new List<GraphicalStaffEntry>();
        }
        public ParentSourceMeasure: SourceMeasure;
        public StaffEntries: List<GraphicalStaffEntry>;
        public ParentMusicSystem: MusicSystem;
        public BeginInstructionsWidth: number;
        public MinimumStaffEntriesWidth: number;
        public StaffEntriesScaleFactor: number;
        public EndInstructionsWidth: number;
        public hasError: boolean;
        public get ParentStaff(): Staff {
            return this.staff;
        }
        public get MeasureNumber(): number {
            return this.measureNumber;
        }
        public get FirstInstructionStaffEntry(): GraphicalStaffEntry {
            return this.firstInstructionStaffEntry;
        }
        public set FirstInstructionStaffEntry(value: GraphicalStaffEntry) {
            this.firstInstructionStaffEntry = value;
        }
        public get LastInstructionStaffEntry(): GraphicalStaffEntry {
            return this.lastInstructionStaffEntry;
        }
        public set LastInstructionStaffEntry(value: GraphicalStaffEntry) {
            this.lastInstructionStaffEntry = value;
        }
        public get ParentStaffLine(): StaffLine {
            return this.parentStaffLine;
        }
        public set ParentStaffLine(value: StaffLine) {
            this.parentStaffLine = value;
            if (this.parentStaffLine != null)
                PositionAndShape.Parent = this.parentStaffLine.PositionAndShape;
        }
        public ResetLayout(): void { throw new Error('not implemented'); }
        public GetLineWidth(line: SystemLinesEnum): number { throw new Error('not implemented'); }
        public AddClefAtBegin(clef: ClefInstruction): void { throw new Error('not implemented'); }
        public AddKeyAtBegin(currentKey: KeyInstruction, previousKey: KeyInstruction, currentClef: ClefInstruction): void { throw new Error('not implemented'); }
        public AddRhythmAtBegin(rhythm: RhythmInstruction): void { throw new Error('not implemented'); }
        public AddClefAtEnd(clef: ClefInstruction): void { throw new Error('not implemented'); }
        public SetPositionInStaffline(xPos: number): void { throw new Error('not implemented'); }
        public SetWidth(width: number): void { throw new Error('not implemented'); }
        public LayoutSymbols(): void { throw new Error('not implemented'); }
        public findGraphicalStaffEntryFromTimestamp(relativeTimestamp: Fraction): GraphicalStaffEntry {
            for (var idx: number = 0, len = this.StaffEntries.Count; idx < len; ++idx) {
                var graphicalStaffEntry: GraphicalStaffEntry = this.StaffEntries[idx];
                if (graphicalStaffEntry.RelInMeasureTimestamp == relativeTimestamp)
                    return graphicalStaffEntry;
            }
            return null;
        }
        public findGraphicalStaffEntryFromVerticalContainerTimestamp(absoluteTimestamp: Fraction): GraphicalStaffEntry {
            for (var idx: number = 0, len = this.StaffEntries.Count; idx < len; ++idx) {
                var graphicalStaffEntry: GraphicalStaffEntry = this.StaffEntries[idx];
                if (graphicalStaffEntry.SourceStaffEntry.VerticalContainerParent.getAbsoluteTimestamp() == absoluteTimestamp)
                    return graphicalStaffEntry;
            }
            return null;
        }
        public hasSameDurationWithSourceMeasureParent(): boolean {
            var duration: Fraction = new Fraction(0, 1);
            for (var idx: number = 0, len = this.StaffEntries.Count; idx < len; ++idx) {
                var graphicalStaffEntry: GraphicalStaffEntry = this.StaffEntries[idx];
                duration.Add(graphicalStaffEntry.findStaffEntryMinNoteLength());
            }
            return duration == this.ParentSourceMeasure.Duration;
        }
        public hasMultipleVoices(): boolean {
            if (this.StaffEntries.Count == 0)
                return false;
            var voices: List<Voice> = new List<Voice>();
            for (var idx: number = 0, len = this.StaffEntries.Count; idx < len; ++idx) {
                var staffEntry: GraphicalStaffEntry = this.StaffEntries[idx];
                for (var idx2: number = 0, len2 = staffEntry.SourceStaffEntry.VoiceEntries.Count; idx2 < len2; ++idx2) {
                    var voiceEntry: VoiceEntry = staffEntry.SourceStaffEntry.VoiceEntries[idx2];
                    if (!voices.Contains(voiceEntry.ParentVoice))
                        voices.Add(voiceEntry.ParentVoice);
                }
            }
            if (voices.Count > 1)
                return true;
            return false;
        }
        public isVisible(): boolean {
            return this.ParentStaff.ParentInstrument.Visible;
        }
        public getGraphicalMeasureDurationFromStaffEntries(): Fraction {
            var duration: Fraction = new Fraction(0, 1);
            var voices: List<Voice> = new List<Voice>();
            for (var idx: number = 0, len = this.StaffEntries.Count; idx < len; ++idx) {
                var graphicalStaffEntry: GraphicalStaffEntry = this.StaffEntries[idx];
                for (var idx2: number = 0, len2 = graphicalStaffEntry.SourceStaffEntry.VoiceEntries.Count; idx2 < len2; ++idx2) {
                    var voiceEntry: VoiceEntry = graphicalStaffEntry.SourceStaffEntry.VoiceEntries[idx2];
                    if (!voices.Contains(voiceEntry.ParentVoice))
                        voices.Add(voiceEntry.ParentVoice);
                }
            }
            for (var idx: number = 0, len = voices.Count; idx < len; ++idx) {
                var voice: Voice = voices[idx];
                var voiceDuration: Fraction = new Fraction(0, 1);
                for (var idx2: number = 0, len2 = this.StaffEntries.Count; idx2 < len2; ++idx2) {
                    var graphicalStaffEntry: GraphicalStaffEntry = this.StaffEntries[idx2];
                    for (var idx3: number = 0, len3 = graphicalStaffEntry.Notes.Count; idx3 < len3; ++idx3) {
                        var graphicalNotes: List<GraphicalNote> = graphicalStaffEntry.Notes[idx3];
                        if (graphicalNotes.Count > 0 && graphicalNotes[0].SourceNote.ParentVoiceEntry.ParentVoice == voice)
                            voiceDuration.Add(graphicalNotes[0].GraphicalNoteLength);
                    }
                }
                if (voiceDuration > duration)
                    duration = new Fraction(voiceDuration);
            }
            return duration;
        }
        public addGraphicalStaffEntry(graphicalStaffEntry: GraphicalStaffEntry): void {
            this.StaffEntries.Add(graphicalStaffEntry);
            PositionAndShape.ChildElements.Add(graphicalStaffEntry.PositionAndShape);
        }
        public addGraphicalStaffEntryAtTimestamp(staffEntry: GraphicalStaffEntry): void {
            if (staffEntry != null) {
                if (this.StaffEntries.Count == 0 || this.StaffEntries[this.StaffEntries.Count - 1].RelInMeasureTimestamp < staffEntry.RelInMeasureTimestamp)
                    this.StaffEntries.Add(staffEntry);
                else {
                    for (var i: number = this.StaffEntries.Count - 1; i >= 0; i--) {
                        if (this.StaffEntries[i].RelInMeasureTimestamp < staffEntry.RelInMeasureTimestamp) {
                            this.StaffEntries.Insert(i + 1, staffEntry);
                            break;
                        }
                        if (i == 0)
                            this.StaffEntries.Insert(i, staffEntry);
                    }
                }
                PositionAndShape.ChildElements.Add(staffEntry.PositionAndShape);
            }
        }
        public beginsWithLineRepetition(): boolean {
            var sourceMeasure: SourceMeasure = this.ParentSourceMeasure;
            if (sourceMeasure == null)
                return false;
            return sourceMeasure.beginsWithLineRepetition();
        }
        public endsWithLineRepetition(): boolean {
            var sourceMeasure: SourceMeasure = this.ParentSourceMeasure;
            if (sourceMeasure == null)
                return false;
            return sourceMeasure.endsWithLineRepetition();
        }
        public beginsWithWordRepetition(): boolean {
            var sourceMeasure: SourceMeasure = this.ParentSourceMeasure;
            if (sourceMeasure == null)
                return false;
            return sourceMeasure.beginsWithWordRepetition();
        }
        public endsWithWordRepetition(): boolean {
            var sourceMeasure: SourceMeasure = this.ParentSourceMeasure;
            if (sourceMeasure == null)
                return false;
            return sourceMeasure.endsWithWordRepetition();
        }
    }
}