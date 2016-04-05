import Vex = require("vexflow");

// Usage:
/// TODO
export class MeasureSizeCalculator {
  private stave: Vex.Flow.Stave;
  private voices: Vex.Flow.Voice[];
  private formatter: any;

  private offsetLeft: number;
  private offsetRight: number;
  private voicesWidth: number;
  private topBorder: number;
  private bottomBorder: number;

  constructor(
    stave: Vex.Flow.Stave,
    voices: Vex.Flow.Voice[],
    formatter: Vex.Flow.Formatter
  ) {
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

  public getWidth(): number {
    // begin_modifiers + voices + end_modifiers
    return this.offsetLeft + this.voicesWidth + this.offsetRight;
    // = stave.end_x - stave.x
  }

  public getHeight(): number {
    // FIXME this formula does not take into account
    // other things like staves and ties!
    return this.stave.getSpacingBetweenLines()
      * (this.topBorder - this.bottomBorder);
  }

  // The following methods return a number
  // where 0 is the upper line of the stave.

  public getTopBorder(): number {
    return this.topBorder;
  }

  public getBottomBorder(): number {
    return this.bottomBorder;
  }

  private format(): void {
    let stave: Vex.Flow.Stave = this.stave;
    let voices: Vex.Flow.Voice[] = this.voices;
    let voicesBoundingBox: Vex.Flow.BoundingBox;
    let bb: Vex.Flow.BoundingBox;
    // Compute widths
    this.voicesWidth = this.formatter.minTotalWidth;
    stave.setWidth(this.voicesWidth);
    stave.format();
    this.offsetLeft = stave.getNoteStartX() - stave.x;
    this.offsetRight = stave.end_x - stave.getWidth() - stave.start_x;
    // Compute heights
    // Height is:
    //// height of StaveModifiers + BoundingBox of notes + height of NoteMod's
    for (let i: number = 0; i < this.voices.length; i ++) {
      voices[i].setStave(stave);
      bb = voices[i].getBoundingBox();
      if (voicesBoundingBox === undefined) {
        voicesBoundingBox = bb;
      } else {
        voicesBoundingBox = voicesBoundingBox.mergeWith(bb);
      }
    }
    // TODO voicesBoundingBox.getW() should be similar to this.voicesWidth?
    //console.log("this.width", this.voicesWidth);
    //console.log("voicesBB", voicesBoundingBox.getW());

    // FIXME the following: should consider stave modifiers
    //this.height = voicesBoundingBox.getH(); FIXME
    this.topBorder = Math.min(
      0,
      Math.floor(stave.getLineForY(voicesBoundingBox.getY()))
    );
    this.bottomBorder = Math.max(
      stave.getNumLines(),
      Math.ceil(stave.getLineForY(voicesBoundingBox.getY() + voicesBoundingBox.getH()))
    );
  }
}
