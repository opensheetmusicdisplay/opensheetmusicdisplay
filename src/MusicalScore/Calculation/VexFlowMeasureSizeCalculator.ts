interface VexFlowVoice {

}

interface VexFlowStave {
  x: number;
  start_x: number;
  end_x: number;

  getWidth(): number;
  setWidth(width: number): VexFlowStave;
  format(): void;
  getSpacingBetweenLines(): number;
}

class MeasureSizeCalculator {
  public stave: VexFlowStave;
  public voices: VexFlowVoice;
  public formatter: any;

  private offsetLeft: number;
  private offsetRight: number;
  private voicesWidth: number;
  private topBorder: number;
  private bottomBorder: number;

  constructor(stave: VexFlowStave, voices: VexFlowVoice[], formatter: any) {
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
    let stave: VexFlowStave = this.stave;
    // Compute widths
    this.voicesWidth = this.formatter.minTotalWidth;
    stave.setWidth(this.voicesWidth);
    stave.format();
    this.offsetLeft = stave.start_x - stave.x;
    this.offsetRight = stave.end_x - stave.getWidth() - stave.start_x;
    // Compute heights
    // Height is:
    //// height of StaveModifiers + BoundingBox of notes + height of NoteMod's
    // TODO
  }
}
