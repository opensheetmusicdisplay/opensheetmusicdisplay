"use strict";
var fraction_1 = require("../../Common/DataObjects/fraction");
var ClefInstruction_1 = require("./Instructions/ClefInstruction");
var KeyInstruction_1 = require("./Instructions/KeyInstruction");
var RhythmInstruction_1 = require("./Instructions/RhythmInstruction");
var SourceStaffEntry = (function () {
    function SourceStaffEntry(verticalContainerParent, parentStaff) {
        this.voiceEntries = [];
        this.instructions = [];
        this.verticalContainerParent = verticalContainerParent;
        this.parentStaff = parentStaff;
    }
    Object.defineProperty(SourceStaffEntry.prototype, "ParentStaff", {
        get: function () {
            return this.parentStaff;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SourceStaffEntry.prototype, "VerticalContainerParent", {
        get: function () {
            return this.verticalContainerParent;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SourceStaffEntry.prototype, "Timestamp", {
        get: function () {
            if (this.VerticalContainerParent !== undefined) {
                return this.VerticalContainerParent.Timestamp;
            }
            return undefined;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SourceStaffEntry.prototype, "AbsoluteTimestamp", {
        get: function () {
            if (this.VerticalContainerParent !== undefined) {
                return fraction_1.Fraction.plus(this.VerticalContainerParent.ParentMeasure.AbsoluteTimestamp, this.VerticalContainerParent.Timestamp);
            }
            return undefined;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SourceStaffEntry.prototype, "VoiceEntries", {
        get: function () {
            return this.voiceEntries;
        },
        set: function (value) {
            this.voiceEntries = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SourceStaffEntry.prototype, "Link", {
        get: function () {
            return this.staffEntryLink;
        },
        set: function (value) {
            this.staffEntryLink = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SourceStaffEntry.prototype, "Instructions", {
        get: function () {
            return this.instructions;
        },
        set: function (value) {
            this.instructions = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SourceStaffEntry.prototype, "ChordContainer", {
        get: function () {
            return this.chordSymbolContainer;
        },
        set: function (value) {
            this.chordSymbolContainer = value;
        },
        enumerable: true,
        configurable: true
    });
    // public removeAllInstructionsOfType(type: AbstractNotationInstruction): number {
    //     let i: number = 0;
    //     let ret: number = 0;
    //     while (i < this.instructions.length) {
    //         let instruction: AbstractNotationInstruction = this.instructions[i];
    //         if (instruction instanceof type) {
    //             this.instructions.splice(i, 1);
    //             ret++;
    //         } else {
    //             i++;
    //         }
    //     }
    //     return ret;
    // }
    //
    // public removeFirstInstructionOfType(type: AbstractNotationInstruction): boolean {
    //     for (let i: number = 0; i < this.instructions.length; i++) {
    //         if (this.instructions[i] instanceof type) {
    //             this.instructions.splice(i, 1);
    //             return true;
    //         }
    //     }
    //     return false;
    // }
    SourceStaffEntry.prototype.removeAllInstructionsOfTypeClefInstruction = function () {
        var i = 0;
        var ret = 0;
        while (i < this.instructions.length) {
            if (this.instructions[i] instanceof ClefInstruction_1.ClefInstruction) {
                this.instructions.splice(i, 1);
                ret++;
            }
            else {
                i++;
            }
        }
        return ret;
    };
    SourceStaffEntry.prototype.removeFirstInstructionOfTypeClefInstruction = function () {
        for (var i = 0; i < this.instructions.length; i++) {
            if (this.instructions[i] instanceof ClefInstruction_1.ClefInstruction) {
                this.instructions.splice(i, 1);
                return true;
            }
        }
        return false;
    };
    SourceStaffEntry.prototype.removeAllInstructionsOfTypeKeyInstruction = function () {
        var i = 0;
        var ret = 0;
        while (i < this.instructions.length) {
            if (this.instructions[i] instanceof KeyInstruction_1.KeyInstruction) {
                this.instructions.splice(i, 1);
                ret++;
            }
            else {
                i++;
            }
        }
        return ret;
    };
    SourceStaffEntry.prototype.removeFirstInstructionOfTypeKeyInstruction = function () {
        for (var i = 0; i < this.instructions.length; i++) {
            if (this.instructions[i] instanceof KeyInstruction_1.KeyInstruction) {
                this.instructions.splice(i, 1);
                return true;
            }
        }
        return false;
    };
    SourceStaffEntry.prototype.removeAllInstructionsOfTypeRhythmInstruction = function () {
        var i = 0;
        var ret = 0;
        while (i < this.instructions.length) {
            if (this.instructions[i] instanceof RhythmInstruction_1.RhythmInstruction) {
                this.instructions.splice(i, 1);
                ret++;
            }
            else {
                i++;
            }
        }
        return ret;
    };
    SourceStaffEntry.prototype.removeFirstInstructionOfTypeRhythmInstruction = function () {
        for (var i = 0; i < this.instructions.length; i++) {
            if (this.instructions[i] instanceof RhythmInstruction_1.RhythmInstruction) {
                this.instructions.splice(i, 1);
                return true;
            }
        }
        return false;
    };
    SourceStaffEntry.prototype.calculateMinNoteLength = function () {
        var duration = new fraction_1.Fraction(Number.MAX_VALUE, 1);
        for (var idx = 0, len = this.VoiceEntries.length; idx < len; ++idx) {
            var voiceEntry = this.VoiceEntries[idx];
            for (var idx2 = 0, len2 = voiceEntry.Notes.length; idx2 < len2; ++idx2) {
                var note = voiceEntry.Notes[idx2];
                if (note.NoteTie !== undefined) {
                    if (duration > note.calculateNoteLengthWithoutTie()) {
                        duration = note.calculateNoteLengthWithoutTie();
                    }
                }
                else if (duration > note.Length) {
                    duration = note.Length;
                }
            }
        }
        return duration;
    };
    SourceStaffEntry.prototype.calculateMaxNoteLength = function () {
        var duration = new fraction_1.Fraction(0, 1);
        for (var idx = 0, len = this.VoiceEntries.length; idx < len; ++idx) {
            var voiceEntry = this.VoiceEntries[idx];
            for (var idx2 = 0, len2 = voiceEntry.Notes.length; idx2 < len2; ++idx2) {
                var note = voiceEntry.Notes[idx2];
                if (note.NoteTie !== undefined) {
                    if (duration < note.calculateNoteLengthWithoutTie()) {
                        duration = note.calculateNoteLengthWithoutTie();
                        for (var idx3 = 0, len3 = note.NoteTie.Fractions.length; idx3 < len3; ++idx3) {
                            var fraction = note.NoteTie.Fractions[idx3];
                            duration.Add(fraction);
                        }
                    }
                }
                else if (duration < note.Length) {
                    duration = note.Length;
                }
            }
        }
        return duration;
    };
    SourceStaffEntry.prototype.hasNotes = function () {
        for (var idx = 0, len = this.VoiceEntries.length; idx < len; ++idx) {
            var voiceEntry = this.VoiceEntries[idx];
            if (voiceEntry.Notes.length > 0) {
                return true;
            }
        }
        return false;
    };
    SourceStaffEntry.prototype.hasTie = function () {
        for (var idx = 0, len = this.VoiceEntries.length; idx < len; ++idx) {
            var voiceEntry = this.VoiceEntries[idx];
            if (voiceEntry.hasTie()) {
                return true;
            }
        }
        return false;
    };
    SourceStaffEntry.prototype.findLinkedNotes = function (linkedNotes) {
        for (var idx = 0, len = this.voiceEntries.length; idx < len; ++idx) {
            var voiceEntry = this.voiceEntries[idx];
            for (var idx2 = 0, len2 = voiceEntry.Notes.length; idx2 < len2; ++idx2) {
                var note = voiceEntry.Notes[idx2];
                if (note.ParentStaffEntry === this) {
                    linkedNotes.push(note);
                }
            }
        }
    };
    return SourceStaffEntry;
}());
exports.SourceStaffEntry = SourceStaffEntry;
