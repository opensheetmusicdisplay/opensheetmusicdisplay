// [VexFlow](http://vexflow.com) - Copyright (c) Mohit Muthanna 2010.
// Author: Cyril Silverman
//
// ## Description
//
// This file implements ornaments as modifiers that can be
// attached to notes. The complete list of ornaments is available in
// `tables.js` under `Vex.Flow.ornamentCodes`.
//
// See `tests/ornament_tests.js` for usage examples.

import { Vex } from './vex';
import { Flow } from './tables';
import { Modifier } from './modifier';
import { TickContext } from './tickcontext';
import { StaveNote } from './stavenote';
import { Glyph } from './glyph';

// To enable logging for this class. Set `Vex.Flow.Ornament.DEBUG` to `true`.
function L(...args) { if (Ornament.DEBUG) Vex.L('Vex.Flow.Ornament', args); }

// VexFlowPatch: the glyph of an accidental of an ornament, also for a list of accidentals drawn side by side
//   (e.g. ['#', '#'] for a sharp-sharp). Like a note's accidentals, they share a baseline, with `spacing` between them.
//   Positioned like a single glyph with origin (0.5, 1.0): render() takes the center and the bottom.
function createAccidentalGlyph(accids, scale, spacing) {
  if (!Array.isArray(accids)) {
    accids = [accids];
  }
  const glyphs = accids.map(accid => new Glyph(Flow.accidentalCodes(accid).code, scale));
  if (glyphs.length === 1) {
    glyphs[0].setOrigin(0.5, 1.0);
    return glyphs[0];
  }
  let top = Infinity;
  let bottom = -Infinity;
  let width = spacing * (glyphs.length - 1);
  for (const glyph of glyphs) {
    top = Math.min(top, glyph.bbox.getY());
    bottom = Math.max(bottom, glyph.bbox.getY() + glyph.bbox.getH());
    width += glyph.bbox.getW();
  }
  return {
    glyphs,
    getMetrics: () => ({ width, height: bottom - top }),
    render: (ctx, x, y) => {
      let left = x - width / 2;
      for (const glyph of glyphs) {
        glyph.render(ctx, left - glyph.bbox.getX(), y - bottom);
        left += glyph.bbox.getW() + spacing;
      }
    },
  };
}

// VexFlowPatch: the y from which the text lines of the ornaments above a note are counted (see Ornament.draw()): a staff
//   space above its stem tip, or above its head if the stem is down (one and a half above a beamed stem tip)
function getTopBaseY(note) {
  const spacing = note.getStave().getSpacingBetweenLines();
  const stemExtents = note.getStem().getExtents();
  if (note.getStemDirection() === StaveNote.STEM_DOWN) {
    return stemExtents.baseY - spacing;
  }
  // Beamed stems are longer than quarter note stems
  return stemExtents.topY - spacing * (note.beam ? 1.5 : 1);
}

// VexFlowPatch: the y from which the text lines of the ornaments below a note are counted: a staff space below its lowest
//   head or its stem tip (one and a half below a beamed stem tip)
function getBottomBaseY(note) {
  const spacing = note.getStave().getSpacingBetweenLines();
  const stemExtents = note.getStem().getExtents();
  const noteBottom = Math.max(...note.getYs(),
    note.hasStem() ? Math.max(stemExtents.topY, stemExtents.baseY) : -Infinity);
  return noteBottom + spacing * (note.getStemDirection() === StaveNote.STEM_DOWN && note.beam ? 1.5 : 1);
}

export class Ornament extends Modifier {
  static get CATEGORY() { return 'ornaments'; }

  // ## Static Methods
  // Arrange ornaments inside `ModifierContext`
  static format(ornaments, state) {
    if (!ornaments || ornaments.length === 0) return false;

    let width = 0;
    for (let i = 0; i < ornaments.length; ++i) {
      const ornament = ornaments[i];
      const increment = 2;

      width = Math.max(ornament.getWidth(), width);

      if (ornament.getPosition() === Modifier.Position.ABOVE) {
        ornament.setTextLine(state.top_text_line);
        state.top_text_line += increment;
      } else {
        ornament.setTextLine(state.text_line);
        state.text_line += increment;
      }
    }

    state.left_shift += width / 2;
    state.right_shift += width / 2;
    return true;
  }

  // Create a new ornament of type `type`, which is an entry in
  // `Vex.Flow.ornamentCodes` in `tables.js`.
  constructor(type) {
    super();
    this.setAttribute('type', 'Ornament');

    this.note = null;
    this.index = null;
    this.type = type;
    this.position = Modifier.Position.ABOVE;
    this.delayed = false;

    this.accidentalUpper = null;
    this.accidentalLower = null;

    this.render_options = {
      font_scale: 38,
      accidentalLowerPadding: 3,
      accidentalUpperPadding: 3,
      accidentalSpacing: 3, // between the accidentals of a list, as between a note's accidentals (Accidental.format())
    };

    this.ornament = Flow.ornamentCodes(this.type);
    if (!this.ornament) {
      throw new Vex.RERR('ArgumentError', `Ornament not found: '${this.type}'`);
    }

    this.glyph = new Glyph(this.ornament.code, this.render_options.font_scale);
    this.glyph.setOrigin(0.5, 1.0); // FIXME: SMuFL won't require a vertical origin shift
  }

  getCategory() { return Ornament.CATEGORY; }

  // Set whether the ornament is to be delayed
  setDelayed(delayed) { this.delayed = delayed; return this; }

  // Set the upper accidental for the ornament
  // VexFlowPatch: also a list of accidentals, drawn side by side (e.g. ['#', '#'] for a sharp-sharp)
  setUpperAccidental(accid) {
    this.accidentalUpper = createAccidentalGlyph(accid, this.render_options.font_scale / 1.3,
      this.render_options.accidentalSpacing / 1.3);
    return this;
  }

  // Set the lower accidental for the ornament
  // VexFlowPatch: also a list of accidentals, see setUpperAccidental()
  setLowerAccidental(accid) {
    this.accidentalLower = createAccidentalGlyph(accid, this.render_options.font_scale / 1.3,
      this.render_options.accidentalSpacing / 1.3);
    return this;
  }

  // VexFlowPatch: the other notes at this time with ornaments on the side of this one: those of the other voices in the staff,
  //   which share this ornament's ModifierContext, and so the text lines that format() gave its ornaments
  getOtherNotesOnSameSide() {
    const isTabNote = note => note.getCategory() === 'tabnotes';
    if (isTabNote(this.note)) {
      return [];
    }
    const ornaments = this.getModifierContext()?.getModifiers(Ornament.CATEGORY) ?? [];
    return ornaments
      .filter(ornament => ornament.getPosition() === this.position && ornament.note !== this.note && !isTabNote(ornament.note))
      .map(ornament => ornament.note);
  }

  // Render ornament in position next to note.
  draw() {
    this.checkContext();

    if (!this.note || this.index == null) {
      throw new Vex.RERR('NoAttachedNote', "Can't draw Ornament without a note and index.");
    }

    this.setRendered();

    const ctx = this.context;
    const stemDir = this.note.getStemDirection();
    const stave = this.note.getStave();

    // Get stem extents
    const stemExtents = this.note.getStem().getExtents();
    let y = stemDir === StaveNote.STEM_DOWN ? stemExtents.baseY : stemExtents.topY;

    // TabNotes don't have stems attached to them. Tab stems are rendered
    // outside the stave.
    if (this.note.getCategory() === 'tabnotes') {
      if (this.note.hasStem()) {
        if (stemDir === StaveNote.STEM_DOWN) {
          y = stave.getYForTopText(this.text_line);
        }
      } else { // Without a stem
        y = stave.getYForTopText(this.text_line);
      }
    }

    const isPlacedOnNoteheadSide = stemDir === StaveNote.STEM_DOWN;
    const spacing = stave.getSpacingBetweenLines();
    let lineSpacing = 1;

    // Beamed stems are longer than quarter note stems, adjust accordingly
    if (!isPlacedOnNoteheadSide && this.note.beam) {
      lineSpacing += 0.5;
    }

    // VexFlowPatch: the text line of an ornament (see format()) is counted from the outermost of the notes at this time
    //   with ornaments on its side, i.e. of all voices in the staff (see getOtherNotesOnSameSide()), not only from its own
    //   note: e.g. the turn of a stem-down note, on text line 2, was drawn at the height of the mordent on text line 0
    //   above the stem of the stem-up note of another voice a second above, over it.
    const otherNotes = this.getOtherNotesOnSameSide();
    for (const note of otherNotes) {
      // a note's ys follow the stave only when its voice draws it (Voice.draw() sets the stave): a voice drawn after this
      //   one still has those of the previous draw, e.g. of the skyline's, where the stave was elsewhere
      note.setStave(note.getStave());
    }
    let topBaseY = y - spacing * lineSpacing;
    for (const note of otherNotes) {
      topBaseY = Math.min(topBaseY, getTopBaseY(note));
    }
    const glyphYBetweenLines = topBaseY - spacing * this.text_line;

    // Get initial coordinates for the modifier position
    const start = this.note.getModifierStartXY(this.position, this.index);
    let glyphX = start.x;
    let glyphY = Math.min(stave.getYForTopText(this.text_line), glyphYBetweenLines);
    if (this.position === Modifier.Position.BELOW) {
      // VexFlowPatch: Place the entire ornament, including accidentals, below the stave and note.
      // Glyphs are drawn upwards from their bottom origin.
      let bottomBaseY = getBottomBaseY(this.note);
      for (const note of otherNotes) {
        bottomBaseY = Math.max(bottomBaseY, getBottomBaseY(note));
      }
      let height = this.glyph.getMetrics().height;
      if (this.accidentalLower) {
        height += this.accidentalLower.getMetrics().height + this.render_options.accidentalLowerPadding;
      }
      if (this.accidentalUpper) {
        height += this.accidentalUpper.getMetrics().height + this.render_options.accidentalUpperPadding;
      }
      glyphY = Math.max(stave.getYForBottomText(this.text_line), bottomBaseY + spacing * this.text_line) + height;
    }
    glyphY += this.y_shift;

    // Ajdust x position if ornament is delayed
    if (this.delayed) {
      let delayXShift = 0;
      if (this.delayXShift !== undefined) {
        delayXShift = this.delayXShift;
      } else {
        delayXShift += this.glyph.getMetrics().width / 2;
        const nextContext = TickContext.getNextContext(this.note.getTickContext());
        if (nextContext) {
          delayXShift += (nextContext.getX() - glyphX) * 0.5;
        } else {
          delayXShift += (stave.x + stave.width - glyphX) * 0.5;
        }
        this.delayXShift = delayXShift;
      }
      glyphX += delayXShift;
    }

    L('Rendering ornament: ', this.ornament, glyphX, glyphY);

    if (this.accidentalLower) {
      this.accidentalLower.render(ctx, glyphX, glyphY);
      glyphY -= this.accidentalLower.getMetrics().height;
      glyphY -= this.render_options.accidentalLowerPadding;
    }

    this.glyph.render(ctx, glyphX, glyphY);
    glyphY -= this.glyph.getMetrics().height;

    if (this.accidentalUpper) {
      glyphY -= this.render_options.accidentalUpperPadding;
      this.accidentalUpper.render(ctx, glyphX, glyphY);
    }
  }
}
