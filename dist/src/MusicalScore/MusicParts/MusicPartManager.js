"use strict";
var fraction_1 = require("../../Common/DataObjects/fraction");
var MusicPartManagerIterator_1 = require("./MusicPartManagerIterator");
var MusicPartManager /*implements ISelectionListener*/ = (function () {
    function MusicPartManager /*implements ISelectionListener*/(musicSheet) {
        this.musicSheet = musicSheet;
    }
    MusicPartManager /*implements ISelectionListener*/.prototype.reInit = function () {
        this.init();
    };
    MusicPartManager /*implements ISelectionListener*/.prototype.init = function () {
        this.parts = this.musicSheet.Repetitions.slice();
        this.sheetStart = this.musicSheet.SelectionStart = new fraction_1.Fraction(0, 1);
        this.sheetEnd = this.musicSheet.SelectionEnd = this.musicSheet.SheetEndTimestamp;
        this.calcMapping();
    };
    MusicPartManager /*implements ISelectionListener*/.prototype.getCurrentRepetitionTimestampTransform = function (curEnrolledTimestamp) {
        var curTransform = undefined;
        for (var i = this.timestamps.length - 1; i >= 0; i--) {
            curTransform = this.timestamps[i];
            if (curEnrolledTimestamp >= curTransform.$from) {
                return curTransform;
            }
        }
        return this.timestamps[0];
    };
    MusicPartManager /*implements ISelectionListener*/.prototype.absoluteEnrolledToSheetTimestamp = function (timestamp) {
        if (this.timestamps.length === 0) {
            return timestamp;
        }
        var transform = this.getCurrentRepetitionTimestampTransform(timestamp);
        return fraction_1.Fraction.plus(timestamp, fraction_1.Fraction.minus(transform.to, transform.$from)); // FIXME
    };
    Object.defineProperty(MusicPartManager /*implements ISelectionListener*/.prototype, "Parts", {
        get: function () {
            return this.parts;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(MusicPartManager /*implements ISelectionListener*/.prototype, "MusicSheet", {
        get: function () {
            return this.musicSheet;
        },
        enumerable: true,
        configurable: true
    });
    MusicPartManager /*implements ISelectionListener*/.prototype.getIterator = function (start) {
        if (start === undefined) {
            return new MusicPartManagerIterator_1.MusicPartManagerIterator(this, this.musicSheet.SelectionStart, this.musicSheet.SelectionEnd);
        }
        return new MusicPartManagerIterator_1.MusicPartManagerIterator(this, start, undefined);
    };
    MusicPartManager /*implements ISelectionListener*/.prototype.setSelectionStart = function (beginning) {
        this.musicSheet.SelectionStart = beginning;
        this.musicSheet.SelectionEnd = undefined;
    };
    MusicPartManager /*implements ISelectionListener*/.prototype.setSelectionRange = function (start, end) {
        this.musicSheet.SelectionStart = start === undefined ? this.sheetStart : start;
        this.musicSheet.SelectionEnd = end === undefined ? this.sheetEnd : end;
    };
    MusicPartManager /*implements ISelectionListener*/.prototype.calcMapping = function () {
        var timestamps = [];
        var iterator = this.getIterator();
        var currentRepetition = iterator.CurrentRepetition;
        var curTimestampTransform = new TimestampTransform(iterator.CurrentEnrolledTimestamp.clone(), iterator.CurrentSourceTimestamp.clone(), undefined, 0);
        timestamps.push(curTimestampTransform);
        while (!iterator.EndReached) {
            if (iterator.JumpOccurred || currentRepetition !== iterator.CurrentRepetition) {
                currentRepetition = iterator.CurrentRepetition;
                if (iterator.backJumpOccurred) {
                    var jumpRep = iterator.JumpResponsibleRepetition;
                    curTimestampTransform.nextBackJump = iterator.CurrentEnrolledTimestamp;
                    curTimestampTransform.curRepetition = jumpRep;
                    curTimestampTransform.curRepetitionIteration = iterator.CurrentJumpResponsibleRepetitionIterationBeforeJump;
                    for (var i = this.timestamps.length - 2; i >= 0; i--) {
                        if (jumpRep.AbsoluteTimestamp > timestamps[i].to || timestamps[i].curRepetition !== undefined) {
                            break;
                        }
                        timestamps[i].nextBackJump = curTimestampTransform.nextBackJump;
                        timestamps[i].curRepetition = jumpRep;
                        timestamps[i].curRepetitionIteration = curTimestampTransform.curRepetitionIteration;
                    }
                }
                curTimestampTransform = new TimestampTransform(iterator.CurrentEnrolledTimestamp.clone(), iterator.CurrentSourceTimestamp.clone(), undefined, 0);
                timestamps.push(curTimestampTransform);
            }
            iterator.moveToNext();
        }
        this.timestamps = timestamps;
    };
    return MusicPartManager /*implements ISelectionListener*/;
}());
exports.MusicPartManager /*implements ISelectionListener*/ = MusicPartManager /*implements ISelectionListener*/;
var TimestampTransform = (function () {
    function TimestampTransform(sourceTimestamp, enrolledTimestamp, repetition, curRepetitionIteration) {
        this.$from = sourceTimestamp;
        this.to = enrolledTimestamp;
        this.curRepetition = repetition;
        this.curRepetitionIteration = curRepetitionIteration;
        this.nextBackJump = undefined;
        this.nextForwardJump = undefined;
    }
    return TimestampTransform;
}());
exports.TimestampTransform = TimestampTransform;
