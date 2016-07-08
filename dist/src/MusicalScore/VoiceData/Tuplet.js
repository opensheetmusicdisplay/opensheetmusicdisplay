"use strict";
var Tuplet = (function () {
    function Tuplet(tupletLabelNumber) {
        this.notes = [];
        this.fractions = [];
        this.tupletLabelNumber = tupletLabelNumber;
    }
    Object.defineProperty(Tuplet.prototype, "TupletLabelNumber", {
        get: function () {
            return this.tupletLabelNumber;
        },
        set: function (value) {
            this.tupletLabelNumber = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Tuplet.prototype, "Notes", {
        get: function () {
            return this.notes;
        },
        set: function (value) {
            this.notes = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Tuplet.prototype, "Fractions", {
        get: function () {
            return this.fractions;
        },
        set: function (value) {
            this.fractions = value;
        },
        enumerable: true,
        configurable: true
    });
    Tuplet.prototype.getNoteIndex = function (note) {
        for (var i = this.notes.length - 1; i >= 0; i--) {
            for (var j = 0; j < this.notes[i].length; j++) {
                if (note === this.notes[i][j]) {
                    return i;
                }
            }
        }
        return 0;
    };
    return Tuplet;
}());
exports.Tuplet = Tuplet;
