import Vex = require("vexflow");

/* TODO
 * Take into account StaveModifiers
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


    //this.height = voicesBoundingBox.getH(); FIXME

    // Consider clefs
    let clefs: Vex.Flow.Clef[] = stave.getModifiers(
      Vex.Flow.StaveModifier.Position.LEFT,
      Vex.Flow.Clef.category
    );
    for (let clef of clefs) {
      voicesBoundingBox = voicesBoundingBox.mergeWith(
        MeasureSizeCalculator.getClefBoundingBox(clef)
      );
    }

    this.topBorder = Math.min(
      0,
      Math.floor(stave.getLineForY(voicesBoundingBox.getY()))
    );
    this.bottomBorder = Math.max(
      stave.getNumLines(),
      Math.ceil(stave.getLineForY(voicesBoundingBox.getY() + voicesBoundingBox.getH()))
    );
  }

  public static getClefBoundingBox(clef: Vex.Flow.Clef): Vex.Flow.BoundingBox {
    let clef2: any = clef;
    clef2.placeGlyphOnLine(clef2.glyph, clef2.stave, clef2.clef.line);
    let glyph: any = clef.glyph;
    let x_pos: number = clef.x + glyph.x_shift;
    let y_pos: number = clef.stave.getYForGlyphs() + glyph.y_shift;
    let scale: number = glyph.scale;
    let outline: any[] = glyph.metrics.outline;
    let xmin: number = 0, xmax: number = 0, ymin: number = 0, ymax: number = 0;

    function update(i: number): void {
      let x: number = outline[i + 1];
      let y: number = outline[i + 2];
      xmin = Math.min(xmin, x);
      xmax = Math.max(xmax, x);
      ymin = Math.min(ymin, y);
      ymax = Math.max(ymax, y);
    }

    for (let i = 0, len = outline.length; i < len; i += 3) {
      console.log(i, outline[i]);
      switch (<string> outline[i]) {
        case "m": update(i); break;
        case "l": update(i); break;
        case "q": i += 2; update(i); break;
        case "b": i += 4; update(i); break;
        default: break;
      }

    }
    return new Vex.Flow.BoundingBox(
      x_pos + xmin * scale,
      y_pos - ymin * scale,
      (xmax - xmin) * scale,
      (ymin - ymax) * scale
    );
  }


}
