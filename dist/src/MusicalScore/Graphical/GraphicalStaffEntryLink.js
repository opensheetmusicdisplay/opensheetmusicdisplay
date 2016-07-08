"use strict";
var GraphicalStaffEntryLink = (function () {
    function GraphicalStaffEntryLink(staffEntryLink) {
        this.graphicalLinkedStaffEntries = [];
        this.staffEntryLink = staffEntryLink;
        this.initialize();
    }
    Object.defineProperty(GraphicalStaffEntryLink.prototype, "GetStaffEntryLink", {
        get: function () {
            return this.staffEntryLink;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GraphicalStaffEntryLink.prototype, "GraphicalLinkedStaffEntries", {
        get: function () {
            return this.graphicalLinkedStaffEntries;
        },
        set: function (value) {
            this.graphicalLinkedStaffEntries = value;
        },
        enumerable: true,
        configurable: true
    });
    GraphicalStaffEntryLink.prototype.isFilled = function () {
        for (var i = 0; i < this.graphicalLinkedStaffEntries.length; i++) {
            if (this.graphicalLinkedStaffEntries[i] === undefined) {
                return false;
            }
        }
        return true;
    };
    GraphicalStaffEntryLink.prototype.getLinkedStaffEntriesGraphicalNotes = function (graphicalStaffEntry) {
        if (this.graphicalLinkedStaffEntries.indexOf(graphicalStaffEntry) !== -1) {
            var notes = [];
            for (var idx = 0, len = this.graphicalLinkedStaffEntries.length; idx < len; ++idx) {
                var graphicalLinkedStaffEntry = this.graphicalLinkedStaffEntries[idx];
                for (var idx2 = 0, len2 = graphicalLinkedStaffEntry.notes.length; idx2 < len2; ++idx2) {
                    var graphicalNotes = graphicalLinkedStaffEntry.notes[idx2];
                    for (var idx3 = 0, len3 = graphicalNotes.length; idx3 < len3; ++idx3) {
                        var graphicalNote = graphicalNotes[idx3];
                        if (graphicalNote.sourceNote.ParentStaffEntry.Link !== undefined
                            && graphicalNote.sourceNote.ParentVoiceEntry === this.staffEntryLink.GetVoiceEntry) {
                            notes.push(graphicalNote);
                        }
                    }
                }
            }
            return notes;
        }
        return undefined;
    };
    GraphicalStaffEntryLink.prototype.initialize = function () {
        for (var idx = 0, len = this.staffEntryLink.LinkStaffEntries.length; idx < len; ++idx) {
            this.graphicalLinkedStaffEntries.push(undefined);
        }
    };
    return GraphicalStaffEntryLink;
}());
exports.GraphicalStaffEntryLink = GraphicalStaffEntryLink;
