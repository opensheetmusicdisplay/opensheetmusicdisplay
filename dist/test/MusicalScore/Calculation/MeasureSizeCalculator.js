"use strict";
var MeasureSizeCalculator_ts_1 = require("../../../src/MusicalScore/Calculation/MeasureSizeCalculator.ts");
var Vex = require("vexflow");
describe("Measure Size Calculator Tests", function () {
    // Initialization
    var stave = new Vex.Flow.Stave(0, 0, 0);
    var voices;
    var formatter;
    var voice;
    var note;
    var calc;
    it("One note", function (done) {
        formatter = new Vex.Flow.Formatter();
        voice = new Vex.Flow.Voice(undefined);
        note = new Vex.Flow.StaveNote({ keys: ["b/4"], "duration": "1" });
        voice.addTickables([note]);
        voices = [voice];
        chai.expect(formatter.preCalculateMinTotalWidth(voices)).to.equal(22);
        calc = new MeasureSizeCalculator_ts_1.MeasureSizeCalculator(stave, voices, formatter);
        chai.expect(calc.getBottomBorder()).to.equal(5);
        done();
    });
    it("Four quarter notes", function (done) {
        formatter = new Vex.Flow.Formatter();
        voice = new Vex.Flow.Voice(undefined);
        voice.addTickables([
            new Vex.Flow.StaveNote({ keys: ["c/4"], "duration": "q" }),
            new Vex.Flow.StaveNote({ keys: ["d/4"], "duration": "q" }),
            new Vex.Flow.StaveNote({ keys: ["e/4"], "duration": "q" }),
            new Vex.Flow.StaveNote({ keys: ["f/4"], "duration": "q" }),
        ]);
        voices = [voice];
        chai.expect(formatter.preCalculateMinTotalWidth(voices)).to.equal(64);
        calc = new MeasureSizeCalculator_ts_1.MeasureSizeCalculator(stave, voices, formatter);
        chai.expect(calc.getWidth()).to.equal(64);
        chai.expect(calc.getBottomBorder()).to.equal(6);
        chai.expect(calc.getTopBorder()).to.equal(0);
        done();
    });
    it("Will certainly pass", function (done) {
        var visual;
        visual = function (func) {
            var canvas = document.createElement("canvas");
            document.body.appendChild(canvas);
            var renderer = new Vex.Flow.Renderer(canvas, Vex.Flow.Renderer.Backends.CANVAS);
            renderer.resize(300, 100);
            var ctx = renderer.getContext();
            ctx.setFont("Arial", 10, "").setBackgroundFillStyle("#eed");
            func(renderer, ctx);
        };
        visual(function (renderer, ctx) {
            renderer.resize(420, 120);
            var stave2 = new Vex.Flow.Stave(10, 0, 410);
            stave2.setContext(ctx);
            for (var t in Vex.Flow.Clef.types) {
                if (Vex.Flow.Clef.types.hasOwnProperty(t)) {
                    var clef = new Vex.Flow.Clef(t);
                    stave2.addModifier(clef, Vex.Flow.Modifier.Position.BEGIN);
                    stave2.format();
                    clef.setStave(stave2);
                    var bb = MeasureSizeCalculator_ts_1.MeasureSizeCalculator.getClefBoundingBox(clef);
                    //console.log(bb);
                    ctx.rect(bb.getX(), bb.getY(), bb.getW(), bb.getH());
                    ctx.stroke();
                }
            }
            stave2.draw();
        });
        done();
    });
});
