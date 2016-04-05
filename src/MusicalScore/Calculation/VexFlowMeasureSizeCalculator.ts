interface VexFlowBoundingBox {
  mergeWith(bb: VexFlowBoundingBox): VexFlowBoundingBox;
  getX(): number;
  getY(): number;
  getW(): number;
  getH(): number;
}

interface VexFlowVoice {
  getBoundingBox(): VexFlowBoundingBox;
  setStave(stave: VexFlowStave): VexFlowVoice;
}

interface VexFlowStave {
  x: number;
  start_x: number;
  end_x: number;

  getWidth(): number;
  setWidth(width: number): VexFlowStave;
  format(): void;
  getSpacingBetweenLines(): number;
  getNumLines(): number;
  getLineForY(y: number): number;
}

// Usage:
/// TODO
class MeasureSizeCalculator {
  public stave: VexFlowStave;
  public voices: VexFlowVoice[];
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
    let stave: VexFlowStave = this.stave;
    let voices: VexFlowVoice[] = this.voices;
    let voicesBoundingBox: VexFlowBoundingBox;
    let bb: VexFlowBoundingBox;
    // Compute widths
    this.voicesWidth = this.formatter.minTotalWidth;
    stave.setWidth(this.voicesWidth);
    stave.format();
    this.offsetLeft = stave.start_x - stave.x;
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
    // FIXME the following: should consider stave modifiers
    //this.height = voicesBoundingBox.getH(); FIXME
    this.topBorder = Math.min(
      0, stave.getLineForY(voicesBoundingBox.getY())
    );
    this.bottomBorder = Math.max(
      stave.getNumLines(),
      stave.getLineForY(voicesBoundingBox.getY() + voicesBoundingBox.getH())
    )
  }
}
