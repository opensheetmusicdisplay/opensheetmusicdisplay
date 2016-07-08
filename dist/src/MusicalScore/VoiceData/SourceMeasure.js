"use strict";
var fraction_1 = require("../../Common/DataObjects/fraction");
var VerticalSourceStaffEntryContainer_1 = require("./VerticalSourceStaffEntryContainer");
var SourceStaffEntry_1 = require("./SourceStaffEntry");
var VoiceEntry_1 = require("./VoiceEntry");
var KeyInstruction_1 = require("./Instructions/KeyInstruction");
var SourceMeasure = (function () {
    function SourceMeasure(completeNumberOfStaves) {
        this.staffLinkedExpressions = [];
        this.tempoExpressions = [];
        this.verticalSourceStaffEntryContainers = [];
        this.staffMeasureErrors = [];
        this.firstRepetitionInstructions = [];
        this.lastRepetitionInstructions = [];
        this.completeNumberOfStaves = completeNumberOfStaves;
        this.implicitMeasure = false;
        this.breakSystemAfter = false;
        this.endsPiece = false;
        this.firstInstructionsStaffEntries = new Array(completeNumberOfStaves);
        this.lastInstructionsStaffEntries = new Array(completeNumberOfStaves);
        for (var i = 0; i < completeNumberOfStaves; i++) {
            this.staffMeasureErrors.push(false);
            this.staffLinkedExpressions.push([]);
        }
    }
    Object.defineProperty(SourceMeasure.prototype, "MeasureNumber", {
        get: function () {
            return this.measureNumber;
        },
        set: function (value) {
            this.measureNumber = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SourceMeasure.prototype, "AbsoluteTimestamp", {
        get: function () {
            return this.absoluteTimestamp;
        },
        set: function (value) {
            this.absoluteTimestamp = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SourceMeasure.prototype, "CompleteNumberOfStaves", {
        get: function () {
            return this.completeNumberOfStaves;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SourceMeasure.prototype, "Duration", {
        get: function () {
            return this.duration;
        },
        set: function (value) {
            this.duration = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SourceMeasure.prototype, "ImplicitMeasure", {
        get: function () {
            return this.implicitMeasure;
        },
        set: function (value) {
            this.implicitMeasure = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SourceMeasure.prototype, "BreakSystemAfter", {
        get: function () {
            return this.breakSystemAfter;
        },
        set: function (value) {
            this.breakSystemAfter = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SourceMeasure.prototype, "StaffLinkedExpressions", {
        get: function () {
            return this.staffLinkedExpressions;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SourceMeasure.prototype, "TempoExpressions", {
        get: function () {
            return this.tempoExpressions;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SourceMeasure.prototype, "VerticalSourceStaffEntryContainers", {
        get: function () {
            return this.verticalSourceStaffEntryContainers;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SourceMeasure.prototype, "FirstInstructionsStaffEntries", {
        get: function () {
            return this.firstInstructionsStaffEntries;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SourceMeasure.prototype, "LastInstructionsStaffEntries", {
        get: function () {
            return this.lastInstructionsStaffEntries;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SourceMeasure.prototype, "FirstRepetitionInstructions", {
        get: function () {
            return this.firstRepetitionInstructions;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SourceMeasure.prototype, "LastRepetitionInstructions", {
        get: function () {
            return this.lastRepetitionInstructions;
        },
        enumerable: true,
        configurable: true
    });
    SourceMeasure.prototype.getErrorInMeasure = function (staffIndex) {
        return this.staffMeasureErrors[staffIndex];
    };
    SourceMeasure.prototype.setErrorInStaffMeasure = function (staffIndex, hasError) {
        this.staffMeasureErrors[staffIndex] = hasError;
    };
    SourceMeasure.prototype.getNextMeasure = function (measures) {
        return measures[this.measureListIndex + 1];
    };
    SourceMeasure.prototype.getPreviousMeasure = function (measures) {
        if (this.measureListIndex > 1) {
            return measures[this.measureListIndex - 1];
        }
        return undefined;
    };
    SourceMeasure.prototype.findOrCreateStaffEntry = function (inMeasureTimestamp, inSourceMeasureStaffIndex, staff) {
        // FIXME Andrea: debug & Test
        var staffEntry = undefined;
        // Find:
        var existingVerticalSourceStaffEntryContainer;
        for (var _i = 0, _a = this.verticalSourceStaffEntryContainers; _i < _a.length; _i++) {
            var container = _a[_i];
            if (container.Timestamp.Equals(inMeasureTimestamp)) {
                existingVerticalSourceStaffEntryContainer = container;
                break;
            }
        }
        if (existingVerticalSourceStaffEntryContainer !== undefined) {
            if (existingVerticalSourceStaffEntryContainer.StaffEntries[inSourceMeasureStaffIndex] !== undefined) {
                staffEntry = existingVerticalSourceStaffEntryContainer.StaffEntries[inSourceMeasureStaffIndex];
            }
            else {
                staffEntry = new SourceStaffEntry_1.SourceStaffEntry(existingVerticalSourceStaffEntryContainer, staff);
                existingVerticalSourceStaffEntryContainer.StaffEntries[inSourceMeasureStaffIndex] = staffEntry;
            }
            return { createdNewContainer: false, staffEntry: staffEntry };
        }
        var last = this.verticalSourceStaffEntryContainers[this.verticalSourceStaffEntryContainers.length - 1];
        if (this.verticalSourceStaffEntryContainers.length === 0 || last.Timestamp.lt(inMeasureTimestamp)) {
            var container = new VerticalSourceStaffEntryContainer_1.VerticalSourceStaffEntryContainer(this, inMeasureTimestamp.clone(), this.completeNumberOfStaves);
            this.verticalSourceStaffEntryContainers.push(container);
            staffEntry = new SourceStaffEntry_1.SourceStaffEntry(container, staff);
            container.StaffEntries[inSourceMeasureStaffIndex] = staffEntry;
        }
        else {
            for (var i = this.verticalSourceStaffEntryContainers.length - 1; i >= 0; i--) {
                if (this.verticalSourceStaffEntryContainers[i].Timestamp.lt(inMeasureTimestamp)) {
                    var container = new VerticalSourceStaffEntryContainer_1.VerticalSourceStaffEntryContainer(this, inMeasureTimestamp.clone(), this.completeNumberOfStaves);
                    this.verticalSourceStaffEntryContainers.splice(i + 1, 0, container);
                    staffEntry = new SourceStaffEntry_1.SourceStaffEntry(container, staff);
                    container.StaffEntries[inSourceMeasureStaffIndex] = staffEntry;
                    break;
                }
                if (i === 0) {
                    var container = new VerticalSourceStaffEntryContainer_1.VerticalSourceStaffEntryContainer(this, inMeasureTimestamp.clone(), this.completeNumberOfStaves);
                    this.verticalSourceStaffEntryContainers.splice(i, 0, container);
                    staffEntry = new SourceStaffEntry_1.SourceStaffEntry(container, staff);
                    container.StaffEntries[inSourceMeasureStaffIndex] = staffEntry;
                    break;
                }
            }
        }
        //Logging.debug("created new container: ", staffEntry, this.verticalSourceStaffEntryContainers);
        return { createdNewContainer: true, staffEntry: staffEntry };
    };
    SourceMeasure.prototype.findOrCreateVoiceEntry = function (sse, voice) {
        var ve = undefined;
        var createdNewVoiceEntry = false;
        for (var _i = 0, _a = sse.VoiceEntries; _i < _a.length; _i++) {
            var voiceEntry = _a[_i];
            if (voiceEntry.ParentVoice === voice) {
                ve = voiceEntry;
                break;
            }
        }
        if (ve === undefined) {
            ve = new VoiceEntry_1.VoiceEntry(sse.Timestamp, voice, sse);
            sse.VoiceEntries.push(ve);
            createdNewVoiceEntry = true;
        }
        return { createdVoiceEntry: createdNewVoiceEntry, voiceEntry: ve };
    };
    SourceMeasure.prototype.getPreviousSourceStaffEntryFromIndex = function (verticalIndex, horizontalIndex) {
        for (var i = horizontalIndex - 1; i >= 0; i--) {
            if (this.verticalSourceStaffEntryContainers[i][verticalIndex] !== undefined) {
                return this.verticalSourceStaffEntryContainers[i][verticalIndex];
            }
        }
        return undefined;
    };
    SourceMeasure.prototype.getVerticalContainerIndexByTimestamp = function (musicTimestamp) {
        for (var idx = 0, len = this.VerticalSourceStaffEntryContainers.length; idx < len; ++idx) {
            if (this.VerticalSourceStaffEntryContainers[idx].Timestamp.Equals(musicTimestamp)) {
                return idx; // this.verticalSourceStaffEntryContainers.indexOf(verticalSourceStaffEntryContainer);
            }
        }
        return -1;
    };
    SourceMeasure.prototype.getVerticalContainerByTimestamp = function (musicTimestamp) {
        for (var idx = 0, len = this.VerticalSourceStaffEntryContainers.length; idx < len; ++idx) {
            var verticalSourceStaffEntryContainer = this.VerticalSourceStaffEntryContainers[idx];
            if (verticalSourceStaffEntryContainer.Timestamp.Equals(musicTimestamp)) {
                return verticalSourceStaffEntryContainer;
            }
        }
        return undefined;
    };
    SourceMeasure.prototype.checkForEmptyVerticalContainer = function (index) {
        var undefinedCounter = 0;
        for (var i = 0; i < this.completeNumberOfStaves; i++) {
            if (this.verticalSourceStaffEntryContainers[index][i] === undefined) {
                undefinedCounter++;
            }
        }
        if (undefinedCounter === this.completeNumberOfStaves) {
            this.verticalSourceStaffEntryContainers.splice(index, 1);
        }
    };
    SourceMeasure.prototype.reverseCheck = function (musicSheet, maxInstDuration) {
        var maxDuration = new fraction_1.Fraction(0, 1);
        var instrumentsDurations = [];
        for (var i = 0; i < musicSheet.Instruments.length; i++) {
            var instrumentDuration = new fraction_1.Fraction(0, 1);
            var inSourceMeasureInstrumentIndex = musicSheet.getGlobalStaffIndexOfFirstStaff(musicSheet.Instruments[i]);
            for (var j = 0; j < musicSheet.Instruments[i].Staves.length; j++) {
                var lastStaffEntry = this.getLastSourceStaffEntryForInstrument(inSourceMeasureInstrumentIndex + j);
                if (lastStaffEntry !== undefined && !lastStaffEntry.hasTie()) {
                    var verticalContainerIndex = this.verticalSourceStaffEntryContainers.indexOf(lastStaffEntry.VerticalContainerParent);
                    for (var m = verticalContainerIndex - 1; m >= 0; m--) {
                        var previousStaffEntry = this.verticalSourceStaffEntryContainers[m][inSourceMeasureInstrumentIndex + j];
                        if (previousStaffEntry !== undefined && previousStaffEntry.hasTie()) {
                            if (instrumentDuration.lt(fraction_1.Fraction.plus(previousStaffEntry.Timestamp, previousStaffEntry.calculateMaxNoteLength()))) {
                                instrumentDuration = fraction_1.Fraction.plus(previousStaffEntry.Timestamp, previousStaffEntry.calculateMaxNoteLength());
                                break;
                            }
                        }
                    }
                }
            }
            instrumentsDurations.push(instrumentDuration);
        }
        for (var idx = 0, len = instrumentsDurations.length; idx < len; ++idx) {
            var instrumentsDuration = instrumentsDurations[idx];
            if (maxDuration.lt(instrumentsDuration)) {
                maxDuration = instrumentsDuration;
            }
        }
        return fraction_1.Fraction.max(maxDuration, maxInstDuration);
    };
    SourceMeasure.prototype.calculateInstrumentsDuration = function (musicSheet, instrumentMaxTieNoteFractions) {
        var instrumentsDurations = [];
        for (var i = 0; i < musicSheet.Instruments.length; i++) {
            var instrumentDuration = new fraction_1.Fraction(0, 1);
            var inSourceMeasureInstrumentIndex = musicSheet.getGlobalStaffIndexOfFirstStaff(musicSheet.Instruments[i]);
            for (var j = 0; j < musicSheet.Instruments[i].Staves.length; j++) {
                var lastStaffEntry = this.getLastSourceStaffEntryForInstrument(inSourceMeasureInstrumentIndex + j);
                if (lastStaffEntry !== undefined && lastStaffEntry.Timestamp !== undefined) {
                    if (instrumentDuration.lt(fraction_1.Fraction.plus(lastStaffEntry.Timestamp, lastStaffEntry.calculateMaxNoteLength()))) {
                        instrumentDuration = fraction_1.Fraction.plus(lastStaffEntry.Timestamp, lastStaffEntry.calculateMaxNoteLength());
                    }
                }
            }
            if (instrumentDuration.lt(instrumentMaxTieNoteFractions[i])) {
                instrumentDuration = instrumentMaxTieNoteFractions[i];
            }
            instrumentsDurations.push(instrumentDuration);
        }
        return instrumentsDurations;
    };
    SourceMeasure.prototype.getEntriesPerStaff = function (staffIndex) {
        var sourceStaffEntries = [];
        for (var _i = 0, _a = this.VerticalSourceStaffEntryContainers; _i < _a.length; _i++) {
            var container = _a[_i];
            var sse = container.StaffEntries[staffIndex];
            if (sse !== undefined) {
                sourceStaffEntries.push(sse);
            }
        }
        return sourceStaffEntries;
    };
    SourceMeasure.prototype.hasBeginInstructions = function () {
        for (var staffIndex = 0, len = this.FirstInstructionsStaffEntries.length; staffIndex < len; staffIndex++) {
            var beginInstructionsStaffEntry = this.FirstInstructionsStaffEntries[staffIndex];
            if (beginInstructionsStaffEntry !== undefined && beginInstructionsStaffEntry.Instructions.length > 0) {
                return true;
            }
        }
        return false;
    };
    SourceMeasure.prototype.beginsWithLineRepetition = function () {
        for (var idx = 0, len = this.FirstRepetitionInstructions.length; idx < len; ++idx) {
            var instr = this.FirstRepetitionInstructions[idx];
            if (instr.parentRepetition !== undefined && instr === instr.parentRepetition.startMarker && !instr.parentRepetition.FromWords) {
                return true;
            }
        }
        return false;
    };
    SourceMeasure.prototype.endsWithLineRepetition = function () {
        for (var idx = 0, len = this.LastRepetitionInstructions.length; idx < len; ++idx) {
            var instruction = this.LastRepetitionInstructions[idx];
            var rep = instruction.parentRepetition;
            if (rep === undefined) {
                continue;
            }
            if (rep.FromWords) {
                continue;
            }
            for (var idx2 = 0, len2 = rep.BackwardJumpInstructions.length; idx2 < len2; ++idx2) {
                var backJumpInstruction = rep.BackwardJumpInstructions[idx2];
                if (instruction === backJumpInstruction) {
                    return true;
                }
            }
        }
        return false;
    };
    SourceMeasure.prototype.beginsWithWordRepetition = function () {
        for (var idx = 0, len = this.FirstRepetitionInstructions.length; idx < len; ++idx) {
            var instruction = this.FirstRepetitionInstructions[idx];
            if (instruction.parentRepetition !== undefined &&
                instruction === instruction.parentRepetition.startMarker && instruction.parentRepetition.FromWords) {
                return true;
            }
        }
        return false;
    };
    SourceMeasure.prototype.endsWithWordRepetition = function () {
        for (var idx = 0, len = this.LastRepetitionInstructions.length; idx < len; ++idx) {
            var instruction = this.LastRepetitionInstructions[idx];
            var rep = instruction.parentRepetition;
            if (rep === undefined) {
                continue;
            }
            if (!rep.FromWords) {
                continue;
            }
            for (var idx2 = 0, len2 = rep.BackwardJumpInstructions.length; idx2 < len2; ++idx2) {
                var backJumpInstruction = rep.BackwardJumpInstructions[idx2];
                if (instruction === backJumpInstruction) {
                    return true;
                }
            }
            if (instruction === rep.forwardJumpInstruction) {
                return true;
            }
        }
        return false;
    };
    SourceMeasure.prototype.getKeyInstruction = function (staffIndex) {
        if (this.FirstInstructionsStaffEntries[staffIndex] !== undefined) {
            var sourceStaffEntry = this.FirstInstructionsStaffEntries[staffIndex];
            for (var idx = 0, len = sourceStaffEntry.Instructions.length; idx < len; ++idx) {
                var abstractNotationInstruction = sourceStaffEntry.Instructions[idx];
                if (abstractNotationInstruction instanceof KeyInstruction_1.KeyInstruction) {
                    return abstractNotationInstruction;
                }
            }
        }
        return undefined;
    };
    SourceMeasure.prototype.getLastSourceStaffEntryForInstrument = function (instrumentIndex) {
        for (var i = this.verticalSourceStaffEntryContainers.length - 1; i >= 0; i--) {
            if (this.verticalSourceStaffEntryContainers[i][instrumentIndex] !== undefined) {
                return this.verticalSourceStaffEntryContainers[i][instrumentIndex];
            }
        }
        return undefined;
    };
    return SourceMeasure;
}());
exports.SourceMeasure = SourceMeasure;
