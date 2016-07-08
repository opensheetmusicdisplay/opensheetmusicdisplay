"use strict";
var Tie = (function () {
    function Tie(note) {
        this.fractions = [];
        this.noteHasBeenCreated = [];
        this.start = note;
    }
    Object.defineProperty(Tie.prototype, "Start", {
        get: function () {
            return this.start;
        },
        set: function (value) {
            this.start = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Tie.prototype, "TieBeam", {
        get: function () {
            return this.tieBeam;
        },
        set: function (value) {
            this.tieBeam = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Tie.prototype, "BeamStartTimestamp", {
        get: function () {
            return this.beamStartTimestamp;
        },
        set: function (value) {
            this.beamStartTimestamp = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Tie.prototype, "TieTuplet", {
        get: function () {
            return this.tieTuplet;
        },
        set: function (value) {
            this.tieTuplet = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Tie.prototype, "Fractions", {
        get: function () {
            return this.fractions;
        },
        set: function (value) {
            this.fractions = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Tie.prototype, "NoteHasBeenCreated", {
        get: function () {
            return this.noteHasBeenCreated;
        },
        set: function (value) {
            this.noteHasBeenCreated = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Tie.prototype, "BaseNoteYPosition", {
        get: function () {
            return this.baseNoteYPosition;
        },
        set: function (value) {
            this.baseNoteYPosition = value;
        },
        enumerable: true,
        configurable: true
    });
    Tie.prototype.initializeBoolList = function () {
        this.noteHasBeenCreated = [];
        for (var idx = 0, len = this.fractions.length; idx < len; ++idx) {
            // let fraction: Fraction = this.fractions[idx];
            this.noteHasBeenCreated.push(false);
        }
    };
    Tie.prototype.allGraphicalNotesHaveBeenCreated = function () {
        for (var idx = 0, len = this.noteHasBeenCreated.length; idx < len; ++idx) {
            if (!this.noteHasBeenCreated[idx]) {
                return false;
            }
        }
        return true;
    };
    return Tie;
}());
exports.Tie = Tie;
