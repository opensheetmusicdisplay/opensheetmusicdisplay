"use strict";
var VexFlowMusicSystem_1 = require("./VexFlowMusicSystem");
var VexFlowStaffLine_1 = require("./VexFlowStaffLine");
var VexFlowMeasure_1 = require("./VexFlowMeasure");
var VexFlowStaffEntry_1 = require("./VexFlowStaffEntry");
var octaveShift_1 = require("../../VoiceData/Expressions/ContinuousExpressions/octaveShift");
var GraphicalNote_1 = require("../GraphicalNote");
var VexFlowGraphicalNote_1 = require("./VexFlowGraphicalNote");
var VexFlowGraphicalSymbolFactory = (function () {
    function VexFlowGraphicalSymbolFactory() {
    }
    /**
     * Create a new music system for the given page.
     * Currently only one vertically endless page exists where all systems are put to.
     * @param page
     * @param systemIndex
     * @returns {VexFlowMusicSystem}
     */
    VexFlowGraphicalSymbolFactory.prototype.createMusicSystem = function (page, systemIndex) {
        return new VexFlowMusicSystem_1.VexFlowMusicSystem(page, systemIndex);
    };
    /**
     * Create a staffline object containing all staff measures belonging to a given system and staff.
     * @param parentSystem
     * @param parentStaff
     * @returns {VexFlowStaffLine}
     */
    VexFlowGraphicalSymbolFactory.prototype.createStaffLine = function (parentSystem, parentStaff) {
        return new VexFlowStaffLine_1.VexFlowStaffLine(parentSystem, parentStaff);
    };
    /**
     * Construct an empty staffMeasure from the given source measure and staff.
     * @param sourceMeasure
     * @param staff
     * @returns {VexFlowMeasure}
     */
    VexFlowGraphicalSymbolFactory.prototype.createStaffMeasure = function (sourceMeasure, staff) {
        return new VexFlowMeasure_1.VexFlowMeasure(staff, undefined, sourceMeasure);
    };
    /**
     * Create empty measure, which will be used to show key, rhythm changes at the end of the system.
     * @param staffLine
     * @returns {VexFlowMeasure}
     */
    VexFlowGraphicalSymbolFactory.prototype.createExtraStaffMeasure = function (staffLine) {
        return new VexFlowMeasure_1.VexFlowMeasure(staffLine.ParentStaff, staffLine);
    };
    /**
     * Create a staffEntry in the given measure for a given sourceStaffEntry.
     * @param sourceStaffEntry
     * @param measure
     * @returns {VexFlowStaffEntry}
     */
    VexFlowGraphicalSymbolFactory.prototype.createStaffEntry = function (sourceStaffEntry, measure) {
        return new VexFlowStaffEntry_1.VexFlowStaffEntry(measure, sourceStaffEntry, undefined);
    };
    /**
     * Create an empty staffEntry which will be used for grace notes.
     * it will be linked to the given staffEntryParent, which is a staffEntry for normal notes.
     * Grace notes are always given before (rarely also after) normal notes.
     * @param staffEntryParent
     * @param measure
     * @returns {VexFlowStaffEntry}
     */
    VexFlowGraphicalSymbolFactory.prototype.createGraceStaffEntry = function (staffEntryParent, measure) {
        return new VexFlowStaffEntry_1.VexFlowStaffEntry(measure, undefined, staffEntryParent);
    };
    /**
     * Create a Graphical Note for given note and clef and as part of graphicalStaffEntry.
     * @param note
     * @param numberOfDots  The number of dots the note has to increase its musical duration.
     * @param graphicalStaffEntry
     * @param activeClef    The currently active clef, needed for positioning the note vertically
     * @param octaveShift   The currently active octave transposition enum, needed for positioning the note vertically
     * @returns {GraphicalNote}
     */
    VexFlowGraphicalSymbolFactory.prototype.createNote = function (note, numberOfDots, graphicalStaffEntry, activeClef, octaveShift) {
        if (octaveShift === void 0) { octaveShift = octaveShift_1.OctaveEnum.NONE; }
        // Creates the note:
        var graphicalNote = new VexFlowGraphicalNote_1.VexFlowGraphicalNote(note, graphicalStaffEntry, activeClef);
        // Adds the note to the right (graphical) voice (mynotes)
        var voiceID = note.ParentVoiceEntry.ParentVoice.VoiceId;
        var mynotes = graphicalStaffEntry.graphicalNotes;
        if (!(voiceID in mynotes)) {
            mynotes[voiceID] = [];
        }
        mynotes[voiceID].push(graphicalNote);
        return graphicalNote;
    };
    /**
     * Create a Graphical Grace Note (smaller head, stem...) for given note and clef and as part of graphicalStaffEntry.
     * @param note
     * @param numberOfDots
     * @param graphicalStaffEntry
     * @param activeClef
     * @param octaveShift
     * @returns {GraphicalNote}
     */
    VexFlowGraphicalSymbolFactory.prototype.createGraceNote = function (note, numberOfDots, graphicalStaffEntry, activeClef, octaveShift) {
        if (octaveShift === void 0) { octaveShift = octaveShift_1.OctaveEnum.NONE; }
        return new GraphicalNote_1.GraphicalNote(note, graphicalStaffEntry);
    };
    /**
     * Sets a pitch which will be used for rendering the given graphical note (not changing the original pitch of the note!!!).
     * Will be only called if the displayed accidental is different from the original (e.g. a C# with C# as key instruction)
     * @param graphicalNote
     * @param pitch The pitch which will be rendered.
     * @param grace
     * @param graceScalingFactor
     */
    VexFlowGraphicalSymbolFactory.prototype.addGraphicalAccidental = function (graphicalNote, pitch, grace, graceScalingFactor) {
        // ToDo: set accidental here from pitch.Accidental
        var note = graphicalNote;
        note.setPitch(pitch);
    };
    /**
     * Adds a Fermata symbol at the last note of the given tied Note.
     * The last graphical note of this tied note is located at the given graphicalStaffEntry.
     * A Fermata has to be located at the last tied note.
     * @param tiedNote
     * @param graphicalStaffEntry
     */
    VexFlowGraphicalSymbolFactory.prototype.addFermataAtTiedEndNote = function (tiedNote, graphicalStaffEntry) {
        return;
    };
    /**
     * Adds a technical instruction at the given staff entry.
     * @param technicalInstruction
     * @param graphicalStaffEntry
     */
    VexFlowGraphicalSymbolFactory.prototype.createGraphicalTechnicalInstruction = function (technicalInstruction, graphicalStaffEntry) {
        return;
    };
    /**
     * Adds a clef change within a measure before the given staff entry.
     * @param graphicalStaffEntry
     * @param clefInstruction
     */
    VexFlowGraphicalSymbolFactory.prototype.createInStaffClef = function (graphicalStaffEntry, clefInstruction) {
        return;
    };
    /**
     * Adds a chord symbol at the given staff entry
     * @param sourceStaffEntry
     * @param graphicalStaffEntry
     * @param transposeHalftones
     */
    VexFlowGraphicalSymbolFactory.prototype.createChordSymbol = function (sourceStaffEntry, graphicalStaffEntry, transposeHalftones) {
        return;
    };
    return VexFlowGraphicalSymbolFactory;
}());
exports.VexFlowGraphicalSymbolFactory = VexFlowGraphicalSymbolFactory;
