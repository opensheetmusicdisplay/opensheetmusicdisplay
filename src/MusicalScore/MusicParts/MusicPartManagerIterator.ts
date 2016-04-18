export class MusicPartManagerIterator {
    constructor(manager: MusicPartManager) {
        this(manager, undefined);

    }
    constructor(manager: MusicPartManager, startTimestamp: Fraction) {
        this(manager, startTimestamp, undefined);

    }
    constructor(manager: MusicPartManager, startTimestamp: Fraction, endTimestamp: Fraction) {
        try {
            this.frontReached = true;
            this.manager = manager;
            this.currentVoiceEntries = undefined;
            this.frontReached = false;
            for (let idx: number = 0, len: number = manager.MusicSheet.Repetitions.Count; idx < len; ++idx) {
                let rep: Repetition = manager.MusicSheet.Repetitions[idx];
                this.repetitionIterationCountDict.Add(rep, 1);
            }
            for (let i: number = 0; i < manager.MusicSheet.getCompleteNumberOfStaves(); i++) {
                this.activeDynamicExpressions.Add(undefined);
            }
            this.currentMeasure = this.manager.MusicSheet.SourceMeasures[0];
            if (startTimestamp === undefined) { return; }
            do {
                this.moveToNext();
            } while ((this.currentVoiceEntries === undefined || this.currentTimeStamp < startTimestamp) && !this.endReached);
            for (let staffIndex: number = 0; staffIndex < this.activeDynamicExpressions.Count; staffIndex++) {
                if (this.activeDynamicExpressions[staffIndex] !== undefined) {
                    if (this.activeDynamicExpressions[staffIndex] instanceof ContinuousDynamicExpression) {
                        let continuousDynamic: ContinuousDynamicExpression = <ContinuousDynamicExpression>this.activeDynamicExpressions[staffIndex];
                        this.currentDynamicChangingExpressions.Add(new DynamicsContainer(continuousDynamic, staffIndex));
                    } else {
                        let instantaniousDynamic: InstantaniousDynamicExpression = <InstantaniousDynamicExpression>this.activeDynamicExpressions[staffIndex];
                        this.currentDynamicChangingExpressions.Add(new DynamicsContainer(instantaniousDynamic, staffIndex));
                    }
                }
            }
            this.currentTempoChangingExpression = this.activeTempoExpression;
        } catch (err) {
            console.log("MusicPartManagerIterator: Exception."); // FIXME
        }

    }
    public BackJumpOccurred: boolean;
    public ForwardJumpOccurred: boolean;
    private manager: MusicPartManager;
    private currentMappingPart: MappingSourceMusicPart;
    private currentMeasure: SourceMeasure;
    private currentMeasureIndex: number = 0;
    private currentPartIndex: number = 0;
    private currentVoiceEntryIndex: number = -1;
    private currentDynamicEntryIndex: number = 0;
    private currentTempoEntryIndex: number = 0;
    private currentVoiceEntries: List<VoiceEntry>;
    private currentDynamicChangingExpressions: List<DynamicsContainer> = new List<DynamicsContainer>();
    private currentTempoChangingExpression: MultiTempoExpression;
    private repetitionIterationCountDict: Dictionary<Repetition, number> = new Dictionary<Repetition, number>();
    private currentRepetition: Repetition = undefined;
    private endReached: boolean = false;
    private frontReached: boolean = false;
    private currentTimeStamp: Fraction = new Fraction(new Fraction(0, 1));
    private currentEnrolledMeasureTimestamp: Fraction = new Fraction(new Fraction(0, 1));
    private currentVerticalContainerInMeasureTimestamp: Fraction = new Fraction(new Fraction(0, 1));
    private jumpResponsibleRepetition: Repetition = undefined;
    private activeDynamicExpressions: List<AbstractExpression> = new List<AbstractExpression>();
    private activeTempoExpression: MultiTempoExpression;
    public get EndReached(): boolean {
        return this.endReached;
    }
    public get FrontReached(): boolean {
        return this.frontReached;
    }
    public get CurrentMeasure(): SourceMeasure {
        return this.currentMeasure;
    }
    public get CurrentRepetition(): Repetition {
        return this.currentRepetition;
    }
    public get CurrentRepetitionIteration(): number {
        if (this.CurrentRepetition !== undefined) {
            return this.repetitionIterationCountDict[this.CurrentRepetition];
        }
        return 0;
    }
    public get CurrentJumpResponsibleRepetitionIterationBeforeJump(): number {
        if (this.jumpResponsibleRepetition !== undefined) {
            return this.repetitionIterationCountDict[this.jumpResponsibleRepetition] - 1;
        }
        return 0;
    }
    public get CurrentVoiceEntries(): List<VoiceEntry> {
        return this.currentVoiceEntries;
    }
    public get CurrentMeasureIndex(): number {
        return this.currentMeasureIndex;
    }
    public get CurrentEnrolledTimestamp(): Fraction {
        return this.currentEnrolledMeasureTimestamp + this.currentVerticalContainerInMeasureTimestamp;
    }
    public get CurrentSourceTimestamp(): Fraction {
        return this.currentTimeStamp;
    }
    public get JumpOccurred(): boolean {
        return this.BackJumpOccurred || this.ForwardJumpOccurred;
    }
    public get ActiveTempoExpression(): MultiTempoExpression {
        return this.activeTempoExpression;
    }
    public get ActiveDynamicExpressions(): List<AbstractExpression> {
        return this.activeDynamicExpressions;
    }
    public get CurrentTempoChangingExpression(): MultiTempoExpression {
        return this.currentTempoChangingExpression;
    }
    public get JumpResponsibleRepetition(): Repetition {
        return this.jumpResponsibleRepetition;
    }
    public clone(): MusicPartManagerIterator {
        let ret: MusicPartManagerIterator = new MusicPartManagerIterator(this.manager);
        ret.currentVoiceEntryIndex = this.currentVoiceEntryIndex;
        ret.currentMappingPart = this.currentMappingPart;
        ret.currentPartIndex = this.currentPartIndex;
        ret.currentVoiceEntries = this.currentVoiceEntries;
        ret.endReached = this.endReached;
        ret.frontReached = this.frontReached;
        return ret;
    }
    public CurrentVisibleVoiceEntries(instrument: Instrument): List<VoiceEntry> {
        let ret: List<VoiceEntry> = new List<VoiceEntry>();
        if (this.currentVoiceEntries === undefined) {
            return ret;
        }
        for (let idx: number = 0, len: number = this.currentVoiceEntries.Count; idx < len; ++idx) {
            let entry: VoiceEntry = this.currentVoiceEntries[idx];
            if (entry.ParentVoice.Parent.IdString === instrument.IdString) {
                this.getVisibleEntries(entry, ret);
                return ret;
            }
        }
        return ret;
    }
    public CurrentVisibleVoiceEntries(): List<VoiceEntry> {
        let voiceEntries: List<VoiceEntry> = new List<VoiceEntry>();
        if (this.currentVoiceEntries !== undefined) {
            for (let idx: number = 0, len: number = this.currentVoiceEntries.Count; idx < len; ++idx) {
                let entry: VoiceEntry = this.currentVoiceEntries[idx];
                this.getVisibleEntries(entry, voiceEntries);
            }
        }
        return voiceEntries;
    }
    public CurrentAudibleVoiceEntries(instrument: Instrument): List<VoiceEntry> {
        let ret: List<VoiceEntry> = new List<VoiceEntry>();
        if (this.currentVoiceEntries === undefined) {
            return ret;
        }
        for (let idx: number = 0, len: number = this.currentVoiceEntries.Count; idx < len; ++idx) {
            let entry: VoiceEntry = this.currentVoiceEntries[idx];
            if (entry.ParentVoice.Parent.IdString === instrument.IdString) {
                this.getAudibleEntries(entry, ret);
                return ret;
            }
        }
        return ret;
    }
    public CurrentAudibleVoiceEntries(): List<VoiceEntry> {
        let voiceEntries: List<VoiceEntry> = new List<VoiceEntry>();
        if (this.currentVoiceEntries !== undefined) {
            for (let idx: number = 0, len: number = this.currentVoiceEntries.Count; idx < len; ++idx) {
                let entry: VoiceEntry = this.currentVoiceEntries[idx];
                this.getAudibleEntries(entry, voiceEntries);
            }
        }
        return voiceEntries;
    }
    public getCurrentDynamicChangingExpressions(): List<DynamicsContainer> {
        return this.currentDynamicChangingExpressions;
    }
    public CurrentScoreFollowingVoiceEntries(instrument: Instrument): List<VoiceEntry> {
        let ret: List<VoiceEntry> = new List<VoiceEntry>();
        if (this.currentVoiceEntries === undefined) {
            return ret;
        }
        for (let idx: number = 0, len: number = this.currentVoiceEntries.Count; idx < len; ++idx) {
            let entry: VoiceEntry = this.currentVoiceEntries[idx];
            if (entry.ParentVoice.Parent.IdString === instrument.IdString) {
                this.getScoreFollowingEntries(entry, ret);
                return ret;
            }
        }
        return ret;
    }
    public CurrentScoreFollowingVoiceEntries(): List<VoiceEntry> {
        let voiceEntries: List<VoiceEntry> = new List<VoiceEntry>();
        if (this.currentVoiceEntries !== undefined) {
            for (let idx: number = 0, len: number = this.currentVoiceEntries.Count; idx < len; ++idx) {
                let entry: VoiceEntry = this.currentVoiceEntries[idx];
                this.getScoreFollowingEntries(entry, voiceEntries);
            }
        }
        return voiceEntries;
    }
    public currentPlaybackSettings(): PlaybackSettings {
        return this.manager.MusicSheet.SheetPlaybackSetting;
    }
    public moveToNext(): void {
        this.ForwardJumpOccurred = this.BackJumpOccurred = false;
        if (this.endReached) { return; }
        if (this.currentVoiceEntries !== undefined) {
            this.currentVoiceEntries.Clear();
        }
        this.recursiveMove();
        if (this.currentMeasure === undefined) {
            this.currentTimeStamp = new Fraction(99999, 1);
        }
    }
    public moveToNextVisibleVoiceEntry(notesOnly: boolean): void {
        while (!this.endReached) {
            this.moveToNext();
            if (this.checkEntries(notesOnly)) { return; }
        }
    }
    private resetRepetitionIterationCount(repetition: Repetition): number {
        this.setRepetitionIterationCount(repetition, 1);
        return 1;
    }
    private incrementRepetitionIterationCount(repetition: Repetition): number {
        if (this.repetitionIterationCountDict.ContainsKey(repetition)) {
            let newIteration: number = this.repetitionIterationCountDict[repetition] + 1;
            this.repetitionIterationCountDict[repetition] = newIteration;
            return newIteration;
        } else {
            this.repetitionIterationCountDict.Add(repetition, 1);
            return 1;
        }
    }
    private setRepetitionIterationCount(repetition: Repetition, iterationCount: number): void {
        if (this.repetitionIterationCountDict.ContainsKey(repetition)) {
            this.repetitionIterationCountDict[repetition] = iterationCount;
        } else {
            this.repetitionIterationCountDict.Add(repetition, iterationCount);
        }
    }
/*    private moveTempoIndexToTimestamp(measureNumber: number): void {
        for (let index: number = 0; index < this.manager.MusicSheet.TimestampSortedTempoExpressionsList.Count; index++) {
            if (this.manager.MusicSheet.TimestampSortedTempoExpressionsList[index].SourceMeasureParent.MeasureNumber >= measureNumber) {
                this.currentTempoEntryIndex = Math.Max(-1, index - 1);
                return
            }
        }
    }
    private getNextTempoEntryTimestamp(): Fraction {
        if (this.currentTempoEntryIndex >= this.manager.MusicSheet.TimestampSortedTempoExpressionsList.Count - 1) {
            return new Fraction(99999, 1);
        }
        return this.manager.MusicSheet.TimestampSortedTempoExpressionsList[this.currentTempoEntryIndex + 1].SourceMeasureParent.AbsoluteTimestamp +
        this.manager.MusicSheet.TimestampSortedTempoExpressionsList[this.currentTempoEntryIndex + 1].Timestamp;
    }
    private moveToNextDynamic(): void {
        this.currentDynamicEntryIndex++;
        this.currentDynamicChangingExpressions.Clear();
        let curDynamicEntry: DynamicsContainer = this.manager.MusicSheet.TimestampSortedDynamicExpressionsList[this.currentDynamicEntryIndex];
        this.currentDynamicChangingExpressions.Add(curDynamicEntry);
        let tsNow: Fraction = curDynamicEntry.parMultiExpression().AbsoluteTimestamp;
        for (let i: number = this.currentDynamicEntryIndex + 1; i < this.manager.MusicSheet.TimestampSortedDynamicExpressionsList.Count; i++) {
            curDynamicEntry = this.manager.MusicSheet.TimestampSortedDynamicExpressionsList[i];
            if ((curDynamicEntry.parMultiExpression().AbsoluteTimestamp !== tsNow)) { break; }
            this.currentDynamicEntryIndex = i;
            this.currentDynamicChangingExpressions.Add(curDynamicEntry);
        }
    }
    private moveDynamicIndexToTimestamp(absoluteTimestamp: Fraction): void {
        let dynamics: List<DynamicsContainer> = this.manager.MusicSheet.TimestampSortedDynamicExpressionsList;
        for (let index: number = 0; index < dynamics.Count; index++) {
            if (dynamics[index].parMultiExpression().AbsoluteTimestamp >= absoluteTimestamp) {
                this.currentDynamicEntryIndex = Math.Max(0, index - 1);
                return
            }
        }
    }
    private getNextDynamicsEntryTimestamp(): Fraction {
        if (this.currentDynamicEntryIndex >= this.manager.MusicSheet.TimestampSortedDynamicExpressionsList.Count - 1) {
            return new Fraction(99999, 1);
        }
        return this.manager.MusicSheet.TimestampSortedDynamicExpressionsList[this.currentDynamicEntryIndex + 1].parMultiExpression().AbsoluteTimestamp;
    }
    private handleRepetitionsAtMeasureBegin(): void {
        for (let idx: number = 0, len: number = this.currentMeasure.FirstRepetitionInstructions.Count; idx < len; ++idx) {
            let repetitionInstruction: RepetitionInstruction = this.currentMeasure.FirstRepetitionInstructions[idx];
            if (repetitionInstruction.ParentRepetition === undefined)
                continue;
            let currentRepetition: Repetition = repetitionInstruction.ParentRepetition;
            this.currentRepetition = currentRepetition;
            if (currentRepetition.StartIndex === this.currentMeasureIndex) {
                if (
                  this.JumpResponsibleRepetition !== undefined &&
                  currentRepetition !== this.JumpResponsibleRepetition &&
                  currentRepetition.StartIndex >= this.JumpResponsibleRepetition.StartIndex &&
                  currentRepetition.EndIndex <= this.JumpResponsibleRepetition.EndIndex
                ) {
                    this.resetRepetitionIterationCount(currentRepetition);
                }
            }
        }
    }
*/
    private handleRepetitionsAtMeasureEnd(): void {
        for (let idx: number = 0, len: number = this.currentMeasure.LastRepetitionInstructions.Count; idx < len; ++idx) {
            let repetitionInstruction: RepetitionInstruction = this.currentMeasure.LastRepetitionInstructions[idx];
            let currentRepetition: Repetition = repetitionInstruction.ParentRepetition;
            if (currentRepetition === undefined) { continue; }
            if (currentRepetition.BackwardJumpInstructions.Contains(repetitionInstruction)) {
                if (this.repetitionIterationCountDict[currentRepetition] < currentRepetition.UserNumberOfRepetitions) {
                    this.doBackJump(currentRepetition);
                    this.BackJumpOccurred = true;
                    return;
                }
            }
            if (repetitionInstruction === currentRepetition.ForwardJumpInstruction) {
                if (
                  this.JumpResponsibleRepetition !== undefined
                  && currentRepetition !== this.JumpResponsibleRepetition
                  && currentRepetition.StartIndex >= this.JumpResponsibleRepetition.StartIndex
                  && currentRepetition.EndIndex <= this.JumpResponsibleRepetition.EndIndex
                ) {
                    this.resetRepetitionIterationCount(currentRepetition);
                }

                let forwardJumpTargetMeasureIndex: number = currentRepetition.getForwardJumpTargetForIteration(
                  this.repetitionIterationCountDict[currentRepetition]
                );
                if (forwardJumpTargetMeasureIndex >= 0) {
                    this.currentMeasureIndex = forwardJumpTargetMeasureIndex;
                    this.currentMeasure = this.manager.MusicSheet.SourceMeasures[this.currentMeasureIndex];
                    this.currentVoiceEntryIndex = -1;
                    this.jumpResponsibleRepetition = currentRepetition;
                    this.ForwardJumpOccurred = true;
                    return;
                }
                if (forwardJumpTargetMeasureIndex === -2) {
                    this.endReached = true;
                }
            }
        }
        this.currentMeasureIndex++;
        if (this.JumpResponsibleRepetition !== undefined && this.currentMeasureIndex > this.JumpResponsibleRepetition.EndIndex) {
            this.jumpResponsibleRepetition = undefined;
        }
    }
    private doBackJump(currentRepetition: Repetition): void {
        this.currentMeasureIndex = currentRepetition.getBackwardJumpTarget();
        this.currentMeasure = this.manager.MusicSheet.SourceMeasures[this.currentMeasureIndex];
        this.currentVoiceEntryIndex = -1;
        this.incrementRepetitionIterationCount(currentRepetition);
        this.jumpResponsibleRepetition = currentRepetition;
    }
    private activateCurrentRhythmInstructions(): void {
        if (
          this.currentMeasure !== undefined &&
          this.currentMeasure.FirstInstructionsStaffEntries.Count > 0 &&
          this.currentMeasure.FirstInstructionsStaffEntries[0] !== undefined
        ) {
            let instructions: List<AbstractNotationInstruction> = this.currentMeasure.FirstInstructionsStaffEntries[0].Instructions;
            for (let idx: number = 0, len: number = instructions.Count; idx < len; ++idx) {
                let abstractNotationInstruction: AbstractNotationInstruction = instructions[idx];
                if (abstractNotationInstruction instanceof RhythmInstruction) {
                    this.manager.MusicSheet.SheetPlaybackSetting.Rhythm = (<RhythmInstruction>abstractNotationInstruction).Rhythm;
                }
            }
        }
    }
    private activateCurrentDynamicOrTempoInstructions(): void {
        let timeSortedDynamics: List<DynamicsContainer> = this.manager.MusicSheet.TimestampSortedDynamicExpressionsList;
        while (
          this.currentDynamicEntryIndex > 0 && (
            this.currentDynamicEntryIndex >= timeSortedDynamics.Count ||
            timeSortedDynamics[this.currentDynamicEntryIndex].parMultiExpression().AbsoluteTimestamp >= this.CurrentSourceTimestamp
          )
        ) {
            this.currentDynamicEntryIndex--;
        }
        while (
          this.currentDynamicEntryIndex < timeSortedDynamics.Count &&
          timeSortedDynamics[this.currentDynamicEntryIndex].parMultiExpression().AbsoluteTimestamp < this.CurrentSourceTimestamp
        ) {
            this.currentDynamicEntryIndex++;
        }
        while (
          this.currentDynamicEntryIndex < timeSortedDynamics.Count
          && timeSortedDynamics[this.currentDynamicEntryIndex].parMultiExpression().AbsoluteTimestamp === this.CurrentSourceTimestamp
        ) {
            let dynamicsContainer: DynamicsContainer = timeSortedDynamics[this.currentDynamicEntryIndex];
            let staffIndex: number = dynamicsContainer.StaffNumber;
            if (this.CurrentSourceTimestamp === dynamicsContainer.parMultiExpression().AbsoluteTimestamp) {
                if (dynamicsContainer.ContinuousDynamicExpression !== undefined) {
                    this.activeDynamicExpressions[staffIndex] = dynamicsContainer.ContinuousDynamicExpression;
                } else if (dynamicsContainer.InstantaniousDynamicExpression !== undefined) {
                    this.activeDynamicExpressions[staffIndex] = dynamicsContainer.InstantaniousDynamicExpression;
                }
            }
            this.currentDynamicEntryIndex++;
        }
        this.currentDynamicChangingExpressions.Clear();
        for (let staffIndex: number = 0; staffIndex < this.activeDynamicExpressions.Count; staffIndex++) {
            if (this.activeDynamicExpressions[staffIndex] !== undefined) {
                let startTime: Fraction;
                let endTime: Fraction;
                if (this.activeDynamicExpressions[staffIndex] instanceof ContinuousDynamicExpression) {
                    let continuousDynamic: ContinuousDynamicExpression = <ContinuousDynamicExpression>this.activeDynamicExpressions[staffIndex];
                    startTime = continuousDynamic.StartMultiExpression.AbsoluteTimestamp;
                    endTime = continuousDynamic.EndMultiExpression.AbsoluteTimestamp;
                    if (this.CurrentSourceTimestamp >= startTime && this.CurrentSourceTimestamp <= endTime) {
                        this.currentDynamicChangingExpressions.Add(new DynamicsContainer(continuousDynamic, staffIndex));
                    }
                } else {
                    let instantaniousDynamic: InstantaniousDynamicExpression = <InstantaniousDynamicExpression>this.activeDynamicExpressions[staffIndex];
                    if (this.CurrentSourceTimestamp === instantaniousDynamic.ParentMultiExpression.AbsoluteTimestamp) {
                        this.currentDynamicChangingExpressions.Add(new DynamicsContainer(instantaniousDynamic, staffIndex));
                    }
                }
            }
        }
        let timeSortedTempoExpressions: List<MultiTempoExpression> = this.manager.MusicSheet.TimestampSortedTempoExpressionsList;

        while (this.currentTempoEntryIndex > 0 && (
          this.currentTempoEntryIndex >= timeSortedTempoExpressions.Count
          || timeSortedTempoExpressions[this.currentTempoEntryIndex].AbsoluteTimestamp >= this.CurrentSourceTimestamp
        )) {
            this.currentTempoEntryIndex--;
        }

        while (
          this.currentTempoEntryIndex < timeSortedTempoExpressions.Count &&
          timeSortedTempoExpressions[this.currentTempoEntryIndex].AbsoluteTimestamp < this.CurrentSourceTimestamp
        ) {
            this.currentTempoEntryIndex++;
        }

        while (
          this.currentTempoEntryIndex < timeSortedTempoExpressions.Count
          && timeSortedTempoExpressions[this.currentTempoEntryIndex]
              .AbsoluteTimestamp === this.CurrentSourceTimestamp
        ) {
            this.activeTempoExpression = timeSortedTempoExpressions[this.currentTempoEntryIndex];
            this.currentTempoEntryIndex++;
        }
        this.currentTempoChangingExpression = undefined;
        if (this.activeTempoExpression !== undefined) {
            let endTime: Fraction = this.activeTempoExpression.AbsoluteTimestamp;
            if (this.activeTempoExpression.ContinuousTempo !== undefined) {
                endTime = this.activeTempoExpression.ContinuousTempo.AbsoluteEndTimestamp;
            }
            if (this.CurrentSourceTimestamp >= this.activeTempoExpression.AbsoluteTimestamp || this.CurrentSourceTimestamp <= endTime) {
                this.currentTempoChangingExpression = this.activeTempoExpression;
            }
        }
    }
    private recursiveMove(): void {
        this.currentVoiceEntryIndex++;
        if (this.currentVoiceEntryIndex === 0) {
            this.handleRepetitionsAtMeasureBegin();
            this.activateCurrentRhythmInstructions();
        }
        if (this.currentVoiceEntryIndex >= 0 && this.currentVoiceEntryIndex < this.currentMeasure.VerticalSourceStaffEntryContainers.Count) {
            let currentContainer: VerticalSourceStaffEntryContainer = this.currentMeasure.VerticalSourceStaffEntryContainers[this.currentVoiceEntryIndex];
            this.currentVoiceEntries = this.getVoiceEntries(currentContainer);
            this.currentVerticalContainerInMeasureTimestamp = currentContainer.Timestamp;
            this.currentTimeStamp = new Fraction(this.currentMeasure.AbsoluteTimestamp + this.currentVerticalContainerInMeasureTimestamp);
            if (this.currentTimeStamp >= this.manager.MusicSheet.SelectionEnd) {
                this.endReached = true;
            }
            this.activateCurrentDynamicOrTempoInstructions();
            return;
        }
        this.currentEnrolledMeasureTimestamp.Add(this.currentMeasure.Duration);
        this.handleRepetitionsAtMeasureEnd();
        if (this.currentMeasureIndex >= 0 && this.currentMeasureIndex < this.manager.MusicSheet.SourceMeasures.Count) {
            this.currentMeasure = this.manager.MusicSheet.SourceMeasures[this.currentMeasureIndex];
            this.currentTimeStamp = new Fraction(this.currentMeasure.AbsoluteTimestamp + this.currentVerticalContainerInMeasureTimestamp);
            this.currentVoiceEntryIndex = -1;
            this.recursiveMove();
            return;
        }
        this.currentVerticalContainerInMeasureTimestamp = new Fraction();
        this.currentMeasure = undefined;
        this.currentVoiceEntries = undefined;
        this.endReached = true;
    }
    private checkEntries(notesOnly: boolean): boolean {
        let tlist: List<VoiceEntry> = this.CurrentVisibleVoiceEntries();
        if (tlist.Count > 0) {
            if (!notesOnly) { return true; }
            for (let idx: number = 0, len: number = tlist.Count; idx < len; ++idx) {
                let entry: VoiceEntry = tlist[idx];
                if (entry.Notes[0].Pitch !== undefined) { return true; }
            }
        }
        return false;
    }
    private getVisibleEntries(entry: VoiceEntry, visibleEntries: List<VoiceEntry>): void {
        if (entry.ParentVoice.Visible) {
            visibleEntries.Add(entry);
        }
    }
    private getAudibleEntries(entry: VoiceEntry, audibleEntries: List<VoiceEntry>): void {
        if (entry.ParentVoice.Audible) {
            audibleEntries.Add(entry);
        }
    }
    private getScoreFollowingEntries(entry: VoiceEntry, followingEntries: List<VoiceEntry>): void {
        if (entry.ParentVoice.Following && entry.ParentVoice.Parent.Following) {
            followingEntries.Add(entry);
        }
    }
    private getVoiceEntries(container: VerticalSourceStaffEntryContainer): List<VoiceEntry> {
        let entries: List<VoiceEntry> = new List<VoiceEntry>();
        for (let idx: number = 0, len: number = container.StaffEntries.Count; idx < len; ++idx) {
            let sourceStaffEntry: SourceStaffEntry = container.StaffEntries[idx];
            if (sourceStaffEntry === undefined) { continue; }
            for (let idx2: number = 0, len2: number = sourceStaffEntry.VoiceEntries.Count; idx2 < len2; ++idx2) {
                let voiceEntry: VoiceEntry = sourceStaffEntry.VoiceEntries[idx2];
                entries.Add(voiceEntry);
            }
        }
        return entries;
    }
}
