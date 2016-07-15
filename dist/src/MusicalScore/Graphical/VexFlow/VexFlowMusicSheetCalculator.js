"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var MusicSheetCalculator_1 = require("../MusicSheetCalculator");
var VexFlowGraphicalSymbolFactory_1 = require("./VexFlowGraphicalSymbolFactory");
var VexFlowTextMeasurer_1 = require("./VexFlowTextMeasurer");
var Vex = require("vexflow");
var Logging_1 = require("../../../Common/Logging");
var VexFlowMusicSheetCalculator = (function (_super) {
    __extends(VexFlowMusicSheetCalculator, _super);
    function VexFlowMusicSheetCalculator() {
        _super.call(this, new VexFlowGraphicalSymbolFactory_1.VexFlowGraphicalSymbolFactory());
        MusicSheetCalculator_1.MusicSheetCalculator.TextMeasurer = new VexFlowTextMeasurer_1.VexFlowTextMeasurer();
    }
    VexFlowMusicSheetCalculator.prototype.clearRecreatedObjects = function () {
        _super.prototype.clearRecreatedObjects.call(this);
        for (var _i = 0, _a = this.graphicalMusicSheet.MeasureList; _i < _a.length; _i++) {
            var staffMeasures = _a[_i];
            for (var _b = 0, staffMeasures_1 = staffMeasures; _b < staffMeasures_1.length; _b++) {
                var staffMeasure = staffMeasures_1[_b];
                staffMeasure.clean();
            }
        }
    };
    //protected clearSystemsAndMeasures(): void {
    //    for (let measure of measures) {
    //
    //    }
    //}
    /**
     * Calculates the x layout of the staff entries within the staff measures belonging to one source measure.
     * All staff entries are x-aligned throughout all vertically aligned staff measures.
     * This method is called within calculateXLayout.
     * The staff entries are aligned with minimum needed x distances.
     * The MinimumStaffEntriesWidth of every measure will be set - needed for system building.
     * @param measures
     * @returns the minimum required x width of the source measure (=list of staff measures)
     */
    VexFlowMusicSheetCalculator.prototype.calculateMeasureXLayout = function (measures) {
        // Finalize beams
        for (var _i = 0, measures_1 = measures; _i < measures_1.length; _i++) {
            var measure = measures_1[_i];
            measure.finalizeBeams();
        }
        // Format the voices
        var allVoices = [];
        var formatter = new Vex.Flow.Formatter({
            align_rests: true,
        });
        for (var _a = 0, measures_2 = measures; _a < measures_2.length; _a++) {
            var measure = measures_2[_a];
            var mvoices = measure.vfVoices;
            var voices = [];
            for (var voiceID in mvoices) {
                if (mvoices.hasOwnProperty(voiceID)) {
                    voices.push(mvoices[voiceID]);
                    allVoices.push(mvoices[voiceID]);
                }
            }
            if (voices.length === 0) {
                Logging_1.Logging.warn("Found a measure with no voices... Continuing anyway.", mvoices);
                continue;
            }
            formatter.joinVoices(voices);
        }
        var firstMeasure = measures[0];
        // FIXME: The following ``+ 5.0'' is temporary: it was added as a workaround for
        // FIXME: a more relaxed formatting of voices
        var width = formatter.preCalculateMinTotalWidth(allVoices) / 10.0 + 5.0;
        for (var _b = 0, measures_3 = measures; _b < measures_3.length; _b++) {
            var measure = measures_3[_b];
            measure.minimumStaffEntriesWidth = width;
            measure.formatVoices = undefined;
        }
        firstMeasure.formatVoices = function (w) {
            formatter.format(allVoices, w);
        };
        return width;
    };
    VexFlowMusicSheetCalculator.prototype.updateStaffLineBorders = function (staffLine) {
        return;
    };
    VexFlowMusicSheetCalculator.prototype.calculateMeasureNumberPlacement = function (musicSystem) {
        return;
    };
    /**
     * Can be used to calculate stem directions, helper(ledger) lines, and overlapping note x-displacement.
     * Is Excecuted per voice entry of a staff entry.
     * After that layoutStaffEntry is called.
     * @param voiceEntry
     * @param graphicalNotes
     * @param graphicalStaffEntry
     * @param hasPitchedNote
     * @param isGraceStaffEntry
     */
    VexFlowMusicSheetCalculator.prototype.layoutVoiceEntry = function (voiceEntry, graphicalNotes, graphicalStaffEntry, hasPitchedNote, isGraceStaffEntry) {
        return;
    };
    /**
     * Do all layout calculations that have to be done per staff entry, like dots, ornaments, arpeggios....
     * This method is called after the voice entries are handled by layoutVoiceEntry().
     * @param graphicalStaffEntry
     */
    VexFlowMusicSheetCalculator.prototype.layoutStaffEntry = function (graphicalStaffEntry) {
        graphicalStaffEntry.parentMeasure.layoutStaffEntry(graphicalStaffEntry);
    };
    /**
     * calculates the y positions of the staff lines within a system and
     * furthermore the y positions of the systems themselves.
     */
    VexFlowMusicSheetCalculator.prototype.calculateSystemYLayout = function () {
        for (var idx = 0, len = this.graphicalMusicSheet.MusicPages.length; idx < len; ++idx) {
            var graphicalMusicPage = this.graphicalMusicSheet.MusicPages[idx];
            if (!this.leadSheet) {
                var globalY = 0;
                for (var idx2 = 0, len2 = graphicalMusicPage.MusicSystems.length; idx2 < len2; ++idx2) {
                    var musicSystem = graphicalMusicPage.MusicSystems[idx2];
                    // calculate y positions of stafflines within system
                    var y = 10;
                    for (var _i = 0, _a = musicSystem.StaffLines; _i < _a.length; _i++) {
                        var line = _a[_i];
                        line.PositionAndShape.RelativePosition.y = y;
                        y += 10;
                    }
                    // set y positions of systems using the previous system and a fixed distance.
                    musicSystem.PositionAndShape.BorderBottom = y + 0;
                    musicSystem.PositionAndShape.RelativePosition.y = globalY;
                    globalY += y + 0;
                }
            }
        }
    };
    /**
     * Is called at the begin of the method for creating the vertically aligned staff measures belonging to one source measure.
     */
    VexFlowMusicSheetCalculator.prototype.initStaffMeasuresCreation = function () {
        return;
    };
    VexFlowMusicSheetCalculator.prototype.handleTie = function (tie, startGraphicalStaffEntry, staffIndex, measureIndex) {
        return;
    };
    VexFlowMusicSheetCalculator.prototype.layoutGraphicalTie = function (tie, tieIsAtSystemBreak) {
        return;
    };
    VexFlowMusicSheetCalculator.prototype.calculateSingleStaffLineLyricsPosition = function (staffLine, lyricVersesNumber) {
        return;
    };
    VexFlowMusicSheetCalculator.prototype.calculateSingleOctaveShift = function (sourceMeasure, multiExpression, measureIndex, staffIndex) {
        return;
    };
    VexFlowMusicSheetCalculator.prototype.calculateWordRepetitionInstruction = function (repetitionInstruction, measureIndex) {
        return;
    };
    VexFlowMusicSheetCalculator.prototype.calculateMoodAndUnknownExpression = function (multiExpression, measureIndex, staffIndex) {
        return;
    };
    VexFlowMusicSheetCalculator.prototype.createGraphicalTieNote = function (beams, activeClef, octaveShiftValue, graphicalStaffEntry, duration, numberOfDots, openTie, isLastTieNote) {
        return;
    };
    /**
     * Is called if a note is part of a beam.
     * @param graphicalNote
     * @param beam
     * @param openBeams a list of all currently open beams
     */
    VexFlowMusicSheetCalculator.prototype.handleBeam = function (graphicalNote, beam, openBeams) {
        graphicalNote.parentStaffEntry.parentMeasure.handleBeam(graphicalNote, beam);
    };
    VexFlowMusicSheetCalculator.prototype.handleVoiceEntryLyrics = function (lyricsEntries, voiceEntry, graphicalStaffEntry, openLyricWords) {
        return;
    };
    VexFlowMusicSheetCalculator.prototype.handleVoiceEntryOrnaments = function (ornamentContainer, voiceEntry, graphicalStaffEntry) {
        return;
    };
    VexFlowMusicSheetCalculator.prototype.handleVoiceEntryArticulations = function (articulations, voiceEntry, graphicalStaffEntry) {
        return;
    };
    /**
     * Is called if a note is part of a tuplet.
     * @param graphicalNote
     * @param tuplet
     * @param openTuplets a list of all currently open tuplets
     */
    VexFlowMusicSheetCalculator.prototype.handleTuplet = function (graphicalNote, tuplet, openTuplets) {
        return;
    };
    return VexFlowMusicSheetCalculator;
}(MusicSheetCalculator_1.MusicSheetCalculator));
exports.VexFlowMusicSheetCalculator = VexFlowMusicSheetCalculator;
