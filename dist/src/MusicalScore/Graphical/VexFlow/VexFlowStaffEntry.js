"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var GraphicalStaffEntry_1 = require("../GraphicalStaffEntry");
var VexFlowStaffEntry = (function (_super) {
    __extends(VexFlowStaffEntry, _super);
    function VexFlowStaffEntry(measure, sourceStaffEntry, staffEntryParent) {
        _super.call(this, measure, sourceStaffEntry, staffEntryParent);
        // The Graphical Notes belonging to this StaffEntry, sorted by voiceID
        this.graphicalNotes = {};
        // The corresponding VexFlow.StaveNotes
        this.vfNotes = {};
    }
    /**
     *
     * @returns {number} the x-position (in units) of this Staff Entry
     */
    VexFlowStaffEntry.prototype.getX = function () {
        var x = 0;
        var n = 0;
        var vfNotes = this.vfNotes;
        for (var voiceId in vfNotes) {
            if (vfNotes.hasOwnProperty(voiceId)) {
                x += (vfNotes[voiceId].getNoteHeadBeginX() + vfNotes[voiceId].getNoteHeadEndX()) / 2;
                n += 1;
            }
        }
        return x / n / 10.0;
    };
    return VexFlowStaffEntry;
}(GraphicalStaffEntry_1.GraphicalStaffEntry));
exports.VexFlowStaffEntry = VexFlowStaffEntry;
