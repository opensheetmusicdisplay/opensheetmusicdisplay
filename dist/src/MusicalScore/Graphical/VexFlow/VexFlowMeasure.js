"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Vex = require("vexflow");
var StaffMeasure_1 = require("../StaffMeasure");
var VexFlowConverter_1 = require("./VexFlowConverter");
var Logging_1 = require("../../../Common/Logging");
var VexFlowMeasure = (function (_super) {
    __extends(VexFlowMeasure, _super);
    function VexFlowMeasure(staff, staffLine, sourceMeasure) {
        if (staffLine === void 0) { staffLine = undefined; }
        if (sourceMeasure === void 0) { sourceMeasure = undefined; }
        _super.call(this, staff, sourceMeasure, staffLine);
        // octaveOffset according to active clef
        this.octaveOffset = 3;
        // The VexFlow Voices in the measure
        this.vfVoices = {};
        // VexFlow StaveConnectors (vertical lines)
        this.connectors = [];
        // Intermediate object to construct beams
        this.beams = {};
        this.minimumStaffEntriesWidth = -1;
        this.resetLayout();
    }
    // Sets the absolute coordinates of the VFStave on the canvas
    VexFlowMeasure.prototype.setAbsoluteCoordinates = function (x, y) {
        this.stave.setX(x).setY(y);
    };
    /**
     * Reset all the geometric values and parameters of this measure and put it in an initialized state.
     * This is needed to evaluate a measure a second time by system builder.
     */
    VexFlowMeasure.prototype.resetLayout = function () {
        // Take into account some space for the begin and end lines of the stave
        // Will be changed when repetitions will be implemented
        //this.beginInstructionsWidth = 20 / 10.0;
        //this.endInstructionsWidth = 20 / 10.0;
        this.stave = new Vex.Flow.Stave(0, 0, 0, {
            space_above_staff_ln: 0,
            space_below_staff_ln: 0,
        });
        this.updateInstructionWidth();
    };
    VexFlowMeasure.prototype.clean = function () {
        //this.beams = {};
        //this.vfbeams = undefined;
        this.connectors = [];
        // Clean up instructions
        this.resetLayout();
    };
    /**
     * returns the x-width of a given measure line.
     * @param line
     * @returns {SystemLinesEnum} the x-width
     */
    VexFlowMeasure.prototype.getLineWidth = function (line) {
        // FIXME: See values in VexFlow's stavebarline.js
        var vfline = VexFlowConverter_1.VexFlowConverter.line(line);
        switch (vfline) {
            case Vex.Flow.StaveConnector.type.SINGLE:
                return 1.0 / 10.0;
            case Vex.Flow.StaveConnector.type.DOUBLE:
                return 3.0 / 10.0;
            default:
                return 0;
        }
    };
    /**
     * adds the given clef to the begin of the measure.
     * This has to update/increase BeginInstructionsWidth.
     * @param clef
     */
    VexFlowMeasure.prototype.addClefAtBegin = function (clef) {
        this.octaveOffset = clef.OctaveOffset;
        var vfclef = VexFlowConverter_1.VexFlowConverter.Clef(clef);
        this.stave.addClef(vfclef, undefined, undefined, Vex.Flow.Modifier.Position.BEGIN);
        this.updateInstructionWidth();
    };
    /**
     * adds the given key to the begin of the measure.
     * This has to update/increase BeginInstructionsWidth.
     * @param currentKey the new valid key.
     * @param previousKey the old cancelled key. Needed to show which accidentals are not valid any more.
     * @param currentClef the valid clef. Needed to put the accidentals on the right y-positions.
     */
    VexFlowMeasure.prototype.addKeyAtBegin = function (currentKey, previousKey, currentClef) {
        var keySig = new Vex.Flow.KeySignature(VexFlowConverter_1.VexFlowConverter.keySignature(currentKey), VexFlowConverter_1.VexFlowConverter.keySignature(previousKey));
        this.stave.addModifier(keySig, Vex.Flow.Modifier.Position.BEGIN);
    };
    /**
     * adds the given rhythm to the begin of the measure.
     * This has to update/increase BeginInstructionsWidth.
     * @param rhythm
     */
    VexFlowMeasure.prototype.addRhythmAtBegin = function (rhythm) {
        var timeSig = VexFlowConverter_1.VexFlowConverter.TimeSignature(rhythm);
        this.stave.addModifier(timeSig, Vex.Flow.Modifier.Position.BEGIN);
        this.updateInstructionWidth();
    };
    /**
     * adds the given clef to the end of the measure.
     * This has to update/increase EndInstructionsWidth.
     * @param clef
     */
    VexFlowMeasure.prototype.addClefAtEnd = function (clef) {
        var vfclef = VexFlowConverter_1.VexFlowConverter.Clef(clef);
        this.stave.setEndClef(vfclef, undefined, undefined);
        this.updateInstructionWidth();
    };
    /**
     * Sets the overall x-width of the measure.
     * @param width
     */
    VexFlowMeasure.prototype.setWidth = function (width) {
        _super.prototype.setWidth.call(this, width);
        // Set the width of the Vex.Flow.Stave
        this.stave.setWidth(width * 10.0);
        // Force the width of the Begin Instructions
        this.stave.setNoteStartX(this.beginInstructionsWidth * 10.0);
        // If this is the first stave in the vertical measure, call the format
        // method to set the width of all the voices
        if (this.formatVoices) {
            // The width of the voices does not include the instructions (StaveModifiers)
            this.formatVoices((width - this.beginInstructionsWidth - this.endInstructionsWidth) * 10.0);
        }
    };
    /**
     * This method is called after the StaffEntriesScaleFactor has been set.
     * Here the final x-positions of the staff entries have to be set.
     * (multiply the minimal positions with the scaling factor, considering the BeginInstructionsWidth)
     */
    VexFlowMeasure.prototype.layoutSymbols = function () {
        this.stave.format();
    };
    //public addGraphicalStaffEntry(entry: VexFlowStaffEntry): void {
    //    super.addGraphicalStaffEntry(entry);
    //}
    //
    //public addGraphicalStaffEntryAtTimestamp(entry: VexFlowStaffEntry): void {
    //    super.addGraphicalStaffEntryAtTimestamp(entry);
    //    // TODO
    //}
    /**
     * Draw this measure on a VexFlow CanvasContext
     * @param ctx
     */
    VexFlowMeasure.prototype.draw = function (ctx) {
        // Draw stave lines
        this.stave.setContext(ctx).draw();
        // Draw all voices
        for (var voiceID in this.vfVoices) {
            if (this.vfVoices.hasOwnProperty(voiceID)) {
                this.vfVoices[voiceID].draw(ctx, this.stave);
            }
        }
        // Draw beams
        for (var voiceID in this.vfbeams) {
            if (this.vfbeams.hasOwnProperty(voiceID)) {
                for (var _i = 0, _a = this.vfbeams[voiceID]; _i < _a.length; _i++) {
                    var beam = _a[_i];
                    beam.setContext(ctx).draw();
                }
            }
        }
        // Draw vertical lines
        for (var _b = 0, _c = this.connectors; _b < _c.length; _b++) {
            var connector = _c[_b];
            connector.setContext(ctx).draw();
        }
    };
    /**
     * Add a note to a beam
     * @param graphicalNote
     * @param beam
     */
    VexFlowMeasure.prototype.handleBeam = function (graphicalNote, beam) {
        var voiceID = graphicalNote.sourceNote.ParentVoiceEntry.ParentVoice.VoiceId;
        var beams = this.beams[voiceID];
        if (beams === undefined) {
            beams = this.beams[voiceID] = [];
        }
        var data;
        for (var _i = 0, beams_1 = beams; _i < beams_1.length; _i++) {
            var mybeam = beams_1[_i];
            if (mybeam[0] === beam) {
                data = mybeam;
            }
        }
        if (data === undefined) {
            data = [beam, []];
            beams.push(data);
        }
        var parent = graphicalNote.parentStaffEntry;
        if (data[1].indexOf(parent) === -1) {
            data[1].push(parent);
        }
    };
    /**
     * Complete the creation of VexFlow Beams in this measure
     */
    VexFlowMeasure.prototype.finalizeBeams = function () {
        // The following line resets the created Vex.Flow Beams and
        // created them brand new. Is this needed? And more importantly,
        // should the old beams be removed manually by the notes?
        this.vfbeams = {};
        for (var voiceID in this.beams) {
            if (this.beams.hasOwnProperty(voiceID)) {
                var vfbeams = this.vfbeams[voiceID];
                if (vfbeams === undefined) {
                    vfbeams = this.vfbeams[voiceID] = [];
                }
                for (var _i = 0, _a = this.beams[voiceID]; _i < _a.length; _i++) {
                    var beam = _a[_i];
                    var notes = [];
                    for (var _b = 0, _c = beam[1]; _b < _c.length; _b++) {
                        var entry = _c[_b];
                        notes.push(entry.vfNotes[voiceID]);
                    }
                    if (notes.length > 1) {
                        vfbeams.push(new Vex.Flow.Beam(notes, true));
                    }
                    else {
                        Logging_1.Logging.log("Warning! Beam with no notes! Trying to ignore, but this is a serious problem.");
                    }
                }
            }
        }
    };
    VexFlowMeasure.prototype.layoutStaffEntry = function (graphicalStaffEntry) {
        var gnotes = graphicalStaffEntry.graphicalNotes;
        var vfVoices = this.vfVoices;
        for (var voiceID in gnotes) {
            if (gnotes.hasOwnProperty(voiceID)) {
                if (!(voiceID in vfVoices)) {
                    vfVoices[voiceID] = new Vex.Flow.Voice({
                        beat_value: this.parentSourceMeasure.Duration.Denominator,
                        num_beats: this.parentSourceMeasure.Duration.Numerator,
                        resolution: Vex.Flow.RESOLUTION,
                    }).setMode(Vex.Flow.Voice.Mode.SOFT);
                }
                var vfnote = VexFlowConverter_1.VexFlowConverter.StaveNote(gnotes[voiceID]);
                graphicalStaffEntry.vfNotes[voiceID] = vfnote;
                vfVoices[voiceID].addTickable(vfnote);
            }
        }
    };
    /**
     * Creates a line from 'top' to this measure, of type 'lineType'
     * @param top
     * @param lineType
     */
    VexFlowMeasure.prototype.lineTo = function (top, lineType) {
        var connector = new Vex.Flow.StaveConnector(top.getVFStave(), this.stave);
        connector.setType(lineType);
        this.connectors.push(connector);
    };
    VexFlowMeasure.prototype.getVFStave = function () {
        return this.stave;
    };
    //private increaseBeginInstructionWidth(): void {
    //    let modifiers: StaveModifier[] = this.stave.getModifiers();
    //    let modifier: StaveModifier = modifiers[modifiers.length - 1];
    //    //let padding: number = modifier.getCategory() === "keysignatures" ? modifier.getPadding(2) : 0;
    //    let padding: number = modifier.getPadding(20);
    //    let width: number = modifier.getWidth();
    //    this.beginInstructionsWidth += (padding + width) / 10.0;
    //}
    //
    //private increaseEndInstructionWidth(): void {
    //    let modifiers: StaveModifier[] = this.stave.getModifiers();
    //    let modifier: StaveModifier = modifiers[modifiers.length - 1];
    //    let padding: number = 0;
    //    let width: number = modifier.getWidth();
    //    this.endInstructionsWidth += (padding + width) / 10.0;
    //
    //}
    VexFlowMeasure.prototype.updateInstructionWidth = function () {
        this.stave.format();
        this.beginInstructionsWidth = this.stave.getNoteStartX() / 10.0;
        this.endInstructionsWidth = this.stave.getNoteEndX() / 10.0;
    };
    return VexFlowMeasure;
}(StaffMeasure_1.StaffMeasure));
exports.VexFlowMeasure = VexFlowMeasure;
