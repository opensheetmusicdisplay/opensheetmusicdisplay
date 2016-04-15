export class Repetition extends PartListEntry implements IRepetition {
    constructor(musicSheet: MusicSheet) {
        super(musicSheet);
        this.musicSheet = musicSheet;
    }
    constructor(musicSheet: MusicSheet, virtualOverallRepetition: boolean) {
        super(musicSheet);
        this.musicSheet = musicSheet;
        this.virtualOverallRepetition = virtualOverallRepetition;
    }
    private backwardJumpInstructions: List<RepetitionInstruction> = new List<RepetitionInstruction>();
    private endingParts: List<RepetitionEndingPart> = new List<RepetitionEndingPart>();
    private endingIndexDict: Dictionary<number, RepetitionEndingPart> = new Dictionary<number, RepetitionEndingPart>();
    private userNumberOfRepetitions: number = 0;
    private visibles: List<boolean> = new List<boolean>();
    private fromWords: boolean = false;
    private musicSheet: MusicSheet;
    private repetitonIterationOrder: List<number> = new List<number>();
    private numberOfEndings: number = 1;
    private virtualOverallRepetition: boolean;
    public StartMarker: RepetitionInstruction;
    public EndMarker: RepetitionInstruction;
    public ForwardJumpInstruction: RepetitionInstruction;
    public get BackwardJumpInstructions(): List<RepetitionInstruction> {
        return this.backwardJumpInstructions;
    }
    public get EndingIndexDict(): Dictionary<number, RepetitionEndingPart> {
        return this.endingIndexDict;
    }
    public get EndingParts(): List<RepetitionEndingPart> {
        return this.endingParts;
    }
    public get Visibles(): List<boolean> {
        return this.visibles;
    }
    public set Visibles(value: List<boolean>) {
        this.visibles = value;
    }
    public get DefaultNumberOfRepetitions(): number {
        var defaultNumber: number = 2;
        if (this.virtualOverallRepetition)
            defaultNumber = 1;
        return Math.Max(Math.Max(defaultNumber, this.endingIndexDict.Count), this.checkRepetitionForMultipleLyricVerses());
    }
    public get UserNumberOfRepetitions(): number {
        return this.userNumberOfRepetitions;
    }
    public set UserNumberOfRepetitions(value: number) {
        this.userNumberOfRepetitions = value;
        this.repetitonIterationOrder.Clear();
        var endingsDiff: number = this.userNumberOfRepetitions - this.NumberOfEndings;
        for (var i: number = 1; i <= this.userNumberOfRepetitions; i++) {
            if (i <= endingsDiff)
                this.repetitonIterationOrder.Add(1);
            else {
                this.repetitonIterationOrder.Add(i - endingsDiff);
            }
        }
    }
    public getForwardJumpTargetForIteration(iteration: number): number {
        var endingIndex: number = this.repetitonIterationOrder[iteration - 1];
        if (this.endingIndexDict.ContainsKey(endingIndex))
            return this.endingIndexDict[endingIndex].part.StartIndex;
        return -1;
    }
    public getBackwardJumpTarget(): number {
        return this.StartMarker.MeasureIndex;
    }
    public SetEndingStartIndex(endingNumbers: List<number>, startIndex: number): void {
        var part: RepetitionEndingPart = new RepetitionEndingPart(new SourceMusicPart(this.musicSheet, startIndex, startIndex));
        this.endingParts.Add(part);
        for (var idx: number = 0, len = endingNumbers.Count; idx < len; ++idx) {
            var endingNumber: number = endingNumbers[idx];
            try {
                this.endingIndexDict.Add(endingNumber, part);
                part.endingIndices.Add(endingNumber);
                if (this.numberOfEndings < endingNumber)
                    this.numberOfEndings = endingNumber;
            }
            catch (err) {

            }

        }
    }
    public SetEndingStartIndex(endingNumber: number, startIndex: number): void {
        var part: RepetitionEndingPart = new RepetitionEndingPart(new SourceMusicPart(this.musicSheet, startIndex, startIndex));
        this.endingParts.Add(part);
        this.endingIndexDict.Add(endingNumber, part);
        part.endingIndices.Add(endingNumber);
        if (this.numberOfEndings < endingNumber)
            this.numberOfEndings = endingNumber;
    }
    public setEndingEndIndex(endingNumber: number, endIndex: number): void {
        if (this.endingIndexDict.ContainsKey(endingNumber)) {
            this.endingIndexDict[endingNumber].part.setEndIndex(endIndex);
        }
    }
    public get NumberOfEndings(): number {
        return this.numberOfEndings;
    }
    public get FromWords(): boolean {
        return this.fromWords;
    }
    public set FromWords(value: boolean) {
        this.fromWords = value;
    }
    public get AbsoluteTimestamp(): Fraction {
        return new Fraction(this.musicSheet.SourceMeasures[this.StartMarker.MeasureIndex].AbsoluteTimestamp);
    }
    public get StartIndex(): number {
        return this.StartMarker.MeasureIndex;
    }
    public get EndIndex(): number {
        if (this.BackwardJumpInstructions.Count == 0)
            return this.StartIndex;
        var result: number = this.BackwardJumpInstructions.Last().MeasureIndex;
        if (this.endingIndexDict.ContainsKey(this.NumberOfEndings))
            result = Math.Max(this.endingIndexDict[this.NumberOfEndings].part.EndIndex, result);
        return result;
    }
    private checkRepetitionForMultipleLyricVerses(): number {
        var lyricVerses: number = 0;
        var start: number = this.StartIndex;
        var end: number = this.EndIndex;
        for (var measureIndex: number = start; measureIndex <= end; measureIndex++) {
            var sourceMeasure: SourceMeasure = this.musicSheet.SourceMeasures[measureIndex];
            for (var i: number = 0; i < sourceMeasure.CompleteNumberOfStaves; i++) {
                for (var j: number = 0; j < sourceMeasure.VerticalSourceStaffEntryContainers.Count; j++) {
                    if (sourceMeasure.VerticalSourceStaffEntryContainers[j][i] != null) {
                        var sourceStaffEntry: SourceStaffEntry = sourceMeasure.VerticalSourceStaffEntryContainers[j][i];
                        var verses: number = 0;
                        for (var idx: number = 0, len = sourceStaffEntry.VoiceEntries.Count; idx < len; ++idx) {
                            var voiceEntry: VoiceEntry = sourceStaffEntry.VoiceEntries[idx];
                            verses += voiceEntry.LyricsEntries.Count;
                        }
                        lyricVerses = Math.Max(lyricVerses, verses);
                    }
                }
            }
        }
        return lyricVerses;
    }
    public get FirstSourceMeasureNumber(): number {
        return getFirstSourceMeasure().MeasureNumber;
    }
    public get LastSourceMeasureNumber(): number {
        return getLastSourceMeasure().MeasureNumber;
    }
}
export module Repetition {
    export class RepetitionEndingPart {
        constructor(endingPart: SourceMusicPart) {
            this.part = endingPart;
        }
        public part: SourceMusicPart;
        public endingIndices: List<number> = new List<number>();
        public ToString(): string {
            var result: string = "";
            if (this.endingIndices.Count > 0)
                result += this.endingIndices[0];
            for (var i: number = 1; i < this.endingIndices.Count; i++) {
                result += ", " + this.endingIndices[i];
            }
            return result;
        }
    }
}