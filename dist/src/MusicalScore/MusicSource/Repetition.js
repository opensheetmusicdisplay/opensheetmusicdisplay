"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var SourceMusicPart_1 = require("./SourceMusicPart");
var fraction_1 = require("../../Common/DataObjects/fraction");
var PartListEntry_1 = require("./PartListEntry");
var Repetition = (function (_super) {
    __extends(Repetition, _super);
    function Repetition(musicSheet, virtualOverallRepetition) {
        _super.call(this, musicSheet);
        this.backwardJumpInstructions = [];
        this.endingParts = [];
        this.endingIndexDict = {};
        this.userNumberOfRepetitions = 0;
        this.visibles = [];
        this.fromWords = false;
        this.repetitonIterationOrder = [];
        this.numberOfEndings = 1;
        this.musicSheet2 = musicSheet;
        this.virtualOverallRepetition = virtualOverallRepetition;
    }
    Object.defineProperty(Repetition.prototype, "BackwardJumpInstructions", {
        get: function () {
            return this.backwardJumpInstructions;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Repetition.prototype, "EndingIndexDict", {
        get: function () {
            return this.endingIndexDict;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Repetition.prototype, "EndingParts", {
        get: function () {
            return this.endingParts;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Repetition.prototype, "Visibles", {
        get: function () {
            return this.visibles;
        },
        set: function (value) {
            this.visibles = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Repetition.prototype, "DefaultNumberOfRepetitions", {
        get: function () {
            var defaultNumber = 2;
            if (this.virtualOverallRepetition) {
                defaultNumber = 1;
            }
            return Math.max(defaultNumber, Object.keys(this.endingIndexDict).length, this.checkRepetitionForMultipleLyricVerses());
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Repetition.prototype, "UserNumberOfRepetitions", {
        get: function () {
            return this.userNumberOfRepetitions;
        },
        set: function (value) {
            this.userNumberOfRepetitions = value;
            this.repetitonIterationOrder = [];
            var endingsDiff = this.userNumberOfRepetitions - this.NumberOfEndings;
            for (var i = 1; i <= this.userNumberOfRepetitions; i++) {
                if (i <= endingsDiff) {
                    this.repetitonIterationOrder.push(1);
                }
                else {
                    this.repetitonIterationOrder.push(i - endingsDiff);
                }
            }
        },
        enumerable: true,
        configurable: true
    });
    Repetition.prototype.getForwardJumpTargetForIteration = function (iteration) {
        var endingIndex = this.repetitonIterationOrder[iteration - 1];
        if (this.endingIndexDict[endingIndex] !== undefined) {
            return this.endingIndexDict[endingIndex].part.StartIndex;
        }
        return -1;
    };
    Repetition.prototype.getBackwardJumpTarget = function () {
        return this.startMarker.measureIndex;
    };
    Repetition.prototype.SetEndingStartIndex = function (endingNumbers, startIndex) {
        var part = new RepetitionEndingPart(new SourceMusicPart_1.SourceMusicPart(this.musicSheet2, startIndex, startIndex));
        this.endingParts.push(part);
        for (var _i = 0, endingNumbers_1 = endingNumbers; _i < endingNumbers_1.length; _i++) {
            var endingNumber = endingNumbers_1[_i];
            try {
                this.endingIndexDict[endingNumber] = part;
                part.endingIndices.push(endingNumber);
                if (this.numberOfEndings < endingNumber) {
                    this.numberOfEndings = endingNumber;
                }
            }
            catch (err) {
                console.log("Repetition: Exception."); // FIXME
            }
        }
    };
    //public SetEndingStartIndex(endingNumber: number, startIndex: number): void {
    //    let part: RepetitionEndingPart = new RepetitionEndingPart(new SourceMusicPart(this.musicSheet2, startIndex, startIndex));
    //    this.endingParts.push(part);
    //    this.endingIndexDict[endingNumber] = part;
    //    part.endingIndices.push(endingNumber);
    //    if (this.numberOfEndings < endingNumber) {
    //        this.numberOfEndings = endingNumber;
    //    }
    //}
    Repetition.prototype.setEndingEndIndex = function (endingNumber, endIndex) {
        if (this.endingIndexDict[endingNumber] !== undefined) {
            this.endingIndexDict[endingNumber].part.setEndIndex(endIndex);
        }
    };
    Object.defineProperty(Repetition.prototype, "NumberOfEndings", {
        get: function () {
            return this.numberOfEndings;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Repetition.prototype, "FromWords", {
        get: function () {
            return this.fromWords;
        },
        set: function (value) {
            this.fromWords = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Repetition.prototype, "AbsoluteTimestamp", {
        get: function () {
            return fraction_1.Fraction.createFromFraction(this.musicSheet2.SourceMeasures[this.startMarker.measureIndex].AbsoluteTimestamp);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Repetition.prototype, "StartIndex", {
        get: function () {
            return this.startMarker.measureIndex;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Repetition.prototype, "EndIndex", {
        get: function () {
            if (this.BackwardJumpInstructions.length === 0) {
                return this.StartIndex;
            }
            var result = this.backwardJumpInstructions[this.backwardJumpInstructions.length - 1].measureIndex;
            if (this.endingIndexDict[this.NumberOfEndings] !== undefined) {
                result = Math.max(this.endingIndexDict[this.NumberOfEndings].part.EndIndex, result);
            }
            return result;
        },
        enumerable: true,
        configurable: true
    });
    Repetition.prototype.checkRepetitionForMultipleLyricVerses = function () {
        var lyricVerses = 0;
        var start = this.StartIndex;
        var end = this.EndIndex;
        for (var measureIndex = start; measureIndex <= end; measureIndex++) {
            var sourceMeasure = this.musicSheet2.SourceMeasures[measureIndex];
            for (var i = 0; i < sourceMeasure.CompleteNumberOfStaves; i++) {
                for (var _i = 0, _a = sourceMeasure.VerticalSourceStaffEntryContainers[i].StaffEntries; _i < _a.length; _i++) {
                    var sourceStaffEntry = _a[_i];
                    if (sourceStaffEntry !== undefined) {
                        var verses = 0;
                        for (var _b = 0, _c = sourceStaffEntry.VoiceEntries; _b < _c.length; _b++) {
                            var voiceEntry = _c[_b];
                            verses += Object.keys(voiceEntry.LyricsEntries).length;
                        }
                        lyricVerses = Math.max(lyricVerses, verses);
                    }
                }
            }
        }
        return lyricVerses;
    };
    Object.defineProperty(Repetition.prototype, "FirstSourceMeasureNumber", {
        get: function () {
            return this.getFirstSourceMeasure().MeasureNumber;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Repetition.prototype, "LastSourceMeasureNumber", {
        get: function () {
            return this.getLastSourceMeasure().MeasureNumber;
        },
        enumerable: true,
        configurable: true
    });
    return Repetition;
}(PartListEntry_1.PartListEntry));
exports.Repetition = Repetition;
var RepetitionEndingPart = (function () {
    function RepetitionEndingPart(endingPart) {
        this.endingIndices = [];
        this.part = endingPart;
    }
    RepetitionEndingPart.prototype.ToString = function () {
        return this.endingIndices.join(", ");
    };
    return RepetitionEndingPart;
}());
exports.RepetitionEndingPart = RepetitionEndingPart;
