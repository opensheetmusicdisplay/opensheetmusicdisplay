// [VexFlow](http://vexflow.com) - Copyright (c) Mohit Muthanna 2010.
//
// ## Description
//
// This file implements different types of pedal markings. These notation
// elements indicate to the performer when to depress and release the a pedal.
//
// In order to create "Sostenuto", and "una corda" markings, you must set
// custom text for the release/depress pedal markings.

import { Vex } from './vex';
import { Element } from './element';
import { Glyph } from './glyph';
import { StaveModifier } from './stavemodifier';

// To enable logging for this class. Set `Vex.Flow.PedalMarking.DEBUG` to `true`.
function L(...args) { if (PedalMarking.DEBUG) Vex.L('Vex.Flow.PedalMarking', args); }

// Draws a pedal glyph with the provided `name` on a rendering `context`
// at the coordinates `x` and `y. Takes into account the glyph data
// coordinate shifts.
function drawPedalGlyph(name, context, x, y, point) {
  const glyph_data = PedalMarking.GLYPHS[name];
  const glyph = new Glyph(glyph_data.code, point);
  glyph.render(context, x + glyph_data.x_shift, y + glyph_data.y_shift);
}

export class PedalMarking extends Element {
  // Glyph data
  static get GLYPHS() {
    return {
      'pedal_depress': {
        code: 'v36',
        x_shift: -10,
        y_shift: 0,
      },
      'pedal_release': {
        code: 'v5d',
        x_shift: -2,
        y_shift: 3,
      },
    };
  }

  static get Styles() {
    return {
      TEXT: 1,
      BRACKET: 2,
      MIXED: 3,
      MIXED_OPEN_END: 4, // VexFlowPatch: additions from here on
      BRACKET_OPEN_BEGIN: 5,
      BRACKET_OPEN_END: 6,
      BRACKET_OPEN_BOTH: 7
    };
  }

  static get StylesString() {
    return {
      text: PedalMarking.Styles.TEXT,
      bracket: PedalMarking.Styles.BRACKET,
      mixed: PedalMarking.Styles.MIXED,
      mixed_open_end: PedalMarking.Styles.MIXED_OPEN_END,
      bracket_open_begin: PedalMarking.Styles.BRACKET_OPEN_BEGIN,
      bracket_open_end: PedalMarking.Styles.BRACKET_OPEN_END,
      bracket_open_both: PedalMarking.Styles.BRACKET_OPEN_BOTH
    };
  }

  // Create a sustain pedal marking. Returns the defaults PedalMarking.
  // Which uses the traditional "Ped" and "*"" markings.
  static createSustain(notes) {
    const pedal = new PedalMarking(notes);
    return pedal;
  }

  // Create a sostenuto pedal marking
  static createSostenuto(notes) {
    const pedal = new PedalMarking(notes);
    pedal.setStyle(PedalMarking.Styles.MIXED);
    pedal.setCustomText('Sost. Ped.');
    return pedal;
  }

  // Create an una corda pedal marking
  static createUnaCorda(notes) {
    const pedal = new PedalMarking(notes);
    pedal.setStyle(PedalMarking.Styles.TEXT);
    pedal.setCustomText('una corda', 'tre corda');
    return pedal;
  }

  // ## Prototype Methods
  constructor(notes) {
    super();
    this.setAttribute('type', 'PedalMarking');
    this.EndsStave = false; // VexFlowPatch
    this.ChangeBegin = false;
    this.ChangeEnd = false;
    this.EndsWithoutHook = false; // VexFlowPatch: the bracket styles end without the end hook (where they would draw it)
    this.ChangeEndBeforeSign = false; // ChangeEnd, and the next pedal marking draws its Ped. sign at the end note
    this.ContinuationSign = false; // VexFlowPatch: going on from the system before: (Ped.) at the stave's note start
    this.notes = notes;
    this.style = PedalMarking.TEXT;
    this.line = 0;

    // Custom text for the release/depress markings
    this.custom_depress_text = '';
    this.custom_release_text = '';

    this.font = {
      family: 'Times New Roman',
      size: 12,
      weight: 'italic bold',
    };

    this.render_options = {
      bracket_height: 10,
      text_margin_right: 6,
      bracket_line_width: 1,
      glyph_point_size: 40,
      color: 'black',
      change_release_margin: 5, // VexFlowPatch: see getChangeReleaseXShift()
      continuation_sign_gap: 1.5, // VexFlowPatch: between the parentheses and the Ped. sign of (Ped.), see drawContinuationSign()
    };
  }

  // VexFlowPatch: the left edge of the Ped. sign that a pedal marking draws where it's pressed, from the note's x
  getDepressSignLeft() {
    const depress = PedalMarking.GLYPHS.pedal_depress;
    return depress.x_shift + new Glyph(depress.code, this.render_options.glyph_point_size).getMetrics().x_min;
  }

  // VexFlowPatch: how far the * of a pedal released and pressed again at its last note (ChangeEnd, in the text style) is moved
  //   from where a release draws it: left of the Ped. sign that the next pedal marking draws at that note, its right edge
  //   render_options.change_release_margin away from the Ped. sign's left edge.
  getChangeReleaseXShift() {
    const release = PedalMarking.GLYPHS.pedal_release;
    const release_right = release.x_shift + new Glyph(release.code, this.render_options.glyph_point_size).getMetrics().x_max;
    return this.getDepressSignLeft() - this.render_options.change_release_margin - release_right;
  }

  // VexFlowPatch: draws (Ped.), the Ped. sign in parentheses, for a pedal going on from the system before (ContinuationSign):
  //   the "(" from x, the parentheses centered on the Ped. sign, which stands on y like a Ped. sign at a note. Returns the
  //   right edge of the ")".
  drawContinuationSign(ctx, x, y) {
    const point = this.render_options.glyph_point_size;
    const depress = PedalMarking.GLYPHS.pedal_depress;
    const ped = new Glyph(depress.code, point);
    const open = new Glyph('v9c', point); // the parentheses of cautionary accidentals, as tall as the Ped. sign
    const close = new Glyph('v84', point);
    const gap = this.render_options.continuation_sign_gap;
    const pedY = y + depress.y_shift;
    const pedMiddle = pedY + ped.bbox.getY() + ped.bbox.getH() / 2;
    const parenY = paren => pedMiddle - (paren.bbox.getY() + paren.bbox.getH() / 2);
    let left = x;
    open.render(ctx, left - open.bbox.getX(), parenY(open));
    left += open.bbox.getW() + gap;
    ped.render(ctx, left - ped.bbox.getX(), pedY);
    left += ped.bbox.getW() + gap;
    close.render(ctx, left - close.bbox.getX(), parenY(close));
    return left + close.bbox.getW();
  }

  // VexFlowPatch: the width of (Ped.), see drawContinuationSign()
  getContinuationSignWidth() {
    const point = this.render_options.glyph_point_size;
    const width = code => new Glyph(code, point).bbox.getW();
    return width('v9c') + width(PedalMarking.GLYPHS.pedal_depress.code) + width('v84') + 2 * this.render_options.continuation_sign_gap;
  }

  setEndStave(stave) { // VexFlowPatch addition
    this.endStave = stave;
    this.endStaveAddedWidth = 0;
    this.startMargin = 0;
    this.endMargin = 0;
    if(Array.isArray(this.endStave.modifiers)){
      for(let i = 0; i < this.endStave.modifiers.length; i++){
        let nextMod = this.endStave.modifiers[i];
        if(nextMod && nextMod.position === StaveModifier.Position.END && nextMod.width){
          this.endStaveAddedWidth += nextMod.width;
        }
      }
    }
  }

  // Set custom text for the `depress`/`release` pedal markings. No text is
  // set if the parameter is falsy.
  setCustomText(depress, release) {
    this.custom_depress_text = depress || '';
    this.custom_release_text = release || '';
    return this;
  }

  // Set the pedal marking style
  setStyle(style) {
    if (style < 1 && style > 3)  {
      throw new Vex.RERR('InvalidParameter', 'The style must be one found in PedalMarking.Styles');
    }

    this.style = style;
    return this;
  }

  // Set the staff line to render the markings on
  setLine(line) { this.line = line; return this; }

  // Draw the bracket based pedal markings
  drawBracketed() {
    const ctx = this.context;
    let is_pedal_depressed = false;
    let prev_x;
    let prev_y;
    const pedal = this;
    // Iterate through each note
    this.notes.forEach((note, index, notes) => {
      // Each note triggers the opposite pedal action
      is_pedal_depressed = !is_pedal_depressed;
      // Get the initial coordinates for the note
      let x = 0; // VexFlowPatch (further smaller diffs below)
      if (note) {
        //default to note head begin
        x = note.getNoteHeadBeginX();
        if (this.BeginsStave) {
          x = note.getStave().getNoteStartX();
        }
      } else {
        x = this.endStave.end_x + this.endStaveAddedWidth;
      }

      //If this pedal doesn't end a stave...
      if(!this.EndsStave){
        if(note){
          //pedal across a single note or just the end note
          if(!is_pedal_depressed){
            switch(pedal.style) {
              case PedalMarking.Styles.BRACKET_OPEN_END:
              case PedalMarking.Styles.BRACKET_OPEN_BOTH:
              case PedalMarking.Styles.MIXED_OPEN_END:
                // VexFlowPatch: going on in the next system: to the end of the stave (the system), as far as its last
                //   barline (end_x: before courtesy signatures at the end), not only to the end of its last note
                x = note.getStave().end_x;
              break;
              default:
                if (this.ChangeEnd && this.ChangeEndBeforeSign) {
                  // VexFlowPatch: pressed again at this note by a pedal marking that draws its Ped. sign here: the end of
                  //   the line, its hook, render_options.change_release_margin left of the Ped. sign
                  x = note.getAbsoluteX() + this.getDepressSignLeft() - pedal.render_options.change_release_margin;
                } else if(this.ChangeEnd){
                  //Start in the middle of the note
                  x = note.getAbsoluteX();
                } else {
                  x = note.getNoteHeadBeginX() - pedal.render_options.text_margin_right;
                  this.startMargin = -pedal.render_options.text_margin_right;
                }
              break;
            }
          } else if(this.ChangeBegin){
            x = note.getAbsoluteX();
          }
        }
      } else {
        //Ends stave and we are at the end...
        if(!is_pedal_depressed){
          //IF we are the end, set the end to the stave end
          if(note){
            if(this.ChangeEnd){
              //Start in the middle of the note
              x = note.getAbsoluteX();
            }  else {
              x = note.getStave().end_x + this.endStaveAddedWidth - pedal.render_options.text_margin_right;
            }
          } else {
            x = this.endStave.end_x + this.endStaveAddedWidth - pedal.render_options.text_margin_right;
          }
          
          this.endMargin = -pedal.render_options.text_margin_right;
        } else if (this.ChangeBegin){
          x = note.getAbsoluteX();
        }
      }

      let stave = this.endStave; // if !note
      if (note) {
        stave = note.getStave();
      }
      let y = stave.getYForBottomText(pedal.line + 3);
      if (prev_y) { // compiler complains if we shorten this
        if (prev_y > y) { // don't slope pedal marking upwards (nonstandard)
          y = prev_y;
        }
      }

      // Throw if current note is positioned before the previous note
      if (x < prev_x) {
        // TODO this unnecessarily throws for missing endNote fix
        // throw new Vex.RERR(
        //   'InvalidConfiguration', 'The notes provided must be in order of ascending x positions'
        // );
      }

      // Determine if the previous or next note are the same
      // as the current note. We need to keep track of this for
      // when adjustments are made for the release+depress action
      const next_is_same = notes[index + 1] === note;
      const prev_is_same = notes[index - 1] === note;

      let x_shift = 0;
      if (is_pedal_depressed) {
        // Adjustment for release+depress
        x_shift =  prev_is_same ? 5 : 0;

        if (this.ContinuationSign && !prev_is_same) {
          // VexFlowPatch: going on from the system before: (Ped.), then the line
          x_shift = this.drawContinuationSign(ctx, x, y) - x + pedal.render_options.text_margin_right;
        } else if ((pedal.style === PedalMarking.Styles.MIXED || pedal.style === PedalMarking.Styles.MIXED_OPEN_END) && !prev_is_same) {
          // For MIXED style, start with text instead of bracket
          if (pedal.custom_depress_text) {
            // If we have custom text, use instead of the default "Ped" glyph
            const text_width = ctx.measureText(pedal.custom_depress_text).width;
            ctx.fillText(pedal.custom_depress_text, x - (text_width / 2), y);
            x_shift = (text_width / 2) + pedal.render_options.text_margin_right;
          } else {
            // Render the Ped glyph in position
            drawPedalGlyph('pedal_depress', ctx, x, y, pedal.render_options.glyph_point_size);
            x_shift = 20 + pedal.render_options.text_margin_right;
          }
        } else {
          // Draw start bracket
          ctx.beginPath();
          if (pedal.style === PedalMarking.Styles.BRACKET_OPEN_BEGIN || pedal.style === PedalMarking.Styles.BRACKET_OPEN_BOTH) {
            ctx.moveTo(x + x_shift, y);
          } else {
            if(this.ChangeBegin){
              x += 5;
            }
            ctx.moveTo(x, y - pedal.render_options.bracket_height);
            if(this.ChangeBegin){
              x += 5;
            }
            ctx.lineTo(x + x_shift, y);
          }
          ctx.stroke();
          ctx.closePath();
        }
      } else {
        // Adjustment for release+depress
        x_shift = next_is_same && !this.EndsStave ? -5 : 0;

        // Draw end bracket
        ctx.beginPath();
        ctx.moveTo(prev_x, prev_y);
        ctx.lineTo(x + x_shift, y);
        if (pedal.style !== PedalMarking.Styles.BRACKET_OPEN_END && pedal.style !== PedalMarking.Styles.MIXED_OPEN_END &&
            pedal.style !== PedalMarking.Styles.BRACKET_OPEN_BOTH && !this.EndsWithoutHook) {
            // ChangeEnd: the up-stroke of the change notch (VexFlowPatch: before a Ped. sign, the hook, see above)
            if(this.ChangeEnd && !this.ChangeEndBeforeSign){
              x += 5;
            }
            ctx.lineTo(x, y - pedal.render_options.bracket_height);
        }
        ctx.stroke();
        ctx.closePath();
      }

      // Store previous coordinates
      prev_x = x + x_shift;
      prev_y = y;
    });
  }

  // Draw the text based pedal markings. This defaults to the traditional
  // "Ped" and "*"" symbols if no custom text has been provided.
  drawText() {
    const ctx = this.context;
    let is_pedal_depressed = false;
    const pedal = this;

    // The glyph point size
    const point = pedal.render_options.glyph_point_size;

    // Iterate through each note, placing glyphs or custom text accordingly
    this.notes.forEach(note => {
      if (!note) {
        return;
        // apparently happens for some GuitarPro/Sibelius exports with faulty MusicXML
      }
      is_pedal_depressed = !is_pedal_depressed;
      const stave = note.getStave();
      const x = note.getAbsoluteX();
      const y = stave.getYForBottomText(pedal.line + 3);

      let text_width = 0;
      if (is_pedal_depressed) {
        if (pedal.ContinuationSign) {
          // VexFlowPatch: going on from the system before: (Ped.) at the stave's note start
          pedal.drawContinuationSign(ctx, stave.getNoteStartX(), y);
        } else if (pedal.custom_depress_text) {
          text_width = ctx.measureText(pedal.custom_depress_text).width;
          ctx.fillText(pedal.custom_depress_text, x - (text_width / 2), y);
        } else {
          drawPedalGlyph('pedal_depress', ctx, x, y, point);
        }
      } else {
        if (pedal.custom_release_text) {
          text_width = ctx.measureText(pedal.custom_release_text).width;
          ctx.fillText(pedal.custom_release_text, x - (text_width / 2), y);
        } else {
          // VexFlowPatch: pressed again at this note (the next pedal marking draws its Ped. sign here): the * left of it
          const release_x = pedal.ChangeEnd ? x + pedal.getChangeReleaseXShift() : x;
          drawPedalGlyph('pedal_release', ctx, release_x, y, point);
        }
      }
    });
  }

  // Render the pedal marking in position on the rendering context
  draw() {
    const ctx = this.checkContext();
    this.setRendered();

    ctx.save();
    ctx.setStrokeStyle(this.render_options.color);
    ctx.setFillStyle(this.render_options.color);
    ctx.setFont(this.font.family, this.font.size, this.font.weight);

    L('Rendering Pedal Marking');

    // VexFlowPatch: the marks and brackets in a group (class vf-pedalmarking). A pedal marking of one shape gets the group's
    //   class instead (<path class="vf-pedalmarking">), and one without shapes gets no group (see SVGContext.openGroup() with
    //   attrs.mergeIntoChild and omitIfEmpty).
    ctx.openGroup('pedalmarking', undefined, { mergeIntoChild: true, omitIfEmpty: true });
    if (this.style === PedalMarking.Styles.BRACKET || this.style === PedalMarking.Styles.MIXED || this.style === PedalMarking.Styles.MIXED_OPEN_END ||
        this.style === PedalMarking.Styles.BRACKET_OPEN_BEGIN || this.style === PedalMarking.Styles.BRACKET_OPEN_END || this.style === PedalMarking.Styles.BRACKET_OPEN_BOTH) {
      ctx.setLineWidth(this.render_options.bracket_line_width);
      this.drawBracketed();
    } else if (this.style === PedalMarking.Styles.TEXT) {
      this.drawText();
    }
    ctx.closeGroup();

    ctx.restore();
  }
}