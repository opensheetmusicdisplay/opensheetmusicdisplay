import {
  MeasureSizeCalculator,
} from "../../../src/MusicalScore/Calculation/MeasureSizeCalculator.ts";

import Vex = require("vexflow");

describe("Measure Size Calculator Tests", () => {
  // Initialization
  let stave: Vex.Flow.Stave = new Vex.Flow.Stave(0, 0, 0);
  let voices: Vex.Flow.Voice[];
  //let formatter: Vex.Flow.Formatter = new Vex.Flow.Formatter();
  let formatter: any;
  // Create a voice with a note
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

    calc = new MeasureSizeCalculator(
      stave, voices, <Vex.Flow.Formatter> formatter
    );
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
    calc = new MeasureSizeCalculator(
      stave, voices, <Vex.Flow.Formatter> formatter
    );
    chai.expect(calc.getWidth()).to.equal(64);
    chai.expect(calc.getBottomBorder()).to.equal(6);
    chai.expect(calc.getTopBorder()).to.equal(0);
    done();
  });
});
