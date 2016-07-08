"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Vex = require("vexflow");
var GraphicalNote_1 = require("../GraphicalNote");
var VexFlowConverter_1 = require("./VexFlowConverter");
var VexFlowGraphicalNote = (function (_super) {
    __extends(VexFlowGraphicalNote, _super);
    function VexFlowGraphicalNote(note, parent, activeClef) {
        _super.call(this, note, parent);
        this.clef = activeClef;
        if (note.Pitch) {
            this.vfpitch = VexFlowConverter_1.VexFlowConverter.pitch(note.Pitch, this.clef);
            this.vfpitch[1] = undefined;
        }
    }
    VexFlowGraphicalNote.prototype.setPitch = function (pitch) {
        if (this.vfnote) {
            var acc = VexFlowConverter_1.VexFlowConverter.accidental(pitch.Accidental);
            if (acc) {
                alert(acc);
                this.vfnote[0].addAccidental(this.vfnote[1], new Vex.Flow.Accidental(acc));
            }
        }
        else {
            this.vfpitch = VexFlowConverter_1.VexFlowConverter.pitch(pitch, this.clef);
        }
    };
    /**
     * Set the corresponding VexFlow StaveNote together with its index
     * @param note
     * @param index
     */
    VexFlowGraphicalNote.prototype.setIndex = function (note, index) {
        this.vfnote = [note, index];
        //if (this.vfpitch && this.vfpitch[1]) {
        //    note.addAccidental(index, new Vex.Flow.Accidental(this.vfpitch[1]));
        //}
    };
    return VexFlowGraphicalNote;
}(GraphicalNote_1.GraphicalNote));
exports.VexFlowGraphicalNote = VexFlowGraphicalNote;
