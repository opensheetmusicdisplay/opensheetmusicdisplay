"use strict";
var Vex = require("vexflow");
/* TODO
 * Complete support for StaveModifiers
 * Take into account Ties and Slurs
 */
/* Measure Size Calculator
 *  Given a stave, voices and a formatter, calculates
 *  through VexFlow the size of a measure.
 *  !!! before using this, call the methods
 *  !!! joinVoices and preCalculateMinTotalWidth
 *  !!! of the formatter!
 *
 * Usage:
 *   let stave: Vex.Flow.Stave = ...;
 *   let formatter = new Vex.Flow.Formatter()
 *   let voices: Vex.Flor.Voice[] = ...;
 *   formatter.preCalculateMinTotalWidth(voices);
 *   let calc = new MeasureSizeCalculator(stave, voices, formatter);
 *   calc.???
 */
var MeasureSizeCalculator = (function () {
    function MeasureSizeCalculator(stave, voices, formatter) {
        this.stave = stave;
        this.voices = voices;
        this.formatter = formatter;
        // the stave must be initialized with width, x, y 0
        // the voices must be already joined and (pre)formatted
        if (!formatter.hasMinTotalWidth) {
            throw "Must first call Formatter.preCalculateMinTotalWidth " +
                "with all the voices in the measure (vertical)";
        }
        this.format();
    }
    // Returns the shape of the note head at position _index_ inside _note_.
    // Remember: in VexFlow, StaveNote correspond to PhonicScore's VoiceEntries.
    //  public static getVexFlowNoteHeadShape(note: StaveNote, index: number): PositionAndShapeInfo {
    //  // note_heads is not public in StaveNote, but we access it anyway...
    //  let bb = note.note_heads[index].getBoundingBox();
    //  let info: any = new PositionAndShapeInfo();
    //  let x: number = bb.getX();
    //  let y: number = bb.getY();
    //  let w: number = bb.getW();
    //  let h: number = bb.getH();
    //  info.Left = info.Right = bb.getW() / 2;
    //  info.Top = info.Bottom = bb.getH() / 2;
    //  info.X = bb.getX() + info.Left;
    //  info.Y = bb.getY() + info.Bottom;
    //  return info;
    //}
    // Returns the shape of all the note heads inside a StaveNote.
    // Remember: in VexFlow, StaveNote correspond to PhonicScore's VoiceEntries.
    MeasureSizeCalculator.getVexFlowStaveNoteShape = function (note) {
        var info = {};
        var bounds = note.getNoteHeadBounds();
        var beginX = note.getNoteHeadBeginX();
        var endX = note.getNoteHeadEndX();
        info.Left = info.Right = (endX - beginX) / 2;
        info.Top = info.Bottom = (bounds.y_top - bounds.y_bottom) / 2;
        info.X = beginX + info.Left;
        info.Y = bounds.y_bottom + info.Bottom;
        return info;
    };
    MeasureSizeCalculator.getClefBoundingBox = function (clef) {
        var clef2 = clef;
        clef2.placeGlyphOnLine(clef2.glyph, clef2.stave, clef2.clef.line);
        var glyph = clef.glyph;
        var posX = clef.x + glyph.x_shift;
        var posY = clef.stave.getYForGlyphs() + glyph.y_shift;
        var scale = glyph.scale;
        var outline = glyph.metrics.outline;
        var xmin = 0, xmax = 0, ymin = 0, ymax = 0;
        function update(i) {
            var x = outline[i + 1];
            var y = outline[i + 2];
            xmin = Math.min(xmin, x);
            xmax = Math.max(xmax, x);
            ymin = Math.min(ymin, y);
            ymax = Math.max(ymax, y);
        }
        for (var i = 0, len = outline.length; i < len; i += 3) {
            switch (outline[i]) {
                case "m":
                    update(i);
                    break;
                case "l":
                    update(i);
                    break;
                case "q":
                    i += 2;
                    update(i);
                    break;
                case "b":
                    i += 4;
                    update(i);
                    break;
                default: break;
            }
        }
        return new Vex.Flow.BoundingBox(posX + xmin * scale, posY - ymin * scale, (xmax - xmin) * scale, (ymin - ymax) * scale);
    };
    MeasureSizeCalculator.getKeySignatureBoundingBox = function (sig) {
        // FIXME: Maybe use Vex.Flow.keySignature(this.keySpec);
        var stave = sig.getStave();
        var width = sig.getWidth();
        var maxLine = 1;
        var minLine = 1;
        for (var _i = 0, _a = sig.accList; _i < _a.length; _i++) {
            var acc = _a[_i];
            maxLine = Math.max(acc.line, maxLine);
            minLine = Math.min(acc.line, minLine);
        }
        var y = sig.getStave().getYForLine(minLine);
        var height = stave.getSpacingBetweenLines() * (maxLine - minLine);
        var x = 0; // FIXME
        return new Vex.Flow.BoundingBox(x, y, width, height);
    };
    MeasureSizeCalculator.prototype.getWidth = function () {
        // begin_modifiers + voices + end_modifiers
        return this.offsetLeft + this.voicesWidth + this.offsetRight;
        // = stave.end_x - stave.x
    };
    MeasureSizeCalculator.prototype.getHeight = function () {
        // FIXME this formula does not take into account
        // other things like staves and ties!
        return this.stave.getSpacingBetweenLines()
            * (this.topBorder - this.bottomBorder);
    };
    // The following methods return a number
    // where 0 is the upper line of the stave.
    MeasureSizeCalculator.prototype.getTopBorder = function () {
        return this.topBorder;
    };
    MeasureSizeCalculator.prototype.getBottomBorder = function () {
        return this.bottomBorder;
    };
    MeasureSizeCalculator.prototype.format = function () {
        var stave = this.stave;
        var voices = this.voices;
        var voicesBoundingBox;
        var bb;
        // Compute widths
        this.voicesWidth = this.formatter.minTotalWidth;
        stave.setWidth(this.voicesWidth);
        stave.format();
        this.offsetLeft = stave.getNoteStartX() - stave.x;
        this.offsetRight = stave.end_x - stave.getWidth() - stave.start_x;
        // Compute heights
        // Height is:
        //// height of StaveModifiers + BoundingBox of notes + height of NoteMod's
        for (var i = 0; i < this.voices.length; i++) {
            voices[i].setStave(stave);
            bb = voices[i].getBoundingBox();
            if (voicesBoundingBox === undefined) {
                voicesBoundingBox = bb;
            }
            else {
                voicesBoundingBox = voicesBoundingBox.mergeWith(bb);
            }
        }
        // TODO voicesBoundingBox.getW() should be similar to this.voicesWidth?
        //console.log("this.width", this.voicesWidth);
        //console.log("voicesBB", voicesBoundingBox.getW());
        //this.height = voicesBoundingBox.getH(); FIXME
        // Consider clefs
        var clefs = stave.getModifiers(Vex.Flow.Modifier.Position.LEFT, Vex.Flow.Clef.category);
        for (var _i = 0, clefs_1 = clefs; _i < clefs_1.length; _i++) {
            var clef = clefs_1[_i];
            voicesBoundingBox = voicesBoundingBox.mergeWith(MeasureSizeCalculator.getClefBoundingBox(clef));
        }
        this.topBorder = Math.min(0, Math.floor(stave.getLineForY(voicesBoundingBox.getY())));
        this.bottomBorder = Math.max(stave.getNumLines(), Math.ceil(stave.getLineForY(voicesBoundingBox.getY() + voicesBoundingBox.getH())));
    };
    return MeasureSizeCalculator;
}());
exports.MeasureSizeCalculator = MeasureSizeCalculator;
