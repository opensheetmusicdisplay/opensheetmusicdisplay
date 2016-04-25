import {
  MeasureSizeCalculator,
} from "../../../src/MusicalScore/Calculation/MeasureSizeCalculator.ts";

import Vex = require("vexflow");

describe("Measure Size Calculator Tests", () => {
  // Initialization
  let stave: Vex.Flow.Stave = new Vex.Flow.Stave(0, 0, 0);
  let voices: Vex.Flow.Voice[];
  let formatter: Vex.Flow.Formatter;
  let voice: Vex.Flow.Voice;
  let note: Vex.Flow.StaveNote;
  let calc: MeasureSizeCalculator;

  it("One note", (done: MochaDone) => {
    formatter = new Vex.Flow.Formatter();
    voice = new Vex.Flow.Voice(undefined);
    note = new Vex.Flow.StaveNote({ keys: ["b/4"], "duration": "1" });
    voice.addTickables([note]);
    voices = [voice];

    chai.expect(formatter.preCalculateMinTotalWidth(voices)).to.equal(22);

    calc = new MeasureSizeCalculator(stave, voices, formatter);

    chai.expect(calc.getBottomBorder()).to.equal(5);
    done();
  });

  it("Four quarter notes", (done: MochaDone) => {
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
    calc = new MeasureSizeCalculator(stave, voices, formatter);

    chai.expect(calc.getWidth()).to.equal(64);
    chai.expect(calc.getBottomBorder()).to.equal(6);
    chai.expect(calc.getTopBorder()).to.equal(0);
    done();
  });

  it("Will certainly pass", (done: MochaDone) => {
    let visual = function(func: (r: any, ctx: any) => void) {
      let canvas: HTMLCanvasElement = document.createElement("canvas");
      document.body.appendChild(canvas);
      let renderer: any = new Vex.Flow.Renderer(
        canvas,
        Vex.Flow.Renderer.Backends.CANVAS
      );
      renderer.resize(300, 100);
      let ctx: any = renderer.getContext();
      ctx.setFont("Arial", 10, "").setBackgroundFillStyle("#eed");
      func(renderer, ctx);
    }

    visual(function(renderer, ctx) {
      renderer.resize(420, 120);
      let stave: Vex.Flow.Stave = new Vex.Flow.Stave(10, 0, 410);
      stave.setContext(ctx);
      for (var t in Vex.Flow.Clef.types) {
        let clef: Vex.Flow.Clef = new Vex.Flow.Clef(t);
        stave.addModifier(clef, Vex.Flow.StaveModifier.Position.BEGIN);
        stave.format();
        // (*&^%$#@) //
        // FIXME HERE? NaN FIXME FIXME FIXME //
        clef.setStave(stave);
        let bb: Vex.Flow.BoundingBox =
          MeasureSizeCalculator.getClefBoundingBox(clef);
        console.log(bb);
        ctx.rect(bb.getX(), bb.getY(), bb.getW(), bb.getH());
        ctx.stroke();
      }
      stave.draw();
    });

    done();
  });

});
