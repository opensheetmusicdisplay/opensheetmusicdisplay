"use strict";
var fraction_1 = require("../../Common/DataObjects/fraction");
var Note = (function () {
    function Note(voiceEntry, parentStaffEntry, length, pitch) {
        this.slurs = [];
        this.graceNoteSlash = false;
        this.playbackInstrumentId = undefined;
        this.voiceEntry = voiceEntry;
        this.parentStaffEntry = parentStaffEntry;
        this.length = length;
        this.pitch = pitch;
        if (pitch !== undefined) {
            this.halfTone = pitch.getHalfTone();
        }
        else {
            this.halfTone = 0;
        }
    }
    Object.defineProperty(Note.prototype, "GraceNoteSlash", {
        get: function () {
            return this.graceNoteSlash;
        },
        set: function (value) {
            this.graceNoteSlash = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Note.prototype, "ParentVoiceEntry", {
        get: function () {
            return this.voiceEntry;
        },
        set: function (value) {
            this.voiceEntry = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Note.prototype, "ParentStaffEntry", {
        get: function () {
            return this.parentStaffEntry;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Note.prototype, "ParentStaff", {
        get: function () {
            return this.parentStaffEntry.ParentStaff;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Note.prototype, "Length", {
        get: function () {
            return this.length;
        },
        set: function (value) {
            this.length = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Note.prototype, "Pitch", {
        get: function () {
            return this.pitch;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Note.prototype, "NoteBeam", {
        get: function () {
            return this.beam;
        },
        set: function (value) {
            this.beam = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Note.prototype, "NoteTuplet", {
        get: function () {
            return this.tuplet;
        },
        set: function (value) {
            this.tuplet = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Note.prototype, "NoteTie", {
        get: function () {
            return this.tie;
        },
        set: function (value) {
            this.tie = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Note.prototype, "NoteSlurs", {
        get: function () {
            return this.slurs;
        },
        set: function (value) {
            this.slurs = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Note.prototype, "PlaybackInstrumentId", {
        get: function () {
            return this.playbackInstrumentId;
        },
        set: function (value) {
            this.playbackInstrumentId = value;
        },
        enumerable: true,
        configurable: true
    });
    Note.prototype.calculateNoteLengthWithoutTie = function () {
        var withoutTieLength = this.length.clone();
        if (this.tie !== undefined) {
            for (var _i = 0, _a = this.tie.Fractions; _i < _a.length; _i++) {
                var fraction = _a[_i];
                withoutTieLength.Sub(fraction);
            }
        }
        return withoutTieLength;
    };
    Note.prototype.calculateNoteOriginalLength = function (originalLength) {
        if (originalLength === void 0) { originalLength = this.length; }
        if (this.tie !== undefined) {
            originalLength = this.calculateNoteLengthWithoutTie();
        }
        if (this.tuplet !== undefined) {
            return this.length;
        }
        if (originalLength.Numerator > 1) {
            var exp = Math.floor(Math.log(originalLength.Denominator) / Math.LN2) - this.calculateNumberOfNeededDots(originalLength);
            originalLength.Denominator = Math.pow(2, exp);
            originalLength.Numerator = 1;
        }
        return originalLength;
    };
    Note.prototype.calculateNoteLengthWithDots = function () {
        // FIXME is this function the same as this.calculateNoteLengthWithoutTie?
        if (this.tie !== undefined) {
            return this.calculateNoteLengthWithoutTie();
        }
        return this.length;
    };
    Note.prototype.calculateNumberOfNeededDots = function (fraction) {
        if (fraction === void 0) { fraction = this.length; }
        // FIXME (Andrea) Test if correct
        if (this.tuplet === undefined) {
            return Math.floor(Math.log(fraction.Numerator) / Math.LN2);
        }
        else {
            return 0;
        }
    };
    Note.prototype.ToString = function () {
        if (this.pitch !== undefined) {
            return this.Pitch.ToString() + ", length: " + this.length.toString();
        }
        else {
            return "rest note, length: " + this.length.toString();
        }
    };
    Note.prototype.getAbsoluteTimestamp = function () {
        return fraction_1.Fraction.plus(this.voiceEntry.Timestamp, this.parentStaffEntry.VerticalContainerParent.ParentMeasure.AbsoluteTimestamp);
    };
    Note.prototype.checkForDoubleSlur = function (slur) {
        for (var idx = 0, len = this.slurs.length; idx < len; ++idx) {
            var noteSlur = this.slurs[idx];
            if (noteSlur.StartNote !== undefined &&
                noteSlur.EndNote !== undefined &&
                slur.StartNote !== undefined &&
                slur.StartNote === noteSlur.StartNote &&
                noteSlur.EndNote === this) {
                return true;
            }
        }
        return false;
    };
    return Note;
}());
exports.Note = Note;
(function (Appearance) {
    Appearance[Appearance["Normal"] = 0] = "Normal";
    Appearance[Appearance["Grace"] = 1] = "Grace";
    Appearance[Appearance["Cue"] = 2] = "Cue";
})(exports.Appearance || (exports.Appearance = {}));
var Appearance = exports.Appearance;
