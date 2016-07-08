"use strict";
var fraction_1 = require("../../../../Common/DataObjects/fraction");
var Slur = (function () {
    function Slur() {
        // ?
    }
    Object.defineProperty(Slur.prototype, "StartNote", {
        get: function () {
            return this.startNote;
        },
        set: function (value) {
            this.startNote = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Slur.prototype, "EndNote", {
        get: function () {
            return this.endNote;
        },
        set: function (value) {
            this.endNote = value;
        },
        enumerable: true,
        configurable: true
    });
    Slur.prototype.startNoteHasMoreStartingSlurs = function () {
        if (this.startNote === undefined) {
            return false;
        }
        for (var idx = 0, len = this.startNote.NoteSlurs.length; idx < len; ++idx) {
            var slur = this.startNote.NoteSlurs[idx];
            if (slur !== this && slur.StartNote === this.startNote) {
                return true;
            }
        }
        return false;
    };
    Slur.prototype.endNoteHasMoreEndingSlurs = function () {
        if (this.endNote === undefined) {
            return false;
        }
        for (var idx = 0, len = this.endNote.NoteSlurs.length; idx < len; ++idx) {
            var slur = this.endNote.NoteSlurs[idx];
            if (slur !== this && slur.EndNote === this.endNote) {
                return true;
            }
        }
        return false;
    };
    Slur.prototype.isCrossed = function () {
        return (this.startNote.ParentStaffEntry.ParentStaff !== this.endNote.ParentStaffEntry.ParentStaff);
    };
    Slur.prototype.isSlurLonger = function () {
        if (this.endNote === undefined || this.startNote === undefined) {
            return false;
        }
        var length = fraction_1.Fraction.minus(this.endNote.getAbsoluteTimestamp(), this.startNote.getAbsoluteTimestamp());
        for (var idx = 0, len = this.startNote.NoteSlurs.length; idx < len; ++idx) {
            var slur = this.startNote.NoteSlurs[idx];
            if (slur !== this
                && slur.EndNote !== undefined
                && slur.StartNote !== undefined
                && fraction_1.Fraction.minus(slur.EndNote.getAbsoluteTimestamp(), slur.StartNote.getAbsoluteTimestamp()).CompareTo(length) === -1) {
                return true;
            }
        }
        for (var idx = 0, len = this.endNote.NoteSlurs.length; idx < len; ++idx) {
            var slur = this.endNote.NoteSlurs[idx];
            if (slur !== this
                && slur.EndNote !== undefined
                && slur.StartNote !== undefined
                && fraction_1.Fraction.minus(slur.EndNote.getAbsoluteTimestamp(), slur.StartNote.getAbsoluteTimestamp()).CompareTo(length)) {
                return true;
            }
        }
        return false;
    };
    return Slur;
}());
exports.Slur = Slur;
