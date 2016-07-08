"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var GraphicalObject_1 = require("./GraphicalObject");
var MusicSheetCalculator_1 = require("./MusicSheetCalculator");
var BoundingBox_1 = require("./BoundingBox");
var GraphicalNote = (function (_super) {
    __extends(GraphicalNote, _super);
    function GraphicalNote(note, parent) {
        _super.call(this);
        this.sourceNote = note;
        this.parentStaffEntry = parent;
        this.PositionAndShape = new BoundingBox_1.BoundingBox(this, parent.PositionAndShape);
    }
    Object.defineProperty(GraphicalNote.prototype, "ParentList", {
        get: function () {
            for (var idx = 0, len = this.parentStaffEntry.notes.length; idx < len; ++idx) {
                var graphicalNotes = this.parentStaffEntry.notes[idx];
                if (graphicalNotes.indexOf(this) !== -1) {
                    return graphicalNotes;
                }
            }
            return undefined;
        },
        enumerable: true,
        configurable: true
    });
    GraphicalNote.prototype.Transpose = function (keyInstruction, activeClef, halfTones, octaveEnum) {
        var transposedPitch = this.sourceNote.Pitch;
        if (MusicSheetCalculator_1.MusicSheetCalculator.transposeCalculator !== undefined) {
            transposedPitch = MusicSheetCalculator_1.MusicSheetCalculator.transposeCalculator.transposePitch(this.sourceNote.Pitch, keyInstruction, halfTones);
        }
        return transposedPitch;
    };
    return GraphicalNote;
}(GraphicalObject_1.GraphicalObject));
exports.GraphicalNote = GraphicalNote;
