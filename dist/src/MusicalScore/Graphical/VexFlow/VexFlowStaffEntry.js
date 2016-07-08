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
    return VexFlowStaffEntry;
}(GraphicalStaffEntry_1.GraphicalStaffEntry));
exports.VexFlowStaffEntry = VexFlowStaffEntry;
