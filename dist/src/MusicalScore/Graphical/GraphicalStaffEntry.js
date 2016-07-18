"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BoundingBox_1 = require("./BoundingBox");
var fraction_1 = require("../../Common/DataObjects/fraction");
var LinkedVoice_1 = require("../VoiceData/LinkedVoice");
var GraphicalObject_1 = require("./GraphicalObject");
var collectionUtil_1 = require("../../Util/collectionUtil");
var GraphicalStaffEntry = (function (_super) {
    __extends(GraphicalStaffEntry, _super);
    function GraphicalStaffEntry(parentMeasure, sourceStaffEntry, staffEntryParent) {
        if (sourceStaffEntry === void 0) { sourceStaffEntry = undefined; }
        if (staffEntryParent === void 0) { staffEntryParent = undefined; }
        _super.call(this);
        this.graphicalInstructions = [];
        this.graphicalTies = [];
        this.lyricsEntries = [];
        this.parentMeasure = parentMeasure;
        this.notes = [];
        this.graceStaffEntriesBefore = [];
        this.graceStaffEntriesAfter = [];
        this.sourceStaffEntry = sourceStaffEntry;
        if (staffEntryParent !== undefined) {
            this.staffEntryParent = staffEntryParent;
            this.parentVerticalContainer = staffEntryParent.parentVerticalContainer;
            this.PositionAndShape = new BoundingBox_1.BoundingBox(this, staffEntryParent.PositionAndShape);
        }
        else {
            this.PositionAndShape = new BoundingBox_1.BoundingBox(this, parentMeasure.PositionAndShape);
        }
        if (sourceStaffEntry !== undefined) {
            this.relInMeasureTimestamp = sourceStaffEntry.Timestamp;
        }
    }
    Object.defineProperty(GraphicalStaffEntry.prototype, "GraphicalInstructions", {
        get: function () {
            return this.graphicalInstructions;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GraphicalStaffEntry.prototype, "GraphicalTies", {
        get: function () {
            return this.graphicalTies;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GraphicalStaffEntry.prototype, "LyricsEntries", {
        get: function () {
            return this.lyricsEntries;
        },
        enumerable: true,
        configurable: true
    });
    GraphicalStaffEntry.prototype.getAbsoluteTimestamp = function () {
        var result = this.parentMeasure.parentSourceMeasure.AbsoluteTimestamp.clone();
        if (this.relInMeasureTimestamp !== undefined) {
            result.Add(this.relInMeasureTimestamp);
        }
        return result;
    };
    GraphicalStaffEntry.prototype.findEndTieGraphicalNoteFromNote = function (tieNote) {
        for (var idx = 0, len = this.notes.length; idx < len; ++idx) {
            var graphicalNotes = this.notes[idx];
            for (var idx2 = 0, len2 = graphicalNotes.length; idx2 < len2; ++idx2) {
                var graphicalNote = graphicalNotes[idx2];
                var note = graphicalNote.sourceNote;
                if (note.Pitch !== undefined && note.Pitch.FundamentalNote === tieNote.Pitch.FundamentalNote
                    && note.Pitch.Octave === tieNote.Pitch.Octave && note.getAbsoluteTimestamp() === tieNote.getAbsoluteTimestamp()) {
                    return graphicalNote;
                }
            }
        }
        return undefined;
    };
    GraphicalStaffEntry.prototype.findEndTieGraphicalNoteFromNoteWithStartingSlur = function (tieNote, slur) {
        for (var idx = 0, len = this.notes.length; idx < len; ++idx) {
            var graphicalNotes = this.notes[idx];
            for (var idx2 = 0, len2 = graphicalNotes.length; idx2 < len2; ++idx2) {
                var graphicalNote = graphicalNotes[idx2];
                var note = graphicalNote.sourceNote;
                if (note.NoteTie !== undefined && note.NoteSlurs.indexOf(slur) !== -1) {
                    return graphicalNote;
                }
            }
        }
        return undefined;
    };
    GraphicalStaffEntry.prototype.findEndTieGraphicalNoteFromNoteWithEndingSlur = function (tieNote) {
        for (var idx = 0, len = this.notes.length; idx < len; ++idx) {
            var graphicalNotes = this.notes[idx];
            for (var idx2 = 0, len2 = graphicalNotes.length; idx2 < len2; ++idx2) {
                var graphicalNote = graphicalNotes[idx2];
                var note = graphicalNote.sourceNote;
                if (note.Pitch !== undefined && note.Pitch.FundamentalNote === tieNote.Pitch.FundamentalNote
                    && note.Pitch.Octave === tieNote.Pitch.Octave && this.getAbsoluteTimestamp() === tieNote.getAbsoluteTimestamp()) {
                    return graphicalNote;
                }
            }
        }
        return undefined;
    };
    GraphicalStaffEntry.prototype.findGraphicalNoteFromGraceNote = function (graceNote) {
        for (var idx = 0, len = this.notes.length; idx < len; ++idx) {
            var graphicalNotes = this.notes[idx];
            for (var idx2 = 0, len2 = graphicalNotes.length; idx2 < len2; ++idx2) {
                var graphicalNote = graphicalNotes[idx2];
                if (graphicalNote.sourceNote === graceNote) {
                    return graphicalNote;
                }
            }
        }
        return undefined;
    };
    GraphicalStaffEntry.prototype.findGraphicalNoteFromNote = function (baseNote) {
        for (var idx = 0, len = this.notes.length; idx < len; ++idx) {
            var graphicalNotes = this.notes[idx];
            for (var idx2 = 0, len2 = graphicalNotes.length; idx2 < len2; ++idx2) {
                var graphicalNote = graphicalNotes[idx2];
                if (graphicalNote.sourceNote === baseNote && this.getAbsoluteTimestamp() === baseNote.getAbsoluteTimestamp()) {
                    return graphicalNote;
                }
            }
        }
        return undefined;
    };
    GraphicalStaffEntry.prototype.getGraphicalNoteDurationFromVoice = function (voice) {
        for (var idx = 0, len = this.notes.length; idx < len; ++idx) {
            var graphicalNotes = this.notes[idx];
            if (graphicalNotes[0].sourceNote.ParentVoiceEntry.ParentVoice === voice) {
                return graphicalNotes[0].graphicalNoteLength;
            }
        }
        return new fraction_1.Fraction(0, 1);
    };
    GraphicalStaffEntry.prototype.findLinkedNotes = function (notLinkedNotes) {
        if (this.sourceStaffEntry !== undefined && this.sourceStaffEntry.Link !== undefined) {
            for (var idx = 0, len = this.notes.length; idx < len; ++idx) {
                var graphicalNotes = this.notes[idx];
                for (var idx2 = 0, len2 = graphicalNotes.length; idx2 < len2; ++idx2) {
                    var graphicalNote = graphicalNotes[idx2];
                    if (graphicalNote.parentStaffEntry === this) {
                        notLinkedNotes.push(graphicalNote);
                    }
                }
            }
        }
    };
    GraphicalStaffEntry.prototype.findVoiceEntryGraphicalNotes = function (voiceEntry) {
        for (var idx = 0, len = this.notes.length; idx < len; ++idx) {
            var graphicalNotes = this.notes[idx];
            for (var idx2 = 0, len2 = graphicalNotes.length; idx2 < len2; ++idx2) {
                var graphicalNote = graphicalNotes[idx2];
                if (graphicalNote.sourceNote.ParentVoiceEntry === voiceEntry) {
                    return graphicalNotes;
                }
            }
        }
        return undefined;
    };
    GraphicalStaffEntry.prototype.isVoiceEntryPartOfLinkedVoiceEntry = function (voiceEntry) {
        if (this.sourceStaffEntry.Link !== undefined) {
            for (var idx = 0, len = this.sourceStaffEntry.Link.LinkStaffEntries.length; idx < len; ++idx) {
                var sEntry = this.sourceStaffEntry.Link.LinkStaffEntries[idx];
                if (sEntry.VoiceEntries.indexOf(voiceEntry) !== -1 && sEntry !== this.sourceStaffEntry) {
                    return true;
                }
            }
        }
        return false;
    };
    GraphicalStaffEntry.prototype.getMainVoice = function () {
        for (var idx = 0, len = this.sourceStaffEntry.VoiceEntries.length; idx < len; ++idx) {
            var voiceEntry = this.sourceStaffEntry.VoiceEntries[idx];
            if (!(voiceEntry.ParentVoice instanceof LinkedVoice_1.LinkedVoice)) {
                return voiceEntry.ParentVoice;
            }
        }
        return this.notes[0][0].sourceNote.ParentVoiceEntry.ParentVoice;
    };
    GraphicalStaffEntry.prototype.findStaffEntryMinNoteLength = function () {
        var minLength = new fraction_1.Fraction(Number.MAX_VALUE, 1);
        for (var idx = 0, len = this.notes.length; idx < len; ++idx) {
            var graphicalNotes = this.notes[idx];
            for (var idx2 = 0, len2 = graphicalNotes.length; idx2 < len2; ++idx2) {
                var graphicalNote = graphicalNotes[idx2];
                var calNoteLen = graphicalNote.graphicalNoteLength;
                if (calNoteLen < minLength && calNoteLen.Numerator > 0) {
                    minLength = calNoteLen;
                }
            }
        }
        return minLength;
    };
    GraphicalStaffEntry.prototype.findStaffEntryMaxNoteLength = function () {
        var maxLength = new fraction_1.Fraction(0, 1);
        for (var idx = 0, len = this.notes.length; idx < len; ++idx) {
            var graphicalNotes = this.notes[idx];
            for (var idx2 = 0, len2 = graphicalNotes.length; idx2 < len2; ++idx2) {
                var graphicalNote = graphicalNotes[idx2];
                var calNoteLen = graphicalNote.graphicalNoteLength;
                if (calNoteLen > maxLength && calNoteLen.Numerator > 0) {
                    maxLength = calNoteLen;
                }
            }
        }
        return maxLength;
    };
    GraphicalStaffEntry.prototype.findOrCreateGraphicalNotesListFromVoiceEntry = function (voiceEntry) {
        var graphicalNotes;
        if (this.notes.length === 0) {
            graphicalNotes = [];
            this.notes.push(graphicalNotes);
        }
        else {
            for (var i = 0; i < this.notes.length; i++) {
                if (this.notes[i][0].sourceNote.ParentVoiceEntry.ParentVoice === voiceEntry.ParentVoice) {
                    return this.notes[i];
                }
            }
            graphicalNotes = [];
            this.notes.push(graphicalNotes);
        }
        return graphicalNotes;
    };
    GraphicalStaffEntry.prototype.findOrCreateGraphicalNotesListFromGraphicalNote = function (graphicalNote) {
        var graphicalNotes;
        var tieStartSourceStaffEntry = graphicalNote.sourceNote.ParentStaffEntry;
        if (this.sourceStaffEntry !== tieStartSourceStaffEntry) {
            graphicalNotes = this.findOrCreateGraphicalNotesListFromVoiceEntry(graphicalNote.sourceNote.ParentVoiceEntry);
        }
        else {
            if (this.notes.length === 0) {
                graphicalNotes = [];
                this.notes.push(graphicalNotes);
            }
            else {
                for (var i = 0; i < this.notes.length; i++) {
                    if (this.notes[i][0].sourceNote.ParentVoiceEntry.ParentVoice === graphicalNote.sourceNote.ParentVoiceEntry.ParentVoice) {
                        return this.notes[i];
                    }
                }
                graphicalNotes = [];
                this.notes.push(graphicalNotes);
            }
        }
        return graphicalNotes;
    };
    GraphicalStaffEntry.prototype.addGraphicalNoteToListAtCorrectYPosition = function (graphicalNotes, graphicalNote) {
        if (graphicalNotes.length === 0 ||
            graphicalNote.PositionAndShape.RelativePosition.y < collectionUtil_1.CollectionUtil.last(graphicalNotes).PositionAndShape.RelativePosition.Y) {
            graphicalNotes.push(graphicalNote);
        }
        else {
            for (var i = graphicalNotes.length - 1; i >= 0; i--) {
                if (graphicalNotes[i].PositionAndShape.RelativePosition.y > graphicalNote.PositionAndShape.RelativePosition.y) {
                    graphicalNotes.splice(i + 1, 0, graphicalNote);
                    break;
                }
                if (i === 0) {
                    graphicalNotes.splice(0, 0, graphicalNote);
                    break;
                }
            }
        }
    };
    return GraphicalStaffEntry;
}(GraphicalObject_1.GraphicalObject));
exports.GraphicalStaffEntry = GraphicalStaffEntry;
