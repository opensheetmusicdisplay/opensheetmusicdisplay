"use strict";
var Beam = (function () {
    function Beam() {
        this.notes = [];
        this.extendedNoteList = [];
    }
    Object.defineProperty(Beam.prototype, "Notes", {
        get: function () {
            return this.notes;
        },
        set: function (value) {
            this.notes = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Beam.prototype, "ExtendedNoteList", {
        get: function () {
            return this.extendedNoteList;
        },
        set: function (value) {
            this.extendedNoteList = value;
        },
        enumerable: true,
        configurable: true
    });
    Beam.prototype.addNoteToBeam = function (note) {
        if (note !== undefined) {
            note.NoteBeam = this;
            this.notes.push(note);
            this.extendedNoteList.push(note);
        }
    };
    return Beam;
}());
exports.Beam = Beam;
(function (BeamEnum) {
    BeamEnum[BeamEnum["BeamNone"] = -1] = "BeamNone";
    BeamEnum[BeamEnum["BeamBegin"] = 0] = "BeamBegin";
    BeamEnum[BeamEnum["BeamContinue"] = 1] = "BeamContinue";
    BeamEnum[BeamEnum["BeamEnd"] = 2] = "BeamEnd";
    BeamEnum[BeamEnum["BeamForward"] = 3] = "BeamForward";
    BeamEnum[BeamEnum["BeamBackward"] = 4] = "BeamBackward";
})(exports.BeamEnum || (exports.BeamEnum = {}));
var BeamEnum = exports.BeamEnum;
