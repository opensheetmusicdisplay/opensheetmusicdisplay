"use strict";
var fraction_1 = require("../../Common/DataObjects/fraction");
var DynamicsContainer_1 = require("../VoiceData/HelperObjects/DynamicsContainer");
var RhythmInstruction_1 = require("../VoiceData/Instructions/RhythmInstruction");
var continuousDynamicExpression_1 = require("../VoiceData/Expressions/ContinuousExpressions/continuousDynamicExpression");
var Logging_1 = require("../../Common/Logging");
var MusicPartManagerIterator = (function () {
    function MusicPartManagerIterator(manager, startTimestamp, endTimestamp) {
        this.currentMeasureIndex = 0;
        this.currentPartIndex = 0;
        this.currentVoiceEntryIndex = -1;
        this.currentDynamicEntryIndex = 0;
        this.currentTempoEntryIndex = 0;
        this.currentDynamicChangingExpressions = [];
        this.currentRepetition = undefined;
        this.endReached = false;
        this.frontReached = false;
        this.currentTimeStamp = new fraction_1.Fraction(0, 1);
        this.currentEnrolledMeasureTimestamp = new fraction_1.Fraction(0, 1);
        this.currentVerticalContainerInMeasureTimestamp = new fraction_1.Fraction(0, 1);
        this.jumpResponsibleRepetition = undefined;
        this.activeDynamicExpressions = [];
        try {
            this.frontReached = true;
            this.manager = manager;
            this.currentVoiceEntries = undefined;
            this.frontReached = false;
            for (var _i = 0, _a = manager.MusicSheet.Repetitions; _i < _a.length; _i++) {
                var rep = _a[_i];
                this.setRepetitionIterationCount(rep, 1);
            }
            this.activeDynamicExpressions = new Array(manager.MusicSheet.getCompleteNumberOfStaves());
            this.currentMeasure = this.manager.MusicSheet.SourceMeasures[0];
            if (startTimestamp === undefined) {
                return;
            }
            do {
                this.moveToNext();
            } while ((this.currentVoiceEntries === undefined || this.currentTimeStamp.lt(startTimestamp)) && !this.endReached);
            for (var staffIndex = 0; staffIndex < this.activeDynamicExpressions.length; staffIndex++) {
                if (this.activeDynamicExpressions[staffIndex] !== undefined) {
                    if (this.activeDynamicExpressions[staffIndex] instanceof continuousDynamicExpression_1.ContinuousDynamicExpression) {
                        var continuousDynamic = this.activeDynamicExpressions[staffIndex];
                        this.currentDynamicChangingExpressions.push(new DynamicsContainer_1.DynamicsContainer(continuousDynamic, staffIndex));
                    }
                    else {
                        var instantaniousDynamic = this.activeDynamicExpressions[staffIndex];
                        this.currentDynamicChangingExpressions.push(new DynamicsContainer_1.DynamicsContainer(instantaniousDynamic, staffIndex));
                    }
                }
            }
            this.currentTempoChangingExpression = this.activeTempoExpression;
        }
        catch (err) {
            Logging_1.Logging.log("MusicPartManagerIterator: " + err);
        }
    }
    Object.defineProperty(MusicPartManagerIterator.prototype, "EndReached", {
        get: function () {
            return this.endReached;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicPartManagerIterator.prototype, "FrontReached", {
        get: function () {
            return this.frontReached;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicPartManagerIterator.prototype, "CurrentMeasure", {
        get: function () {
            return this.currentMeasure;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicPartManagerIterator.prototype, "CurrentRepetition", {
        get: function () {
            return this.currentRepetition;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicPartManagerIterator.prototype, "CurrentRepetitionIteration", {
        get: function () {
            if (this.CurrentRepetition !== undefined) {
                return this.getRepetitionIterationCount(this.CurrentRepetition);
            }
            return 0;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicPartManagerIterator.prototype, "CurrentJumpResponsibleRepetitionIterationBeforeJump", {
        get: function () {
            if (this.jumpResponsibleRepetition !== undefined) {
                return this.getRepetitionIterationCount(this.jumpResponsibleRepetition) - 1;
            }
            return 0;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicPartManagerIterator.prototype, "CurrentVoiceEntries", {
        get: function () {
            return this.currentVoiceEntries;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicPartManagerIterator.prototype, "CurrentMeasureIndex", {
        get: function () {
            return this.currentMeasureIndex;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicPartManagerIterator.prototype, "CurrentEnrolledTimestamp", {
        get: function () {
            return fraction_1.Fraction.plus(this.currentEnrolledMeasureTimestamp, this.currentVerticalContainerInMeasureTimestamp);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicPartManagerIterator.prototype, "CurrentSourceTimestamp", {
        get: function () {
            return this.currentTimeStamp;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicPartManagerIterator.prototype, "JumpOccurred", {
        get: function () {
            return this.backJumpOccurred || this.forwardJumpOccurred;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicPartManagerIterator.prototype, "ActiveTempoExpression", {
        get: function () {
            return this.activeTempoExpression;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicPartManagerIterator.prototype, "ActiveDynamicExpressions", {
        get: function () {
            return this.activeDynamicExpressions;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicPartManagerIterator.prototype, "CurrentTempoChangingExpression", {
        get: function () {
            return this.currentTempoChangingExpression;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicPartManagerIterator.prototype, "JumpResponsibleRepetition", {
        get: function () {
            return this.jumpResponsibleRepetition;
        },
        enumerable: true,
        configurable: true
    });
    MusicPartManagerIterator.prototype.clone = function () {
        var ret = new MusicPartManagerIterator(this.manager);
        ret.currentVoiceEntryIndex = this.currentVoiceEntryIndex;
        ret.currentMappingPart = this.currentMappingPart;
        ret.currentPartIndex = this.currentPartIndex;
        ret.currentVoiceEntries = this.currentVoiceEntries;
        ret.endReached = this.endReached;
        ret.frontReached = this.frontReached;
        return ret;
    };
    MusicPartManagerIterator.prototype.CurrentVisibleVoiceEntries = function (instrument) {
        var voiceEntries = [];
        if (this.currentVoiceEntries === undefined) {
            return voiceEntries;
        }
        if (instrument !== undefined) {
            for (var _i = 0, _a = this.currentVoiceEntries; _i < _a.length; _i++) {
                var entry = _a[_i];
                if (entry.ParentVoice.Parent.IdString === instrument.IdString) {
                    this.getVisibleEntries(entry, voiceEntries);
                    return voiceEntries;
                }
            }
        }
        else {
            for (var _b = 0, _c = this.currentVoiceEntries; _b < _c.length; _b++) {
                var entry = _c[_b];
                this.getVisibleEntries(entry, voiceEntries);
            }
        }
        return voiceEntries;
    };
    MusicPartManagerIterator.prototype.CurrentAudibleVoiceEntries = function (instrument) {
        var voiceEntries = [];
        if (this.currentVoiceEntries === undefined) {
            return voiceEntries;
        }
        if (instrument !== undefined) {
            for (var _i = 0, _a = this.currentVoiceEntries; _i < _a.length; _i++) {
                var entry = _a[_i];
                if (entry.ParentVoice.Parent.IdString === instrument.IdString) {
                    this.getAudibleEntries(entry, voiceEntries);
                    return voiceEntries;
                }
            }
        }
        else {
            for (var _b = 0, _c = this.currentVoiceEntries; _b < _c.length; _b++) {
                var entry = _c[_b];
                this.getAudibleEntries(entry, voiceEntries);
            }
        }
        return voiceEntries;
    };
    MusicPartManagerIterator.prototype.getCurrentDynamicChangingExpressions = function () {
        return this.currentDynamicChangingExpressions;
    };
    MusicPartManagerIterator.prototype.CurrentScoreFollowingVoiceEntries = function (instrument) {
        var voiceEntries = [];
        if (this.currentVoiceEntries === undefined) {
            return voiceEntries;
        }
        if (instrument !== undefined) {
            for (var _i = 0, _a = this.currentVoiceEntries; _i < _a.length; _i++) {
                var entry = _a[_i];
                if (entry.ParentVoice.Parent.IdString === instrument.IdString) {
                    this.getScoreFollowingEntries(entry, voiceEntries);
                    return voiceEntries;
                }
            }
        }
        else {
            for (var _b = 0, _c = this.currentVoiceEntries; _b < _c.length; _b++) {
                var entry = _c[_b];
                this.getScoreFollowingEntries(entry, voiceEntries);
            }
        }
        return voiceEntries;
    };
    //public currentPlaybackSettings(): PlaybackSettings {
    //    return this.manager.MusicSheet.SheetPlaybackSetting;
    //}
    MusicPartManagerIterator.prototype.moveToNext = function () {
        this.forwardJumpOccurred = this.backJumpOccurred = false;
        if (this.endReached) {
            return;
        }
        if (this.currentVoiceEntries !== undefined) {
            this.currentVoiceEntries = [];
        }
        this.recursiveMove();
        if (this.currentMeasure === undefined) {
            this.currentTimeStamp = new fraction_1.Fraction(99999, 1);
        }
    };
    MusicPartManagerIterator.prototype.moveToNextVisibleVoiceEntry = function (notesOnly) {
        while (!this.endReached) {
            this.moveToNext();
            if (this.checkEntries(notesOnly)) {
                return;
            }
        }
    };
    MusicPartManagerIterator.prototype.resetRepetitionIterationCount = function (repetition) {
        this.setRepetitionIterationCount(repetition, 1);
        return 1;
    };
    MusicPartManagerIterator.prototype.incrementRepetitionIterationCount = function (repetition) {
        if (this.repetitionIterationCountDictKeys.indexOf(repetition) === -1) {
            return this.setRepetitionIterationCount(repetition, 1);
        }
        else {
            return this.setRepetitionIterationCount(repetition, this.getRepetitionIterationCount(repetition) + 1);
        }
    };
    MusicPartManagerIterator.prototype.setRepetitionIterationCount = function (repetition, iterationCount) {
        var i = this.repetitionIterationCountDictKeys.indexOf(repetition);
        if (i === -1) {
            this.repetitionIterationCountDictKeys.push(repetition);
            this.repetitionIterationCountDictValues.push(iterationCount);
        }
        else {
            this.repetitionIterationCountDictValues[i] = iterationCount;
        }
        return iterationCount;
    };
    MusicPartManagerIterator.prototype.getRepetitionIterationCount = function (rep) {
        var i = this.repetitionIterationCountDictKeys.indexOf(rep);
        if (i !== -1) {
            return this.repetitionIterationCountDictValues[i];
        }
    };
    /*    private moveTempoIndexToTimestamp(measureNumber: number): void {
            for (let index: number = 0; index < this.manager.MusicSheet.TimestampSortedTempoExpressionsList.length; index++) {
                if (this.manager.MusicSheet.TimestampSortedTempoExpressionsList[index].SourceMeasureParent.MeasureNumber >= measureNumber) {
                    this.currentTempoEntryIndex = Math.Max(-1, index - 1);
                    return
                }
            }
        }
        private getNextTempoEntryTimestamp(): Fraction {
            if (this.currentTempoEntryIndex >= this.manager.MusicSheet.TimestampSortedTempoExpressionsList.length - 1) {
                return new Fraction(99999, 1);
            }
            return this.manager.MusicSheet.TimestampSortedTempoExpressionsList[this.currentTempoEntryIndex + 1].SourceMeasureParent.AbsoluteTimestamp +
            this.manager.MusicSheet.TimestampSortedTempoExpressionsList[this.currentTempoEntryIndex + 1].Timestamp;
        }
        private moveToNextDynamic(): void {
            this.currentDynamicEntryIndex++;
            this.currentDynamicChangingExpressions.Clear();
            let curDynamicEntry: DynamicsContainer = this.manager.MusicSheet.TimestampSortedDynamicExpressionsList[this.currentDynamicEntryIndex];
            this.currentDynamicChangingExpressions.push(curDynamicEntry);
            let tsNow: Fraction = curDynamicEntry.parMultiExpression().AbsoluteTimestamp;
            for (let i: number = this.currentDynamicEntryIndex + 1; i < this.manager.MusicSheet.TimestampSortedDynamicExpressionsList.length; i++) {
                curDynamicEntry = this.manager.MusicSheet.TimestampSortedDynamicExpressionsList[i];
                if ((curDynamicEntry.parMultiExpression().AbsoluteTimestamp !== tsNow)) { break; }
                this.currentDynamicEntryIndex = i;
                this.currentDynamicChangingExpressions.push(curDynamicEntry);
            }
        }
        private moveDynamicIndexToTimestamp(absoluteTimestamp: Fraction): void {
            let dynamics: DynamicsContainer[] = this.manager.MusicSheet.TimestampSortedDynamicExpressionsList;
            for (let index: number = 0; index < dynamics.length; index++) {
                if (dynamics[index].parMultiExpression().AbsoluteTimestamp >= absoluteTimestamp) {
                    this.currentDynamicEntryIndex = Math.Max(0, index - 1);
                    return
                }
            }
        }
        private getNextDynamicsEntryTimestamp(): Fraction {
            if (this.currentDynamicEntryIndex >= this.manager.MusicSheet.TimestampSortedDynamicExpressionsList.length - 1) {
                return new Fraction(99999, 1);
            }
            return this.manager.MusicSheet.TimestampSortedDynamicExpressionsList[this.currentDynamicEntryIndex + 1].parMultiExpression().AbsoluteTimestamp;
        }
        */
    MusicPartManagerIterator.prototype.handleRepetitionsAtMeasureBegin = function () {
        for (var idx = 0, len = this.currentMeasure.FirstRepetitionInstructions.length; idx < len; ++idx) {
            var repetitionInstruction = this.currentMeasure.FirstRepetitionInstructions[idx];
            if (repetitionInstruction.parentRepetition === undefined) {
                continue;
            }
            var currentRepetition = repetitionInstruction.parentRepetition;
            this.currentRepetition = currentRepetition;
            if (currentRepetition.StartIndex === this.currentMeasureIndex) {
                if (this.JumpResponsibleRepetition !== undefined &&
                    currentRepetition !== this.JumpResponsibleRepetition &&
                    currentRepetition.StartIndex >= this.JumpResponsibleRepetition.StartIndex &&
                    currentRepetition.EndIndex <= this.JumpResponsibleRepetition.EndIndex) {
                    this.resetRepetitionIterationCount(currentRepetition);
                }
            }
        }
    };
    MusicPartManagerIterator.prototype.handleRepetitionsAtMeasureEnd = function () {
        for (var idx = 0, len = this.currentMeasure.LastRepetitionInstructions.length; idx < len; ++idx) {
            var repetitionInstruction = this.currentMeasure.LastRepetitionInstructions[idx];
            var currentRepetition = repetitionInstruction.parentRepetition;
            if (currentRepetition === undefined) {
                continue;
            }
            if (currentRepetition.BackwardJumpInstructions.indexOf(repetitionInstruction) > -1) {
                if (this.getRepetitionIterationCount(currentRepetition) < currentRepetition.UserNumberOfRepetitions) {
                    this.doBackJump(currentRepetition);
                    this.backJumpOccurred = true;
                    return;
                }
            }
            if (repetitionInstruction === currentRepetition.forwardJumpInstruction) {
                if (this.JumpResponsibleRepetition !== undefined
                    && currentRepetition !== this.JumpResponsibleRepetition
                    && currentRepetition.StartIndex >= this.JumpResponsibleRepetition.StartIndex
                    && currentRepetition.EndIndex <= this.JumpResponsibleRepetition.EndIndex) {
                    this.resetRepetitionIterationCount(currentRepetition);
                }
                var forwardJumpTargetMeasureIndex = currentRepetition.getForwardJumpTargetForIteration(this.getRepetitionIterationCount(currentRepetition));
                if (forwardJumpTargetMeasureIndex >= 0) {
                    this.currentMeasureIndex = forwardJumpTargetMeasureIndex;
                    this.currentMeasure = this.manager.MusicSheet.SourceMeasures[this.currentMeasureIndex];
                    this.currentVoiceEntryIndex = -1;
                    this.jumpResponsibleRepetition = currentRepetition;
                    this.forwardJumpOccurred = true;
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
    };
    MusicPartManagerIterator.prototype.doBackJump = function (currentRepetition) {
        this.currentMeasureIndex = currentRepetition.getBackwardJumpTarget();
        this.currentMeasure = this.manager.MusicSheet.SourceMeasures[this.currentMeasureIndex];
        this.currentVoiceEntryIndex = -1;
        this.incrementRepetitionIterationCount(currentRepetition);
        this.jumpResponsibleRepetition = currentRepetition;
    };
    MusicPartManagerIterator.prototype.activateCurrentRhythmInstructions = function () {
        if (this.currentMeasure !== undefined &&
            this.currentMeasure.FirstInstructionsStaffEntries.length > 0 &&
            this.currentMeasure.FirstInstructionsStaffEntries[0] !== undefined) {
            var instructions = this.currentMeasure.FirstInstructionsStaffEntries[0].Instructions;
            for (var idx = 0, len = instructions.length; idx < len; ++idx) {
                var abstractNotationInstruction = instructions[idx];
                if (abstractNotationInstruction instanceof RhythmInstruction_1.RhythmInstruction) {
                    this.manager.MusicSheet.SheetPlaybackSetting.rhythm = abstractNotationInstruction.Rhythm;
                }
            }
        }
    };
    MusicPartManagerIterator.prototype.activateCurrentDynamicOrTempoInstructions = function () {
        var timeSortedDynamics = this.manager.MusicSheet.TimestampSortedDynamicExpressionsList;
        while (this.currentDynamicEntryIndex > 0 && (this.currentDynamicEntryIndex >= timeSortedDynamics.length ||
            timeSortedDynamics[this.currentDynamicEntryIndex].parMultiExpression().AbsoluteTimestamp >= this.CurrentSourceTimestamp)) {
            this.currentDynamicEntryIndex--;
        }
        while (this.currentDynamicEntryIndex < timeSortedDynamics.length &&
            timeSortedDynamics[this.currentDynamicEntryIndex].parMultiExpression().AbsoluteTimestamp < this.CurrentSourceTimestamp) {
            this.currentDynamicEntryIndex++;
        }
        while (this.currentDynamicEntryIndex < timeSortedDynamics.length
            && timeSortedDynamics[this.currentDynamicEntryIndex].parMultiExpression().AbsoluteTimestamp === this.CurrentSourceTimestamp) {
            var dynamicsContainer = timeSortedDynamics[this.currentDynamicEntryIndex];
            var staffIndex = dynamicsContainer.staffNumber;
            if (this.CurrentSourceTimestamp === dynamicsContainer.parMultiExpression().AbsoluteTimestamp) {
                if (dynamicsContainer.continuousDynamicExpression !== undefined) {
                    this.activeDynamicExpressions[staffIndex] = dynamicsContainer.continuousDynamicExpression;
                }
                else if (dynamicsContainer.instantaneousDynamicExpression !== undefined) {
                    this.activeDynamicExpressions[staffIndex] = dynamicsContainer.instantaneousDynamicExpression;
                }
            }
            this.currentDynamicEntryIndex++;
        }
        this.currentDynamicChangingExpressions = [];
        for (var staffIndex = 0; staffIndex < this.activeDynamicExpressions.length; staffIndex++) {
            if (this.activeDynamicExpressions[staffIndex] !== undefined) {
                var startTime = void 0;
                var endTime = void 0;
                if (this.activeDynamicExpressions[staffIndex] instanceof continuousDynamicExpression_1.ContinuousDynamicExpression) {
                    var continuousDynamic = this.activeDynamicExpressions[staffIndex];
                    startTime = continuousDynamic.StartMultiExpression.AbsoluteTimestamp;
                    endTime = continuousDynamic.EndMultiExpression.AbsoluteTimestamp;
                    if (this.CurrentSourceTimestamp >= startTime && this.CurrentSourceTimestamp <= endTime) {
                        this.currentDynamicChangingExpressions.push(new DynamicsContainer_1.DynamicsContainer(continuousDynamic, staffIndex));
                    }
                }
                else {
                    var instantaniousDynamic = this.activeDynamicExpressions[staffIndex];
                    if (this.CurrentSourceTimestamp === instantaniousDynamic.ParentMultiExpression.AbsoluteTimestamp) {
                        this.currentDynamicChangingExpressions.push(new DynamicsContainer_1.DynamicsContainer(instantaniousDynamic, staffIndex));
                    }
                }
            }
        }
        var timeSortedTempoExpressions = this.manager.MusicSheet.TimestampSortedTempoExpressionsList;
        while (this.currentTempoEntryIndex > 0 && (this.currentTempoEntryIndex >= timeSortedTempoExpressions.length
            || timeSortedTempoExpressions[this.currentTempoEntryIndex].AbsoluteTimestamp >= this.CurrentSourceTimestamp)) {
            this.currentTempoEntryIndex--;
        }
        while (this.currentTempoEntryIndex < timeSortedTempoExpressions.length &&
            timeSortedTempoExpressions[this.currentTempoEntryIndex].AbsoluteTimestamp < this.CurrentSourceTimestamp) {
            this.currentTempoEntryIndex++;
        }
        while (this.currentTempoEntryIndex < timeSortedTempoExpressions.length
            && timeSortedTempoExpressions[this.currentTempoEntryIndex].AbsoluteTimestamp === this.CurrentSourceTimestamp) {
            this.activeTempoExpression = timeSortedTempoExpressions[this.currentTempoEntryIndex];
            this.currentTempoEntryIndex++;
        }
        this.currentTempoChangingExpression = undefined;
        if (this.activeTempoExpression !== undefined) {
            var endTime = this.activeTempoExpression.AbsoluteTimestamp;
            if (this.activeTempoExpression.ContinuousTempo !== undefined) {
                endTime = this.activeTempoExpression.ContinuousTempo.AbsoluteEndTimestamp;
            }
            if (this.CurrentSourceTimestamp >= this.activeTempoExpression.AbsoluteTimestamp
                || this.CurrentSourceTimestamp <= endTime) {
                this.currentTempoChangingExpression = this.activeTempoExpression;
            }
        }
    };
    MusicPartManagerIterator.prototype.recursiveMove = function () {
        this.currentVoiceEntryIndex++;
        if (this.currentVoiceEntryIndex === 0) {
            this.handleRepetitionsAtMeasureBegin();
            this.activateCurrentRhythmInstructions();
        }
        if (this.currentVoiceEntryIndex >= 0 && this.currentVoiceEntryIndex < this.currentMeasure.VerticalSourceStaffEntryContainers.length) {
            var currentContainer = this.currentMeasure.VerticalSourceStaffEntryContainers[this.currentVoiceEntryIndex];
            this.currentVoiceEntries = this.getVoiceEntries(currentContainer);
            this.currentVerticalContainerInMeasureTimestamp = currentContainer.Timestamp;
            this.currentTimeStamp = fraction_1.Fraction.plus(this.currentMeasure.AbsoluteTimestamp, this.currentVerticalContainerInMeasureTimestamp);
            if (this.currentTimeStamp >= this.manager.MusicSheet.SelectionEnd) {
                this.endReached = true;
            }
            this.activateCurrentDynamicOrTempoInstructions();
            return;
        }
        this.currentEnrolledMeasureTimestamp.Add(this.currentMeasure.Duration);
        this.handleRepetitionsAtMeasureEnd();
        if (this.currentMeasureIndex >= 0 && this.currentMeasureIndex < this.manager.MusicSheet.SourceMeasures.length) {
            this.currentMeasure = this.manager.MusicSheet.SourceMeasures[this.currentMeasureIndex];
            this.currentTimeStamp = fraction_1.Fraction.plus(this.currentMeasure.AbsoluteTimestamp, this.currentVerticalContainerInMeasureTimestamp);
            this.currentVoiceEntryIndex = -1;
            this.recursiveMove();
            return;
        }
        this.currentVerticalContainerInMeasureTimestamp = new fraction_1.Fraction();
        this.currentMeasure = undefined;
        this.currentVoiceEntries = undefined;
        this.endReached = true;
    };
    MusicPartManagerIterator.prototype.checkEntries = function (notesOnly) {
        var tlist = this.CurrentVisibleVoiceEntries();
        if (tlist.length > 0) {
            if (!notesOnly) {
                return true;
            }
            for (var idx = 0, len = tlist.length; idx < len; ++idx) {
                var entry = tlist[idx];
                if (entry.Notes[0].Pitch !== undefined) {
                    return true;
                }
            }
        }
        return false;
    };
    MusicPartManagerIterator.prototype.getVisibleEntries = function (entry, visibleEntries) {
        if (entry.ParentVoice.Visible) {
            visibleEntries.push(entry);
        }
    };
    MusicPartManagerIterator.prototype.getAudibleEntries = function (entry, audibleEntries) {
        if (entry.ParentVoice.Audible) {
            audibleEntries.push(entry);
        }
    };
    MusicPartManagerIterator.prototype.getScoreFollowingEntries = function (entry, followingEntries) {
        if (entry.ParentVoice.Following && entry.ParentVoice.Parent.Following) {
            followingEntries.push(entry);
        }
    };
    MusicPartManagerIterator.prototype.getVoiceEntries = function (container) {
        var entries = [];
        for (var _i = 0, _a = container.StaffEntries; _i < _a.length; _i++) {
            var sourceStaffEntry = _a[_i];
            if (sourceStaffEntry === undefined) {
                continue;
            }
            for (var _b = 0, _c = sourceStaffEntry.VoiceEntries; _b < _c.length; _b++) {
                var voiceEntry = _c[_b];
                entries.push(voiceEntry);
            }
        }
        return entries;
    };
    return MusicPartManagerIterator;
}());
exports.MusicPartManagerIterator = MusicPartManagerIterator;
