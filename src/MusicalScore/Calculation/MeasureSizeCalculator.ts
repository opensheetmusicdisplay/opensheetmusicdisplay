import Vex = require("vexflow");
import StaveNote = Vex.Flow.StaveNote;

// The type PositionAndShapeInfo is still to be ported in TypeScript
type PositionAndShapeInfo = any;
declare var PositionAndShapeInfo: any;

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
  public static getVexFlowStaveNoteShape(note: StaveNote): PositionAndShapeInfo {
    let info: any = new PositionAndShapeInfo();
    let bounds: any = note.getNoteHeadBounds();
    let beginX: number = note.getNoteHeadBeginX();
    let endX: number = note.getNoteHeadEndX();

    info.Left = info.Right = (endX - beginX) / 2;
    info.Top = info.Bottom = (bounds.y_top - bounds.y_bottom) / 2;
    info.X = beginX + info.Left;
    info.Y = bounds.y_bottom + info.Bottom;
    return info;
  }


  public static getClefBoundingBox(clef: Vex.Flow.Clef): Vex.Flow.BoundingBox {
    let clef2: any = clef;
    clef2.placeGlyphOnLine(clef2.glyph, clef2.stave, clef2.clef.line);
    let glyph: any = clef.glyph;
    let posX: number = clef.x + glyph.x_shift;
    let posY: number = clef.stave.getYForGlyphs() + glyph.y_shift;
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

    for (let i: number = 0, len: number = outline.length; i < len; i += 3) {
      switch (outline[i] as string) {
        case "m": update(i); break;
        case "l": update(i); break;
        case "q": i += 2; update(i); break;
        case "b": i += 4; update(i); break;
        default: break;
      }

    }
    return new Vex.Flow.BoundingBox(
        posX + xmin * scale,
        posY - ymin * scale,
        (xmax - xmin) * scale,
        (ymin - ymax) * scale
    );
  }


  public static getKeySignatureBoundingBox(sig: any): Vex.Flow.BoundingBox {
    // FIXME: Maybe use Vex.Flow.keySignature(this.keySpec);
    let stave: Vex.Flow.Stave = sig.getStave();
    let width: number = sig.getWidth();
    let maxLine: number = 1;
    let minLine: number = 1;
    for (let acc of sig.accList) {
      maxLine = Math.max(acc.line, maxLine);
      minLine = Math.min(acc.line, minLine);
    }
    let y: number = sig.getStave().getYForLine(minLine);
    let height: number = stave.getSpacingBetweenLines() * (maxLine - minLine);
    let x: number = 0; // FIXME
    return new Vex.Flow.BoundingBox(x, y, width, height);
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

}
